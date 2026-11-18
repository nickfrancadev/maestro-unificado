import { describe, it, expect } from 'vitest';
import {
  applySavedResults,
  audienceBlockers,
  buildEditDiff,
  buildUpdateRequest,
  editErrors,
  editSpendStatement,
  ensureEmployer,
  groupFromEditData,
  initialEditState,
  mergeCriteria,
  parseBudget,
  personTargetingFromCriteria,
  stateAfterSave,
  targetingSummary,
} from './publishedEdit';
import type { EditDataResponse, EditState, PublishedGroup } from './publishedEdit';
import { buildMockPublishedGroup } from './mockPublishedGroup';
import { EMPLOYERS_FACET, employersOf } from '../../../../supabase/functions/make-server-a4d5bbe0/campaignEditGuards';
import { createEmptyPersonTargeting } from '../wizard/segmentation/targeting';

const TODAY = '2026-11-18';
const ACME = 'urn:li:organization:111';
const BETA = 'urn:li:organization:222';
const BRASIL = 'urn:li:geo:106057199';

const criteria = (employer: string, extra: any[] = []) => ({
  include: {
    and: [
      { or: { [EMPLOYERS_FACET]: [employer] } },
      { or: { 'urn:li:adTargetingFacet:locations': [BRASIL] } },
      { or: { 'urn:li:adTargetingFacet:seniorities': ['urn:li:seniority:6'] } },
      ...extra,
    ],
  },
});

function editData(): EditDataResponse {
  const camp = (id: string, name: string, employer: string, extra: any[] = []) => ({
    id, name, status: 'ACTIVE',
    dailyBudget: { amount: '30', currencyCode: 'BRL' }, totalBudget: null,
    runSchedule: { start: Date.UTC(2026, 10, 1), end: Date.UTC(2026, 11, 31, 23, 59, 59) },
    objectiveType: 'BRAND_AWARENESS', costType: 'CPM',
    targetingCriteria: criteria(employer, extra),
  });
  return {
    group: {
      id: '900', urn: 'urn:li:sponsoredCampaignGroup:900', name: 'ABM Q4', status: 'ACTIVE',
      runSchedule: { start: Date.UTC(2026, 10, 1) },
      dailyBudget: { amount: '60', currencyCode: 'BRL' }, totalBudget: null,
    },
    campaigns: [
      camp('1', 'ABM Q4 — Acme', ACME, [{ or: { 'urn:li:adTargetingFacet:interfaceLocales': ['urn:li:locale:pt_BR'] } }]),
      camp('2', 'ABM Q4 — Beta', BETA),
    ],
    entityNames: { [BRASIL]: 'Brasil' },
    adAccountName: 'Conta Maestro',
    currency: 'BRL',
  };
}

const group = (): PublishedGroup => groupFromEditData(editData());

describe('groupFromEditData: o LinkedIn vira a tela', () => {
  it('lê empresa, orçamento, datas e público de cada campanha', () => {
    const g = group();
    expect(g.name).toBe('ABM Q4');
    expect(g.groupBudget).toBe(60);
    expect(g.startDate).toBe('2026-11-01');
    expect(g.objective).toBe('BRAND_AWARENESS');
    const [acme] = g.companies;
    expect(acme.company).toBe('Acme');
    expect(acme.employer.urn).toBe(ACME);
    expect(acme.budget).toBe(30);
    expect(acme.endDate).toBe('2026-12-31');
    expect(acme.targeting.locations.included[0].label).toBe('Brasil');
    expect(acme.targeting.seniorities.included[0].label).toBe('Diretor');
  });
  it('localização sem nome mostra o id, não some', () => {
    const pt = personTargetingFromCriteria({ include: { and: [{ or: { 'urn:li:adTargetingFacet:locations': ['urn:li:geo:42'] } }] } });
    expect(pt.locations.included[0]).toMatchObject({ id: '42', label: 'Localização 42', urn: 'urn:li:geo:42' });
  });
});

describe('mergeCriteria / ensureEmployer: a empresa nunca sai', () => {
  it('sempre recoloca a empresa, mesmo com o público de pessoa vazio', () => {
    const c = group().companies[0];
    const next = mergeCriteria(c.criteria, c.employer, createEmptyPersonTargeting());
    expect(employersOf(next)).toEqual([ACME]);
    expect(ensureEmployer(next, c)).toBeNull();
  });
  it('mantém facetas que a tela não edita (idioma da interface)', () => {
    const c = group().companies[0];
    const next = mergeCriteria(c.criteria, c.employer, c.targeting);
    expect(JSON.stringify(next)).toContain('interfaceLocales');
  });
  it('ensureEmployer acusa público sem a empresa', () => {
    const c = group().companies[0];
    expect(ensureEmployer({ include: { and: [] } }, c)).toMatch(/perdeu o filtro de empresa/);
  });
});

describe('editErrors: orçamento e datas', () => {
  it('estado inicial não tem erro (nem com término no passado, se não mudou)', () => {
    const g = group();
    g.companies.forEach((c) => { c.endDate = '2026-04-30'; });
    expect(editErrors(g, initialEditState(g), TODAY)).toEqual({ budgets: {} });
  });
  it('orçamento abaixo do mínimo e vazio', () => {
    const g = group();
    const s = initialEditState(g);
    s.budgets['1'] = '5';
    s.budgets['2'] = '';
    const e = editErrors(g, s, TODAY);
    expect(e.budgets['1']).toBe('O mínimo é 10 por empresa');
    expect(e.budgets['2']).toBe('Informe o orçamento diário de Beta');
  });
  it('término antes de hoje e antes do início', () => {
    const g = group();
    expect(editErrors(g, { ...initialEditState(g), endDate: '2026-11-17' }, TODAY).endDate).toBe('O término não pode ser antes de hoje');
    g.startDate = '2027-01-10';
    expect(editErrors(g, { ...initialEditState(g), endDate: '2027-01-01' }, TODAY).endDate).toBe('O término não pode ser antes do início');
    expect(editErrors(g, { ...initialEditState(g), endDate: '' }, TODAY).endDate).toBeUndefined();
  });
  it('parseBudget aceita vírgula e recusa texto', () => {
    expect(parseBudget('50,5')).toBe(50.5);
    expect(parseBudget('1.234,50')).toBe(1234.5);
    expect(parseBudget('abc')).toBeNaN();
  });
});

describe('audienceBlockers: público < 300 trava só quem vai reenviar o público', () => {
  it('empresa com público alterado e pequeno trava; sem alteração só avisa', () => {
    const g = group();
    const s = initialEditState(g);
    expect(audienceBlockers(g, s, ['1'])).toEqual([]);
    s.targeting['1'] = { ...s.targeting['1'], jobTitles: { included: [{ id: 't', label: 'CFO', urn: 'urn:li:title:1' }], excluded: [] } };
    expect(audienceBlockers(g, s, ['1']).map((c) => c.company)).toEqual(['Acme']);
  });
});

describe('buildEditDiff / buildUpdateRequest', () => {
  it('sem mudança: diff vazio e pedido sem campanhas', () => {
    const g = group();
    const s = initialEditState(g);
    expect(buildEditDiff(g, s).hasChanges).toBe(false);
    expect(buildUpdateRequest(g, s).campaigns).toEqual([]);
  });

  it('orçamento por empresa: de → para, teto do grupo acompanha a soma', () => {
    const g = group();
    const s: EditState = { ...initialEditState(g), budgets: { '1': '50', '2': '30' } };
    const d = buildEditDiff(g, s);
    expect(d.companies).toEqual([{ campaignId: '1', company: 'Acme', changes: [{ label: 'Orçamento diário', from: 'R$ 30,00', to: 'R$ 50,00' }] }]);
    expect(d.group).toEqual([{ label: 'Teto diário do grupo', from: 'R$ 60,00', to: 'R$ 80,00' }]);
    const r = buildUpdateRequest(g, s);
    expect(r.campaigns).toEqual([{ campaign_id: '1', company_name: 'Acme', employer_urn: ACME, budget_amount: 50, budget_type: 'daily' }]);
    expect(r.group).toEqual({ budget_amount: 80, budget_type: 'daily' });
  });

  it('nome do grupo renomeia o grupo e cada campanha', () => {
    const g = group();
    const r = buildUpdateRequest(g, { ...initialEditState(g), groupName: 'ABM Q1' });
    expect(r.group).toEqual({ name: 'ABM Q1' });
    expect(r.campaigns.map((c) => c.name)).toEqual(['ABM Q1 — Acme', 'ABM Q1 — Beta']);
  });

  it('término vale para todas; vazio vira null (sem término)', () => {
    const g = group();
    const r = buildUpdateRequest(g, { ...initialEditState(g), endDate: '' });
    expect(r.campaigns.map((c) => c.end_date)).toEqual([null, null]);
    expect(buildEditDiff(g, { ...initialEditState(g), endDate: '' }).companies[0].changes[0])
      .toEqual({ label: 'Término', from: '31/12/2026', to: 'sem término' });
  });

  it('público: manda o critério com a empresa e lista o que mudou', () => {
    const g = group();
    const s = initialEditState(g);
    s.targeting['2'] = { ...s.targeting['2'], seniorities: { included: [{ id: '5', label: 'Gerente', urn: 'urn:li:seniority:5' }], excluded: [] } };
    const r = buildUpdateRequest(g, s);
    expect(r.campaigns).toHaveLength(1);
    expect(employersOf(r.campaigns[0].targeting_criteria)).toEqual([BETA]);
    expect(buildEditDiff(g, s).companies[0].changes).toEqual([{ label: 'Público · Senioridade', from: '', to: '+ Gerente, − Diretor' }]);
  });

  it('nunca monta pedido com público sem a empresa', () => {
    const g = group();
    g.companies[0].employer = { ...g.companies[0].employer, urn: '' };
    const s = initialEditState(g);
    s.targeting['1'] = createEmptyPersonTargeting();
    expect(() => buildUpdateRequest(g, s)).toThrow(/não inclui mais Acme|perdeu o filtro/);
  });
});

describe('editSpendStatement: a frase do assistente', () => {
  it('mesmo valor: "N empresas × Y"', () => {
    const g = group();
    expect(editSpendStatement(g, initialEditState(g))).toBe('Você vai gastar até R$ 60,00 por dia (2 empresas × R$ 30,00), ≈ R$ 1.800,00 por mês.');
  });
  it('valores diferentes: soma', () => {
    const g = group();
    expect(editSpendStatement(g, { ...initialEditState(g), budgets: { '1': '50', '2': '30' } }))
      .toBe('Você vai gastar até R$ 80,00 por dia (soma de 2 empresas com valores diferentes), ≈ R$ 2.400,00 por mês.');
  });
});

describe('applySavedResults: sucesso parcial', () => {
  it('quem salvou vira a base; quem falhou continua pendente', () => {
    const g = group();
    const s: EditState = { ...initialEditState(g), budgets: { '1': '50', '2': '40' } };
    const req = buildUpdateRequest(g, s);
    const saved = applySavedResults(g, req, {
      success: false, partial: true, group: { success: true },
      results: [{ campaign_id: '1', success: true }, { campaign_id: '2', success: false, error: 'LinkedIn API 400' }],
    });
    expect(saved.companies[0].budget).toBe(50);
    expect(saved.companies[1].budget).toBe(30);
    expect(saved.groupBudget).toBe(90);
    const after = buildEditDiff(saved, stateAfterSave(s, saved));
    expect(after.companies.map((c) => c.company)).toEqual(['Beta']);
  });
});

describe('demonstração', () => {
  it('grupo mock: 5 empresas, cada uma com a própria empresa no público', () => {
    const g = buildMockPublishedGroup();
    expect(g.isMock).toBe(true);
    expect(g.companies).toHaveLength(5);
    for (const c of g.companies) expect(employersOf(c.criteria)).toEqual([c.employer.urn]);
    expect(targetingSummary(g.companies[0].targeting)).toBe('Brasil · Diretor, Vice-presidente, CXO (C-level)');
  });
});
