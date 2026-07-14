import type { PageEvent } from '../store/tracking';

const DAY = 86_400_000;

export function evaluateIntent(events: PageEvent[], accountId: string): { fired: boolean; reason: string } {
  const mine = events.filter((e) => e.accountId === accountId);
  const deepScroll = mine.some((e) => e.type === 'scroll_depth' && (e.value ?? 0) >= 80);
  const clickedCta = mine.some((e) => e.type === 'cta_click');
  if (deepScroll && clickedCta) return { fired: true, reason: 'Scroll ≥80% + clique no CTA' };

  const views = mine.filter((e) => e.type === 'page_view').map((e) => Date.parse(e.ts)).sort((a, b) => a - b);
  for (let i = 1; i < views.length; i += 1) {
    if (views[i] - views[0] <= 7 * DAY) return { fired: true, reason: '2+ visitas em 7 dias' };
  }
  return { fired: false, reason: '' };
}
