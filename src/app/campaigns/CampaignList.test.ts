import { describe, it, expect } from 'vitest';
import { budgetUsage, groupCampaigns, summarizeGroup, aggregateStatus, splitAdSetName, periodLabel } from './CampaignList';
import type { CampaignRow } from './CampaignList';

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

function row(p: Partial<CampaignRow> & { id: string; name: string }): CampaignRow {
  return {
    status: 'Active', type: 'SPONSORED_UPDATES', budget: 10, budgetCurrency: 'USD', budgetType: 'daily',
    startDate: null, endDate: null, campaignGroup: null, ...p,
  };
}
const summary = (impressions: number, clicks: number, cost: number) => ({ impressions, clicks, cost, ctr: '0', currency: 'USD' });

describe('splitAdSetName', () => {
  it('separa no último " — " (o nome da campanha pode ter o próprio travessão)', () => {
    expect(splitAdSetName('ABM — Q1 — Acme')).toEqual({ prefix: 'ABM — Q1', company: 'Acme' });
    expect(splitAdSetName('Sem empresa')).toEqual({ prefix: null, company: 'Sem empresa' });
  });
});

describe('groupCampaigns', () => {
  it('agrupa pelo campaignGroup e tira o nome da empresa do sufixo', () => {
    const groups = groupCampaigns([
      row({ id: '1', name: 'Q4 — Acme', campaignGroup: 'urn:g:1' }),
      row({ id: '2', name: 'Outra', campaignGroup: 'urn:g:2' }),
      row({ id: '3', name: 'Q4 — Beta', campaignGroup: 'urn:g:1' }),
    ]);
    expect(groups.map(g => g.name)).toEqual(['Q4', 'Outra']);
    expect(groups[0].children.map(c => c.company)).toEqual(['Acme', 'Beta']);
    expect(groups[1].children[0].company).toBe('Outra');
  });

  it('sem campaignGroup, agrupa pelo prefixo antes de " — "', () => {
    const groups = groupCampaigns([
      row({ id: '1', name: 'Q4 — Acme' }),
      row({ id: '2', name: 'Q4 — Beta' }),
      row({ id: '3', name: 'Avulsa' }),
      row({ id: '4', name: 'Avulsa' }),
    ]);
    expect(groups).toHaveLength(3); // conjuntos sem separador não se juntam por nome igual
    expect(groups[0]).toMatchObject({ key: 'name:Q4', name: 'Q4' });
    expect(groups[0].children).toHaveLength(2);
  });

  it('dois lançamentos com o mesmo nome ficam separados quando o grupo vem do LinkedIn', () => {
    const groups = groupCampaigns([
      row({ id: '1', name: 'Q4 — Acme', campaignGroup: 'urn:g:1' }),
      row({ id: '2', name: 'Q4 — Acme', campaignGroup: 'urn:g:2' }),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe('aggregateStatus', () => {
  it('basta uma ativa para o grupo estar ativo; depois pausada, rascunho, concluída', () => {
    expect(aggregateStatus(['Paused', 'Active', 'Completed'])).toBe('Active');
    expect(aggregateStatus(['Completed', 'Paused'])).toBe('Paused');
    expect(aggregateStatus(['Completed', 'Completed'])).toBe('Completed');
  });
});

describe('summarizeGroup', () => {
  it('soma orçamento diário, gasto e impressões; CTR = cliques/impressões', () => {
    const s = summarizeGroup([
      row({ id: '1', name: 'a', budget: 10, analytics: summary(1000, 10, 5) }),
      row({ id: '2', name: 'b', budget: 10, status: 'Paused', analytics: summary(1000, 30, 7) }),
    ]);
    expect(s).toMatchObject({ status: 'Active', companies: 2, activeCount: 1, dailyBudget: 20, spend: 12, impressions: 2000, partial: false });
    expect(s.ctr).toBeCloseTo(2);
  });

  it('sem nenhum dado: gasto e CTR null ("—"), nunca zero', () => {
    const s = summarizeGroup([row({ id: '1', name: 'a', analyticsFailed: true })]);
    expect(s.spend).toBeNull();
    expect(s.ctr).toBeNull();
  });

  it('zero impressões: gasto 0 conhecido, CTR null', () => {
    const s = summarizeGroup([row({ id: '1', name: 'a', analytics: summary(0, 0, 0) })]);
    expect(s.spend).toBe(0);
    expect(s.ctr).toBeNull();
  });

  it('uma empresa sem dado deixa o total marcado como parcial', () => {
    const s = summarizeGroup([
      row({ id: '1', name: 'a', analytics: summary(100, 1, 2) }),
      row({ id: '2', name: 'b', analyticsFailed: true }),
    ]);
    expect(s.spend).toBe(2);
    expect(s.partial).toBe(true);
  });

  it('período: contínua se alguma empresa não tem fim', () => {
    const s = summarizeGroup([
      row({ id: '1', name: 'a', startDate: NOW, endDate: NOW + 10 * DAY }),
      row({ id: '2', name: 'b', startDate: NOW - DAY, endDate: null }),
    ]);
    expect(s.start).toBe(NOW - DAY);
    expect(s.continuous).toBe(true);
  });
});

describe('periodLabel', () => {
  it('início e fim, contínua, ou sem data', () => {
    const start = new Date(2026, 10, 5).getTime();
    const end = new Date(2026, 11, 5).getTime();
    expect(periodLabel(start, end)).toBe('05/11/2026 – 05/12/2026');
    expect(periodLabel(start, null)).toBe('Desde 05/11/2026 · contínua');
    expect(periodLabel(null, null)).toBe('Contínua');
  });
});
