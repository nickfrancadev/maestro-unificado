import { describe, it, expect } from 'vitest';
import { buildLaunchPlan, validateLaunchPlan } from './launchPlan';
import { createEmptyTargeting } from './SegmentationStep';
import { createDefaultCampaignConfig, createDefaultCreativeData } from './types';
import type { TargetingData } from './SegmentationStep';

const nubank = { id: 'c1', label: 'Nubank', urn: 'urn:li:organization:1' };
const itau = { id: 'c2', label: 'Itaú', urn: 'urn:li:organization:2' };

function targeting(companies: { id: string; label: string; urn?: string }[]): TargetingData {
  const t = createEmptyTargeting();
  return {
    ...t,
    companies: { ...t.companies, included: companies },
    defaultTargeting: {
      ...t.defaultTargeting,
      locations: { included: [{ id: 'urn:li:geo:106057199', label: 'Brasil' }], excluded: [] },
    },
  } as TargetingData;
}

function creative() {
  return {
    ...createDefaultCreativeData(),
    headline: 'ABM para {{company.name}}',
    bodyText: 'Time da {{company.name}}, venha para a certificação.',
    landingPageUrl: 'https://maestroabm.com/p/{{account.slug}}',
    imageUrl: 'https://cdn/template.png',
  };
}

describe('buildLaunchPlan', () => {
  it('cria um conjunto por empresa, cada um com a sua segmentação de empresa', () => {
    const plan = buildLaunchPlan(
      { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM' },
      targeting([nubank, itau]),
      creative(),
    );
    expect(plan.map((a) => a.name)).toEqual(['Q4 ABM — Nubank', 'Q4 ABM — Itaú']);
    const employers = plan.map((a) => JSON.stringify(a.criteria));
    expect(employers[0]).toContain('urn:li:organization:1');
    expect(employers[0]).not.toContain('urn:li:organization:2');
    expect(employers[1]).toContain('urn:li:organization:2');
  });

  it('dá a cada conjunto o seu criativo, com as variáveis da empresa trocadas', () => {
    const plan = buildLaunchPlan(
      { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM' },
      targeting([nubank, itau]),
      creative(),
    );
    expect(plan[0].creative.headline).toBe('ABM para Nubank');
    expect(plan[1].creative.headline).toBe('ABM para Itaú');
    expect(plan[1].creative.bodyText).toContain('Time da Itaú');
    expect(plan[0].creative.landingPageUrl).toBe('https://maestroabm.com/p/nubank');
    expect(plan[1].creative.landingPageUrl).toBe('https://maestroabm.com/p/itau');
    expect(plan.every((a) => a.creative.imageUrl === 'https://cdn/template.png')).toBe(true);
  });

  it('usa o criativo personalizado da empresa quando existe', () => {
    const data = creative();
    data.overrides = {
      c2: { status: 'fully_personalized', headline: 'Itaú, bora?', bodyText: 'Copy do Itaú', imageUrl: 'https://cdn/itau.png' },
    };
    const plan = buildLaunchPlan(
      { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM' },
      targeting([nubank, itau]),
      data,
    );
    expect(plan[0].creative.imageUrl).toBe('https://cdn/template.png');
    expect(plan[1].creative).toMatchObject({ headline: 'Itaú, bora?', bodyText: 'Copy do Itaú', imageUrl: 'https://cdn/itau.png' });
  });

  it('respeita {{company.name}} no nome da campanha', () => {
    const plan = buildLaunchPlan(
      { ...createDefaultCampaignConfig(), campaignName: 'Convite {{company.name}}' },
      targeting([nubank]),
      creative(),
    );
    expect(plan[0].name).toBe('Convite Nubank');
  });
});

describe('buildLaunchPlan — ids', () => {
  it('prefixa o id do conjunto com o id do lançamento, para não reaproveitar campanha antiga da mesma empresa', () => {
    const plan = buildLaunchPlan(
      { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM' },
      targeting([nubank]),
      creative(),
      { runId: 'run42' },
    );
    expect(plan[0].id).toBe('run42-c1');
  });
});

describe('validateLaunchPlan', () => {
  const config = { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM', budgetAmount: '50' };

  it('aceita um plano completo', () => {
    const plan = buildLaunchPlan(config, targeting([nubank]), creative());
    expect(validateLaunchPlan(plan)).toEqual({});
  });

  it('aponta, por conjunto, imagem, título e texto faltando', () => {
    const data = { ...creative(), imageUrl: null, headline: '', bodyText: '' };
    const issues = validateLaunchPlan(buildLaunchPlan(config, targeting([nubank]), data));
    expect(issues.c1).toEqual(expect.arrayContaining([
      'Sem imagem', 'Sem título', 'Sem texto do anúncio',
    ]));
  });

  it('barra texto de erro da IA e variável não trocada', () => {
    const data = creative();
    data.overrides = { c1: { status: 'fully_personalized', headline: 'Não encontrado - input manual necessário', bodyText: 'Olá {{contact.first_name}}' } };
    const issues = validateLaunchPlan(buildLaunchPlan(config, targeting([nubank]), data));
    expect(issues.c1).toEqual(expect.arrayContaining([
      'O título é uma mensagem de erro da IA, não um texto de anúncio',
      'O texto tem uma variável que não foi preenchida: {{contact.first_name}}',
    ]));
  });

  it('exige URL http(s) válida', () => {
    const data = { ...creative(), landingPageUrl: '/p/nubank' };
    const issues = validateLaunchPlan(buildLaunchPlan(config, targeting([nubank]), data));
    expect(issues.c1).toContain('A URL de destino precisa começar com https://');
  });
});

describe('buildLaunchPlan — variáveis no criativo personalizado', () => {
  it('troca {{company.name}} também no texto escrito para a empresa', () => {
    const data = creative();
    data.overrides = { c2: { status: 'fully_personalized', headline: 'Oi, {{company.name}}', bodyText: 'Time {{company.name}}' } };
    const plan = buildLaunchPlan(
      { ...createDefaultCampaignConfig(), campaignName: 'Q4' },
      targeting([itau]),
      data,
    );
    expect(plan[0].creative.headline).toBe('Oi, Itaú');
    expect(plan[0].creative.bodyText).toBe('Time Itaú');
  });
});
