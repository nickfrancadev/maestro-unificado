// Read models for campaigns running in LinkedIn: list, summary metrics,
// detailed time series, and post comments. Also includes the manual
// performance sync trigger.

import { SERVER_BASE, headers } from './client';

export interface CampaignPerformanceData {
  linkedin_campaign_id: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpm: number;
  date_range: { start: string; end: string };
}

export async function syncCampaignPerformance(
  campaignId: string,
): Promise<CampaignPerformanceData[]> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/sync-performance`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ campaign_id: campaignId }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.metrics || [];
  } catch (err: any) {
    console.error('[LinkedIn] Sync performance erro:', err);
    return [];
  }
}

export interface LinkedInCampaign {
  id: string;
  name: string;
  status: string;
  rawStatus: string;
  type: string;
  costType: string;
  totalBudget: { amount: string; currency: string } | null;
  dailyBudget: { amount: string; currency: string } | null;
  runSchedule: { start: number | null; end: number | null } | null;
}

export interface CampaignAnalyticsSummary {
  impressions: number;
  clicks: number;
  ctr: string;
  cost: number;
  currency: string;
}

export interface CampaignAnalyticsDetail {
  impressions: number;
  clicks: number;
  cost: number;
  ctr: string;
  cpc: string;
  conversions: number;
  currency: string;
  timeSeries: { date: string; impressions: number; clicks: number }[];
  changes: {
    impressions: string | null;
    clicks: string | null;
    cost: string | null;
    conversions: string | null;
  };
  error?: string;
}

export interface CampaignAnalyticsFull {
  impressions: number;
  clicks: number;
  landingPageClicks: number;
  likes: number;
  shares: number;
  comments: number;
  follows: number;
  costInLocalCurrency: number;
  externalWebsiteConversions: number;
  externalWebsitePostClickConversions: number;
  externalWebsitePostViewConversions: number;
  oneClickLeads: number;
  oneClickLeadFormOpens: number;
  viralImpressions: number;
  viralClicks: number;
  viralLikes: number;
  viralShares: number;
  approximateMemberReach: number;
  cardClicks: number;
  cardImpressions: number;
  ctr: string;
  cpc: string;
  cpm: string;
  engagementRate: string;
  cpl: string | null;
  postClickConvRate: string;
  viralAmplification: string;
  timeSeries: {
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    likes: number;
    shares: number;
  }[];
  delta: Record<string, string | null>;
  currency: string;
  error?: string;
}

export interface CampaignComment {
  id: string;
  author_name: string | null;
  author_title: string | null;
  text: string;
  created_at: string;
  likes_count: number;
  is_reply: boolean;
  parent_comment_id: string | null;
}

export interface CampaignCommentsResponse {
  post_urn?: string;
  comments: CampaignComment[];
  total: number;
  error?: string;
}

export async function fetchLinkedInCampaigns(): Promise<{
  campaigns: LinkedInCampaign[];
  currency: string;
}> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/campaigns-list`, {
      headers: headers(),
    });
    if (!response.ok) {
      const data = await response.json();
      console.warn('[LinkedIn Campaigns] Fetch failed:', data);
      return { campaigns: [], currency: 'USD' };
    }
    return await response.json();
  } catch (err: any) {
    console.error('[LinkedIn Campaigns] Fetch erro:', err);
    return { campaigns: [], currency: 'USD' };
  }
}

export async function fetchCampaignAnalyticsSummary(
  campaignId: string,
): Promise<CampaignAnalyticsSummary> {
  try {
    const response = await fetch(
      `${SERVER_BASE}/linkedin/campaign-analytics-summary?campaignId=${campaignId}`,
      { headers: headers() },
    );
    if (!response.ok) {
      return { impressions: 0, clicks: 0, ctr: '0', cost: 0, currency: 'USD' };
    }
    return await response.json();
  } catch (err: any) {
    console.error('[Campaign Analytics Summary] Erro:', err);
    return { impressions: 0, clicks: 0, ctr: '0', cost: 0, currency: 'USD' };
  }
}

export async function fetchCampaignAnalyticsDetail(
  campaignId: string,
  dateRange: string = '30d',
): Promise<CampaignAnalyticsDetail> {
  const empty: CampaignAnalyticsDetail = {
    impressions: 0,
    clicks: 0,
    cost: 0,
    ctr: '0%',
    cpc: '0',
    conversions: 0,
    currency: 'USD',
    timeSeries: [],
    changes: { impressions: null, clicks: null, cost: null, conversions: null },
  };
  try {
    const response = await fetch(
      `${SERVER_BASE}/linkedin/campaign-analytics?campaignId=${campaignId}&dateRange=${dateRange}`,
      { headers: headers() },
    );
    if (!response.ok) {
      return empty;
    }
    return await response.json();
  } catch (err: any) {
    console.error('[Campaign Analytics Detail] Erro:', err);
    return empty;
  }
}

const EMPTY_FULL: CampaignAnalyticsFull = {
  impressions: 0, clicks: 0, landingPageClicks: 0, likes: 0, shares: 0, comments: 0, follows: 0,
  costInLocalCurrency: 0, externalWebsiteConversions: 0, externalWebsitePostClickConversions: 0,
  externalWebsitePostViewConversions: 0, oneClickLeads: 0, oneClickLeadFormOpens: 0,
  viralImpressions: 0, viralClicks: 0, viralLikes: 0, viralShares: 0, approximateMemberReach: 0,
  cardClicks: 0, cardImpressions: 0, ctr: '0', cpc: '0', cpm: '0', engagementRate: '0',
  cpl: null, postClickConvRate: '0', viralAmplification: '0',
  timeSeries: [], delta: {}, currency: 'USD',
};

export async function fetchCampaignAnalyticsFull(
  campaignId: string,
  dateRange: string = '30d',
): Promise<CampaignAnalyticsFull> {
  try {
    const response = await fetch(
      `${SERVER_BASE}/linkedin/campaign-analytics-full?campaignId=${campaignId}&dateRange=${dateRange}`,
      { headers: headers() },
    );
    if (!response.ok) {
      console.warn('[Campaign Analytics Full] Fetch failed:', response.status);
      return { ...EMPTY_FULL };
    }
    return await response.json();
  } catch (err: any) {
    console.error('[Campaign Analytics Full] Erro:', err);
    return { ...EMPTY_FULL };
  }
}

export async function fetchCampaignComments(
  campaignId: string,
): Promise<CampaignCommentsResponse> {
  try {
    const response = await fetch(
      `${SERVER_BASE}/linkedin/campaign-comments?campaignId=${campaignId}`,
      { headers: headers() },
    );
    return await response.json();
  } catch (err: any) {
    console.error('[Campaign Comments] Erro:', err);
    return { comments: [], total: 0, error: err.message };
  }
}

// ---- Per-account analytics (1 ad set = 1 empresa-alvo) ----
// Espelha a shape do futuro endpoint GET /linkedin/campaign-analytics-by-account,
// que virá de adAnalytics?q=statistics&pivots=List(CAMPAIGN) sobre os N ad sets
// da campanha, mapeando pivotValues -> campaign_accounts -> target_accounts.

export interface AccountAnalyticsTotals {
  impressions: number;
  clicks: number;
  landingPageClicks: number;
  likes: number;
  shares: number;
  comments: number;
  follows: number;
  costInLocalCurrency: number;
  externalWebsiteConversions: number;
  externalWebsitePostClickConversions: number;
  externalWebsitePostViewConversions: number;
  oneClickLeads: number;
  oneClickLeadFormOpens: number;
  viralImpressions: number;
  viralClicks: number;
  viralLikes: number;
  viralShares: number;
  approximateMemberReach: number;
  cardClicks: number;
  cardImpressions: number;
}

export interface AccountTimeSeriesPoint {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  likes: number;
  shares: number;
}

export interface AccountAnalytics {
  accountId: string;
  accountName: string;
  industry: string | null;
  linkedinCampaignId: string;
  totals: AccountAnalyticsTotals;
  timeSeries: AccountTimeSeriesPoint[];
}

export interface CampaignAnalyticsByAccount {
  campaignId: string;
  currency: string;
  accounts: AccountAnalytics[];
}

const EMPTY_TOTALS: AccountAnalyticsTotals = {
  impressions: 0, clicks: 0, landingPageClicks: 0, likes: 0, shares: 0, comments: 0, follows: 0,
  costInLocalCurrency: 0, externalWebsiteConversions: 0, externalWebsitePostClickConversions: 0,
  externalWebsitePostViewConversions: 0, oneClickLeads: 0, oneClickLeadFormOpens: 0,
  viralImpressions: 0, viralClicks: 0, viralLikes: 0, viralShares: 0, approximateMemberReach: 0,
  cardClicks: 0, cardImpressions: 0,
};

export function sumTotals(accounts: AccountAnalytics[]): AccountAnalyticsTotals {
  const acc: AccountAnalyticsTotals = { ...EMPTY_TOTALS };
  for (const a of accounts) {
    for (const k of Object.keys(acc) as (keyof AccountAnalyticsTotals)[]) {
      acc[k] += a.totals[k];
    }
  }
  acc.costInLocalCurrency = parseFloat(acc.costInLocalCurrency.toFixed(2));
  return acc;
}

export function mergeSeriesByDate(accounts: AccountAnalytics[]): AccountTimeSeriesPoint[] {
  const byDate = new Map<string, AccountTimeSeriesPoint>();
  for (const a of accounts) {
    for (const p of a.timeSeries) {
      const cur = byDate.get(p.date) ?? { date: p.date, impressions: 0, clicks: 0, cost: 0, likes: 0, shares: 0 };
      cur.impressions += p.impressions;
      cur.clicks += p.clicks;
      cur.cost = parseFloat((cur.cost + p.cost).toFixed(2));
      cur.likes += p.likes;
      cur.shares += p.shares;
      byDate.set(p.date, cur);
    }
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
}

// Agrega contas selecionadas no shape consumido pelo dashboard.
// delta sai vazio: só faz sentido vs período anterior do MESMO recorte,
// e isso é responsabilidade de quem chama (mock/endpoint).
export function aggregateAccounts(accounts: AccountAnalytics[], currency: string): CampaignAnalyticsFull {
  const t = sumTotals(accounts);
  const ctr = t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(2) : '0';
  const cpc = t.clicks > 0 ? (t.costInLocalCurrency / t.clicks).toFixed(2) : '0';
  const cpm = t.impressions > 0 ? ((t.costInLocalCurrency / t.impressions) * 1000).toFixed(2) : '0';
  const engagementRate = t.impressions > 0
    ? (((t.clicks + t.likes + t.comments + t.shares + t.follows) / t.impressions) * 100).toFixed(2)
    : '0';
  const cpl = t.oneClickLeads > 0 ? (t.costInLocalCurrency / t.oneClickLeads).toFixed(2) : null;
  const postClickConvRate = t.clicks > 0
    ? ((t.externalWebsitePostClickConversions / t.clicks) * 100).toFixed(2)
    : '0';
  const viralAmplification = t.impressions > 0
    ? ((t.viralImpressions / t.impressions) * 100).toFixed(2)
    : '0';
  return {
    ...t,
    ctr, cpc, cpm, engagementRate, cpl, postClickConvRate, viralAmplification,
    timeSeries: mergeSeriesByDate(accounts),
    delta: {},
    currency,
  };
}
