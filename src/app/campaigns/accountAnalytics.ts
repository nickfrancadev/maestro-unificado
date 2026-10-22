import type { AccountAnalytics } from '@/lib/linkedin';
import { fmtDateLabel } from './format';

// Paleta fixa: cor estável por índice da conta na ordem original de byAccount.accounts
export const ACCOUNT_COLORS = ['#FF5F39', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#64748b'];

export function accountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

export type ComparisonMetric = 'impressions' | 'clicks' | 'cost';

export const COMPARISON_METRICS: { key: ComparisonMetric; label: string }[] = [
  { key: 'impressions', label: 'Impressões' },
  { key: 'clicks', label: 'Cliques' },
  { key: 'cost', label: 'Investimento' },
];

// Linhas do recharts: { date, dateLabel, [accountId]: valor } por data
export function buildComparisonData(
  accounts: AccountAnalytics[],
  metric: ComparisonMetric,
): Record<string, number | string>[] {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const a of accounts) {
    for (const p of a.timeSeries) {
      const row = byDate.get(p.date) ?? { date: p.date, dateLabel: fmtDateLabel(p.date) };
      row[a.accountId] = p[metric];
      byDate.set(p.date, row);
    }
  }
  return [...byDate.values()].sort((x, y) => String(x.date).localeCompare(String(y.date)));
}

// Métricas derivadas em número (CTR já ×100); a formatação fica na tela (format.ts).
export interface AccountRow {
  account: AccountAnalytics;
  colorIndex: number;
  ctr: number;
  cpc: number;
  cpl: number | null;
}

// Linhas da tabela, ordenadas por investimento desc, com colorIndex preservando a ordem original
export function buildAccountRows(accounts: AccountAnalytics[]): AccountRow[] {
  return accounts
    .map((account, colorIndex) => {
      const t = account.totals;
      return {
        account,
        colorIndex,
        ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
        cpc: t.clicks > 0 ? t.costInLocalCurrency / t.clicks : 0,
        cpl: t.oneClickLeads > 0 ? t.costInLocalCurrency / t.oneClickLeads : null,
      };
    })
    .sort((a, b) => b.account.totals.costInLocalCurrency - a.account.totals.costInLocalCurrency);
}

// Rótulos PT-BR para os CTAs do LinkedIn
export const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Saiba mais',
  SIGN_UP: 'Cadastre-se',
  DOWNLOAD: 'Baixar',
  REQUEST_DEMO: 'Solicitar demo',
  SUBSCRIBE: 'Inscrever-se',
  REGISTER: 'Registrar',
  APPLY_NOW: 'Candidatar-se',
  CONTACT_US: 'Fale conosco',
};

export function ctaLabel(cta: string): string {
  return CTA_LABELS[cta] ?? 'Saiba mais';
}

// Gradiente determinístico por índice para preview sem imagem (reusa a paleta)
export function creativeFallbackGradient(index: number): string {
  const c = accountColor(index);
  return `linear-gradient(135deg, ${c} 0%, ${c}99 100%)`;
}
