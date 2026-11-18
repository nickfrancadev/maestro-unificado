import { describe, it, expect } from 'vitest';
import {
  EMPLOYERS_FACET,
  MIN_BUDGET_PER_COMPANY,
  buildCampaignPatch,
  buildGroupPatch,
  employerProblem,
  employersOf,
  endOfDayTs,
  liveCampaignProblem,
  todayIso,
  tsToIsoDate,
  validateUpdateRequest,
} from './campaignEditGuards';
import type { UpdateRequest } from './campaignEditGuards';
import { MIN_BUDGET_PER_AD_SET } from '../../../src/app/campaigns/wizard/types';

const ACME = 'urn:li:organization:111';
const OTHER = 'urn:li:organization:222';
const GROUP = 'urn:li:sponsoredCampaignGroup:900';

const withEmployer = (urns: string[]) => ({
  include: { and: [{ or: { [EMPLOYERS_FACET]: urns } }, { or: { 'urn:li:adTargetingFacet:locations': ['urn:li:geo:106057199'] } }] },
});
const noEmployer = { include: { and: [{ or: { 'urn:li:adTargetingFacet:locations': ['urn:li:geo:106057199'] } }] } };

const TODAY = '2026-11-18';
function req(over: Partial<UpdateRequest> = {}): UpdateRequest {
  return {
    group_id: '900',
    currency: 'BRL',
    start_date: '2026-11-01',
    campaigns: [{ campaign_id: '1', company_name: 'Acme', employer_urn: ACME, budget_amount: 50, budget_type: 'daily' }],
    ...over,
  };
}

describe('employerProblem: o público nunca perde a empresa', () => {
  it('aceita o público com a empresa da campanha', () => {
    expect(employerProblem(withEmployer([ACME]), ACME, 'Acme')).toBeNull();
  });
  it('recusa o público sem filtro de empresa (o bug que abria para o Brasil inteiro)', () => {
    expect(employerProblem(noEmployer, ACME, 'Acme')).toMatch(/perdeu o filtro de empresa/);
  });
  it('recusa trocar a empresa ou juntar outra', () => {
    expect(employerProblem(withEmployer([OTHER]), ACME, 'Acme')).toMatch(/não inclui mais Acme/);
    expect(employerProblem(withEmployer([ACME, OTHER]), ACME, 'Acme')).toMatch(/outras empresas/);
  });
  it('recusa público vazio e excluir a própria empresa', () => {
    expect(employerProblem(null, ACME, 'Acme')).toMatch(/vazio/);
    const both = { ...withEmployer([ACME]), exclude: { or: { [EMPLOYERS_FACET]: [ACME] } } };
    expect(employerProblem(both, ACME, 'Acme')).toMatch(/exclui a própria empresa/);
  });
  it('employersOf lê só o include', () => {
    expect(employersOf(withEmployer([ACME]))).toEqual([ACME]);
    expect(employersOf(noEmployer)).toEqual([]);
  });
});

describe('validateUpdateRequest: o que o servidor recusa com 422', () => {
  it('pedido válido passa', () => {
    expect(validateUpdateRequest(req(), TODAY)).toEqual({ general: [], campaigns: [] });
  });
  it('orçamento abaixo do mínimo, nomeando a empresa', () => {
    const r = validateUpdateRequest(req({ campaigns: [{ campaign_id: '1', company_name: 'Acme', employer_urn: ACME, budget_amount: 5 }] }), TODAY);
    expect(r.campaigns[0].problems[0]).toMatch(/Acme está abaixo do mínimo de 10/);
  });
  it('mínimo do servidor = mínimo do assistente', () => {
    expect(MIN_BUDGET_PER_COMPANY).toBe(MIN_BUDGET_PER_AD_SET);
  });
  it('término antes de hoje ou antes do início', () => {
    const past = validateUpdateRequest(req({ campaigns: [{ campaign_id: '1', employer_urn: ACME, end_date: '2026-11-17' }] }), TODAY);
    expect(past.campaigns[0].problems).toContain('O término não pode ser antes de hoje.');
    const beforeStart = validateUpdateRequest(req({ start_date: '2026-12-10', campaigns: [{ campaign_id: '1', employer_urn: ACME, end_date: '2026-12-01' }] }), TODAY);
    expect(beforeStart.campaigns[0].problems).toContain('O término não pode ser antes do início.');
    const today = validateUpdateRequest(req({ campaigns: [{ campaign_id: '1', employer_urn: ACME, end_date: TODAY }] }), TODAY);
    expect(today.campaigns).toEqual([]);
  });
  it('tirar o término (null) é permitido', () => {
    expect(validateUpdateRequest(req({ campaigns: [{ campaign_id: '1', employer_urn: ACME, end_date: null }] }), TODAY).campaigns).toEqual([]);
  });
  it('público sem a empresa recusa o pedido inteiro', () => {
    const r = validateUpdateRequest(req({ campaigns: [{ campaign_id: '1', company_name: 'Acme', employer_urn: ACME, targeting_criteria: noEmployer }] }), TODAY);
    expect(r.campaigns[0].problems[0]).toMatch(/perdeu o filtro de empresa/);
  });
  it('nome de grupo vazio', () => {
    expect(validateUpdateRequest(req({ group: { name: '  ' } }), TODAY).general).toContain('Dê um nome ao grupo.');
  });
});

describe('liveCampaignProblem: confere contra a campanha real no LinkedIn', () => {
  const live = { campaignGroup: GROUP, targetingCriteria: withEmployer([ACME]) };
  it('aceita quando a campanha é do grupo e mantém a empresa', () => {
    expect(liveCampaignProblem(live, { campaign_id: '1', employer_urn: ACME, targeting_criteria: withEmployer([ACME]) }, GROUP)).toBeNull();
  });
  it('não confia na empresa mandada pelo front', () => {
    const p = liveCampaignProblem(live, { campaign_id: '1', company_name: 'Acme', employer_urn: OTHER, targeting_criteria: withEmployer([OTHER]) }, GROUP);
    expect(p).toMatch(/empresa de Acme no LinkedIn é outra/);
  });
  it('recusa campanha de outro grupo e campanha que não carregou', () => {
    expect(liveCampaignProblem({ ...live, campaignGroup: 'urn:li:sponsoredCampaignGroup:1' }, { campaign_id: '1', employer_urn: ACME }, GROUP)).toMatch(/não é deste grupo/);
    expect(liveCampaignProblem(null, { campaign_id: '1', employer_urn: ACME }, GROUP)).toMatch(/Não foi possível ler/);
  });
  it('recusa público novo sem a empresa mesmo se o front disser a certa', () => {
    expect(liveCampaignProblem(live, { campaign_id: '1', employer_urn: ACME, targeting_criteria: noEmployer }, GROUP)).toMatch(/perdeu o filtro/);
  });
});

describe('PARTIAL_UPDATE do LinkedIn', () => {
  it('campanha: só o que mudou, orçamento com 2 casas e término aninhado em runSchedule', () => {
    const p = buildCampaignPatch({ campaign_id: '1', employer_urn: ACME, name: 'G — Acme', budget_amount: 50, budget_type: 'daily', end_date: '2026-12-31', targeting_criteria: withEmployer([ACME]) }, 'BRL');
    expect(p).toEqual({
      patch: {
        $set: { name: 'G — Acme', dailyBudget: { amount: '50.00', currencyCode: 'BRL' }, targetingCriteria: withEmployer([ACME]) },
        runSchedule: { $set: { end: Date.UTC(2026, 11, 31, 23, 59, 59) } },
      },
    });
  });
  it('tirar o término usa $delete e não reenvia o início', () => {
    expect(buildCampaignPatch({ campaign_id: '1', employer_urn: ACME, end_date: null }, 'BRL')).toEqual({ patch: { runSchedule: { $delete: ['end'] } } });
  });
  it('orçamento total vai em totalBudget; nada mudou = null', () => {
    expect(buildCampaignPatch({ campaign_id: '1', employer_urn: ACME, budget_amount: 100, budget_type: 'total' }, 'USD')!.patch.$set)
      .toEqual({ totalBudget: { amount: '100.00', currencyCode: 'USD' } });
    expect(buildCampaignPatch({ campaign_id: '1', employer_urn: ACME }, 'BRL')).toBeNull();
  });
  it('grupo: nome, teto e término', () => {
    expect(buildGroupPatch({ name: 'Novo', budget_amount: 150, budget_type: 'daily', end_date: null }, 'BRL')).toEqual({
      patch: { $set: { name: 'Novo', dailyBudget: { amount: '150.00', currencyCode: 'BRL' } }, runSchedule: { $delete: ['end'] } },
    });
    expect(buildGroupPatch(undefined, 'BRL')).toBeNull();
  });
});

describe('datas', () => {
  it('término é o fim do dia e volta para a mesma data', () => {
    expect(tsToIsoDate(endOfDayTs('2026-12-31'))).toBe('2026-12-31');
    expect(tsToIsoDate(null)).toBe('');
  });
  it('hoje no fuso de São Paulo', () => {
    // 02:00 UTC do dia 19 ainda é dia 18 em São Paulo.
    expect(todayIso(new Date('2026-11-19T02:00:00Z'))).toBe('2026-11-18');
  });
});
