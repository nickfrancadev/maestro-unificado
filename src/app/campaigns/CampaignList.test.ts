import { describe, it, expect } from 'vitest';
import { budgetUsage } from './CampaignList';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-22T12:00:00Z').getTime();

describe('budgetUsage', () => {
  it('orçamento total: compara gasto com o total', () => {
    const u = budgetUsage({ budget: 1000, budgetType: 'total', startDate: null, endDate: null }, 250, 90, NOW);
    expect(u).toEqual({ base: 1000, pct: 25, days: null });
  });

  it('orçamento diário sem data de início: usa a janela inteira de 90 dias', () => {
    const u = budgetUsage({ budget: 100, budgetType: 'daily', startDate: null, endDate: null }, 4500, 90, NOW)!;
    expect(u.days).toBe(90);
    expect(u.base).toBe(9000);
    expect(u.pct).toBe(50);
  });

  it('orçamento diário: limita aos dias que a campanha existe', () => {
    const u = budgetUsage({ budget: 100, budgetType: 'daily', startDate: NOW - 10 * DAY, endDate: null }, 500, 90, NOW)!;
    expect(u.days).toBe(10);
    expect(u.pct).toBe(50);
  });

  it('não satura em 100% só porque passou de 1 dia', () => {
    const u = budgetUsage({ budget: 150, budgetType: 'daily', startDate: NOW - 30 * DAY, endDate: null }, 3000, 90, NOW)!;
    expect(u.pct).toBeCloseTo(66.67, 1);
  });

  it('campanha encerrada: conta só até o fim; janela null = vida toda', () => {
    const row = { budget: 150, budgetType: 'daily' as const, startDate: NOW - 200 * DAY, endDate: NOW - 100 * DAY };
    expect(budgetUsage(row, 1000, 90, NOW)).toBeNull(); // terminou antes da janela de 90 dias
    expect(budgetUsage(row, 7500, null, NOW)).toEqual({ base: 15000, pct: 50, days: 100 });
  });

  it('sem orçamento: null', () => {
    expect(budgetUsage({ budget: 0, budgetType: 'daily', startDate: null, endDate: null }, 10, 90, NOW)).toBeNull();
  });
});
