# Performance por Empresa no Analytics de Campanha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar separação de métricas por empresa-alvo (1 ad set = 1 empresa) no dashboard de analytics de campanha (`/campaigns/mock-abm-001`), com filtro multi-seleção, gráfico comparativo multi-linha e tabela por empresa — escopo mock-only, espelhando a shape do futuro endpoint real (pivot `CAMPAIGN` do `adAnalytics`).

**Spec:** `docs/superpowers/specs/2026-06-11-per-account-analytics-design.md`

**Architecture:** Tipos e helpers de agregação puros entram em `src/lib/linkedin/analytics.ts` (usados por mock e UI). O mock (`src/lib/mockCampaignData.ts`) passa a gerar 5 séries por empresa e **deriva o agregado da soma delas** (consistência por construção). A UI ganha dois componentes novos (`AccountComparisonChart`, `AccountPerformanceTable`) e `CampaignAnalytics.tsx` orquestra a seleção de empresas, recalculando todas as seções agregadas sobre a seleção.

**Tech Stack:** React 18 + TypeScript, recharts 2.15 (LineChart), Tailwind CSS 4, Vite 6.

**Infra de testes:** O projeto NÃO tem vitest/jest nem script `test` (ver `package.json` — scripts: `build`, `dev`, `preview`). Conforme o spec, a validação é via `npx tsc --noEmit` + `npm run build` por task e verificação manual no navegador ao final (mock determinístico, valores conferíveis). **Não introduza framework de testes neste plano.**

**Baseline conhecida de `npx tsc --noEmit`:** imprime um aviso pré-existente `tsconfig.json(15,5): error TS5101: Option 'baseUrl' is deprecated...` mas **sai com exit code 0**. Trate esse aviso como baseline; qualquer outro erro é regressão sua.

---

## Estrutura de arquivos

- **Modify:** `src/lib/linkedin/analytics.ts` — novos tipos (`AccountAnalyticsTotals`, `AccountTimeSeriesPoint`, `AccountAnalytics`, `CampaignAnalyticsByAccount`) + helpers puros (`sumTotals`, `mergeSeriesByDate`, `aggregateAccounts`). Já é re-exportado pelo barrel `src/lib/linkedin.ts` (`export * from './linkedin/analytics'`), nada a fazer no barrel.
- **Modify:** `src/lib/mockCampaignData.ts` — 5 empresas mock com séries próprias; `getMockAnalyticsByAccount()`; `getMockAnalyticsFull()` derivado da soma.
- **Create:** `src/app/campaigns/format.ts` — `fmtCurrency`, `fmtNum`, `fmtDateLabel` extraídos de `CampaignAnalytics.tsx`.
- **Create:** `src/app/campaigns/accountAnalytics.ts` — paleta de cores, `ComparisonMetric`, `buildComparisonData`, `buildAccountRows`.
- **Create:** `src/app/campaigns/AccountComparisonChart.tsx` — gráfico multi-linha + seletor de métrica.
- **Create:** `src/app/campaigns/AccountPerformanceTable.tsx` — tabela por empresa com checkboxes e rodapé de totais.
- **Modify:** `src/app/campaigns/CampaignAnalytics.tsx` — estado de seleção, chips de filtro, troca do gráfico, remoção do placeholder `MEMBER_COMPANY`, seções agregadas sobre a seleção.

---

### Task 1: Tipos por empresa em `src/lib/linkedin/analytics.ts`

**Files:**
- Modify: `src/lib/linkedin/analytics.ts` (adicionar ao final do arquivo)

- [ ] **Step 1: Adicionar os tipos ao final de `src/lib/linkedin/analytics.ts`**

```ts
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
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: somente o aviso baseline TS5101; exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/linkedin/analytics.ts
git commit -m "feat(analytics): tipos de analytics por empresa (ad set = conta)"
```

---

### Task 2: Helpers de agregação em `src/lib/linkedin/analytics.ts`

**Files:**
- Modify: `src/lib/linkedin/analytics.ts` (adicionar após os tipos da Task 1)

- [ ] **Step 1: Adicionar os helpers puros ao final do arquivo**

```ts
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
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: somente o aviso baseline TS5101; exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/linkedin/analytics.ts
git commit -m "feat(analytics): helpers puros de agregacao por empresa"
```

---

### Task 3: Mock por empresa em `src/lib/mockCampaignData.ts`

**Files:**
- Modify: `src/lib/mockCampaignData.ts`

O agregado (`getMockAnalyticsFull`) passa a ser **derivado da soma das contas**. Os valores absolutos do mock atual mudam — esperado e aceito pelo spec. As 5 empresas reaproveitam os nomes que já aparecem nos comentários mock (coerência narrativa).

- [ ] **Step 1: Substituir o bloco de geração de dados**

Em `src/lib/mockCampaignData.ts`, substituir TODO o trecho desde a linha `export const MOCK_CAMPAIGN_SUMMARY ...` (linha 24) até o final da função `getMockAnalyticsFull` (linha 151) — mantendo intactos `MOCK_CAMPAIGN_ID`, `MOCK_CAMPAIGN`, `getMockComments`, `getMockAnalyticsDetail` e `isMockCampaign` — pelo código abaixo. Atualizar também a linha de import (linha 5) para:

```ts
import type {
  LinkedInCampaign,
  CampaignAnalyticsSummary,
  CampaignAnalyticsFull,
  CampaignCommentsResponse,
  AccountAnalytics,
  AccountAnalyticsTotals,
  AccountTimeSeriesPoint,
  CampaignAnalyticsByAccount,
} from './linkedin';
import { aggregateAccounts } from './linkedin/analytics';
```

Código novo (no lugar do bloco removido):

```ts
// ---- 5 empresas-alvo mock (1 ad set por empresa) ----
// Perfis distintos de performance para a comparação ser ilustrativa.
interface MockAccountProfile {
  accountId: string;
  accountName: string;
  industry: string;
  linkedinCampaignId: string;
  seed: number;
  weight: number;    // multiplicador de volume de impressões
  ctrBase: number;   // CTR base diário
  convRate: number;  // conversões / clicks
  leadRate: number;  // leads / clicks
}

const MOCK_ACCOUNT_PROFILES: MockAccountProfile[] = [
  { accountId: 'acc-techcorp', accountName: 'TechCorp Brasil', industry: 'Tecnologia', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-101', seed: 1101, weight: 1.35, ctrBase: 0.024, convRate: 0.020, leadRate: 0.014 },
  { accountId: 'acc-innovatech', accountName: 'Innovatech', industry: 'SaaS', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-102', seed: 1102, weight: 1.0, ctrBase: 0.021, convRate: 0.018, leadRate: 0.012 },
  { accountId: 'acc-datadriven', accountName: 'DataDriven Solutions', industry: 'Dados & Analytics', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-103', seed: 1103, weight: 0.75, ctrBase: 0.032, convRate: 0.026, leadRate: 0.018 },
  { accountId: 'acc-scaleup', accountName: 'ScaleUp Ventures', industry: 'Venture Capital', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-104', seed: 1104, weight: 0.55, ctrBase: 0.014, convRate: 0.010, leadRate: 0.006 },
  { accountId: 'acc-quantum', accountName: 'Quantum Bank', industry: 'Serviços Financeiros', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-105', seed: 1105, weight: 1.25, ctrBase: 0.015, convRate: 0.012, leadRate: 0.008 },
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
    const pct = (c: number, p: number) => p === 0 ? null : (((c - p) / p) * 100).toFixed(1);
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
```

Atenção: `MOCK_CAMPAIGN_SUMMARY` precisa ficar declarado DEPOIS de `getMockAnalyticsFull` no arquivo (é IIFE que a chama no load do módulo). `getMockAnalyticsDetail` e `getMockComments` permanecem como estão (a `getMockAnalyticsDetail` já delega para `getMockAnalyticsFull`).

- [ ] **Step 2: Verificar compilação e build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc com apenas o aviso baseline; build do Vite conclui sem erros.

(A consistência soma-das-contas == agregado é garantida por construção — `getMockAnalyticsFull` chama `aggregateAccounts` — e conferida visualmente na Task 9.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockCampaignData.ts
git commit -m "feat(mock): analytics por empresa; agregado derivado da soma das contas"
```

---

### Task 4: Extrair formatadores para `src/app/campaigns/format.ts`

**Files:**
- Create: `src/app/campaigns/format.ts`
- Modify: `src/app/campaigns/CampaignAnalytics.tsx:46-63`

- [ ] **Step 1: Criar `src/app/campaigns/format.ts`**

```ts
export function fmtCurrency(amount: number, currency: string): string {
  const s = currency === 'BRL' ? 'R$' : '$';
  if (amount >= 1000) return `${s}${(amount / 1000).toFixed(1)}k`;
  return `${s}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function fmtDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
}
```

- [ ] **Step 2: Em `CampaignAnalytics.tsx`, remover as três funções locais e importar**

Remover as definições locais de `fmtCurrency` (linhas 46-50), `fmtNum` (52-56) e `fmtDateLabel` (58-63). Adicionar import junto aos demais:

```ts
import { fmtCurrency, fmtNum, fmtDateLabel } from './format';
```

(`fmtTimestamp`, `relativeTime`, `avatarColor`, `initials` permanecem locais — só são usados ali.)

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: somente o aviso baseline TS5101; exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/campaigns/format.ts src/app/campaigns/CampaignAnalytics.tsx
git commit -m "refactor(campaign): extrai formatadores para format.ts"
```

---

### Task 5: Helpers de apresentação em `src/app/campaigns/accountAnalytics.ts`

**Files:**
- Create: `src/app/campaigns/accountAnalytics.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
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
  { key: 'clicks', label: 'Clicks' },
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

export interface AccountRow {
  account: AccountAnalytics;
  colorIndex: number;
  ctr: string;
  cpc: string;
  cpl: string | null;
}

// Linhas da tabela, ordenadas por spend desc, com colorIndex preservando a ordem original
export function buildAccountRows(accounts: AccountAnalytics[]): AccountRow[] {
  return accounts
    .map((account, colorIndex) => {
      const t = account.totals;
      return {
        account,
        colorIndex,
        ctr: t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(2) : '0',
        cpc: t.clicks > 0 ? (t.costInLocalCurrency / t.clicks).toFixed(2) : '0',
        cpl: t.oneClickLeads > 0 ? (t.costInLocalCurrency / t.oneClickLeads).toFixed(2) : null,
      };
    })
    .sort((a, b) => b.account.totals.costInLocalCurrency - a.account.totals.costInLocalCurrency);
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: somente o aviso baseline TS5101; exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/accountAnalytics.ts
git commit -m "feat(campaign): helpers de apresentacao para analytics por empresa"
```

---

### Task 6: Componente `AccountComparisonChart`

**Files:**
- Create: `src/app/campaigns/AccountComparisonChart.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import React, { useMemo, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AccountAnalytics } from '@/lib/linkedin';
import { accountColor, buildComparisonData, COMPARISON_METRICS, type ComparisonMetric } from './accountAnalytics';
import { fmtCurrency, fmtNum } from './format';

interface AccountComparisonChartProps {
  accounts: AccountAnalytics[];   // todas as contas, na ordem original (cores estáveis)
  selectedIds: Set<string>;
  currency: string;
  loading: boolean;
}

export function AccountComparisonChart({ accounts, selectedIds, currency, loading }: AccountComparisonChartProps) {
  const [metric, setMetric] = useState<ComparisonMetric>('impressions');

  const selected = useMemo(
    () => accounts
      .map((account, colorIndex) => ({ account, colorIndex }))
      .filter(({ account }) => selectedIds.has(account.accountId)),
    [accounts, selectedIds],
  );

  const chartData = useMemo(
    () => buildComparisonData(selected.map(s => s.account), metric),
    [selected, metric],
  );

  const fmtValue = (v: number) => metric === 'cost' ? fmtCurrency(v, currency) : fmtNum(v);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="font-bold text-slate-800">Comparativo por empresa</h3>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {COMPARISON_METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                metric === m.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {selected.map(({ account, colorIndex }) => (
          <div key={account.accountId} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accountColor(colorIndex) }} />
            {account.accountName}
          </div>
        ))}
      </div>

      <div className="h-[260px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => fmtNum(v)} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                formatter={(value: number, name: string) => [fmtValue(value), name]}
              />
              {selected.map(({ account, colorIndex }) => (
                <Line
                  key={account.accountId}
                  type="monotone"
                  dataKey={account.accountId}
                  name={account.accountName}
                  stroke={accountColor(colorIndex)}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Sem dados para o período selecionado</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: somente o aviso baseline TS5101; exit 0. (O componente ainda não é usado — sem erro de unused em build do Vite.)

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/AccountComparisonChart.tsx
git commit -m "feat(campaign): grafico comparativo multi-linha por empresa"
```

---

### Task 7: Componente `AccountPerformanceTable`

**Files:**
- Create: `src/app/campaigns/AccountPerformanceTable.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import type { AccountAnalytics } from '@/lib/linkedin';
import { sumTotals } from '@/lib/linkedin';
import { accountColor, buildAccountRows } from './accountAnalytics';
import { fmtCurrency, fmtNum } from './format';

interface AccountPerformanceTableProps {
  accounts: AccountAnalytics[];   // todas as contas, na ordem original (cores estáveis)
  selectedIds: Set<string>;
  onToggle: (accountId: string) => void;
  currency: string;
}

export function AccountPerformanceTable({ accounts, selectedIds, onToggle, currency }: AccountPerformanceTableProps) {
  const rows = useMemo(() => buildAccountRows(accounts), [accounts]);
  const totals = useMemo(() => sumTotals(accounts), [accounts]);
  const totalCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0';
  const cy = currency === 'BRL' ? 'R$' : '$';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          Performance por Empresa
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Cada empresa-alvo tem seu próprio conjunto de anúncios. Marque para filtrar o dashboard.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 w-8" />
              <th className="px-2 py-2.5 font-medium">Empresa</th>
              <th className="px-3 py-2.5 font-medium text-right">Spend</th>
              <th className="px-3 py-2.5 font-medium text-right">Impressões</th>
              <th className="px-3 py-2.5 font-medium text-right">Clicks</th>
              <th className="px-3 py-2.5 font-medium text-right">CTR</th>
              <th className="px-3 py-2.5 font-medium text-right">CPC</th>
              <th className="px-3 py-2.5 font-medium text-right">Conv.</th>
              <th className="px-3 py-2.5 font-medium text-right">Leads</th>
              <th className="px-4 py-2.5 font-medium text-right">CPL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(({ account, colorIndex, ctr, cpc, cpl }) => {
              const checked = selectedIds.has(account.accountId);
              return (
                <tr
                  key={account.accountId}
                  onClick={() => onToggle(account.accountId)}
                  className={`cursor-pointer transition-colors ${checked ? 'hover:bg-slate-50' : 'opacity-50 hover:opacity-75'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(account.accountId)}
                      onClick={e => e.stopPropagation()}
                      className="accent-[#FF5F39] cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accountColor(colorIndex) }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{account.accountName}</p>
                        {account.industry && <p className="text-[11px] text-slate-400 truncate">{account.industry}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-800">{fmtCurrency(account.totals.costInLocalCurrency, currency)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{fmtNum(account.totals.impressions)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{fmtNum(account.totals.clicks)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{ctr}%</td>
                  <td className="px-3 py-3 text-right text-slate-600">{cy}{cpc}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{account.totals.externalWebsiteConversions}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{account.totals.oneClickLeads}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{cpl ? `${cy}${cpl}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60 text-slate-800 font-semibold">
              <td className="px-4 py-3" />
              <td className="px-2 py-3 text-xs uppercase tracking-wide text-slate-500">Total da campanha</td>
              <td className="px-3 py-3 text-right">{fmtCurrency(totals.costInLocalCurrency, currency)}</td>
              <td className="px-3 py-3 text-right">{fmtNum(totals.impressions)}</td>
              <td className="px-3 py-3 text-right">{fmtNum(totals.clicks)}</td>
              <td className="px-3 py-3 text-right">{totalCtr}%</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">{totals.externalWebsiteConversions}</td>
              <td className="px-3 py-3 text-right">{totals.oneClickLeads}</td>
              <td className="px-4 py-3 text-right">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

(O rodapé soma TODAS as empresas — independente da seleção — conforme o spec.)

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: somente o aviso baseline TS5101; exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/AccountPerformanceTable.tsx
git commit -m "feat(campaign): tabela de performance por empresa com selecao"
```

---

### Task 8: Integração em `CampaignAnalytics.tsx`

**Files:**
- Modify: `src/app/campaigns/CampaignAnalytics.tsx`

- [ ] **Step 1: Adicionar imports**

```ts
import { AccountComparisonChart } from './AccountComparisonChart';
import { AccountPerformanceTable } from './AccountPerformanceTable';
import { accountColor } from './accountAnalytics';
import { aggregateAccounts } from '@/lib/linkedin';
import type { CampaignAnalyticsByAccount } from '@/lib/linkedin';
```

E acrescentar `getMockAnalyticsByAccount` ao import existente de `@/lib/mockCampaignData`:

```ts
import { isMockCampaign, MOCK_CAMPAIGN, getMockAnalyticsFull, getMockComments, getMockAnalyticsByAccount } from '@/lib/mockCampaignData';
```

- [ ] **Step 2: Adicionar estado de seleção e carga por empresa**

Junto aos `useState` existentes (após a linha do `deleteLoading`):

```ts
const [byAccount, setByAccount] = useState<CampaignAnalyticsByAccount | null>(null);
const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
```

No `loadAnalytics` (callback existente), o ramo mock passa a carregar também os dados por conta; o ramo real zera `byAccount`:

```ts
const loadAnalytics = useCallback(async () => {
  setLoading(true);
  try {
    if (isMockCampaign(campaignId)) {
      await new Promise(r => setTimeout(r, 400));
      const byAcc = getMockAnalyticsByAccount(dateRange);
      setByAccount(byAcc);
      setSelectedAccountIds(prev => prev.size > 0 ? prev : new Set(byAcc.accounts.map(a => a.accountId)));
      setData(getMockAnalyticsFull(dateRange));
    } else {
      setByAccount(null);
      const result = await fetchCampaignAnalyticsFull(campaignId, dateRange);
      setData(result);
    }
  } catch (err) {
    console.error('[CampaignAnalytics] Erro:', err);
  } finally {
    setLoading(false);
  }
}, [campaignId, dateRange]);
```

(Trocar de range mantém a seleção — os `accountId`s não mudam.)

- [ ] **Step 3: Toggle de seleção (nunca esvazia) e view agregada da seleção**

Logo após `loadAnalytics`/`useEffect`, adicionar:

```ts
const toggleAccount = useCallback((accountId: string) => {
  setSelectedAccountIds(prev => {
    const next = new Set(prev);
    if (next.has(accountId)) {
      if (next.size === 1) return prev; // nunca permite seleção vazia
      next.delete(accountId);
    } else {
      next.add(accountId);
    }
    return next;
  });
}, []);

const accounts = byAccount?.accounts ?? [];
const selectedAccounts = React.useMemo(
  () => accounts.filter(a => selectedAccountIds.has(a.accountId)),
  [byAccount, selectedAccountIds],
);
const allSelected = accounts.length > 0 && selectedAccounts.length === accounts.length;
const selectAll = () => setSelectedAccountIds(new Set(accounts.map(a => a.accountId)));
```

Substituir a linha `const d = data; // shorthand` por:

```ts
// View do dashboard: agregado da seleção quando há dados por empresa.
// Deltas vs período anterior só com todas selecionadas (não há delta por subconjunto).
const d: CampaignAnalyticsFull | null = React.useMemo(() => {
  if (!byAccount || loading) return data;
  const agg = aggregateAccounts(selectedAccounts, byAccount.currency);
  return { ...agg, delta: allSelected ? (data?.delta ?? {}) : {} };
}, [byAccount, data, selectedAccounts, allSelected, loading]);
```

- [ ] **Step 4: Chips de filtro por empresa**

Entre o bloco do Header (fecha em `</div>` antes do comentário `{/* 2-column layout */}`) e o layout de 2 colunas, inserir:

```tsx
{/* Filtro por empresa (1 ad set = 1 empresa) */}
{accounts.length > 0 && (
  <div className="flex flex-wrap items-center gap-2">
    <button
      onClick={selectAll}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        allSelected
          ? 'bg-[#FFF1ED] border-[#FF5F39]/30 text-[#E54A26]'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      Todas
    </button>
    {accounts.map((a, i) => {
      const active = selectedAccountIds.has(a.accountId);
      return (
        <button
          key={a.accountId}
          onClick={() => toggleAccount(a.accountId)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            active
              ? 'bg-white border-slate-300 text-slate-800 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? accountColor(i) : '#cbd5e1' }} />
          {a.accountName}
        </button>
      );
    })}
  </div>
)}
```

- [ ] **Step 5: Trocar o gráfico quando há dados por empresa**

Envolver a Section 2 (card "Engajamento ao longo do tempo", o `<div className="bg-white p-6 rounded-xl ...">` inteiro) em condicional — o card existente fica como ramo `else` (campanhas reais):

```tsx
{/* Section 2 — Chart */}
{byAccount ? (
  <AccountComparisonChart accounts={accounts} selectedIds={selectedAccountIds} currency={currency} loading={loading} />
) : (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    {/* ...card AreaChart existente, inalterado... */}
  </div>
)}
```

- [ ] **Step 6: Substituir o placeholder MEMBER_COMPANY pela tabela**

Remover por completo a `{/* Section 7 — Standard Tier info */}` (o card com `<Info ...>` e o texto "Performance por empresa estará disponível após ativação do LinkedIn Standard tier..."). No lugar:

```tsx
{/* Section 7 — Performance por Empresa */}
{byAccount && (loading
  ? <SkeletonCard className="h-64" />
  : <AccountPerformanceTable accounts={accounts} selectedIds={selectedAccountIds} onToggle={toggleAccount} currency={currency} />
)}
```

(Para campanhas reais — `byAccount === null` — nada renderiza, conforme o spec.)

Se o import de `Info` do lucide-react ficar sem uso (ainda é usado pelo `SmallCard` com tooltip — conferir), manter; caso contrário remover do import.

- [ ] **Step 7: Verificar compilação e build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc com apenas o aviso baseline; build conclui sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/app/campaigns/CampaignAnalytics.tsx
git commit -m "feat(campaign): dashboard analytics com separacao por empresa"
```

---

### Task 9: Verificação manual no navegador

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev` (background) e abrir `http://localhost:5173/campaigns/mock-abm-001`.

- [ ] **Step 2: Checklist visual**

1. Chips das 5 empresas (TechCorp Brasil, Innovatech, DataDriven Solutions, ScaleUp Ventures, Quantum Bank) aparecem abaixo do header, todas ativas; "Todas" destacado.
2. Tabela "Performance por Empresa" no lugar do antigo placeholder MEMBER_COMPANY, ordenada por Spend desc, rodapé "Total da campanha" igual à soma visual das linhas.
3. KPI "Total Spend" do topo == rodapé da tabela (consistência por construção).
4. Desmarcar 3 empresas (deixar 2): KPIs/conversões/social diminuem; delta badges somem; gráfico mostra só 2 linhas; rodapé da tabela NÃO muda.
5. Tentar desmarcar a última empresa selecionada: seleção permanece (nunca esvazia).
6. Seletor de métrica do gráfico (Impressões | Clicks | Investimento) troca as séries; tooltip de Investimento formata como moeda.
7. Trocar range (7d/30d/90d): dados mudam, seleção de empresas é mantida.
8. "Todas": volta ao agregado completo, delta badges reaparecem.
9. Coluna de comentários inalterada à direita.
10. Console do browser sem erros/warnings novos.

- [ ] **Step 3: Se tudo passar, encerrar o dev server**

Nenhum commit nesta task (não há mudança de código). Se algo falhar, corrigir na task correspondente antes de prosseguir.
