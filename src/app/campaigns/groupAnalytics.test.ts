import { describe, it, expect } from 'vitest';
import {
  groupRoutePath,
  groupIdFromRoute,
  groupChildren,
  groupCampaignMeta,
  buildGroupBreakdown,
} from './groupAnalytics';
import { aggregateAccounts } from '@/lib/linkedin';
import { buildAccountRows } from './accountAnalytics';
import type { LinkedInCampaign, CampaignAnalyticsFull } from '@/lib/linkedin';

const G = 'urn:li:sponsoredCampaignGroup:555';
const camp = (id: string, name: string, extra: Partial<LinkedInCampaign> = {}): LinkedInCampaign => ({
  id, name, status: 'Active', rawStatus: 'ACTIVE', type: 'SPONSORED_UPDATES', costType: 'CPM',
  totalBudget: null, dailyBudget: { amount: '50', currency: 'BRL' },
  runSchedule: { start: Date.UTC(2026, 9, 1), end: null }, campaignGroup: G, ...extra,
});
const full = (impressions: number, clicks: number, cost: number): CampaignAnalyticsFull => ({
  impressions, clicks, landingPageClicks: 0, likes: 1, shares: 0, comments: 0, follows: 0,
  costInLocalCurrency: cost, externalWebsiteConversions: 0, externalWebsitePostClickConversions: 0,
  externalWebsitePostViewConversions: 0, oneClickLeads: 0, oneClickLeadFormOpens: 0,
  viralImpressions: 0, viralClicks: 0, viralLikes: 0, viralShares: 0, approximateMemberReach: 100,
  cardClicks: 0, cardImpressions: 0, ctr: '0', cpc: '0', cpm: '0', engagementRate: '0', cpl: null,
  postClickConvRate: '0', viralAmplification: '0',
  timeSeries: [{ date: '2026-10-02', impressions, clicks, cost, likes: 1, shares: 0 }],
  delta: {}, currency: 'BRL',
});

const children = [camp('1', 'Q4 ABM — Nubank'), camp('2', 'Q4 ABM — Itaú', { status: 'Paused', runSchedule: { start: Date.UTC(2026, 9, 5), end: null } })];
const all = [...children, camp('3', 'Outra — XP', { campaignGroup: 'urn:li:sponsoredCampaignGroup:999' })];

describe('analytics por empresa numa campanha real (grupo)', () => {
  it('rota do grupo vai e volta', () => {
    expect(groupRoutePath(G)).toBe('/campaigns/group-555');
    expect(groupIdFromRoute('group-555')).toBe('555');
    expect(groupIdFromRoute('12345')).toBeNull();
    expect(groupIdFromRoute('mock-abm-001')).toBeNull();
  });

  it('pega só os conjuntos do grupo', () => {
    expect(groupChildren(all, '555').map((c) => c.id)).toEqual(['1', '2']);
  });

  it('cabeçalho do grupo: nome, status agregado, período e orçamento somado', () => {
    const meta = groupCampaignMeta('555', children);
    expect(meta.name).toBe('Q4 ABM');
    expect(meta.status).toBe('Active');
    expect(meta.runSchedule).toEqual({ start: Date.UTC(2026, 9, 1), end: null });
    expect(meta.dailyBudget).toEqual({ amount: '100', currency: 'BRL' });
  });

  it('tabela por empresa: um conjunto = uma empresa, e o total é a soma dos conjuntos', () => {
    const b = buildGroupBreakdown('555', children, [full(1000, 10, 50), full(3000, 30, 120)], 'USD')!;
    expect(b.failed).toEqual([]);
    expect(b.byAccount.currency).toBe('BRL');
    expect(b.byAccount.accounts.map((a) => a.accountName)).toEqual(['Nubank', 'Itaú']);
    const agg = aggregateAccounts(b.byAccount.accounts, 'BRL');
    expect(agg.impressions).toBe(4000);
    expect(agg.clicks).toBe(40);
    expect(agg.costInLocalCurrency).toBe(170);
    // Alcance não é somável entre empresas.
    expect(agg.approximateMemberReach).toBeNull();
    // Mesmo formato da demonstração: a tabela ordena por investimento.
    expect(buildAccountRows(b.byAccount.accounts).map((r) => r.account.accountName)).toEqual(['Itaú', 'Nubank']);
  });

  it('empresa que não carregou fica fora da soma e é listada; nenhuma carregou = erro', () => {
    const failedOne = { ...full(0, 0, 0), error: 'HTTP 502' };
    const b = buildGroupBreakdown('555', children, [full(1000, 10, 50), failedOne], 'BRL')!;
    expect(b.failed).toEqual(['Itaú']);
    expect(b.byAccount.accounts).toHaveLength(1);
    expect(buildGroupBreakdown('555', children, [null, failedOne], 'BRL')).toBeNull();
  });
});
