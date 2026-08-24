import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';
import { generateBaseImage, composeLogoOverlay } from '@/lib/ai';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn().mockResolvedValue({
    voice: '', brand_context: '', website_url: '',
    product_service: '', audience_market: '', persona: '',
  }),
  saveClientVoice: vi.fn().mockResolvedValue(undefined),
  generateBaseImage: vi.fn().mockResolvedValue({ url: 'https://x/gerada.png', filename: 'gerada.png' }),
  composeLogoOverlay: vi.fn().mockResolvedValue({ url: 'https://x/composta.png', filename: 'composta.png' }),
}));

const targeting = {
  companies: { included: [{ id: 'c1', label: 'Nubank' }], excluded: [] },
  defaultTargeting: {
    locations: { included: [], excluded: [] },
    seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] },
    jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function Host({ initial }: { initial?: Partial<CreativeData> }) {
  const [data, setData] = useState<CreativeData>({ ...createDefaultCreativeData(), ...initial });
  return (
    <CreativeStep
      selectedAccounts={[]}
      targetingData={targeting as never}
      creativeData={data}
      onCreativeChange={setData}
      campaignId="camp-1"
    />
  );
}

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
// Os toggles têm aria-label EXATO com o título do card — /^Texto$/ não colide
// com "Gerar texto".
const toggle = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}$`) });

describe('CreativeStep — acordeão dos cards do editor', () => {
  it('começa com os três cards colapsados, só headers à vista', () => {
    renderStep();
    goTo(/Template global/);

    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('Imagem')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('Destino')).toHaveAttribute('aria-expanded', 'false');
    // Nenhum campo exposto.
    expect(screen.queryByPlaceholderText(/Hi \{\{company\.name\}\} team/)).toBeNull();
    expect(screen.queryByLabelText(/^CTA$/i)).toBeNull();
  });

  it('clicar no header expande o card e revela os campos', () => {
    renderStep();
    goTo(/Template global/);

    fireEvent.click(toggle('Texto'));
    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByPlaceholderText(/Hi \{\{company\.name\}\} team/)).toBeInTheDocument();
  });

  it('é acordeão: abrir Imagem fecha Texto', () => {
    renderStep();
    goTo(/Template global/);

    fireEvent.click(toggle('Texto'));
    fireEvent.click(toggle('Imagem'));
    expect(toggle('Imagem')).toHaveAttribute('aria-expanded', 'true');
    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByPlaceholderText(/Hi \{\{company\.name\}\} team/)).toBeNull();
  });

  it('clicar de novo no header aberto recolhe o card', () => {
    renderStep();
    goTo(/Template global/);

    fireEvent.click(toggle('Texto'));
    fireEvent.click(toggle('Texto'));
    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'false');
  });

  it('a ação do card fica visível colapsado e clicá-la NÃO expande', () => {
    renderStep();
    goTo(/Template global/);

    const gerar = screen.getByRole('button', { name: /Gerar texto$/ });
    expect(gerar).toBeInTheDocument();
    fireEvent.click(gerar);
    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'false');
  });

  it('trocar o alvo de edição recolhe tudo', () => {
    renderStep();
    goTo(/Template global/);
    fireEvent.click(toggle('Texto'));
    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'true');

    goTo(/Nubank/);
    expect(toggle('Texto')).toHaveAttribute('aria-expanded', 'false');
    expect(toggle('Imagem')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('CreativeStep — resumos dos cards colapsados', () => {
  it('Texto sem nada mostra "Sem texto ainda"; com headline mostra a headline', () => {
    // O default de CreativeData vem com texto de exemplo — zera para testar o vazio.
    renderStep({ headline: '', bodyText: '' });
    goTo(/Template global/);
    expect(within(toggle('Texto')).getByText('Sem texto ainda')).toBeInTheDocument();

    fireEvent.click(toggle('Texto'));
    fireEvent.change(screen.getByPlaceholderText(/Acelere seu ABM/), {
      target: { value: 'ABM para {{company.name}}' },
    });
    fireEvent.click(toggle('Texto')); // recolhe → resumo volta
    expect(within(toggle('Texto')).getByText('ABM para {{company.name}}')).toBeInTheDocument();
  });

  it('empresa sem override de texto resume como "Segue o template"', () => {
    renderStep({ headline: 'Headline do template' });
    goTo(/Nubank/);
    // A sidebar tem um badge "Segue o template" por empresa — restringe ao toggle.
    expect(within(toggle('Texto')).getByText('Segue o template')).toBeInTheDocument();
  });

  it('Imagem resume formato, origem e ausência de imagem-base', () => {
    renderStep();
    goTo(/Template global/);
    expect(screen.getByText(/Banner 1\.91:1 · Upload · sem imagem-base/)).toBeInTheDocument();
  });

  it('Destino resume CTA e URL', () => {
    renderStep();
    goTo(/Template global/);
    expect(screen.getByText(/Learn More · /)).toBeInTheDocument();
  });
});

describe('CreativeStep — controles de camada só quando a camada está ativa', () => {
  const withBase = () => {
    const d = createDefaultCreativeData();
    d.templateLogo.baseImageUrl = 'https://x/base.png';
    d.templateLogo.baseImageSource = 'upload';
    d.templateLogo.textoDestaque = 'WORKSHOP ABM';
    d.templateLogo.textoComplementar = 'Convite VIP';
    return d;
  };

  it('os sliders ficam ocultos até a camada ser ativada pelo foco no input', () => {
    renderStep(withBase() as never);
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));

    // Inputs visíveis, controles não.
    const destaque = screen.getByPlaceholderText('Texto principal na imagem');
    expect(destaque).toBeInTheDocument();
    expect(screen.queryByLabelText(/Tamanho do texto destaque/)).toBeNull();
    expect(screen.queryByLabelText(/Tamanho do texto complementar/)).toBeNull();

    // Focar o input ativa a camada e revela SÓ os controles dela.
    fireEvent.focus(destaque);
    expect(screen.getByLabelText(/Tamanho do texto destaque/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Tamanho do texto complementar/)).toBeNull();
  });

  it('trocar o foco para o outro texto troca os controles', () => {
    renderStep(withBase() as never);
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));

    fireEvent.focus(screen.getByPlaceholderText('Texto principal na imagem'));
    fireEvent.focus(screen.getByPlaceholderText('Texto secundário na imagem'));
    expect(screen.queryByLabelText(/Tamanho do texto destaque/)).toBeNull();
    expect(screen.getByLabelText(/Tamanho do texto complementar/)).toBeInTheDocument();
  });

  it('clicar no texto dentro do preview também ativa os controles da camada', () => {
    renderStep(withBase() as never);
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));
    expect(screen.queryByLabelText(/Tamanho do texto destaque/)).toBeNull();

    // O texto renderizado no canvas do preview.
    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 10, clientY: 10, pointerId: 1 });
    expect(screen.getByLabelText(/Tamanho do texto destaque/)).toBeInTheDocument();
  });

  it('Alinhamento e Espaçamento são do bloco e só aparecem com uma camada de texto ativa', () => {
    renderStep(withBase() as never);
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));

    expect(screen.queryByText('Alinhamento')).toBeNull();
    expect(screen.queryByLabelText(/Espaçamento entre os textos/)).toBeNull();

    fireEvent.focus(screen.getByPlaceholderText('Texto principal na imagem'));
    expect(screen.getByText('Alinhamento')).toBeInTheDocument();
    expect(screen.getByLabelText(/Espaçamento entre os textos/)).toBeInTheDocument();
  });
});


describe('CreativeStep — toggle Textos pela IA', () => {
  const aiData = (patch: (d: CreativeData) => void = () => {}) => {
    const d = createDefaultCreativeData();
    d.imageMode = 'ai';
    d.templateLogo.textoDestaque = 'WORKSHOP ABM';
    d.templateLogo.textoComplementar = 'Convite VIP';
    d.templateLogo.basePrompt = 'fundo azul abstrato';
    patch(d);
    return d;
  };

  it('só existe na origem "Gerar com IA"', () => {
    renderStep(); // default: upload
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));
    expect(screen.queryByRole('switch', { name: /Textos pela IA/ })).toBeNull();

    goTo(/Gerar com IA/);
    expect(screen.getByRole('switch', { name: /Textos pela IA/ })).toBeInTheDocument();
  });

  it('ligado, os controles de estilo somem e só os inputs de texto ficam', () => {
    renderStep(aiData((d) => { d.templateLogo.aiTexts = true; }));
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));

    const destaque = screen.getByPlaceholderText('Texto principal na imagem');
    expect(destaque).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Texto secundário na imagem')).toBeInTheDocument();

    // Nem focando o input os controles aparecem — a IA é quem estiliza.
    fireEvent.focus(destaque);
    expect(screen.queryByLabelText(/Tamanho do texto destaque/)).toBeNull();
    expect(screen.queryByText('Alinhamento')).toBeNull();
    expect(screen.queryByText('Fonte')).toBeNull();
  });

  it('os textos entram no prompt da geração quando ligado — e não entram desligado', async () => {
    const spy = vi.mocked(generateBaseImage);
    spy.mockClear();

    const { unmount } = renderStep(aiData((d) => { d.templateLogo.aiTexts = true; }));
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));
    // Ligado, o CTA assume que o resultado é o criativo inteiro.
    fireEvent.click(screen.getByRole('button', { name: /Gerar criativo com IA/ }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0].prompt_brief).toContain('fundo azul abstrato');
    expect(spy.mock.calls[0][0].prompt_brief).toContain('WORKSHOP ABM');
    expect(spy.mock.calls[0][0].prompt_brief).toContain('Convite VIP');
    unmount();

    spy.mockClear();
    renderStep(aiData());
    goTo(/Template global/);
    fireEvent.click(toggle('Imagem'));
    // Desligado, o CTA promete só a imagem — os textos seguem manuais.
    expect(screen.queryByRole('button', { name: /Gerar criativo com IA/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Gerar imagem com IA/ }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0].prompt_brief).toContain('fundo azul abstrato');
    expect(spy.mock.calls[0][0].prompt_brief).not.toContain('WORKSHOP ABM');
  });

  it('ligado, a composição não sobrepõe os textos (a IA já os pintou na base)', async () => {
    const spy = vi.mocked(composeLogoOverlay);
    spy.mockClear();

    renderStep(aiData((d) => {
      d.templateLogo.aiTexts = true;
      d.templateLogo.baseImageUrl = 'https://x/base.png';
      d.templateLogo.baseImageSource = 'ai';
    }));
    goTo(/Nubank/);
    fireEvent.click(toggle('Imagem'));
    fireEvent.click(screen.getByRole('button', { name: /^Gerar imagem$/ }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0].texto_destaque).toBe('');
    expect(spy.mock.calls[0][0].texto_complementar).toBe('');
  });
});
