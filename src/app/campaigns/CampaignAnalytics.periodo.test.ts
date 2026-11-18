import { describe, it, expect } from 'vitest';
import { DATE_RANGES, DEFAULT_DATE_RANGE } from './CampaignAnalytics';
import { analyticsQuery } from '@/lib/linkedin/analytics';

describe('analytics abre na vida da campanha, não em 30 dias fixos', () => {
  it('o padrão é "Vida da campanha"', () => {
    expect(DEFAULT_DATE_RANGE).toBe('all');
    expect(DATE_RANGES.find((r) => r.key === DEFAULT_DATE_RANGE)?.label).toBe('Vida da campanha');
  });

  it('a busca leva a data de início da campanha', () => {
    expect(analyticsQuery('123', 'all', 1785542400000)).toBe('campaignId=123&dateRange=all&start=1785542400000');
    expect(analyticsQuery('123', '30d', 1785542400000)).toBe('campaignId=123&dateRange=30d');
  });
});
