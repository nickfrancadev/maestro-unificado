import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep, buildLandingPageUrl, displayDomain } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';
import { generateCopy, composeLogoOverlay, AiRequestError } from '@/lib/ai';
import type { LandingPage } from '@/app/landingPages/store/model';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchBrandBrief: vi.fn().mockResolvedValue({
    industry: '', value_proposition: '', visual_style_keywords: [], primary_colors: [],
    key_messaging_themes: [], target_persona_hint: '', generated_at: '2026-10-01T00:00:00Z',
  }),
  generateCopy: vi.fn().mockResolvedValue({ headline: 'Headline da IA', bodyText: 'Corpo da IA' }),
  generateBaseImage: vi.fn().mockResolvedValue({ url: 'https://x/gerada.png', filename: 'gerada.png' }),
  composeLogoOverlay: vi.fn().mockResolvedValue({ url: 'https://x/composta.png', filename: 'composta.png' }),
}));

const PAGE = {
  id: 'lp-1', name: 'Workshop ABM', slug: 'workshop-abm', status: 'published',
  links: { campaignIds: [], accountIds: [] },
} as unknown as LandingPage;

vi.mock('@/app/landingPages/store/repo', () => ({
  listPages: () => [PAGE],
  savePage: vi.fn(),
}));

const targeting = {
  companies: {
    included: [{ id: 'c1', label: 'Nubank' }, { id: 'c2', label: 'Stone' }],
    excluded: [],
  },
  defaultTargeting: {
    locations: { included: [], excluded: [] },
    seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] },
    jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

let latest: CreativeData;

function Host({ initial, onEditBrand }: { initial?: Partial<CreativeData>; onEditBrand?: () => void }) {
  const [data, setData] = useState<CreativeData>(() => {
    const base = createDefaultCreativeData();
    return {
      ...base,
      brandKit: { ...base.brandKit, voice: 'Direto e técnico' },
      // Com imagem-base pronta o botão "Gerar para todas" fica habilitado.
      templateLogo: { ...base.templateLogo, baseImageUrl: 'https://x/base.png', baseImageSource: 'upload' },
      ...initial,
    };
  });
  latest = data;
  return (
    <CreativeStep
      selectedAccounts={[]}
      targetingData={targeting as never}
      creativeData={data}
      onCreativeChange={(d) => { latest = d; setData(d); }}
      onEditBrand={onEditBrand}
    />
  );
}

const renderStep = (initial?: Partial<CreativeData>, onEditBrand?: () => void) =>
  render(<MemoryRouter><Host initial={initial} onEditBrand={onEditBrand} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('CreativeStep — "Gerar para todas" não descarta texto do usuário', () => {
  beforeEach(() => vi.mocked(generateCopy).mockClear());

  const editedC1 = {
    overrides: { c1: { status: 'fully_personalized' as const, headline: 'Meu título', bodyText: 'Meu texto' } },
  };

  it('com texto editado, pergunta inline antes de gerar', () => {
    renderStep(editedC1);
    goTo(/Template global/);
    goTo(/Gerar para todas \(2\)/);

    expect(screen.getByText(/Nubank tem textos editados por você/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Substituir também os textos editados' })).toBeInTheDocument();
    expect(generateCopy).not.toHaveBeenCalled();
  });

  it('"Manter os editados" preserva o texto e gera só para quem não editou', async () => {
    renderStep(editedC1);
    goTo(/Template global/);
    goTo(/Gerar para todas \(2\)/);
    goTo(/^Manter os editados$/);

    await vi.waitFor(() => expect(latest.overrides.c2?.headline).toBe('Headline da IA'));
    expect(generateCopy).toHaveBeenCalledTimes(1);
    expect(latest.overrides.c1.headline).toBe('Meu título');
    expect(latest.overrides.c1.bodyText).toBe('Meu texto');
  });

  it('"Substituir também os textos editados" regera todas', async () => {
    renderStep(editedC1);
    goTo(/Template global/);
    goTo(/Gerar para todas \(2\)/);
    goTo(/Substituir também os textos editados/);

    await vi.waitFor(() => expect(latest.overrides.c1?.headline).toBe('Headline da IA'));
    expect(generateCopy).toHaveBeenCalledTimes(2);
  });

  it('sem textos editados, gera direto — e texto igual ao do template não conta como edição', async () => {
    renderStep({
      overrides: {
        c1: { status: 'fully_personalized', headline: createDefaultCreativeData().headline },
      },
    });
    goTo(/Template global/);
    goTo(/Gerar para todas \(2\)/);

    expect(screen.queryByText(/textos editados por você/)).not.toBeInTheDocument();
    await vi.waitFor(() => expect(generateCopy).toHaveBeenCalledTimes(2));
  });
});

describe('CreativeStep — URL da landing page escolhida', () => {
  it('buildLandingPageUrl monta URL absoluta a partir do origin', () => {
    expect(buildLandingPageUrl('workshop-abm')).toBe(`${window.location.origin}/p/workshop-abm`);
  });

  it('escolher uma LP grava URL absoluta, não o caminho relativo', () => {
    renderStep({ landingPageUrl: '' });
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /^Destino$/ }));
    goTo(/Escolher landing page/);
    goTo(/Workshop ABM/);

    expect(latest.landingPageUrl).toBe(`${window.location.origin}/p/workshop-abm`);
    expect(() => new URL(latest.landingPageUrl)).not.toThrow();
  });

  it('displayDomain mostra o host sem www em caixa alta, e nada se inválido', () => {
    expect(displayDomain('https://www.acme.com.br/p/x')).toBe('ACME.COM.BR');
    expect(displayDomain('/p/relativo')).toBe('');
    expect(displayDomain('https://{{account.domain}}/x')).toBe('');
  });
});

// Achado do QA do produto: "Gerar texto + imagem" devolveu ad_text/headline
// vazios (HTTP 201) e a tela gravou as strings vazias por cima do que o
// usuário tinha escrito, sem aviso.
describe('CreativeStep — a IA nunca destrói o texto do usuário', () => {
  beforeEach(() => {
    vi.mocked(generateCopy).mockClear();
    vi.mocked(composeLogoOverlay).mockClear();
  });

  const editedC1 = {
    overrides: { c1: { status: 'fully_personalized' as const, headline: 'Meu título', bodyText: 'Meu texto' } },
  };

  it('resposta vazia não é gravada: o texto fica e o aviso oferece "Tentar de novo"', async () => {
    vi.mocked(generateCopy).mockResolvedValueOnce({ headline: '', bodyText: '' });
    renderStep({ overrides: { c2: { status: 'fully_personalized', headline: 'Título da Stone' } } as never });
    goTo(/Stone/);
    // Texto igual ao último da IA não conta como edição; aqui o título é do
    // usuário, então primeiro vem a pergunta.
    goTo(/^Gerar texto$/);
    goTo(/^Substituir pelos textos da IA$/);

    await vi.waitFor(() => expect(screen.getByText(/A IA não devolveu um texto válido para Stone/)).toBeTruthy());
    expect(screen.getByText(/o título veio vazio e o texto veio vazio/)).toBeTruthy();
    expect(latest.overrides.c2.headline).toBe('Título da Stone');

    vi.mocked(generateCopy).mockResolvedValueOnce({ headline: 'Novo título', bodyText: 'Novo texto' });
    const copyAlert = screen.getByText(/A IA não devolveu um texto válido para Stone/).closest('[role="alert"]') as HTMLElement;
    fireEvent.click(within(copyAlert).getByRole('button', { name: 'Tentar de novo' }));
    goTo(/^Substituir pelos textos da IA$/);
    await vi.waitFor(() => expect(latest.overrides.c2.headline).toBe('Novo título'));
  });

  it('frase de falha da IA, variável sem resolver e parceria também não são gravadas', async () => {
    const bad = [
      { headline: 'Não encontrado - input manual', bodyText: 'Não encontrado - input manual' },
      { headline: 'Oi {{company.name}}', bodyText: 'Texto' },
      { headline: 'Maestro ABM + Stone: uma parceria', bodyText: 'Juntos vamos longe.' },
    ];
    renderStep();
    goTo(/Stone/);
    for (const response of bad) {
      vi.mocked(generateCopy).mockResolvedValueOnce(response);
      goTo(/^Gerar texto$/);
      await vi.waitFor(() => expect(screen.getByText(/A IA não devolveu um texto válido para Stone/)).toBeTruthy());
      expect(latest.overrides.c2?.headline).toBeUndefined();
    }
  });

  it('o 422 do servidor aparece com a mensagem dele', async () => {
    vi.mocked(generateCopy).mockRejectedValueOnce(
      new AiRequestError('A IA não conseguiu um texto válido para Stone: o texto sugere parceria. Seu texto atual foi mantido.', 422),
    );
    renderStep();
    goTo(/Stone/);
    goTo(/^Gerar texto$/);
    await vi.waitFor(() => expect(screen.getByText(/o texto sugere parceria\. Seu texto atual foi mantido/)).toBeTruthy());
  });

  it('"Gerar texto" numa empresa com texto editado pergunta antes, como o "Gerar para todas"', () => {
    renderStep(editedC1);
    goTo(/Nubank/);
    goTo(/^Gerar texto$/);

    expect(screen.getByText(/Nubank tem textos editados por você\. Substituir pelos textos da IA\?/)).toBeTruthy();
    expect(generateCopy).not.toHaveBeenCalled();
    goTo(/^Manter os editados$/);
    expect(generateCopy).not.toHaveBeenCalled();
    expect(latest.overrides.c1.headline).toBe('Meu título');
  });

  it('"Gerar texto + imagem" com "Manter os editados" gera só a imagem', async () => {
    renderStep(editedC1);
    goTo(/Nubank/);
    goTo(/Gerar texto \+ imagem/);
    goTo(/^Manter os editados$/);

    await vi.waitFor(() => expect(composeLogoOverlay).toHaveBeenCalledTimes(1));
    expect(generateCopy).not.toHaveBeenCalled();
    expect(latest.overrides.c1.bodyText).toBe('Meu texto');
  });

  it('o template com texto escrito pelo usuário também pergunta antes', () => {
    renderStep({ headline: 'Meu título do template' });
    goTo(/Template global/);
    goTo(/^Gerar texto$/);
    expect(screen.getByText(/O template tem textos escritos por você/)).toBeTruthy();
    expect(generateCopy).not.toHaveBeenCalled();
  });
});

describe('CreativeStep — o que falta para gerar vem numa mensagem só', () => {
  it('sem tom de voz e sem imagem-base, lista os dois e cada atalho leva ao lugar', () => {
    const onEditBrand = vi.fn();
    renderStep({
      brandKit: { ...createDefaultCreativeData().brandKit, voice: '' },
      templateLogo: { ...createDefaultCreativeData().templateLogo, baseImageUrl: null },
    }, onEditBrand);
    goTo(/Template global/);
    goTo(/Gerar para todas \(2\)/);

    expect(screen.getByText('Para gerar, defina o tom de voz na etapa Marca e envie uma imagem-base no card Imagem.')).toBeTruthy();
    expect(generateCopy).not.toHaveBeenCalled();
    goTo(/^Ir para Marca$/);
    expect(onEditBrand).toHaveBeenCalledTimes(1);
  });
});

describe('CreativeStep — obrigatório só acusa depois da interação', () => {
  it('título vazio não mostra erro antes do blur, e mostra depois', () => {
    renderStep({ headline: '' });
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /^Texto$/ }));
    expect(screen.queryByText('Escreva o título do anúncio.')).toBeNull();

    fireEvent.blur(screen.getByPlaceholderText(/Acelere seu ABM/));
    expect(screen.getByText('Escreva o título do anúncio.')).toBeTruthy();
  });
});

describe('CreativeStep — initialTarget abre a empresa pedida', () => {
  it('seleciona a empresa na montagem e quando o valor muda', () => {
    const view = (target?: string) => (
      <MemoryRouter>
        <CreativeStep
          selectedAccounts={[]}
          targetingData={targeting as never}
          creativeData={createDefaultCreativeData()}
          onCreativeChange={() => {}}
          initialTarget={target}
        />
      </MemoryRouter>
    );
    const { rerender } = render(view('c2'));
    expect(screen.getByText(/Editando: Stone/)).toBeTruthy();
    rerender(view('c1'));
    expect(screen.getByText(/Editando: Nubank/)).toBeTruthy();
  });

  it('sem initialTarget abre o Template global', () => {
    render(<MemoryRouter><Host /></MemoryRouter>);
    expect(screen.getByText(/Editando: Template global/)).toBeTruthy();
  });
});
