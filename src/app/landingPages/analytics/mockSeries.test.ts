import { describe, it, expect, beforeEach } from 'vitest';
import { buildFunnel, buildLpSeries, buildPerAccountRows } from './mockSeries';

function mem(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  } as Storage;
}

beforeEach(() => { (globalThis as any).localStorage = mem(); });

describe('buildLpSeries', () => {
  it('is deterministic for the same landingPageId', () => {
    const a = buildLpSeries('lp-abc');
    const b = buildLpSeries('lp-abc');
    expect(a).toEqual(b);
  });

  it('differs across landingPageIds', () => {
    const a = buildLpSeries('lp-abc');
    const b = buildLpSeries('lp-xyz');
    expect(a).not.toEqual(b);
  });

  it('produces ~30 days of data, sorted ascending', () => {
    const series = buildLpSeries('lp-abc');
    expect(series.length).toBeGreaterThanOrEqual(30);
    const dates = series.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('buildFunnel', () => {
  it('never divides by zero (guards NaN)', () => {
    // Even a fresh page with no baseline traffic in some edge case should not NaN.
    const funnel = buildFunnel('lp-empty-seed-x');
    expect(Number.isNaN(funnel.ctaRate)).toBe(false);
    expect(Number.isNaN(funnel.formRate)).toBe(false);
  });

  it('rates are consistent with totals', () => {
    const funnel = buildFunnel('lp-abc');
    expect(funnel.ctaRate).toBeCloseTo(funnel.views > 0 ? (funnel.ctaClicks / funnel.views) * 100 : 0);
    expect(funnel.formRate).toBeCloseTo(funnel.ctaClicks > 0 ? (funnel.formSubmits / funnel.ctaClicks) * 100 : 0);
  });
});

describe('buildPerAccountRows', () => {
  it('returns an empty array when there are no tracked events', () => {
    expect(buildPerAccountRows('lp-no-events')).toEqual([]);
  });
});
