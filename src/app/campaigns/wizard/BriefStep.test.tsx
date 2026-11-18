import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { BriefStep, createEmptyBriefDraft } from './BriefStep';
import type { BriefDraft } from './BriefPane';
import { saveClientVoice, extractBrandVoice, extractBrandBook, AiRequestError } from '@/lib/ai';
import type { CreativeData } from './types';

afterEach(cleanup);
beforeEach(() => { vi.mocked(saveClientVoice).mockClear(); });

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn().mockResolvedValue({
    voice: '', brand_context: '', website_url: '',
    product_service: '', audience_market: '', persona: '',
  }),
  saveClientVoice: vi.fn().mockResolvedValue(undefined),
  // Extração real do brand book (PDF): o envio e a leitura moram no servidor.
  extractBrandBook: vi.fn().mockResolvedValue({
    voice: 'Voz do manual.', voice_examples: [], brand_context: 'Contexto do manual.',
    brand_colors: { primary: '#123456', secondary: '', accent: '' },
    color_candidates: [], scrape_status: 'ok', source_url: null, about_url: null,
  }),
  // Extração real do site, com candidatas de cor vindas do CSS.
  extractBrandVoice: vi.fn().mockResolvedValue({
    voice: 'Técnico e didático.', voice_examples: [], brand_context: 'SaaS de ABM.',
    brand_colors: { primary: '#FF5F39', secondary: '#0F172A', accent: '#6366F1' },
    color_candidates: ['#FF5F39', '#E54A26', '#0F172A'],
    scrape_status: 'ok', source_url: 'https://exemplo.com', about_url: null,
  }),
}));

/**
 * Harness com estado real: faz o papel do `CampaignWizard`, que é dono tanto do
 * `creativeData` quanto do rascunho da marca. Sem o prop controlado dando a
 * volta pelo pai, qualquer bug de re-semeadura do draft fica invisível.
 */
function StatefulHost() {
  const [data, setData] = useState<CreativeData>({ overrides: {} } as never);
  const [draft, setDraft] = useState<BriefDraft>(createEmptyBriefDraft());
  return (
    <BriefStep
      creativeData={data}
      onCreativeChange={setData}
      draft={draft}
      setDraft={setDraft}
    />
  );
}

function renderStep() {
  return render(<StatefulHost />);
}

describe('BriefStep', () => {
  it('abre direto no formulário da marca', () => {
    renderStep();
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^marca$/i })).toBeTruthy();
  });

  // Regressão: escrever num campo de campanha reescrevia o draft inteiro a
  // partir do brandKit salvo, apagando o que ainda não tinha sido salvo.
  it('preserva edições da marca quando um campo desta campanha muda', () => {
    renderStep();
    const voz = screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement;
    fireEvent.change(voz, { target: { value: 'Direto e confiante' } });
    expect(voz.value).toBe('Direto e confiante');

    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), { target: { value: 'Produto A' } });

    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Direto e confiante');
    expect((screen.getByLabelText(/produto\/serviço/i) as HTMLSelectElement).value).toBe('Produto A');
  });

  it('só grava a marca no servidor quando "Salvar marca" é clicado', async () => {
    renderStep();
    fireEvent.change(screen.getByLabelText(/tom de voz/i), { target: { value: 'Direto' } });
    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), { target: { value: 'Produto A' } });
    expect(vi.mocked(saveClientVoice)).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
    });
    expect(vi.mocked(saveClientVoice)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveClientVoice).mock.calls[0][0]).toMatchObject({
      voice: 'Direto',
      product_service: 'Produto A',
    });
  });

  // O catch engolia o erro e o painel não fecha mais: falha do servidor ficava
  // indistinguível de sucesso.
  it('mostra o erro quando o save global falha', async () => {
    vi.mocked(saveClientVoice).mockRejectedValueOnce(new Error('HTTP 500'));
    renderStep();
    fireEvent.change(screen.getByLabelText(/tom de voz/i), { target: { value: 'Direto' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/não foi possível salvar a marca.*http 500/i);
  });

  // Salvar mudava o `brandKit`, o semeador do draft reagia e zerava
  // `source`/`extractedRef` — o chip de procedência sumia exatamente no
  // momento em que ele mais serve.
  it('mantém o chip de procedência depois de salvar a marca', async () => {
    vi.useFakeTimers();
    try {
      renderStep();
      const dropzone = screen.getByText(/arraste o pdf/i).closest('div')!;
      const pdf = new File(['%PDF-'], 'manual-da-marca.pdf', { type: 'application/pdf' });
      fireEvent.drop(dropzone, { dataTransfer: { files: [pdf] } });
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(screen.getByText('Brand Book lido')).toBeTruthy();
      expect(screen.getByText('manual-da-marca.pdf')).toBeTruthy();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
      });
      expect(screen.getByText('Brand Book lido')).toBeTruthy();
      expect(screen.getByText('manual-da-marca.pdf')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('BriefStep — candidatas de cor sobrevivem ao save', () => {
  // Regressão: persistVoice escrevia o brandKit sem colorOptions, e o efeito de
  // sync re-semeia o draft a partir do brandKit. Resultado: extrair mostrava as
  // amostras e salvar as apagava.
  it('mantém as amostras depois de salvar a marca', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderStep();

      const url = screen.getByLabelText(/website da sua empresa/i);
      fireEvent.change(url, { target: { value: 'https://exemplo.com' } });
      fireEvent.click(screen.getByRole('button', { name: /extrair com ia/i }));
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

      expect(screen.getAllByRole('button', { name: /usar #E54A26/i }).length).toBeGreaterThan(0);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
      });

      expect(screen.getAllByRole('button', { name: /usar #E54A26/i }).length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('BriefStep — rascunho vive no pai', () => {
  // O step desmonta a cada navegação do wizard. Se o draft fosse local, tudo
  // que não passou pelo "Salvar marca" morreria ao clicar em "Próximo Passo".
  it('mantém o que foi digitado depois de desmontar e remontar', () => {
    function Host({ mounted }: { mounted: boolean }) {
      const [data, setData] = useState<CreativeData>({ overrides: {} } as never);
      const [draft, setDraft] = useState<BriefDraft>(createEmptyBriefDraft());
      return mounted
        ? <BriefStep creativeData={data} onCreativeChange={setData} draft={draft} setDraft={setDraft} />
        : <div>outro passo</div>;
    }
    const { rerender } = render(<Host mounted />);
    fireEvent.change(screen.getByLabelText(/tom de voz/i), { target: { value: 'Não salvo ainda' } });

    rerender(<Host mounted={false} />);
    expect(screen.getByText('outro passo')).toBeTruthy();

    rerender(<Host mounted />);
    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Não salvo ainda');
  });
});

// Achado do QA do produto: extração que falha precisa aparecer e não pode
// deixar lixo do modelo nos campos.
describe('BriefStep — extração do site', () => {
  const extract = () => {
    fireEvent.change(screen.getByLabelText(/website da sua empresa/i), { target: { value: 'https://exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: /extrair com ia/i }));
  };

  it('falha mostra o que preencher e mantém os campos', async () => {
    vi.mocked(extractBrandVoice).mockRejectedValueOnce(
      new AiRequestError('Não conseguimos extrair a marca deste site. Preencha manualmente o tom de voz, o contexto e as cores.', 422),
    );
    renderStep();
    fireEvent.change(screen.getByLabelText(/tom de voz/i), { target: { value: 'Minha voz' } });
    extract();
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Preencha manualmente o tom de voz, o contexto e as cores\. Seus campos foram mantidos/));
    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Minha voz');
  });

  it('resposta em que o modelo está conversando não entra nos campos', async () => {
    vi.mocked(extractBrandVoice).mockResolvedValueOnce({
      voice: 'Se preferir, posso analisar outra página.', voice_examples: [], brand_context: '1. **Contexto**',
      brand_colors: { primary: '', secondary: '', accent: '' }, scrape_status: 'ok', source_url: null, about_url: null,
    });
    renderStep();
    extract();
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Não conseguimos extrair a marca/));
    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('sem cores, preenche o resto e pede as cores à mão', async () => {
    vi.mocked(extractBrandVoice).mockResolvedValueOnce({
      voice: 'Direto e técnico.', voice_examples: [], brand_context: 'SaaS de ABM.',
      brand_colors: { primary: 'nenhuma', secondary: '', accent: '' }, scrape_status: 'ok', source_url: null, about_url: null,
    });
    renderStep();
    extract();
    await vi.waitFor(() => expect(screen.getByText(/Não encontramos as cores no site/)).toBeTruthy());
    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Direto e técnico.');
  });
});

describe('BriefStep — brand book em PDF', () => {
  const dropPdf = () => {
    const file = new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' });
    const zone = screen.getByText('Arraste o PDF ou clique para enviar').parentElement!;
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    return file;
  };

  it('envia o PDF de verdade e preenche a marca com o que o servidor extraiu', async () => {
    vi.mocked(extractBrandBook).mockClear();
    renderStep();
    let file!: File;
    await act(async () => { file = dropPdf(); });
    expect(vi.mocked(extractBrandBook)).toHaveBeenCalledWith(file);
    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Voz do manual.');
    expect(screen.getByText(/Não encontramos as cores no PDF|Marca extraída do PDF/)).toBeTruthy();
    // Nada da fixture antiga.
    expect(screen.queryByText(/mock/i)).toBeNull();
  });

  it('422 mostra a mensagem do servidor e mantém os campos', async () => {
    vi.mocked(extractBrandBook).mockRejectedValueOnce(new AiRequestError('Não conseguimos extrair a marca de manual.pdf.', 422, ['cores']));
    renderStep();
    fireEvent.change(screen.getByLabelText(/tom de voz/i), { target: { value: 'Meu tom' } });
    await act(async () => { dropPdf(); });
    expect(screen.getByText('Não conseguimos extrair a marca de manual.pdf. Seus campos foram mantidos.')).toBeTruthy();
    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Meu tom');
  });
});

describe('BriefStep — logo salvo no kit da marca', () => {
  it('"Salvar marca" grava a URL e o caminho do logo no brandKit', async () => {
    let saved: CreativeData | undefined;
    function Host() {
      const [data, setData] = useState<CreativeData>({ overrides: {} } as never);
      const [draft, setDraft] = useState<BriefDraft>({
        ...createEmptyBriefDraft(), voice: 'Direto', logo: 'https://storage/logo.png', logoPath: 'uuid-logo.png',
      });
      saved = data;
      return <BriefStep creativeData={data} onCreativeChange={setData} draft={draft} setDraft={setDraft} />;
    }
    render(<Host />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar marca/i })); });
    expect(saved?.brandKit).toMatchObject({ logo: 'https://storage/logo.png', logoPath: 'uuid-logo.png' });
  });
});

describe('BriefStep — seguidores opcionais', () => {
  it('"Salvar marca" grava o número digitado; vazio grava null', async () => {
    let saved: CreativeData | undefined;
    function Host({ followers }: { followers: string }) {
      const [data, setData] = useState<CreativeData>({ overrides: {} } as never);
      const [draft, setDraft] = useState<BriefDraft>({ ...createEmptyBriefDraft(), voice: 'Direto', followers });
      saved = data;
      return <BriefStep creativeData={data} onCreativeChange={setData} draft={draft} setDraft={setDraft} />;
    }
    const { unmount } = render(<Host followers="3.550" />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar marca/i })); });
    expect(saved?.brandKit.followers).toBe(3550);
    unmount();
    render(<Host followers="" />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /salvar marca/i })); });
    expect(saved?.brandKit.followers).toBeNull();
  });

  it('o campo aparece como opcional', () => {
    renderStep();
    expect(screen.getByLabelText(/Seguidores no LinkedIn/)).toBeTruthy();
  });
});
