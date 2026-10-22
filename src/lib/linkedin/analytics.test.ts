import { describe, it, expect } from 'vitest';
import { sumTotals, aggregateAccounts } from './analytics';
import type { AccountAnalytics, AccountAnalyticsTotals } from './analytics';

function totals(over: Partial<AccountAnalyticsTotals>): AccountAnalyticsTotals {
  return {
    impressions: 0, clicks: 0, landingPageClicks: 0, likes: 0, shares: 0, comments: 0, follows: 0,
    costInLocalCurrency: 0, externalWebsiteConversions: 0, externalWebsitePostClickConversions: 0,
    externalWebsitePostViewConversions: 0, oneClickLeads: 0, oneClickLeadFormOpens: 0,
    viralImpressions: 0, viralClicks: 0, viralLikes: 0, viralShares: 0, approximateMemberReach: null,
    cardClicks: 0, cardImpressions: 0,
    ...over,
  };
}

function account(id: string, over: Partial<AccountAnalyticsTotals>): AccountAnalytics {
  return {
    accountId: id,
    accountName: `Empresa ${id}`,
    industry: null,
    linkedinCampaignId: `urn:li:sponsoredCampaign:${id}`,
    totals: totals(over),
    timeSeries: [],
    creative: { variant: 'generic', headline: '', body: '', imageUrl: '', cta: 'LEARN_MORE', postUrn: '' },
  };
}

describe('sumTotals', () => {
  it('soma contagens e custo entre ad sets', () => {
    const t = sumTotals([
      account('a', { impressions: 1000, clicks: 10, costInLocalCurrency: 12.346 }),
      account('b', { impressions: 500, clicks: 5, costInLocalCurrency: 7.5 }),
    ]);
    expect(t.impressions).toBe(1500);
    expect(t.clicks).toBe(15);
    expect(t.costInLocalCurrency).toBe(19.85);
  });

  // Alcance é de membros únicos: somar entre ad sets contaria a mesma pessoa
  // mais de uma vez. Com vários ad sets o agregado fica sem valor ("—").
  it('não soma o alcance quando agrega mais de um ad set', () => {
    const t = sumTotals([
      account('a', { approximateMemberReach: 800 }),
      account('b', { approximateMemberReach: 600 }),
    ]);
    expect(t.approximateMemberReach).toBeNull();
  });

  it('mantém o alcance de um único ad set', () => {
    expect(sumTotals([account('a', { approximateMemberReach: 800 })]).approximateMemberReach).toBe(800);
  });

  it('alcance fica null quando o LinkedIn não devolve ou não há ad sets', () => {
    expect(sumTotals([account('a', {})]).approximateMemberReach).toBeNull();
    expect(sumTotals([]).approximateMemberReach).toBeNull();
  });

  it('aggregateAccounts propaga o alcance null', () => {
    const agg = aggregateAccounts([
      account('a', { approximateMemberReach: 800 }),
      account('b', { approximateMemberReach: 600 }),
    ], 'BRL');
    expect(agg.approximateMemberReach).toBeNull();
  });
});
