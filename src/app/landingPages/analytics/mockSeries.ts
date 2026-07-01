// Deterministic mock time series + funnel + per-account breakdown for the LP
// analytics screen. The baseline series is seeded off the landingPageId
// string hash (no Math.random/Date.now) so it renders identically across
// reloads/renders for a given page. Real tracked events (from tracking.ts)
// are merged in on top so the screen reflects genuine activity generated on
// the public page during the session.
import { listEvents } from '../store/tracking';
import { listAccounts } from '../store/accounts';

export interface LpSeriesPoint {
  date: string;
  views: number;
  ctaClicks: number;
  formSubmits: number;
}

export interface LpFunnel {
  views: number;
  ctaClicks: number;
  formSubmits: number;
  ctaRate: number; // % of views that clicked the CTA
  formRate: number; // % of CTA clicks that submitted the form
}

export interface LpAccountRow {
  accountId: string;
  accountName: string;
  views: number;
  ctaClicks: number;
  formSubmits: number;
  conversion: number; // % of views that submitted the form
}

const SERIES_DAYS = 30;
const ANON_ACCOUNT_ID = 'anonymous';
const ANON_ACCOUNT_NAME = 'Anônimo/Direto';

// Simple deterministic string hash (djb2-like) — stable seed per page id.
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(h) >>> 0;
}

// Deterministic LCG PRNG seeded by a number — no Math.random/Date.now.
function createRng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function dateKeysEndingToday(days: number): string[] {
  const anchor = new Date('2026-07-01T00:00:00.000Z');
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

/** Deterministic ~30-day baseline series, seeded off landingPageId, merged with real events. */
export function buildLpSeries(landingPageId: string): LpSeriesPoint[] {
  const rand = createRng(hashString(landingPageId) || 1);
  const dates = dateKeysEndingToday(SERIES_DAYS);

  const baseline = new Map<string, LpSeriesPoint>();
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const growth = 1 + i * 0.01;
    const noise = 0.75 + rand() * 0.5;
    const views = Math.round((8 + rand() * 14) * growth * noise);
    const ctaClicks = Math.round(views * (0.18 + rand() * 0.12));
    const formSubmits = Math.round(ctaClicks * (0.25 + rand() * 0.2));
    baseline.set(date, { date, views, ctaClicks, formSubmits });
  }

  // Fold real tracked events on top of the baseline, bucketed by day.
  const events = listEvents(landingPageId);
  for (const e of events) {
    const day = e.ts.slice(0, 10);
    let point = baseline.get(day);
    if (!point) {
      point = { date: day, views: 0, ctaClicks: 0, formSubmits: 0 };
      baseline.set(day, point);
    }
    if (e.type === 'page_view') point.views += 1;
    else if (e.type === 'cta_click') point.ctaClicks += 1;
    else if (e.type === 'form_submit') point.formSubmits += 1;
  }

  return [...baseline.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Funnel totals (view -> CTA -> form) derived from the merged series, with guarded rates. */
export function buildFunnel(landingPageId: string): LpFunnel {
  const series = buildLpSeries(landingPageId);
  const views = series.reduce((sum, p) => sum + p.views, 0);
  const ctaClicks = series.reduce((sum, p) => sum + p.ctaClicks, 0);
  const formSubmits = series.reduce((sum, p) => sum + p.formSubmits, 0);
  return {
    views,
    ctaClicks,
    formSubmits,
    ctaRate: views > 0 ? (ctaClicks / views) * 100 : 0,
    formRate: ctaClicks > 0 ? (formSubmits / ctaClicks) * 100 : 0,
  };
}

/** Per-account breakdown from real tracked events, joined with account names. */
export function buildPerAccountRows(landingPageId: string): LpAccountRow[] {
  const events = listEvents(landingPageId);
  const accountsById = new Map(listAccounts().map((a) => [a.id, a.name]));

  const byAccount = new Map<string, LpAccountRow>();
  for (const e of events) {
    const accountId = e.accountId ?? ANON_ACCOUNT_ID;
    let row = byAccount.get(accountId);
    if (!row) {
      row = {
        accountId,
        accountName: accountId === ANON_ACCOUNT_ID ? ANON_ACCOUNT_NAME : (accountsById.get(accountId) ?? accountId),
        views: 0,
        ctaClicks: 0,
        formSubmits: 0,
        conversion: 0,
      };
      byAccount.set(accountId, row);
    }
    if (e.type === 'page_view') row.views += 1;
    else if (e.type === 'cta_click') row.ctaClicks += 1;
    else if (e.type === 'form_submit') row.formSubmits += 1;
  }

  return [...byAccount.values()]
    .map((row) => ({ ...row, conversion: row.views > 0 ? (row.formSubmits / row.views) * 100 : 0 }))
    .sort((a, b) => b.views - a.views);
}
