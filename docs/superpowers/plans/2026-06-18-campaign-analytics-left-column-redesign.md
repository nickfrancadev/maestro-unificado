# Campaign Analytics — Left Column Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the left column of the campaign analytics screen so a user comparing per-company ad performance can rank companies at a glance and drill into one — inline-expand on desktop, full-screen replace on mobile.

**Architecture:** Add a single `detailAccountId` state to `CampaignAnalytics.tsx` that drives a dual mode (overview ↔ company detail). Extract a reusable `AccountDetailPanel` rendered inline (desktop) inside the sortable `AccountPerformanceTable` or full-screen (mobile) in place of the overview. Reorder overview sections so the comparative table + chart sit directly under the KPIs and aggregate metrics drop below a "this is a sum" label.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS 4, Recharts 2, Lucide icons, Vite. **No test framework exists in this project** — verification is `npx tsc --noEmit` + `npm run build` + visual check in `npm run dev`.

## Global Constraints

- No new dependencies. Use existing Recharts, Lucide, Tailwind only.
- Breakpoint for desktop/mobile mode switch: `lg` (1024px), consistent with the existing `lg:w-[65%]` / `lg:w-[35%]` layout.
- Brand orange: `#FF5F39` (primary), `#E54A26` (active text), `#FFF1ED` (active bg). Company colors come from `accountColor(index)` in `src/app/campaigns/accountAnalytics.ts`.
- Currency symbol: `R$` for `BRL`, `$` otherwise. Use existing `fmtCurrency`/`fmtNum` from `src/app/campaigns/format.ts`.
- Right column (`AccountFocusSwitcher`, `AccountAdPreview`, `CommentsCard`) must NOT change behavior.
- Stable company color = index of the account in the original `byAccount.accounts` order. Never reindex after sort.
- All text in PT-BR, matching existing copy style.

---

### Task 1: Extract `AccountDetailPanel` (reusable single-company detail)

Pulls the per-company detail content into one component reused by both desktop inline-expand and mobile full-screen. Mirrors the aggregate sections that already exist in `CampaignAnalytics.tsx` (KPIs, social, conversions) but scoped to ONE account's `totals` + `timeSeries`.

**Files:**
- Create: `src/app/campaigns/AccountDetailPanel.tsx`
- Reference (read-only, for markup patterns): `src/app/campaigns/CampaignAnalytics.tsx:442-507` (SmallCard/IconCard usage), `src/app/campaigns/AccountComparisonChart.tsx` (chart pattern)

**Interfaces:**
- Consumes: `AccountAnalytics` (from `@/lib/linkedin`), `accountColor` + `buildComparisonData` (from `./accountAnalytics`), `fmtCurrency`/`fmtNum` (from `./format`).
- Produces: `export function AccountDetailPanel(props: AccountDetailPanelProps)` and `export interface AccountDetailPanelProps { account: AccountAnalytics; colorIndex: number; currency: string; variant: 'inline' | 'fullscreen'; onBack?: () => void; }`. The `variant` controls padding/border; `onBack` renders the "← Voltar" header only in `fullscreen`.

- [ ] **Step 1: Create the component with KPI row + back header**

```tsx
// src/app/campaigns/AccountDetailPanel.tsx
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowLeft, DollarSign, Eye, MousePointerClick, TrendingUp, Heart, Share2, MessageCircle, UserPlus } from 'lucide-react';
import type { AccountAnalytics } from '@/lib/linkedin';
import { accountColor } from './accountAnalytics';
import { fmtCurrency, fmtNum, fmtDateLabel } from './format';

export interface AccountDetailPanelProps {
  account: AccountAnalytics;
  colorIndex: number;
  currency: string;
  variant: 'inline' | 'fullscreen';
  onBack?: () => void;
}

export function AccountDetailPanel({ account, colorIndex, currency, variant, onBack }: AccountDetailPanelProps) {
  const t = account.totals;
  const color = accountColor(colorIndex);
  const cy = currency === 'BRL' ? 'R$' : '$';
  const ctr = t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(2) : '0';
  const cpc = t.clicks > 0 ? (t.costInLocalCurrency / t.clicks).toFixed(2) : '0';
  const gradId = React.useId();
  const series = account.timeSeries.map(p => ({ ...p, dateLabel: fmtDateLabel(p.date) }));

  const wrap = variant === 'fullscreen'
    ? 'space-y-4'
    : 'bg-slate-50/60 border-t border-slate-100 px-4 py-4 space-y-4';

  return (
    <div className={wrap}>
      {variant === 'fullscreen' && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[#E54A26] bg-[#FFF1ED] border border-[#FF5F39]/30 rounded-lg px-3 py-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar · {account.accountName}
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" style={{ color }} /> Spend</p>
          <p className="text-lg font-bold text-slate-900">{fmtCurrency(t.costInLocalCurrency, currency)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-600" /> Impressões</p>
          <p className="text-lg font-bold text-slate-900">{fmtNum(t.impressions)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-purple-600" /> Clicks</p>
          <p className="text-lg font-bold text-slate-900">{fmtNum(t.clicks)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-600" /> CTR · CPC</p>
          <p className="text-lg font-bold text-slate-900">{ctr}% · {cy}{cpc}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500 mb-3">Evolução · {account.accountName}</p>
        <div className="h-[180px] w-full">
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id={`d-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} />
                <Area type="monotone" dataKey="impressions" name="Impressões" stroke={color} strokeWidth={2} fill={`url(#d-${gradId})`} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> Likes</p><p className="text-base font-bold text-slate-900">{fmtNum(t.likes)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-blue-500" /> Shares</p><p className="text-base font-bold text-slate-900">{fmtNum(t.shares)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-amber-500" /> Comments</p><p className="text-base font-bold text-slate-900">{fmtNum(t.comments)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-green-500" /> Follows</p><p className="text-base font-bold text-slate-900">{fmtNum(t.follows)}</p></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AccountDetailPanel.tsx`. (If `AccountAnalyticsTotals` lacks `likes`/`shares`/`comments`/`follows`, open `src/lib/linkedin/analytics.ts` around line 295 to confirm the exact field names and adjust — they are used by the existing aggregate cards so they exist.)

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/AccountDetailPanel.tsx
git commit -m "feat(analytics): add reusable AccountDetailPanel for per-company drill-down"
```

---

### Task 2: Add sorting + magnitude bars to `AccountPerformanceTable`

Make the comparison table answer "who's winning" without leaving the page: clickable sortable column headers and inline magnitude bars on Spend & Impressões.

**Files:**
- Modify: `src/app/campaigns/AccountPerformanceTable.tsx` (whole file — see Task 4 for the expand wiring; this task does sort + bars only)
- Reference: `src/app/campaigns/accountAnalytics.ts:35-57` (`AccountRow`, `buildAccountRows`)

**Interfaces:**
- Consumes: `buildAccountRows` (returns `AccountRow[]` with `account`, `colorIndex`, `ctr`, `cpc`, `cpl`), `accountColor`, `sumTotals`.
- Produces: internal `sortKey`/`sortDir` state; a `SortableTh` helper local to the file. No exported signature change yet (props stay `{ accounts, selectedIds, onToggle, currency }`).

- [ ] **Step 1: Add sort state and a comparator at the top of the component**

In `AccountPerformanceTable.tsx`, after `const rows = useMemo(...)` (line 16), add:

```tsx
type SortKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'conv' | 'leads' | 'cpl';
const [sortKey, setSortKey] = React.useState<SortKey>('spend');
const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

const sortVal = (r: typeof rows[number], k: SortKey): number => {
  const t = r.account.totals;
  switch (k) {
    case 'spend': return t.costInLocalCurrency;
    case 'impressions': return t.impressions;
    case 'clicks': return t.clicks;
    case 'ctr': return parseFloat(r.ctr);
    case 'cpc': return parseFloat(r.cpc);
    case 'conv': return t.externalWebsiteConversions;
    case 'leads': return t.oneClickLeads;
    case 'cpl': return r.cpl ? parseFloat(r.cpl) : -1;
  }
};

const sortedRows = React.useMemo(() => {
  const arr = [...rows];
  arr.sort((a, b) => (sortVal(a, sortKey) - sortVal(b, sortKey)) * (sortDir === 'asc' ? 1 : -1));
  return arr;
}, [rows, sortKey, sortDir]);

const onSort = (k: SortKey) => {
  if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
  else { setSortKey(k); setSortDir('desc'); }
};

const maxSpend = Math.max(1, ...rows.map(r => r.account.totals.costInLocalCurrency));
const maxImpr = Math.max(1, ...rows.map(r => r.account.totals.impressions));
```

Add `import React, { useMemo } from 'react';` already exists — ensure `React` is imported (it is, line 1).

- [ ] **Step 2: Add a `SortableTh` helper above the `return`**

```tsx
const SortableTh = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
  <th
    onClick={() => onSort(k)}
    aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    className="px-3 py-2.5 font-medium text-right cursor-pointer select-none hover:text-slate-600"
  >
    <span className="inline-flex items-center gap-1 justify-end">
      {children}
      <span className="text-slate-300">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
    </span>
  </th>
);
```

- [ ] **Step 3: Replace the numeric `<th>` cells with `SortableTh`**

In the `<thead>` (lines 35-46), replace the Spend/Impressões/Clicks/CTR/CPC/Conv./Leads/CPL `<th>` elements:

```tsx
<th className="px-4 py-2.5 w-8" />
<th className="px-2 py-2.5 font-medium">Empresa</th>
<SortableTh k="spend">Spend</SortableTh>
<SortableTh k="impressions">Impressões</SortableTh>
<SortableTh k="clicks">Clicks</SortableTh>
<SortableTh k="ctr">CTR</SortableTh>
<SortableTh k="cpc">CPC</SortableTh>
<SortableTh k="conv">Conv.</SortableTh>
<SortableTh k="leads">Leads</SortableTh>
<SortableTh k="cpl">CPL</SortableTh>
```

- [ ] **Step 4: Iterate `sortedRows` and add magnitude bars to Spend & Impressões cells**

Replace `{rows.map(...)}` with `{sortedRows.map(...)}` (line 49). Replace the Spend cell (line 76) and Impressões cell (line 77) with:

```tsx
<td className="px-3 py-3 text-right font-medium text-slate-800">
  <span className="inline-flex items-center gap-2 justify-end w-full">
    <span className="h-1.5 rounded-full" style={{ width: `${Math.round((account.totals.costInLocalCurrency / maxSpend) * 40)}px`, backgroundColor: accountColor(colorIndex) }} />
    {fmtCurrency(account.totals.costInLocalCurrency, currency)}
  </span>
</td>
<td className="px-3 py-3 text-right text-slate-600">
  <span className="inline-flex items-center gap-2 justify-end w-full">
    <span className="h-1.5 rounded-full bg-slate-300" style={{ width: `${Math.round((account.totals.impressions / maxImpr) * 40)}px` }} />
    {fmtNum(account.totals.impressions)}
  </span>
</td>
```

- [ ] **Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/AccountPerformanceTable.tsx
git commit -m "feat(analytics): sortable columns + magnitude bars in company table"
```

---

### Task 3: Add `detailAccountId` state + responsive mode in `CampaignAnalytics`

Introduce the dual-mode state and a viewport hook so the page knows whether to expand inline (desktop) or replace (mobile). Wire row clicks to open detail and sync the right column's focus.

**Files:**
- Modify: `src/app/campaigns/CampaignAnalytics.tsx` (state block ~line 124-126; helpers; the left column render ~line 366-514)

**Interfaces:**
- Consumes: existing `selectedAccounts`, `accounts`, `setFocusedAccountId`, `AccountDetailPanel` (Task 1).
- Produces: `detailAccountId` state + `openDetail(id)` / `closeDetail()` callbacks + `isDesktop` boolean, passed down in Task 4.

- [ ] **Step 1: Add the viewport hook (inline, no new file)**

After the state declarations (after line 126), add:

```tsx
const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
useEffect(() => {
  const mq = window.matchMedia('(min-width: 1024px)');
  const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}, []);
```

- [ ] **Step 2: Add open/close callbacks that sync the right column**

After `toggleAccount` (after line 179), add:

```tsx
const openDetail = useCallback((accountId: string) => {
  setDetailAccountId(accountId);
  setFocusedAccountId(accountId); // right column (ad preview + comments) follows
}, []);
const closeDetail = useCallback(() => setDetailAccountId(null), []);
```

- [ ] **Step 3: Derive the detail account + its stable color index**

After `focusedColorIndex` (after line 244), add:

```tsx
const detailAccount = React.useMemo(
  () => accounts.find(a => a.accountId === detailAccountId) ?? null,
  [accounts, detailAccountId],
);
const detailColorIndex = detailAccount ? accounts.findIndex(a => a.accountId === detailAccount.accountId) : 0;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`detailAccount`/`closeDetail` may be reported as unused until Task 4 — acceptable mid-task; if the project's tsconfig has `noUnusedLocals`, proceed to Task 4 before building.)

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/CampaignAnalytics.tsx
git commit -m "feat(analytics): add detailAccountId state + responsive mode + right-column sync"
```

---

### Task 4: Wire inline-expand (desktop) and full-screen replace (mobile)

Connect the new state to the UI: desktop renders `AccountDetailPanel` inline inside the table row; mobile replaces the whole left column.

**Files:**
- Modify: `src/app/campaigns/AccountPerformanceTable.tsx` (props + expand row)
- Modify: `src/app/campaigns/CampaignAnalytics.tsx` (left column render branch)

**Interfaces:**
- Consumes: `openDetail`, `detailAccountId`, `isDesktop`, `detailAccount`, `detailColorIndex`, `closeDetail` (Task 3); `AccountDetailPanel` (Task 1).
- Produces: extended `AccountPerformanceTableProps` adding `onOpenDetail: (id: string) => void; expandedId: string | null; expandInline: boolean; currency: string;`.

- [ ] **Step 1: Extend the table props**

In `AccountPerformanceTable.tsx`, replace the interface (lines 8-13):

```tsx
interface AccountPerformanceTableProps {
  accounts: AccountAnalytics[];
  selectedIds: Set<string>;
  onToggle: (accountId: string) => void;
  onOpenDetail: (accountId: string) => void;
  expandedId: string | null;
  expandInline: boolean;   // true on desktop → render AccountDetailPanel under the row
  currency: string;
}
```

Update the destructure (line 15) to `{ accounts, selectedIds, onToggle, onOpenDetail, expandedId, expandInline, currency }` and import the panel + chevrons at the top:

```tsx
import { Building2, ChevronRight, ChevronDown } from 'lucide-react';
import { AccountDetailPanel } from './AccountDetailPanel';
```

- [ ] **Step 2: Change row click to open detail (not toggle) and add a chevron cell**

Replace the `<tr ...>` open tag and its first cell behavior (lines 52-66). The row's `onClick` now calls `onOpenDetail`; the checkbox still toggles selection via its own handler:

```tsx
const expanded = expandedId === account.accountId;
return (
  <React.Fragment key={account.accountId}>
    <tr
      onClick={() => onOpenDetail(account.accountId)}
      className={`cursor-pointer transition-colors ${checked ? 'hover:bg-slate-50' : 'opacity-50 hover:opacity-75'} ${expanded ? 'bg-slate-50' : ''}`}
    >
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(account.accountId)}
          className="accent-[#FF5F39] cursor-pointer"
          aria-label={`Filtrar ${account.accountName}`}
        />
      </td>
```

- [ ] **Step 3: Add the chevron to the Empresa cell**

In the Empresa `<td>` (lines 67-75), prepend a chevron before the color dot so expandability is discoverable:

```tsx
<td className="px-2 py-3">
  <div className="flex items-center gap-2">
    {expandInline && (expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />)}
    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accountColor(colorIndex) }} />
    <div className="min-w-0">
      <p className="font-semibold text-slate-800 truncate">{account.accountName}</p>
      {account.industry && <p className="text-[11px] text-slate-400 truncate">{account.industry}</p>}
    </div>
  </div>
</td>
```

- [ ] **Step 4: Close the `<tr>` and render the inline expand row**

After the closing `</tr>` of the data row (before line 85's `);`), add the expand row and close the Fragment:

```tsx
    </tr>
    {expandInline && expanded && (
      <tr>
        <td colSpan={10} className="p-0">
          <AccountDetailPanel account={account} colorIndex={colorIndex} currency={currency} variant="inline" />
        </td>
      </tr>
    )}
  </React.Fragment>
);
```

Remove the old standalone `key={account.accountId}` on `<tr>` (now on the Fragment) and the old checkbox `onClick={e => e.stopPropagation()}` line (moved to the `<td>`).

- [ ] **Step 5: Render mobile full-screen vs overview in CampaignAnalytics**

In `CampaignAnalytics.tsx`, wrap the LEFT column content (the `<div className="lg:w-[65%] space-y-6">` block, lines 368-514). Immediately inside it, branch:

```tsx
<div className="lg:w-[65%] space-y-6">
  {!isDesktop && detailAccount ? (
    <AccountDetailPanel
      account={detailAccount}
      colorIndex={detailColorIndex}
      currency={currency}
      variant="fullscreen"
      onBack={closeDetail}
    />
  ) : (
    <>
      {/* ...existing Section 1 KPIs through Section 7 table, reordered in Task 5... */}
    </>
  )}
</div>
```

- [ ] **Step 6: Update the table call site with new props**

Replace the `AccountPerformanceTable` usage (line 512):

```tsx
<AccountPerformanceTable
  accounts={accounts}
  selectedIds={selectedAccountIds}
  onToggle={toggleAccount}
  onOpenDetail={openDetail}
  expandedId={isDesktop ? detailAccountId : null}
  expandInline={isDesktop}
  currency={currency}
/>
```

- [ ] **Step 7: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/campaigns/AccountPerformanceTable.tsx src/app/campaigns/CampaignAnalytics.tsx
git commit -m "feat(analytics): inline-expand on desktop, full-screen detail on mobile"
```

---

### Task 5: Reorder the overview sections + label aggregates

Move the comparison table directly under the KPIs (above the chart), and group the aggregate metric sections under a "this is a sum" label.

**Files:**
- Modify: `src/app/campaigns/CampaignAnalytics.tsx` (left column section order, lines 370-513)

**Interfaces:**
- Consumes: existing sections (KPIs, chart, cost, social, conversions, viral, table). No new symbols.
- Produces: none (pure reordering + a label heading).

- [ ] **Step 1: Reorder to KPIs → Table → Chart → labeled aggregates**

Within the overview branch (the `<>...</>` from Task 4 Step 5), arrange the existing blocks in this order:

1. Section 1 — KPI cards (unchanged, lines 370-382).
2. Section 7 — `AccountPerformanceTable` (moved up to here, only when `byAccount`).
3. Section 2 — chart (`AccountComparisonChart` / `AreaChart` fallback, lines 384-429).
4. A heading, then Sections 3–6 (cost, social, conversions, viral):

```tsx
<div className="pt-2">
  <h3 className="text-sm font-semibold text-slate-700">Métricas agregadas</h3>
  <p className="text-xs text-slate-400">Soma das empresas selecionadas — não é por empresa.</p>
</div>
{/* Section 3 cost, Section 4 social, Section 5 conversions, Section 6 viral follow here unchanged */}
```

Keep each section's existing `loading ? <Skeleton/> : <content/>` ternaries intact — only their order moves. Delete the old Section 7 block at the bottom (lines 509-513) since it now lives under the KPIs.

- [ ] **Step 2: Verify the chart still receives `selectedIds` and renders multi-line**

No code change — confirm `AccountComparisonChart accounts={accounts} selectedIds={selectedAccountIds} ...` is intact after the move.

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/campaigns/CampaignAnalytics.tsx
git commit -m "feat(analytics): reorder overview — comparison first, aggregates labeled as sum"
```

---

### Task 6: Visual verification in the running app

No automated tests exist; verify behavior manually against the mock campaign.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open: `http://localhost:5173/campaigns/mock-abm-001`

- [ ] **Step 2: Verify overview (desktop, window ≥1024px wide)**

Confirm, in order from top: KPI cards → "Performance por Empresa" table → "Comparativo por empresa" chart → "Métricas agregadas" heading → cost/social/conversions/viral. Click a numeric column header (e.g. CTR) — rows reorder and a ↑/↓ appears. Spend & Impressões cells show magnitude bars.

- [ ] **Step 3: Verify desktop inline-expand**

Click a company row (not the checkbox) — a detail panel (KPIs + chart + social) expands directly under that row; chevron flips to ▾; other rows stay visible. The right column's ad preview + comments switch to that company. Click again / another row toggles correctly.

- [ ] **Step 4: Verify checkbox still filters**

Click a row's checkbox — it toggles selection (dims row, updates aggregated KPIs) WITHOUT opening the detail. Confirm clicking the checkbox does not expand the row.

- [ ] **Step 5: Verify mobile full-screen (narrow window <1024px)**

Resize below 1024px. Click a company row — the left column is replaced by the full-screen detail with a "← Voltar · {company}" button. Click Voltar — returns to overview. Right column still in sync.

- [ ] **Step 6: Verify right column unchanged**

Carousel arrows, ad preview, and comments behave as before (no regressions).

- [ ] **Step 7: Final commit if any tweaks were needed**

```bash
git add -A && git commit -m "fix(analytics): visual verification adjustments" || echo "no changes"
```

---

## Self-Review

**Spec coverage:**
- Dual mode (overview ↔ detail) → Task 3. ✓
- Desktop inline-expand → Task 4. ✓
- Mobile full-screen replace → Tasks 1 (panel variant) + 4. ✓
- Right column sync → Task 3 Step 2 (`openDetail` sets `focusedAccountId`). ✓
- Reorder, keep all visible, aggregates labeled → Task 5. ✓
- Sortable columns + magnitude bars (option B) → Task 2. ✓
- Row click = open detail, checkbox = filter → Task 4 Steps 2–4. ✓
- `AccountDetailPanel` reused both modes → Task 1 + used in Tasks 4 & 4. ✓
- Right column untouched → enforced; Task 6 Step 6 verifies. ✓
- No semantic color / no accordion / no data-model change → respected (out of scope). ✓

**Placeholder scan:** No TBD/TODO; all code shown inline. Test cycle adapted to project reality (tsc + build + manual) and stated up front. ✓

**Type consistency:** `AccountDetailPanelProps` (Task 1) matches usages in Task 4. `SortKey` union (Task 2) reused consistently. `openDetail`/`closeDetail`/`detailAccountId`/`isDesktop` defined in Task 3, consumed in Task 4. Table props extended once (Task 4 Step 1) and call site updated to match (Task 4 Step 6). ✓
