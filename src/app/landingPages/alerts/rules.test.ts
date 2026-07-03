import { describe, it, expect } from 'vitest';
import { evaluateIntent } from './rules';
import type { PageEvent } from '../store/tracking';

const ev = (type: PageEvent['type'], value?: number, ts = '2026-07-01T10:00:00.000Z'): PageEvent =>
  ({ id: 'x', landingPageId: 'lp1', accountId: 'a1', type, value, ts });

describe('evaluateIntent', () => {
  it('fires on scroll>=80 + cta_click', () => {
    const r = evaluateIntent([ev('scroll_depth', 80), ev('cta_click')], 'a1');
    expect(r.fired).toBe(true);
  });
  it('fires on 2+ page_views in 7 days', () => {
    const r = evaluateIntent([ev('page_view', undefined, '2026-06-28T10:00:00.000Z'), ev('page_view', undefined, '2026-07-01T10:00:00.000Z')], 'a1');
    expect(r.fired).toBe(true);
  });
  it('does not fire on a single page_view', () => {
    expect(evaluateIntent([ev('page_view')], 'a1').fired).toBe(false);
  });
  it('ignores events from other accounts', () => {
    const other = { ...ev('cta_click'), accountId: 'a2' };
    expect(evaluateIntent([ev('scroll_depth', 90), other], 'a1').fired).toBe(false);
  });
});
