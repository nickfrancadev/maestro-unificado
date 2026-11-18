import { describe, it, expect } from 'vitest';
import { analyticsWindowStart, MAX_LOOKBACK_DAYS } from './analyticsRange';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(Date.UTC(2026, 10, 18));

describe('janela do analytics — padrão é a vida da campanha', () => {
  it('sem período escolhido, começa no início da campanha', () => {
    const start = Date.UTC(2026, 7, 1);
    expect(analyticsWindowStart(undefined, String(start), now).getTime()).toBe(start);
    expect(analyticsWindowStart('all', '2026-08-01', now).toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('7, 30 e 90 dias continuam disponíveis', () => {
    expect(now.getTime() - analyticsWindowStart('7d', null, now).getTime()).toBe(7 * DAY);
    expect(now.getTime() - analyticsWindowStart('30d', null, now).getTime()).toBe(30 * DAY);
    expect(now.getTime() - analyticsWindowStart('90d', null, now).getTime()).toBe(90 * DAY);
  });

  it('sem data de início conhecida, últimos 365 dias', () => {
    expect(now.getTime() - analyticsWindowStart('all', null, now).getTime()).toBe(365 * DAY);
  });

  it('não volta além de 2 anos nem passa de hoje', () => {
    expect(now.getTime() - analyticsWindowStart('all', '2019-01-01', now).getTime()).toBe(MAX_LOOKBACK_DAYS * DAY);
    expect(analyticsWindowStart('all', '2027-01-01', now).getTime()).toBe(now.getTime());
  });
});
