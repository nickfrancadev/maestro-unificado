import { describe, expect, it } from 'vitest';
import { CHURN_ANALYSIS } from './churnAnalysis.mock';
import {
  CHURN_PLAY_TYPES,
  type ChurnSummary,
  type ChurnWindowKey,
} from './churnAnalysis.types';

const WINDOWS: ChurnWindowKey[] = ['30d', '90d', '365d'];
const SUMMARY_KEYS: (keyof ChurnSummary)[] = [
  'playsCount',
  'avgTouchpoints',
  'avgContacts',
  'avgInteractions',
  'avgDaysToClose',
];

function playsIn(key: ChurnWindowKey): number {
  return CHURN_ANALYSIS.windows[key].total.byType.reduce(
    (acc, metric) => acc + metric.playsCount,
    0
  );
}

describe('mock do dashboard de plays', () => {
  it('expõe as três janelas do payload real', () => {
    expect(Object.keys(CHURN_ANALYSIS.windows).sort()).toEqual(
      ['30d', '365d', '90d']
    );
  });

  it('encaixa as janelas: 30d ⊆ 90d ⊆ 365d', () => {
    // a janela maior contém a menor, então nunca pode ter menos plays
    expect(playsIn('30d')).toBeLessThanOrEqual(playsIn('90d'));
    expect(playsIn('90d')).toBeLessThanOrEqual(playsIn('365d'));
  });

  it.each(WINDOWS)('em %s, o summary bate com a soma por tipo', (key) => {
    const window = CHURN_ANALYSIS.windows[key];
    expect(window.summary.playsCount.current).toBe(playsIn(key));
  });

  it.each(WINDOWS)('em %s, o delta de cada KPI é current - previous', (key) => {
    const { summary } = CHURN_ANALYSIS.windows[key];
    for (const metricKey of SUMMARY_KEYS) {
      const metric = summary[metricKey];
      expect(metric.delta).toBeCloseTo(metric.current - metric.previous, 2);
    }
  });

  it.each(WINDOWS)('em %s, deltaPercentage é null só quando não há base', (key) => {
    const { summary } = CHURN_ANALYSIS.windows[key];
    for (const metricKey of SUMMARY_KEYS) {
      const metric = summary[metricKey];
      if (metric.previous === 0) {
        expect(metric.deltaPercentage).toBeNull();
      } else {
        expect(metric.deltaPercentage).toBe(
          Math.round(((metric.current - metric.previous) / metric.previous) * 100)
        );
      }
    }
  });

  it.each(WINDOWS)('em %s, todos os tipos aparecem na ordem fixa', (key) => {
    const byType = CHURN_ANALYSIS.windows[key].total.byType;
    expect(byType.map((metric) => metric.type)).toEqual(CHURN_PLAY_TYPES);
  });

  it.each(WINDOWS)('em %s, abertas + fechadas = total, por tipo', (key) => {
    for (const metric of CHURN_ANALYSIS.windows[key].total.byType) {
      expect(metric.open + metric.closed).toBe(metric.playsCount);
    }
  });

  it.each(WINDOWS)('em %s, byCompany traz só a conta logada', (key) => {
    // a chamada real é escopada (`?company_id=<própria>`), então o breakdown
    // tem uma entrada e ela repete o total — não é uma carteira
    const window = CHURN_ANALYSIS.windows[key];
    expect(window.byCompany).toHaveLength(1);
    for (const type of CHURN_PLAY_TYPES) {
      const own = window.byCompany[0].byType.find((entry) => entry.type === type)!;
      const total = window.total.byType.find((entry) => entry.type === type)!;
      expect(own.playsCount).toBe(total.playsCount);
    }
  });

  it('é determinístico: reimportar devolve os mesmos números', async () => {
    const again = await import('./churnAnalysis.mock');
    expect(again.CHURN_ANALYSIS.windows['30d'].summary.playsCount.current).toBe(
      CHURN_ANALYSIS.windows['30d'].summary.playsCount.current
    );
  });
});
