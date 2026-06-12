// ================================================
// Mock Campaign Data — Simulação Realista
// ================================================

import type {
  LinkedInCampaign,
  CampaignAnalyticsSummary,
  CampaignAnalyticsFull,
  CampaignCommentsResponse,
  CampaignComment,
  AccountAnalytics,
  AccountAnalyticsTotals,
  AccountTimeSeriesPoint,
  AccountCreative,
  CampaignAnalyticsByAccount,
} from './linkedin';
import { aggregateAccounts } from './linkedin/analytics';

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

// ---- 5 empresas-alvo mock (1 ad set por empresa) ----
// Perfis distintos de performance para a comparação ser ilustrativa.
interface MockAccountProfile {
  accountId: string;
  accountName: string;
  industry: string;
  linkedinCampaignId: string;
  seed: number;
  weight: number;
  ctrBase: number;
  convRate: number;
  leadRate: number;
  postUrn: string;
  creativeVariant: 'named' | 'generic';
  creativeHeadline: string;
  creativeBody: string;
  creativeImageUrl: string;
  creativeCta: string;
}

const MOCK_ACCOUNT_PROFILES: MockAccountProfile[] = [
  { accountId: 'acc-techcorp', accountName: 'TechCorp Brasil', industry: 'Tecnologia', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-101', seed: 1101, weight: 1.35, ctrBase: 0.024, convRate: 0.020, leadRate: 0.014,
    postUrn: 'urn:li:ugcPost:mock-101', creativeVariant: 'named', creativeCta: 'LEARN_MORE', creativeImageUrl: '',
    creativeHeadline: 'TechCorp Brasil: escale seu pipeline enterprise com ABM',
    creativeBody: 'Decisores de tecnologia confiam na Maestro para orquestrar campanhas 1:1. Veja como gerar reuniões qualificadas com as contas que importam.' },
  { accountId: 'acc-innovatech', accountName: 'Innovatech', industry: 'SaaS', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-102', seed: 1102, weight: 1.0, ctrBase: 0.021, convRate: 0.018, leadRate: 0.012,
    postUrn: 'urn:li:ugcPost:mock-102', creativeVariant: 'named', creativeCta: 'SIGN_UP', creativeImageUrl: '',
    creativeHeadline: 'Innovatech, acelere seu go-to-market com dados de intenção',
    creativeBody: 'Personalize cada anúncio por conta e fale diretamente com o comitê de compra. Comece sua estratégia ABM hoje.' },
  { accountId: 'acc-datadriven', accountName: 'DataDriven Solutions', industry: 'Dados & Analytics', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-103', seed: 1103, weight: 0.75, ctrBase: 0.032, convRate: 0.026, leadRate: 0.018,
    postUrn: 'urn:li:ugcPost:mock-103', creativeVariant: 'named', creativeCta: 'DOWNLOAD', creativeImageUrl: '',
    creativeHeadline: 'DataDriven: transforme dados em receita previsível',
    creativeBody: 'Baixe o playbook de ABM orientado a dados e descubra como contas-alvo viram oportunidades de pipeline.' },
  { accountId: 'acc-scaleup', accountName: 'ScaleUp Ventures', industry: 'Venture Capital', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-104', seed: 1104, weight: 0.55, ctrBase: 0.014, convRate: 0.010, leadRate: 0.006,
    postUrn: 'urn:li:ugcPost:mock-104', creativeVariant: 'generic', creativeCta: 'LEARN_MORE', creativeImageUrl: '',
    creativeHeadline: 'Marketing baseado em contas para portfólios de alto crescimento',
    creativeBody: 'Da semente à série B, alcance os decisores certos com mensagens personalizadas por empresa.' },
  { accountId: 'acc-quantum', accountName: 'Quantum Bank', industry: 'Serviços Financeiros', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-105', seed: 1105, weight: 1.25, ctrBase: 0.015, convRate: 0.012, leadRate: 0.008,
    postUrn: 'urn:li:ugcPost:mock-105', creativeVariant: 'named', creativeCta: 'REQUEST_DEMO', creativeImageUrl: '',
    creativeHeadline: 'Quantum Bank: compliance e crescimento na mesma estratégia',
    creativeBody: 'Solicite uma demo e veja como instituições financeiras usam ABM para engajar contas corporativas com segurança.' },
];

const FULL_DAYS = 47;

// Série determinística por empresa (mesmo gerador do mock anterior, parametrizado)
function generateTimeSeries(days: number, seed0: number, weight: number, ctrBase: number): AccountTimeSeriesPoint[] {
  const ret: AccountTimeSeriesPoint[] = [];
  const now = new Date('2026-03-23');
  let seed = seed0;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseImpressions = (isWeekend ? 80 + rand() * 40 : 180 + rand() * 100) * weight;
    const growthFactor = 1 + (days - i) * 0.005;
    const noise = 0.8 + rand() * 0.4;
    const impressions = Math.round(baseImpressions * growthFactor * noise);
    const ctrForDay = ctrBase + rand() * 0.01;
    const clicks = Math.round(impressions * ctrForDay);
    const cost = parseFloat(((impressions / 1000) * 18.5).toFixed(2));
    const likes = Math.round(clicks * (0.15 + rand() * 0.1));
    const shares = Math.round(clicks * (0.03 + rand() * 0.03));
    ret.push({ date: dateStr, impressions, clicks, cost, likes, shares });
  }
  return ret;
}

const FULL_SERIES_BY_ACCOUNT = MOCK_ACCOUNT_PROFILES.map(profile => ({
  profile,
  series: generateTimeSeries(FULL_DAYS, profile.seed, profile.weight, profile.ctrBase),
}));

function sliceForRange(series: AccountTimeSeriesPoint[], range: string): AccountTimeSeriesPoint[] {
  switch (range) {
    case '7d': return series.slice(-7);
    case '30d': return series.slice(-30);
    case '90d': return series;
    case 'all': return series;
    default: return series.slice(-30);
  }
}

function prevSliceForRange(series: AccountTimeSeriesPoint[], range: string): AccountTimeSeriesPoint[] {
  const n = series.length;
  switch (range) {
    case '7d': return series.slice(Math.max(0, n - 14), n - 7);
    case '30d': return series.slice(Math.max(0, n - 60), Math.max(0, n - 30));
    default: return [];
  }
}

function computeFromSeries(series: AccountTimeSeriesPoint[]) {
  const impressions = series.reduce((s, d) => s + d.impressions, 0);
  const clicks = series.reduce((s, d) => s + d.clicks, 0);
  const cost = series.reduce((s, d) => s + d.cost, 0);
  const likes = series.reduce((s, d) => s + d.likes, 0);
  const shares = series.reduce((s, d) => s + d.shares, 0);
  return { impressions, clicks, cost, likes, shares };
}

function buildAccount(profile: MockAccountProfile, series: AccountTimeSeriesPoint[]): AccountAnalytics {
  const { impressions, clicks, cost, likes, shares } = computeFromSeries(series);
  const comments = Math.round(clicks * 0.04);
  const follows = Math.round(clicks * 0.02);
  const conversions = Math.round(clicks * profile.convRate);
  const postClickConv = Math.round(conversions * 0.7);
  const oneClickLeads = Math.round(clicks * profile.leadRate);
  const viralImpressions = Math.round(impressions * 0.08);
  const viralClicks = Math.round(viralImpressions * 0.015);

  const totals: AccountAnalyticsTotals = {
    impressions, clicks,
    landingPageClicks: Math.round(clicks * 0.85),
    likes, shares, comments, follows,
    costInLocalCurrency: parseFloat(cost.toFixed(2)),
    externalWebsiteConversions: conversions,
    externalWebsitePostClickConversions: postClickConv,
    externalWebsitePostViewConversions: conversions - postClickConv,
    oneClickLeads,
    oneClickLeadFormOpens: Math.round(oneClickLeads * 1.8),
    viralImpressions, viralClicks,
    viralLikes: Math.round(viralClicks * 0.3),
    viralShares: Math.round(viralClicks * 0.05),
    approximateMemberReach: Math.round(impressions * 0.65),
    cardClicks: 0, cardImpressions: 0,
  };

  return {
    accountId: profile.accountId,
    accountName: profile.accountName,
    industry: profile.industry,
    linkedinCampaignId: profile.linkedinCampaignId,
    totals,
    timeSeries: series,
    creative: {
      variant: profile.creativeVariant,
      headline: profile.creativeHeadline,
      body: profile.creativeBody,
      imageUrl: profile.creativeImageUrl,
      cta: profile.creativeCta,
      postUrn: profile.postUrn,
    },
  };
}

export function getMockAnalyticsByAccount(dateRange: string = '30d'): CampaignAnalyticsByAccount {
  return {
    campaignId: MOCK_CAMPAIGN_ID,
    currency: 'BRL',
    accounts: FULL_SERIES_BY_ACCOUNT.map(({ profile, series }) =>
      buildAccount(profile, sliceForRange(series, dateRange))),
  };
}

// Agregado da campanha = soma das contas (consistência por construção).
export function getMockAnalyticsFull(dateRange: string = '30d'): CampaignAnalyticsFull {
  const { accounts } = getMockAnalyticsByAccount(dateRange);
  const agg = aggregateAccounts(accounts, 'BRL');

  // Delta vs período anterior, somando as janelas anteriores de todas as contas
  const prevPoints = FULL_SERIES_BY_ACCOUNT.flatMap(({ series }) => prevSliceForRange(series, dateRange));
  if (prevPoints.length > 0) {
    const prev = computeFromSeries(prevPoints);
    // Janelas podem ter tamanhos diferentes (série tem 47 dias; "30d anteriores" só tem 17) —
    // compara médias diárias para o delta não inflar.
    const curDays = sliceForRange(FULL_SERIES_BY_ACCOUNT[0].series, dateRange).length;
    const prevDays = prevSliceForRange(FULL_SERIES_BY_ACCOUNT[0].series, dateRange).length;
    const pct = (c: number, p: number) => {
      if (p === 0 || prevDays === 0 || curDays === 0) return null;
      const prevDaily = p / prevDays;
      return (((c / curDays - prevDaily) / prevDaily) * 100).toFixed(1);
    };
    agg.delta = {
      impressions: pct(agg.impressions, prev.impressions),
      clicks: pct(agg.clicks, prev.clicks),
      cost: pct(agg.costInLocalCurrency, prev.cost),
      likes: pct(agg.likes, prev.likes),
      shares: pct(agg.shares, prev.shares),
      comments: null,
      follows: null,
      conversions: null,
      oneClickLeads: null,
      viralImpressions: null,
      reach: null,
    };
  }
  return agg;
}

// Summary derivado do agregado total (não mais hardcoded)
export const MOCK_CAMPAIGN_SUMMARY: CampaignAnalyticsSummary = (() => {
  const f = getMockAnalyticsFull('all');
  return { impressions: f.impressions, clicks: f.clicks, ctr: f.ctr, cost: f.costInLocalCurrency, currency: 'BRL' };
})();

// Comentários por empresa (cada empresa = 1 post próprio com seus comentários)
const MOCK_COMMENTS_BY_ACCOUNT: Record<string, CampaignComment[]> = {
  'acc-techcorp': [
    { id: 'tc1', author_name: 'Ricardo Almeida', author_title: 'VP of Sales @ Latitude Tech', text: 'Excelente conteúdo! Estamos implementando uma estratégia ABM similar e os resultados têm sido muito positivos.', created_at: '2026-03-21T14:30:00Z', likes_count: 12, is_reply: false, parent_comment_id: null },
    { id: 'tc2', author_name: 'Mariana Costa', author_title: 'Head of Marketing @ Innovatech', text: 'Concordo totalmente. A personalização é key para engajar decision makers no B2B.', created_at: '2026-03-21T16:45:00Z', likes_count: 7, is_reply: true, parent_comment_id: 'tc1' },
    { id: 'tc3', author_name: 'Ana Beatriz Santos', author_title: 'Growth Lead @ ScaleUp Ventures', text: '🔥 Dados impressionantes. O ROI de campanhas ABM bem executadas é incomparável.', created_at: '2026-03-20T08:20:00Z', likes_count: 15, is_reply: false, parent_comment_id: null },
  ],
  'acc-innovatech': [
    { id: 'in1', author_name: 'Fernando Oliveira', author_title: 'CEO @ DataDriven Solutions', text: 'Qual ferramenta vocês usam para a segmentação de contas? Temos buscado algo mais sofisticado.', created_at: '2026-03-19T09:15:00Z', likes_count: 4, is_reply: false, parent_comment_id: null },
    { id: 'in2', author_name: null, author_title: null, text: 'Muito bom! Salvando para referência.', created_at: '2026-03-18T11:00:00Z', likes_count: 2, is_reply: false, parent_comment_id: null },
  ],
  'acc-datadriven': [
    { id: 'dd1', author_name: 'Camila Ferreira', author_title: 'Diretora de Marketing @ NorthStar', text: 'O playbook é ótimo. A parte de dados de intenção mudou nossa abordagem.', created_at: '2026-03-22T10:10:00Z', likes_count: 9, is_reply: false, parent_comment_id: null },
  ],
  'acc-scaleup': [
    { id: 'su1', author_name: 'Pedro Henrique Lima', author_title: 'Partner @ Vertex Capital', text: 'Faz muito sentido para portfólios early-stage. Compartilhando com as investidas.', created_at: '2026-03-17T13:40:00Z', likes_count: 6, is_reply: false, parent_comment_id: null },
  ],
  'acc-quantum': [
    { id: 'qb1', author_name: 'Juliana Rocha', author_title: 'Head of Digital @ Meridian Bank', text: 'Compliance + ABM é exatamente o que o setor financeiro precisa. Demo solicitada!', created_at: '2026-03-23T15:25:00Z', likes_count: 11, is_reply: false, parent_comment_id: null },
    { id: 'qb2', author_name: 'Lucas Martins', author_title: 'CMO @ Quantum Bank', text: 'Obrigado pelo interesse! Nossa equipe entra em contato em breve.', created_at: '2026-03-23T17:00:00Z', likes_count: 3, is_reply: true, parent_comment_id: 'qb1' },
  ],
};

export function getMockCommentsByAccount(accountId: string): CampaignCommentsResponse {
  const profile = MOCK_ACCOUNT_PROFILES.find(p => p.accountId === accountId);
  const comments = MOCK_COMMENTS_BY_ACCOUNT[accountId] ?? [];
  return {
    post_urn: profile?.postUrn,
    total: comments.length,
    comments,
  };
}

// Legado: feed agregado (mantido para compat; dashboard usa getMockCommentsByAccount no caminho mock)
export function getMockComments(): CampaignCommentsResponse {
  const all = Object.values(MOCK_COMMENTS_BY_ACCOUNT).flat();
  return { post_urn: 'urn:li:ugcPost:mock-001', total: all.length, comments: all };
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
