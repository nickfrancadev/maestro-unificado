import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
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
import { PendingMarker } from './PendingMarker';
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
  /** Explicação da COORTE que a coluna mede (popover no cabeçalho). */
  hint?: string;
  /** Dado fabricado — o produto ainda não instrumenta isto. */
  pending?: boolean;
}

/**
 * COORTES DIFERENTES, lado a lado.
 *
 * "Fechadas" e "% fechadas" NÃO dividem uma pela outra, e é por construção:
 *  - `playsClosed`    = plays fechadas DENTRO do período, tenham nascido quando
 *                       tiverem nascido;
 *  - `playsCloseRate` = das plays CRIADAS no período, a fração que já fechou.
 *
 * A conta está certa (é a coorte única da Fase 1); o que faltava era o rótulo
 * dizer de QUEM cada célula fala. Sem isso, "criadas 7 · fechadas 10 · 86%" lia
 * como aritmética impossível — mais fechadas que criadas, e uma porcentagem que
 * não bate com nenhuma das duas — e a tabela inteira perdia a credibilidade.
 */
const CLOSED_IN_PERIOD_HINT =
  'Fechadas DENTRO do período, independente de quando foram criadas. Coorte diferente de "% da coorte criada" — os dois números não se dividem.';
const CLOSE_RATE_HINT =
  'Das plays CRIADAS no período, a fração que já fechou. Coorte diferente de "Fechadas no período" — os dois números não se dividem.';
const TP_CLOSED_HINT =
  'Touchpoints finalizados DENTRO do período, independente de quando foram criados. Coorte diferente de "Criados no período".';

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
    // Login NÃO é rastreado pelo produto (ver spec, §"⚠️ Login não é rastreado").
    // Esta é a única superfície onde a coluna fabricada fica ao lado da coluna
    // derivável ("Última atividade") e AMBAS são ordenáveis: ordenar por
    // "Último acesso" é o gesto mais natural de churn que existe, e sem o
    // marcador o CS lead recebe um ranking construído sobre dado inventado sem
    // nada na tela dizendo isso.
    pending: true,
  },
  {
    id: 'lastActivity',
    label: 'Última atividade',
    numeric: true,
    sortValue: (r) => lastActivityAt(r.company)?.getTime() ?? null,
  },
  { id: 'playsCreated', label: 'Plays criadas', numeric: true, sortValue: (r) => r.metrics.playsCreated },
  {
    id: 'playsClosed',
    label: 'Fechadas no período',
    numeric: true,
    sortValue: (r) => r.metrics.playsClosed,
    hint: CLOSED_IN_PERIOD_HINT,
  },
  {
    id: 'playsCloseRate',
    label: '% da coorte criada',
    numeric: true,
    sortValue: (r) => r.metrics.playsCloseRate,
    hint: CLOSE_RATE_HINT,
  },
  { id: 'tpCreated', label: 'Touch criados', numeric: true, sortValue: (r) => r.metrics.touchpointsCreated },
  {
    id: 'tpClosed',
    label: 'Finalizados no período',
    numeric: true,
    sortValue: (r) => r.metrics.touchpointsClosed,
    hint: TP_CLOSED_HINT,
  },
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

/**
 * Explicação da coorte de uma coluna. Abre por clique (mouse e teclado), como o
 * `PendingMarker` — hover-only excluiria teclado e toque. O `<th>` já tem o
 * botão de ordenação, então este é um segundo alvo, irmão dele, nunca aninhado.
 */
function ColumnHint({ label, text }: { label: string; text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`O que "${label}" mede: ${text}`}
          className="inline-flex items-center justify-center rounded-full p-0.5 align-middle transition-colors hover:bg-[#E2E8F0] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
          style={{ color: '#64748B' }}
        >
          <Info size={12} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-[280px] rounded-lg border border-[#d8d8d8] bg-white p-2.5 font-['Euclid_Circular_A',sans-serif] normal-case"
          style={{
            color: '#212A46',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 0,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {text}
          <Popover.Arrow style={{ fill: '#ffffff' }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

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
                    {/* Marcadores são IRMÃOS do botão de ordenar, nunca filhos:
                        um botão dentro de outro é HTML inválido e rouba o clique. */}
                    <span
                      className={`inline-flex items-center gap-1 ${
                        col.numeric ? 'flex-row-reverse' : ''
                      }`}
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
                      {col.pending && <PendingMarker />}
                      {col.hint && <ColumnHint label={col.label} text={col.hint} />}
                    </span>
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
