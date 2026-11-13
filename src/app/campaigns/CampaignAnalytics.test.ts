import { describe, it, expect } from 'vitest';
import { analyticsView, derivedMetric } from './CampaignAnalytics';

describe('analyticsView', () => {
  it('zero impressões num resumo que carregou = sem entrega, sem aviso de divisão', () => {
    expect(analyticsView({ loading: false, data: { impressions: 0 }, breakdownFailed: true }))
      .toEqual({ state: 'empty', showBreakdownError: false });
  });

  it('resumo que falhou é erro, não "sem entrega"', () => {
    expect(analyticsView({ loading: false, data: { impressions: 0, error: 'HTTP 500' } }).state).toBe('error');
    expect(analyticsView({ loading: false, data: null }).state).toBe('error');
    expect(analyticsView({ loading: false, data: { impressions: 10 }, loadError: 'rede' }).state).toBe('error');
  });

  it('com entrega: mostra os números; divisão indisponível só se ela falhou', () => {
    expect(analyticsView({ loading: false, data: { impressions: 10 } }))
      .toEqual({ state: 'data', showBreakdownError: false });
    expect(analyticsView({ loading: false, data: { impressions: 10 }, breakdownFailed: true }).showBreakdownError).toBe(true);
  });

  it('carregando vence tudo', () => {
    expect(analyticsView({ loading: true, data: null }).state).toBe('loading');
  });
});

describe('derivedMetric', () => {
  it('denominador zero ou ausente → null ("—"), mesmo com "0" do servidor', () => {
    expect(derivedMetric('0', 0)).toBeNull();
    expect(derivedMetric('0', undefined)).toBeNull();
    expect(derivedMetric('1.25', 10)).toBe(1.25);
    expect(derivedMetric(null, 10)).toBeNull();
  });
});
