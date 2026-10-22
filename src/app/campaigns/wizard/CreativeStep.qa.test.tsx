import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep, buildLandingPageUrl, displayDomain } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';
import { generateCopy } from '@/lib/ai';
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

function Host({ initial }: { initial?: Partial<CreativeData> }) {
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
    />
  );
}

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

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
