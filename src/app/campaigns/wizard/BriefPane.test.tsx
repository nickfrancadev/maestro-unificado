import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BriefPane, type BriefDraft } from './BriefPane';

afterEach(cleanup);

function draft(over: Partial<BriefDraft> = {}): BriefDraft {
  return {
    voice: '', context: '', websiteUrl: '',
    productService: '', audienceMarket: '', persona: '',
    brandColors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [], graphics: [],
    source: null, extractedRef: '',
    ...over,
  };
}

function setup(over: Partial<BriefDraft> = {}, status: 'defined' | 'empty' = 'empty', props = {}) {
  // `setDraft` recebe um updater (`d => ({ ...d, campo: v })`). Asserção de
  // "foi chamado" passaria mesmo se ele escrevesse no campo errado, então o
  // mock APLICA o updater e guarda o resultado — e aplica na hora, dentro do
  // handler: rodar depois leria `e.target.value` já restaurado pelo React
  // (componente controlado), devolvendo o valor antigo.
  const inicial = draft(over);
  let atual = inicial;
  const setDraft = vi.fn((next: unknown) => {
    atual = typeof next === 'function' ? (next as (d: BriefDraft) => BriefDraft)(atual) : (next as BriefDraft);
  });
  const draftAtual = () => atual;
  const onSaveBrand = vi.fn();
  const onCampaignFieldChange = vi.fn();
  render(
    <BriefPane
      draft={inicial}
      setDraft={setDraft}
      status={status}
      savingBrand={false}
      onSaveBrand={onSaveBrand}
      extracting={false}
      extractError={null}
      extractWarning={null}
      onExtractWebsite={vi.fn()}
      onUploadBrandBook={vi.fn()}
      onResetExtraction={vi.fn()}
      onCampaignFieldChange={onCampaignFieldChange}
      {...props}
    />,
  );
  return { setDraft, draftAtual, onSaveBrand, onCampaignFieldChange };
}

describe('BriefPane — marca já definida', () => {
  // O bug central: hoje o modal renderiza BrandSummary em somente-leitura
  // quando a marca vem de /ai/client-voice, e não há como alterá-la.
  it('renderiza o tom de voz num campo editável', () => {
    const { setDraft, draftAtual } = setup({ voice: 'Técnico e didático' }, 'defined');
    const campo = screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement;
    expect(campo).not.toHaveAttribute('readonly');
    expect(campo.value).toBe('Técnico e didático');
    fireEvent.change(campo, { target: { value: 'Direto' } });
    expect(setDraft).toHaveBeenCalledTimes(1);
    // O draft resultante — não só "foi chamado": o updater tem que escrever em
    // `voice` e deixar o resto intacto.
    expect(draftAtual()).toMatchObject({ voice: 'Direto', context: '', websiteUrl: '' });
  });

  it('mantém as ações de extração alcançáveis', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.getByText(/substituir a partir de pdf/i)).toBeTruthy();
    expect(screen.getByText(/extrair do site novamente/i)).toBeTruthy();
  });

  // O PDF era um `<label>` embrulhando `input[type=file].hidden`: nem o label
  // nem o input entram na ordem de tabulação, então o caminho virava só-mouse.
  it('expõe "Substituir a partir de PDF" como botão focável', () => {
    setup({ voice: 'Técnico' }, 'defined');
    const botao = screen.getByRole('button', { name: /substituir a partir de pdf/i });
    botao.focus();
    expect(document.activeElement).toBe(botao);
  });

  // `status` governa apresentação, nunca editabilidade — e `websiteUrl` é campo
  // da marca (vai pro servidor como `website_url`).
  it('deixa o website da empresa editável também com a marca definida', () => {
    const { draftAtual } = setup({ voice: 'Técnico', websiteUrl: 'https://antigo.com' }, 'defined');
    const campo = screen.getByLabelText(/website da sua empresa/i) as HTMLInputElement;
    expect(campo.value).toBe('https://antigo.com');
    fireEvent.change(campo, { target: { value: 'https://novo.com' } });
    expect(draftAtual()).toMatchObject({ websiteUrl: 'https://novo.com', voice: 'Técnico' });
  });

  it('desabilita "Extrair do site novamente" sem URL e explica no title', () => {
    setup({ voice: 'Técnico', websiteUrl: '' }, 'defined');
    const botao = screen.getByRole('button', { name: /extrair do site novamente/i }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(botao.getAttribute('title')).toMatch(/website/i);
  });

  it('habilita "Extrair do site novamente" quando há URL', () => {
    setup({ voice: 'Técnico', websiteUrl: 'https://exemplo.com' }, 'defined');
    const botao = screen.getByRole('button', { name: /extrair do site novamente/i }) as HTMLButtonElement;
    expect(botao.disabled).toBe(false);
  });

  // Marca vinda do servidor não tem `source`; o chip precisa dizer de onde veio
  // em vez de simplesmente não existir.
  it('mostra chip de origem para marca carregada das configurações salvas', () => {
    setup({ voice: 'Técnico', source: null }, 'defined');
    expect(screen.getByText(/configurações salvas/i)).toBeTruthy();
  });

  it('prefere o chip da extração quando ela aconteceu nesta sessão', () => {
    setup({ voice: 'Técnico', source: 'website', extractedRef: 'https://exemplo.com' }, 'defined');
    expect(screen.getByText(/extraído do site/i)).toBeTruthy();
    expect(screen.queryByText(/configurações salvas/i)).toBeNull();
  });

  it('avisa que a marca vale para todas as campanhas', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.getByText(/todas as campanhas/i)).toBeTruthy();
  });
});

describe('BriefPane — marca vazia', () => {
  it('mostra os campos preenchíveis sem exigir extração antes', () => {
    setup({}, 'empty');
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
    expect(screen.queryByText(/aparecem após a extração/i)).toBeNull();
  });

  it('oferece os dois caminhos de extração', () => {
    setup({}, 'empty');
    expect(screen.getByText(/brand book/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /extrair com ia/i })).toBeTruthy();
  });
});

describe('BriefPane — separação de escopo', () => {
  // Campo de campanha grava ao vivo; não pode acionar o save global.
  it('campo de campanha chama onCampaignFieldChange e não onSaveBrand', () => {
    const { onCampaignFieldChange, onSaveBrand } = setup({}, 'defined');
    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), {
      target: { value: 'Produto A' },
    });
    expect(onCampaignFieldChange).toHaveBeenCalledWith({ productService: 'Produto A' });
    expect(onSaveBrand).not.toHaveBeenCalled();
  });

  it('salvar marca chama onSaveBrand uma vez', () => {
    const { onSaveBrand } = setup({ voice: 'Técnico' }, 'defined');
    fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
    expect(onSaveBrand).toHaveBeenCalledTimes(1);
  });
});

describe('BriefPane — feedback do save global', () => {
  // Sem o modal fechando, sucesso e falha do POST ficavam indistinguíveis.
  it('mostra a falha do save junto ao botão', () => {
    setup({ voice: 'Técnico' }, 'defined', { saveError: 'Não foi possível salvar a marca no servidor: HTTP 500' });
    expect(screen.getByRole('alert').textContent).toMatch(/não foi possível salvar/i);
  });

  it('confirma o sucesso do save', () => {
    setup({ voice: 'Técnico' }, 'defined', { saveSucceeded: true });
    expect(screen.getByRole('status').textContent).toMatch(/marca salva/i);
  });

  it('não mostra confirmação nem erro no estado neutro', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
