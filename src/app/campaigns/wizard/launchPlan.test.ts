import { describe, it, expect } from 'vitest';
import { buildLaunchPlan, validateLaunchPlan, buildPipelineParams, buildReviewChecklist, canPublishChecklist } from './launchPlan';
import { createEmptyTargeting } from './SegmentationStep';
import { createDefaultCampaignConfig, createDefaultCreativeData, OBJECTIVE_MAP } from './types';
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

describe('buildPipelineParams: o que a Revisão mostra é o que vai ao servidor', () => {
  const base = { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM', budgetAmount: '10' };
  const plan = () => buildLaunchPlan(base, targeting([nubank, itau]), creative(), { runId: 'r1' });
  const ctx = { adAccountId: '123', currency: 'USD' };

  it('"Ao publicar: Pausada/Ativa" sai de auto_activate', () => {
    const p = plan();
    expect(buildPipelineParams(p[0], p, { ...base, autoActivate: false }, ctx).auto_activate).toBe(false);
    expect(buildPipelineParams(p[0], p, { ...base, autoActivate: true }, ctx).auto_activate).toBe(true);
  });

  it('orçamento do grupo é a soma dos conjuntos', () => {
    const p = plan();
    const params = buildPipelineParams(p[1], p, base, ctx);
    expect(params.budget_amount).toBe(10);
    expect(params.group_budget_amount).toBe(20);
    expect(params.campaign_id).toBe('r1-c2');
  });

  it('visitas ao site vai como CPM: o LinkedIn recusa CPC com a otimização por cliques', () => {
    const p = plan();
    // Mesmo um rascunho antigo, salvo com costType CPC, manda CPM.
    const params = buildPipelineParams(p[0], p, { ...base, objective: 'website_visits', costType: 'CPC' }, ctx);
    expect(params.cost_type).toBe('CPM');
    expect(OBJECTIVE_MAP.website_visits.costType).toBe('CPM');
    expect(OBJECTIVE_MAP.website_visits.costLabel).toMatch(/CPM/);
  });

  it('lance manual que o objetivo não aceita vira automático, sem valor', () => {
    const p = plan();
    const params = buildPipelineParams(p[0], p, { ...base, objective: 'website_visits', biddingStrategy: 'manual_cpc', unitCostAmount: '5' }, ctx);
    expect(params.bidding_strategy).toBe('automated');
    expect(params.unit_cost).toBeUndefined();
    expect(params.cost_type).toBe('CPM');
  });

  it('lance manual por mil impressões vai com o valor e a moeda da conta', () => {
    const p = plan();
    const params = buildPipelineParams(p[0], p, { ...base, biddingStrategy: 'manual_cpm', unitCostAmount: '8' }, ctx);
    expect(params.unit_cost).toEqual({ amount: '8', currency_code: 'USD' });
    expect(params.cost_type).toBe('CPM');
  });
});

describe('buildReviewChecklist', () => {
  const config = { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM', budgetAmount: '50' };
  const ready = { audience: { pending: false, small: [] as string[] }, linkedInReady: true, hasBilling: true };

  it('tudo certo: só itens ok e pode publicar', () => {
    const plan = buildLaunchPlan(config, targeting([nubank, itau]), creative());
    const items = buildReviewChecklist({ config, plan, creativeIssues: validateLaunchPlan(plan), ...ready });
    expect(items.every((i) => i.status === 'ok')).toBe(true);
    expect(canPublishChecklist(items)).toBe(true);
  });

  it('empresa sem imagem trava, com link para Criativos daquela empresa', () => {
    const data = creative();
    data.imageUrl = null;
    data.overrides = { c1: { status: 'fully_personalized', imageUrl: 'https://cdn/nubank.png' } };
    const plan = buildLaunchPlan(config, targeting([nubank, itau]), data);
    const items = buildReviewChecklist({ config, plan, creativeIssues: validateLaunchPlan(plan), ...ready });
    const itauItem = items.find((i) => i.id === 'creative-c2');
    expect(itauItem).toMatchObject({ status: 'blocked', fix: { step: 4, label: 'Ir para Criativos · Itaú', companyId: 'c2' } });
    expect(itauItem?.label).toMatch(/^Itaú: Sem imagem/);
    expect(items.find((i) => i.id === 'creative-c1')).toBeUndefined();
    expect(canPublishChecklist(items)).toBe(false);
  });

  it('público abaixo de 300 trava mesmo em empresa que segue o padrão', () => {
    const plan = buildLaunchPlan(config, targeting([nubank, itau]), creative());
    const items = buildReviewChecklist({ config, plan, creativeIssues: {}, ...ready, audience: { pending: false, small: ['c1'] } });
    expect(plan[0].customTargeting).toBe(false);
    expect(items.find((i) => i.id === 'audience-c1')).toMatchObject({
      status: 'blocked', label: 'Nubank: público abaixo de 300 pessoas', fix: { step: 2, label: 'Ir para Segmentação · Nubank' },
    });
    expect(canPublishChecklist(items)).toBe(false);
  });

  it('público ainda calculando também segura o botão', () => {
    const plan = buildLaunchPlan(config, targeting([nubank]), creative());
    const items = buildReviewChecklist({ config, plan, creativeIssues: {}, ...ready, audience: { pending: true, small: [] } });
    expect(items.find((i) => i.id === 'audience')?.status).toBe('attention');
    expect(canPublishChecklist(items)).toBe(false);
  });

  it('variável não preenchida e URL inválida aparecem no item da empresa', () => {
    const data = { ...creative(), landingPageUrl: 'maestro/p', bodyText: 'Oi {{contact.first_name}}' };
    const plan = buildLaunchPlan(config, targeting([nubank]), data);
    const item = buildReviewChecklist({ config, plan, creativeIssues: validateLaunchPlan(plan), ...ready }).find((i) => i.id === 'creative-c1');
    expect(item?.label).toMatch(/variável que não foi preenchida/);
    expect(item?.label).toMatch(/URL de destino/);
  });

  it('sem LinkedIn conectado não publica; sem pagamento só avisa', () => {
    const plan = buildLaunchPlan(config, targeting([nubank]), creative());
    const items = buildReviewChecklist({ config, plan, creativeIssues: {}, ...ready, linkedInReady: false, hasBilling: false });
    expect(items.find((i) => i.id === 'linkedin')?.status).toBe('blocked');
    expect(items.find((i) => i.id === 'billing')).toMatchObject({ status: 'attention', blocking: false });
  });
});
