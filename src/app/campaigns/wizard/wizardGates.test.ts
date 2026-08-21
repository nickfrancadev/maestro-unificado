import { describe, it, expect } from 'vitest';
import { canProceedFromStep, WIZARD_STEPS, type WizardState } from './wizardGates';
import { createEmptyTargeting } from './SegmentationStep';
import { createDefaultCampaignConfig, createDefaultCreativeData } from './types';
import { createDefaultBrandKit } from './brandKit';

function state(patch: Partial<WizardState> = {}): WizardState {
  return {
    campaignConfig: createDefaultCampaignConfig(),
    targetingData: createEmptyTargeting(),
    creativeData: createDefaultCreativeData(),
    ...patch,
  };
}

const nubank = { id: 'c1', label: 'Nubank' };

function targetingWith(companies: { id: string; label: string }[], locations: string[]) {
  const t = createEmptyTargeting();
  return {
    ...t,
    companies: { ...t.companies, included: companies },
    defaultTargeting: {
      ...t.defaultTargeting,
      locations: {
        included: locations.map((l) => ({ id: l, label: l })),
        excluded: [],
      },
    },
  } as WizardState['targetingData'];
}

describe('canProceedFromStep — 1 Configuração', () => {
  it('exige um nome de campanha', () => {
    expect(canProceedFromStep(WIZARD_STEPS.config, state())).toBe(false);
    expect(canProceedFromStep(WIZARD_STEPS.config, state({
      campaignConfig: { ...createDefaultCampaignConfig(), campaignName: 'Q3 ABM' },
    }))).toBe(true);
  });
});

describe('canProceedFromStep — 2 Segmentação', () => {
  it('exige empresa-alvo e localização', () => {
    expect(canProceedFromStep(WIZARD_STEPS.segmentation, state())).toBe(false);
    expect(canProceedFromStep(WIZARD_STEPS.segmentation, state({
      targetingData: targetingWith([nubank], []),
    }))).toBe(false);
    expect(canProceedFromStep(WIZARD_STEPS.segmentation, state({
      targetingData: targetingWith([nubank], ['Brasil']),
    }))).toBe(true);
  });
});

describe('canProceedFromStep — 3 Marca', () => {
  it('bloqueia enquanto não há tom de voz na marca', () => {
    expect(canProceedFromStep(WIZARD_STEPS.brand, state())).toBe(false);
  });

  it('espaço em branco não conta como tom de voz', () => {
    expect(canProceedFromStep(WIZARD_STEPS.brand, state({
      creativeData: {
        ...createDefaultCreativeData(),
        brandKit: { ...createDefaultBrandKit(), voice: '   ' },
      },
    }))).toBe(false);
  });

  it('libera quando a marca salva tem tom de voz', () => {
    expect(canProceedFromStep(WIZARD_STEPS.brand, state({
      creativeData: {
        ...createDefaultCreativeData(),
        brandKit: { ...createDefaultBrandKit(), status: 'defined', voice: 'Direto e confiante' },
      },
    }))).toBe(true);
  });
});

describe('canProceedFromStep — 4 Criativos', () => {
  const withTemplate = (patch = {}) => ({
    ...createDefaultCreativeData(),
    landingPageUrl: 'https://acme.com/lp',
    cta: 'LEARN_MORE',
    headline: 'Título',
    bodyText: 'Corpo',
    imageUrl: 'https://cdn/img.png',
    ...patch,
  });

  it('exige URL e CTA no template', () => {
    expect(canProceedFromStep(WIZARD_STEPS.creatives, state({
      creativeData: withTemplate({ landingPageUrl: '' }),
      targetingData: targetingWith([nubank], ['Brasil']),
    }))).toBe(false);
  });

  it('template completo cobre as empresas que seguem o template', () => {
    expect(canProceedFromStep(WIZARD_STEPS.creatives, state({
      creativeData: withTemplate(),
      targetingData: targetingWith([nubank], ['Brasil']),
    }))).toBe(true);
  });

  it('template incompleto passa se TODA empresa tem override completo', () => {
    const incomplete = withTemplate({ headline: '', bodyText: '', imageUrl: null });
    expect(canProceedFromStep(WIZARD_STEPS.creatives, state({
      creativeData: incomplete,
      targetingData: targetingWith([nubank], ['Brasil']),
    }))).toBe(false);

    expect(canProceedFromStep(WIZARD_STEPS.creatives, state({
      creativeData: {
        ...incomplete,
        overrides: {
          c1: { status: 'fully_personalized', headline: 'H', bodyText: 'B', imageUrl: 'https://cdn/a.png' },
        },
      },
      targetingData: targetingWith([nubank], ['Brasil']),
    }))).toBe(true);
  });
});

describe('canProceedFromStep — 5 Revisão', () => {
  it('é sempre válido', () => {
    expect(canProceedFromStep(WIZARD_STEPS.review, state())).toBe(true);
  });
});
