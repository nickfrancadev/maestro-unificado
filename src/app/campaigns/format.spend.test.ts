import { describe, it, expect } from 'vitest';
import { spendStatement, daysInclusive, fmtMoney } from './format';

describe('spendStatement: o orçamento é por empresa e a conta fica escrita', () => {
  it('diário: total por dia, a multiplicação e o mês', () => {
    const s = spendStatement({ perAdSet: 10, adSets: 2, budgetType: 'daily', currency: 'USD' });
    expect(s.headline).toBe('Você vai gastar até US$ 20,00 por dia (2 empresas × US$ 10,00), ≈ US$ 600,00 por mês.');
    expect(s.detail).toMatch(/Sem data de encerramento/);
  });

  it('com data de encerramento, mostra o máximo do período', () => {
    const s = spendStatement({ perAdSet: 10, adSets: 2, budgetType: 'daily', currency: 'USD', startDate: '2026-12-01', endDate: '2026-12-31' });
    expect(s.detail).toBe('De 01/12/2026 a 31/12/2026 (31 dias), o máximo é US$ 620,00.');
    expect(s.maxTotal).toBe(620);
  });

  it('total: soma das empresas, sem "por mês"', () => {
    const s = spendStatement({ perAdSet: 100, adSets: 1, budgetType: 'total', currency: 'BRL' });
    expect(s.headline).toBe('Você vai gastar até R$ 100,00 no total (1 empresa × R$ 100,00).');
  });

  it('valores grandes não são compactados', () => {
    expect(fmtMoney(12345.6, 'BRL')).toBe('R$ 12.345,60');
  });

  it('dias contam as duas pontas e recusam fim antes do início', () => {
    expect(daysInclusive('2026-11-13', '2026-11-13')).toBe(1);
    expect(daysInclusive('2026-11-13', '2026-11-12')).toBeNull();
    expect(daysInclusive('2026-11-13', '')).toBeNull();
  });
});
