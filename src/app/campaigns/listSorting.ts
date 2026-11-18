// Lista de campanhas: ordenar por coluna e paginar (F013). Pura para o teste
// provar a regra que o produto copia: a ordem vale para a lista INTEIRA (não
// só a página atual) e a página tem 30 campanhas.
import type { GroupSummary } from './CampaignList';

export type SortKey = 'name' | 'status' | 'companies' | 'budget' | 'spend' | 'impressions' | 'ctr' | 'period';
export type SortDir = 'asc' | 'desc';

export const PAGE_SIZE = 30;

/** Ordem do status: ativas primeiro. */
const STATUS_ORDER = ['Active', 'Paused', 'Draft', 'Completed', 'Canceled'];

interface SortableGroup {
  name: string;
  summary: Pick<GroupSummary, 'status' | 'companies' | 'dailyBudget' | 'totalBudget' | 'spend' | 'impressions' | 'ctr' | 'start'>;
}

function value(g: SortableGroup, key: SortKey): string | number | null {
  const s = g.summary;
  switch (key) {
    case 'name': return g.name.toLocaleLowerCase('pt-BR');
    case 'status': { const i = STATUS_ORDER.indexOf(s.status); return i < 0 ? STATUS_ORDER.length : i; }
    case 'companies': return s.companies;
    case 'budget': return s.dailyBudget + s.totalBudget;
    case 'spend': return s.spend;
    case 'impressions': return s.impressions;
    case 'ctr': return s.ctr;
    case 'period': return s.start;
  }
}

/** Primeiro clique numa coluna: texto em ordem alfabética, números do maior para o menor. */
export function defaultDir(key: SortKey): SortDir {
  return key === 'name' || key === 'status' ? 'asc' : 'desc';
}

/** Próximo estado ao clicar no cabeçalho: mesma coluna inverte, outra coluna começa no padrão. */
export function nextSort(current: { key: SortKey; dir: SortDir } | null, key: SortKey): { key: SortKey; dir: SortDir } {
  if (current?.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: defaultDir(key) };
}

/**
 * Ordena sem mudar a lista original. Sem dado (gasto que não carregou, "—")
 * vai sempre para o fim, nas duas direções; empate mantém a ordem anterior.
 */
export function sortGroups<T extends SortableGroup>(groups: T[], sort: { key: SortKey; dir: SortDir } | null): T[] {
  if (!sort) return groups;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return groups
    .map((g, i) => ({ g, i, v: value(g, sort.key) }))
    .sort((a, b) => {
      if (a.v == null && b.v == null) return a.i - b.i;
      if (a.v == null) return 1;
      if (b.v == null) return -1;
      const cmp = typeof a.v === 'string' ? a.v.localeCompare(String(b.v), 'pt-BR') : (a.v as number) - (b.v as number);
      return cmp !== 0 ? cmp * sign : a.i - b.i;
    })
    .map((x) => x.g);
}

export interface Page<T> {
  items: T[];
  /** 1-based, já limitada ao intervalo válido. */
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (p - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return { items: slice, page: p, pageCount, total, from: total ? start + 1 : 0, to: start + slice.length };
}
