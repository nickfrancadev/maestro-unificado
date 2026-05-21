// ================================================
// Mock Campaign Data — Simulação Realista
// ================================================

import type { LinkedInCampaign, CampaignAnalyticsSummary, CampaignAnalyticsFull, CampaignCommentsResponse } from './linkedin';

export const MOCK_CAMPAIGN_ID = 'mock-abm-001';

export const MOCK_CAMPAIGN: LinkedInCampaign = {
  id: MOCK_CAMPAIGN_ID,
  name: 'ABM — Enterprise Decision Makers Q1 2026',
  status: 'Active',
  rawStatus: 'ACTIVE',
  type: 'SPONSORED_UPDATES',
  costType: 'CPM',
  totalBudget: null,
  dailyBudget: { amount: '150', currency: 'BRL' },
  runSchedule: {
    start: new Date('2026-02-05T00:00:00Z').getTime(),
    end: new Date('2026-04-30T00:00:00Z').getTime(),
  },
};

export const MOCK_CAMPAIGN_SUMMARY: CampaignAnalyticsSummary = {
  impressions: 47832,
  clicks: 1247,
  ctr: '2.61',
  cost: 4218.50,
  currency: 'BRL',
};

// Generate realistic time series
function generateTimeSeries(days: number): { date: string; impressions: number; clicks: number; cost: number; likes: number; shares: number }[] {
  const series: typeof ret = [];
  const ret: { date: string; impressions: number; clicks: number; cost: number; likes: number; shares: number }[] = [];
  const now = new Date('2026-03-23');

  // Seed-based pseudo-random for deterministic data
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseImpressions = isWeekend ? 400 + rand() * 200 : 900 + rand() * 500;
    const growthFactor = 1 + (days - i) * 0.005;
    const noise = 0.8 + rand() * 0.4;
    const impressions = Math.round(baseImpressions * growthFactor * noise);
    const ctrForDay = 0.02 + rand() * 0.015;
    const clicks = Math.round(impressions * ctrForDay);
    const cost = parseFloat(((impressions / 1000) * 18.5).toFixed(2));
    const likes = Math.round(clicks * (0.15 + rand() * 0.1));
    const shares = Math.round(clicks * (0.03 + rand() * 0.03));

    ret.push({ date: dateStr, impressions, clicks, cost, likes, shares });
  }

  return ret;
}

const fullTimeSeries = generateTimeSeries(47);

function getTimeSeriesForRange(range: string) {
  switch (range) {
    case '7d': return fullTimeSeries.slice(-7);
    case '30d': return fullTimeSeries.slice(-30);
    case '90d': return fullTimeSeries;
    case 'all': return fullTimeSeries;
    default: return fullTimeSeries.slice(-30);
  }
}

function computeFromSeries(series: typeof fullTimeSeries) {
  const impressions = series.reduce((s, d) => s + d.impressions, 0);
  const clicks = series.reduce((s, d) => s + d.clicks, 0);
  const cost = series.reduce((s, d) => s + d.cost, 0);
  const likes = series.reduce((s, d) => s + d.likes, 0);
  const shares = series.reduce((s, d) => s + d.shares, 0);
  return { impressions, clicks, cost, likes, shares };
}

export function getMockAnalyticsFull(dateRange: string = '30d'): CampaignAnalyticsFull {
  const series = getTimeSeriesForRange(dateRange);
  const { impressions, clicks, cost, likes, shares } = computeFromSeries(series);

  const comments = Math.round(clicks * 0.04);
  const follows = Math.round(clicks * 0.02);
  const conversions = Math.round(clicks * 0.018);
  const postClickConv = Math.round(conversions * 0.7);
  const postViewConv = conversions - postClickConv;
  const oneClickLeads = Math.round(clicks * 0.012);
  const viralImpressions = Math.round(impressions * 0.08);
  const viralClicks = Math.round(viralImpressions * 0.015);
  const reach = Math.round(impressions * 0.65);

  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0';
  const cpc = clicks > 0 ? (cost / clicks).toFixed(2) : '0';
  const cpm = impressions > 0 ? ((cost / impressions) * 1000).toFixed(2) : '0';
  const engagementRate = impressions > 0 ? (((clicks + likes + comments + shares + follows) / impressions) * 100).toFixed(2) : '0';
  const cpl = oneClickLeads > 0 ? (cost / oneClickLeads).toFixed(2) : null;
  const postClickConvRate = clicks > 0 ? ((postClickConv / clicks) * 100).toFixed(2) : '0';
  const viralAmplification = impressions > 0 ? ((viralImpressions / impressions) * 100).toFixed(2) : '0';

  // Compute deltas vs previous period
  const allLen = fullTimeSeries.length;
  let delta: Record<string, string | null> = {};
  let prevSeries: typeof fullTimeSeries = [];
  switch (dateRange) {
    case '7d': prevSeries = fullTimeSeries.slice(Math.max(0, allLen - 14), allLen - 7); break;
    case '30d': prevSeries = fullTimeSeries.slice(Math.max(0, allLen - 60), Math.max(0, allLen - 30)); break;
    default: break;
  }
  if (prevSeries.length > 0) {
    const prev = computeFromSeries(prevSeries);
    const pct = (c: number, p: number) => p === 0 ? null : (((c - p) / p) * 100).toFixed(1);
    delta = {
      impressions: pct(impressions, prev.impressions),
      clicks: pct(clicks, prev.clicks),
      cost: pct(cost, prev.cost),
      likes: pct(likes, prev.likes),
      shares: pct(shares, prev.shares),
      comments: null,
      follows: null,
      conversions: null,
      oneClickLeads: null,
      viralImpressions: null,
      reach: null,
    };
  }

  return {
    impressions, clicks, landingPageClicks: Math.round(clicks * 0.85),
    likes, shares, comments, follows,
    costInLocalCurrency: parseFloat(cost.toFixed(2)),
    externalWebsiteConversions: conversions,
    externalWebsitePostClickConversions: postClickConv,
    externalWebsitePostViewConversions: postViewConv,
    oneClickLeads, oneClickLeadFormOpens: Math.round(oneClickLeads * 1.8),
    viralImpressions, viralClicks, viralLikes: Math.round(viralClicks * 0.3),
    viralShares: Math.round(viralClicks * 0.05),
    approximateMemberReach: reach,
    cardClicks: 0, cardImpressions: 0,
    ctr, cpc, cpm, engagementRate, cpl, postClickConvRate, viralAmplification,
    timeSeries: series,
    delta,
    currency: 'BRL',
  };
}

export function getMockComments(): CampaignCommentsResponse {
  return {
    post_urn: 'urn:li:ugcPost:mock-001',
    total: 5,
    comments: [
      {
        id: 'c1', author_name: 'Ricardo Almeida', author_title: 'VP of Sales @ TechCorp Brasil',
        text: 'Excelente conteúdo! Estamos implementando uma estratégia ABM similar na nossa empresa e os resultados têm sido muito positivos.',
        created_at: '2026-03-21T14:30:00Z', likes_count: 12, is_reply: false, parent_comment_id: null,
      },
      {
        id: 'c2', author_name: 'Mariana Costa', author_title: 'Head of Marketing @ Innovatech',
        text: 'Concordo totalmente. A personalização é key para engajar decision makers no B2B.',
        created_at: '2026-03-21T16:45:00Z', likes_count: 7, is_reply: true, parent_comment_id: 'c1',
      },
      {
        id: 'c3', author_name: 'Fernando Oliveira', author_title: 'CEO @ DataDriven Solutions',
        text: 'Qual ferramenta vocês usam para a segmentação de contas? Temos buscado algo mais sofisticado do que o que temos hoje.',
        created_at: '2026-03-19T09:15:00Z', likes_count: 4, is_reply: false, parent_comment_id: null,
      },
      {
        id: 'c4', author_name: null, author_title: null,
        text: 'Muito bom! Salvando para referência.',
        created_at: '2026-03-18T11:00:00Z', likes_count: 2, is_reply: false, parent_comment_id: null,
      },
      {
        id: 'c5', author_name: 'Ana Beatriz Santos', author_title: 'Growth Lead @ ScaleUp Ventures',
        text: '🔥 Dados impressionantes. O ROI de campanhas ABM bem executadas é incomparável. Compartilhando com meu time!',
        created_at: '2026-03-17T08:20:00Z', likes_count: 15, is_reply: false, parent_comment_id: null,
      },
    ],
  };
}

// Keep backward compat for CampaignAnalyticsDetail (used by old code path)
export function getMockAnalyticsDetail(dateRange: string = '30d') {
  const full = getMockAnalyticsFull(dateRange);
  return {
    impressions: full.impressions,
    clicks: full.clicks,
    cost: full.costInLocalCurrency,
    ctr: full.ctr,
    cpc: full.cpc,
    conversions: full.externalWebsiteConversions,
    currency: full.currency,
    timeSeries: full.timeSeries.map(t => ({ date: t.date, impressions: t.impressions, clicks: t.clicks })),
    changes: {
      impressions: full.delta.impressions || null,
      clicks: full.delta.clicks || null,
      cost: full.delta.cost || null,
      conversions: full.delta.conversions || null,
    },
  };
}

export function isMockCampaign(id: string): boolean {
  return id === MOCK_CAMPAIGN_ID;
}
