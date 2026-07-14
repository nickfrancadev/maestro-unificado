import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Company, Health } from '../data/types';
import type { UsageMetrics } from '../lib/selectors';
import { BUCKET_META } from '../lib/health';
import {
  formatDaysAgo,
  formatDelta,
  formatNumber,
  formatPct,
} from '../lib/format';
import { lastAccessAt, lastActivityAt } from '../lib/selectors';
import { BUCKET_ICON } from './icons';
import { TREND_BAD, TREND_FLAT, TREND_GOOD } from './colors';

export interface CompanyRow {
  company: Company;
  health: Health;
  metrics: UsageMetrics;
  prevMetrics: UsageMetrics;
}

interface CompanyTableProps {
  rows: CompanyRow[];
  onRowClick: (id: string) => void;
}

type SortDir = 'asc' | 'desc';

interface Column {
  id: string;
  label: string;
  /** true → alinhado à direita e em tabular-nums */
  numeric?: boolean;
  /** valor de ordenação; `null` ordena por último em ambos os sentidos */
  sortValue: (row: CompanyRow) => number | string | null;
}

/**
 * Δ de atividade = plays + touchpoints criados, período atual vs. anterior.
 *
 * É a MESMA grandeza que `activityVolume(company, period)` de `lib/selectors`:
 * lá, `playsIn().length + touchpointsIn().length`; aqui, os mesmos dois valores
 * já materializados em `UsageMetrics.playsCreated` / `.touchpointsCreated`
 * (`computeMetrics` os deriva exatamente desses dois seletores). Não chamamos
 * `activityVolume` diretamente porque `CompanyRow` carrega as métricas já
 * computadas, não o `Period` — e a prop é congelada pela Fase 3.
 * `CompanyCard.test.tsx` guarda essa equivalência nas 24 companies do mock.
 */
function activityOf(m: UsageMetrics): number {
  return m.playsCreated + m.touchpointsCreated;
}

const COLUMNS: Column[] = [
  { id: 'name', label: 'Cliente', sortValue: (r) => r.company.name.toLowerCase() },
  { id: 'score', label: 'Score', numeric: true, sortValue: (r) => r.health.score },
  {
    id: 'lastAccess',
    label: 'Último acesso',
    numeric: true,
    sortValue: (r) => lastAccessAt(r.company)?.getTime() ?? null,
  },
  {
    id: 'lastActivity',
    label: 'Última atividade',
    numeric: true,
    sortValue: (r) => lastActivityAt(r.company)?.getTime() ?? null,
  },
  { id: 'playsCreated', label: 'Plays criadas', numeric: true, sortValue: (r) => r.metrics.playsCreated },
  { id: 'playsClosed', label: 'Fechadas', numeric: true, sortValue: (r) => r.metrics.playsClosed },
  { id: 'playsCloseRate', label: '% fechadas', numeric: true, sortValue: (r) => r.metrics.playsCloseRate },
  { id: 'tpCreated', label: 'Touch criados', numeric: true, sortValue: (r) => r.metrics.touchpointsCreated },
  { id: 'tpClosed', label: 'Finalizados', numeric: true, sortValue: (r) => r.metrics.touchpointsClosed },
  { id: 'tpLate', label: 'Atrasados', numeric: true, sortValue: (r) => r.metrics.touchpointsLate },
  { id: 'avgTpPerPlay', label: 'Média touch/play', numeric: true, sortValue: (r) => r.metrics.avgTouchpointsPerPlay },
  { id: 'avgContacts', label: 'Contatos/play', numeric: true, sortValue: (r) => r.metrics.avgContactsPerPlay },
  { id: 'avgInteractions', label: 'Interações/play', numeric: true, sortValue: (r) => r.metrics.avgInteractionsPerPlay },
  { id: 'daysToClose', label: 'Dias p/ fechar', numeric: true, sortValue: (r) => r.metrics.avgDaysToClose },
  { id: 'activeUsers', label: 'Usuários ativos', numeric: true, sortValue: (r) => r.metrics.activeUsers },
  {
    id: 'delta',
    label: 'Δ atividade',
    numeric: true,
    sortValue: (r) => formatDelta(activityOf(r.metrics), activityOf(r.prevMetrics)).pct,
  },
];

/** Nulos (nunca acessou, nenhuma play fechada) sempre no fim, dos dois lados. */
function compare(a: number | string | null, b: number | string | null, dir: SortDir): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const cmp = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b, 'pt-BR') : Number(a) - Number(b);
  return dir === 'asc' ? cmp : -cmp;
}

function BucketBadge({ bucket }: { bucket: Health['bucket'] }) {
  const meta = BUCKET_META[bucket];
  const Icon = BUCKET_ICON[bucket];
  // Cor nunca sozinha: ícone + rótulo + cor.
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-none whitespace-nowrap"
      style={{ color: meta.color, borderColor: meta.color, fontWeight: 500 }}
    >
      <Icon size={12} aria-hidden="true" className="shrink-0" />
      {meta.label}
    </span>
  );
}

const DELTA_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
/** Δ de atividade é tendência, NÃO risco — cores fora da rampa (ver colors.ts). */
const DELTA_COLOR = { up: TREND_GOOD, down: TREND_BAD, flat: TREND_FLAT } as const;

function DeltaCell({ curr, prev }: { curr: number; prev: number }) {
  const delta = formatDelta(curr, prev);
  const Icon = DELTA_ICON[delta.dir];
  return (
    <span
      className="inline-flex items-center justify-end gap-1 tabular-nums whitespace-nowrap"
      style={{ color: DELTA_COLOR[delta.dir] }}
    >
      <Icon size={13} aria-hidden="true" className="shrink-0" />
      {delta.label}
    </span>
  );
}

const TH_BASE =
  "sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E2E8F0] px-3 py-2 font-['Euclid_Circular_A',sans-serif] whitespace-nowrap";
const TD_BASE = 'px-3 py-2.5 border-b border-[#E2E8F0] whitespace-nowrap';

export function CompanyTable({ rows, onRowClick }: CompanyTableProps) {
  const [sortId, setSortId] = useState<string>('score');
  const [dir, setDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.id === sortId);
    if (!col) return rows;
    return [...rows].sort((a, b) => compare(col.sortValue(a), col.sortValue(b), dir));
  }, [rows, sortId, dir]);

  function toggleSort(id: string) {
    if (id === sortId) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortId(id);
      setDir('asc');
    }
  }

  if (rows.length === 0) {
    return (
      <div
        className="bg-white rounded-xl p-8 border border-[#d8d8d8] text-center font-['Euclid_Circular_A',sans-serif]"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#64748B', fontSize: 14 }}
      >
        Nenhum cliente para os filtros selecionados.
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl border border-[#d8d8d8] overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
        <table className="w-full border-collapse font-['Euclid_Circular_A',sans-serif] text-[13px]">
          <caption className="sr-only">
            Uso por cliente. Colunas ordenáveis; cada linha abre o detalhe do cliente.
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const active = col.id === sortId;
                const SortIcon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${TH_BASE} ${col.numeric ? 'text-right' : 'text-left'}`}
                    style={{ fontWeight: 600, color: '#212A46' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      className={`inline-flex items-center gap-1 cursor-pointer rounded focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] ${
                        col.numeric ? 'flex-row-reverse' : ''
                      }`}
                      style={{ color: active ? '#212A46' : '#64748B' }}
                    >
                      {col.label}
                      <SortIcon size={12} aria-hidden="true" className="shrink-0" />
                      <span className="sr-only">
                        {active
                          ? dir === 'asc'
                            ? '(ordenado crescente — clique para inverter)'
                            : '(ordenado decrescente — clique para inverter)'
                          : '(clique para ordenar)'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const { company, health, metrics, prevMetrics } = row;
              return (
                <tr
                  key={company.id}
                  onClick={() => onRowClick(company.id)}
                  className="cursor-pointer hover:bg-[#F8FAFC] focus-within:bg-[#F8FAFC]"
                >
                  {/* célula-âncora: o botão dá o alvo de teclado da linha inteira */}
                  <td className={`${TD_BASE} text-left`} style={{ color: '#212A46' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(company.id);
                      }}
                      className="text-left rounded focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] cursor-pointer"
                      style={{ fontWeight: 600 }}
                    >
                      {company.name}
                      <span className="sr-only"> — abrir detalhe</span>
                    </button>
                    <span className="block text-[11px]" style={{ color: '#64748B' }}>
                      {company.plan}
                    </span>
                  </td>

                  <td className={`${TD_BASE} text-right`}>
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="tabular-nums" style={{ fontWeight: 600, color: '#212A46' }}>
                        {health.score}
                      </span>
                      <BucketBadge bucket={health.bucket} />
                    </span>
                  </td>

                  <td className={`${TD_BASE} text-right tabular-nums`} style={{ color: '#64748B' }}>
                    {formatDaysAgo(lastAccessAt(company))}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`} style={{ color: '#64748B' }}>
                    {formatDaysAgo(lastActivityAt(company))}
                  </td>

                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.playsCreated)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.playsClosed)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatPct(metrics.playsCloseRate)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.touchpointsCreated)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.touchpointsClosed)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.touchpointsLate)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.avgTouchpointsPerPlay)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.avgContactsPerPlay)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.avgInteractionsPerPlay)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {metrics.avgDaysToClose === null ? '—' : formatNumber(metrics.avgDaysToClose)}
                  </td>
                  <td className={`${TD_BASE} text-right tabular-nums`}>
                    {formatNumber(metrics.activeUsers)}
                  </td>
                  <td className={`${TD_BASE} text-right`}>
                    <DeltaCell curr={activityOf(metrics)} prev={activityOf(prevMetrics)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
