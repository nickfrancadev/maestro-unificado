// Analytics de uma campanha REAL vista como o produto publica: um grupo de
// campanhas no LinkedIn com um conjunto (ad set) por empresa-alvo.
//
// Antes só a demonstração tinha a visão do grupo com a tabela por empresa; a
// campanha real abria um conjunto por vez. Aqui cada conjunto do grupo vira
// uma "empresa" no mesmo formato que a demonstração usa
// (`CampaignAnalyticsByAccount`), e a tela reaproveita o layout inteiro.
import type {
  AccountAnalytics,
  CampaignAnalyticsByAccount,
  CampaignAnalyticsFull,
  LinkedInCampaign,
} from '@/lib/linkedin';
import { splitAdSetName, aggregateStatus } from './CampaignList';

const GROUP_PREFIX = 'group-';

/** Rota da visão do grupo: /campaigns/group-<id do grupo>. */
export function groupRoutePath(campaignGroupUrn: string): string {
  return `/campaigns/${GROUP_PREFIX}${String(campaignGroupUrn).split(':').pop()}`;
}

/** "group-123" → "123". Qualquer outro id → null (é um conjunto ou a demonstração). */
export function groupIdFromRoute(routeId: string | undefined): string | null {
  if (!routeId || !routeId.startsWith(GROUP_PREFIX)) return null;
  const id = routeId.slice(GROUP_PREFIX.length);
  return /^\d+$/.test(id) ? id : null;
}

/** Conjuntos do grupo, na ordem da lista. */
export function groupChildren(campaigns: LinkedInCampaign[], groupId: string): LinkedInCampaign[] {
  return campaigns.filter((c) => !!c.campaignGroup && String(c.campaignGroup).split(':').pop() === groupId);
}

/** Nome do grupo: o prefixo comum "<campanha> — <empresa>"; sem ele, o primeiro nome. */
export function groupName(children: LinkedInCampaign[]): string {
  const prefixes = children.map((c) => splitAdSetName(c.name).prefix);
  return prefixes.find(Boolean) ?? children[0]?.name ?? 'Campanha';
}

/**
 * Metadados do grupo para o cabeçalho: status agregado (uma ativa = ativo),
 * período do primeiro início ao último fim (contínuo se algum não tem fim) e
 * orçamento somado das empresas.
 */
export function groupCampaignMeta(groupId: string, children: LinkedInCampaign[]): LinkedInCampaign {
  const starts = children.map((c) => c.runSchedule?.start).filter((n): n is number => n != null);
  const ends = children.map((c) => c.runSchedule?.end ?? null);
  const sum = (pick: (c: LinkedInCampaign) => { amount: string; currency: string } | null) => {
    const list = children.map(pick).filter((b): b is { amount: string; currency: string } => !!b);
    if (!list.length) return null;
    return { amount: String(list.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0)), currency: list[0].currency };
  };
  return {
    id: `${GROUP_PREFIX}${groupId}`,
    name: groupName(children),
    status: aggregateStatus(children.map((c) => c.status)),
    rawStatus: '',
    type: children[0]?.type ?? 'SPONSORED_UPDATES',
    costType: children[0]?.costType ?? 'CPM',
    dailyBudget: sum((c) => c.dailyBudget),
    totalBudget: sum((c) => c.totalBudget),
    runSchedule: {
      start: starts.length ? Math.min(...starts) : null,
      end: ends.some((e) => e == null) ? null : Math.max(...(ends as number[])),
    },
    campaignGroup: `urn:li:sponsoredCampaignGroup:${groupId}`,
  };
}

/** Um conjunto do LinkedIn no formato "empresa" da tabela por empresa. */
export function adSetAsAccount(campaign: LinkedInCampaign, full: CampaignAnalyticsFull, prefix: string): AccountAnalytics {
  const company = campaign.name.startsWith(`${prefix} — `) ? campaign.name.slice(prefix.length + 3) : splitAdSetName(campaign.name).company;
  return {
    accountId: campaign.id,
    accountName: company,
    industry: null,
    linkedinCampaignId: campaign.id,
    totals: {
      impressions: full.impressions, clicks: full.clicks, landingPageClicks: full.landingPageClicks,
      likes: full.likes, shares: full.shares, comments: full.comments, follows: full.follows,
      costInLocalCurrency: full.costInLocalCurrency,
      externalWebsiteConversions: full.externalWebsiteConversions,
      externalWebsitePostClickConversions: full.externalWebsitePostClickConversions,
      externalWebsitePostViewConversions: full.externalWebsitePostViewConversions,
      oneClickLeads: full.oneClickLeads, oneClickLeadFormOpens: full.oneClickLeadFormOpens,
      viralImpressions: full.viralImpressions, viralClicks: full.viralClicks,
      viralLikes: full.viralLikes, viralShares: full.viralShares,
      approximateMemberReach: full.approximateMemberReach,
      cardClicks: full.cardClicks, cardImpressions: full.cardImpressions,
    },
    timeSeries: full.timeSeries,
    // O anúncio de cada empresa vem do LinkedIn em outra busca; sem ele, o
    // preview usa o gradiente da empresa.
    creative: { variant: 'named', headline: '', body: '', imageUrl: '', cta: 'LEARN_MORE', postUrn: '' },
  };
}

export interface GroupBreakdown {
  byAccount: CampaignAnalyticsByAccount;
  /** Empresas cujo número não carregou: ficam fora da soma e a tela avisa. */
  failed: string[];
}

/**
 * Tabela por empresa do grupo: soma os conjuntos que carregaram. `null` se
 * nenhum carregou (a tela mostra erro com "Tentar de novo", não zeros).
 */
export function buildGroupBreakdown(
  groupId: string,
  children: LinkedInCampaign[],
  results: (CampaignAnalyticsFull | null)[],
  fallbackCurrency: string,
): GroupBreakdown | null {
  const prefix = groupName(children);
  const accounts: AccountAnalytics[] = [];
  const failed: string[] = [];
  children.forEach((c, i) => {
    const r = results[i];
    if (!r || r.error) failed.push(splitAdSetName(c.name).company);
    else accounts.push(adSetAsAccount(c, r, prefix));
  });
  if (!accounts.length) return null;
  const currency = results.find((r) => r && !r.error)?.currency || fallbackCurrency;
  return { byAccount: { campaignId: `${GROUP_PREFIX}${groupId}`, currency, accounts }, failed };
}
