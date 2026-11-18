import { describe, it, expect } from 'vitest';
import { sortGroups, nextSort, paginate, PAGE_SIZE } from './listSorting';

const g = (name: string, o: Partial<{ status: string; companies: number; daily: number; spend: number | null; start: number | null }> = {}) => ({
  name,
  summary: {
    status: o.status ?? 'Active', companies: o.companies ?? 1, dailyBudget: o.daily ?? 10, totalBudget: 0,
    spend: o.spend === undefined ? 0 : o.spend, impressions: 0, ctr: null, start: o.start ?? null,
  },
});

describe('lista: ordenar por coluna (F013)', () => {
  const list = [
    g('Bravo', { status: 'Paused', spend: 50, companies: 3 }),
    g('alfa', { status: 'Active', spend: null, companies: 1 }),
    g('Charlie', { status: 'Completed', spend: 200, companies: 2 }),
  ];

  it('nome em ordem alfabética, sem diferenciar maiúscula', () => {
    expect(sortGroups(list, { key: 'name', dir: 'asc' }).map((x) => x.name)).toEqual(['alfa', 'Bravo', 'Charlie']);
  });

  it('status: ativas primeiro', () => {
    expect(sortGroups(list, { key: 'status', dir: 'asc' }).map((x) => x.name)).toEqual(['alfa', 'Bravo', 'Charlie']);
  });

  it('gasto do maior para o menor, e sem dado ("—") sempre no fim', () => {
    expect(sortGroups(list, { key: 'spend', dir: 'desc' }).map((x) => x.name)).toEqual(['Charlie', 'Bravo', 'alfa']);
    expect(sortGroups(list, { key: 'spend', dir: 'asc' }).map((x) => x.name)).toEqual(['Bravo', 'Charlie', 'alfa']);
  });

  it('clicar de novo inverte; outra coluna começa no padrão dela', () => {
    expect(nextSort(null, 'spend')).toEqual({ key: 'spend', dir: 'desc' });
    expect(nextSort({ key: 'spend', dir: 'desc' }, 'spend')).toEqual({ key: 'spend', dir: 'asc' });
    expect(nextSort({ key: 'spend', dir: 'asc' }, 'name')).toEqual({ key: 'name', dir: 'asc' });
  });

  it('sem ordenação escolhida, mantém a ordem do LinkedIn', () => {
    expect(sortGroups(list, null)).toBe(list);
  });
});

describe('lista: paginar quando houver muitas campanhas (F013)', () => {
  const many = Array.from({ length: 65 }, (_, i) => i + 1);

  it('30 por página', () => {
    expect(PAGE_SIZE).toBe(30);
    const p1 = paginate(many, 1);
    expect(p1.items).toHaveLength(30);
    expect(p1.pageCount).toBe(3);
    expect([p1.from, p1.to]).toEqual([1, 30]);
    expect(paginate(many, 3).items).toEqual([61, 62, 63, 64, 65]);
  });

  it('página fora do intervalo volta para uma válida', () => {
    expect(paginate(many, 9).page).toBe(3);
    expect(paginate(many, 0).page).toBe(1);
    expect(paginate([], 1)).toMatchObject({ page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });

  it('ordena a lista inteira antes de cortar a página', () => {
    const groups = Array.from({ length: 40 }, (_, i) => g(`C${String(i).padStart(2, '0')}`, { spend: i }));
    const first = paginate(sortGroups(groups, { key: 'spend', dir: 'desc' }), 1).items;
    expect(first[0].name).toBe('C39');
    expect(first[29].name).toBe('C10');
  });
});
