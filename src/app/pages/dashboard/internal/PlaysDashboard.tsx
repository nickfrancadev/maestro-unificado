/**
 * "Dashboard de plays" — a tela `/admin/health` do produto real, trazida para a
 * aba Interno.
 *
 * O que veio de lá: o seletor de janela, os 5 KPIs com comparação contra o
 * período anterior, as barras por tipo e os dois donuts.
 *
 * O que é novo: a tabela "Desempenho por tipo de play". Ela não inventa dado
 * nenhum — lê `closedPercentage`, `avgContacts`, `avgInteractions` e
 * `avgDaysToClose` por tipo, campos que `GET /aggregates/churnAnalysis` já
 * devolve e que a tela original não renderiza.
 *
 * Escopo: a conta logada. O `byCompany` do payload existe, mas escopado numa
 * empresa ele repete o total — não há carteira para listar aqui.
 *
 * Dados 100% mockados — ver `churnAnalysis.mock.ts`.
 */
import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  MessageSquare,
  Play,
  Users,
  Zap,
} from 'lucide-react';
import { useCountUp } from '../useCountUp';
import { Donut } from './Donut';
import { CHURN_ANALYSIS } from './churnAnalysis.mock';
import {
  CHURN_TYPE_LABEL,
  CHURN_WINDOW_OPTIONS,
  type ChurnMetric,
  type ChurnPlayType,
  type ChurnSummary,
  type ChurnTypeMetric,
  type ChurnWindowKey,
} from './churnAnalysis.types';
import {
  BAD,
  BORDER,
  GOOD,
  INK,
  INK_MUTED,
  ORANGE,
  TYPE_BADGE_BG,
  TYPE_BADGE_INK,
  TYPE_COLOR,
  br,
  fixed,
  fixedOrDash,
  percent,
  signed,
} from './format';

// ------------------------------------------------------------------ primitivos

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-xl border p-5 ${className}`}
      style={{ borderColor: BORDER, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {children}
    </section>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3
        className="font-['Euclid_Circular_A',sans-serif] leading-tight"
        style={{ fontSize: 15, fontWeight: 700, color: INK }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="font-['Euclid_Circular_A',sans-serif] mt-0.5"
          style={{ fontSize: 12, color: INK_MUTED }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: ChurnPlayType }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md px-2 py-1 font-['Euclid_Circular_A',sans-serif] whitespace-nowrap"
      style={{
        fontSize: 11,
        fontWeight: 600,
        background: TYPE_BADGE_BG[type],
        color: TYPE_BADGE_INK[type],
      }}
    >
      {CHURN_TYPE_LABEL[type]}
    </span>
  );
}

// ------------------------------------------------------------------ KPIs

/** Como o delta de cada KPI é lido em voz alta na tela. */
type DeltaKind = 'percent' | 'perPlay' | 'days';

interface KpiSpec {
  key: keyof ChurnSummary;
  label: string;
  icon: typeof Play;
  tint: string;
  bg: string;
  kind: DeltaKind;
  /** Complemento do delta, quando `kind` é `perPlay`. */
  suffix?: string;
  unit?: string;
  decimals: number;
  /** Em "dias até fechar", cair é melhorar — por isso não é sempre `true`. */
  upIsGood: boolean;
}

const KPIS: KpiSpec[] = [
  {
    key: 'playsCount',
    label: 'Quantidade de plays',
    icon: Play,
    tint: '#FF5F39',
    bg: '#FFF1ED',
    kind: 'percent',
    decimals: 0,
    upIsGood: true,
  },
  {
    key: 'avgTouchpoints',
    label: 'Média de touchpoints',
    icon: MessageSquare,
    tint: '#2B7FD4',
    bg: '#E7F0FB',
    kind: 'perPlay',
    suffix: 'por play',
    decimals: 2,
    upIsGood: true,
  },
  {
    key: 'avgContacts',
    label: 'Média de contatos',
    icon: Users,
    tint: '#3F8F2B',
    bg: '#E9F5E3',
    kind: 'perPlay',
    suffix: 'envolvidos por play',
    decimals: 2,
    upIsGood: true,
  },
  {
    key: 'avgInteractions',
    label: 'Média de interações',
    icon: Zap,
    tint: '#D99A0B',
    bg: '#FDF3DC',
    kind: 'perPlay',
    suffix: 'por play',
    decimals: 2,
    upIsGood: true,
  },
  {
    key: 'avgDaysToClose',
    label: 'Dias até fechar plays',
    icon: Clock,
    tint: '#5B6AC4',
    bg: '#ECEFFB',
    kind: 'days',
    unit: 'dias',
    decimals: 0,
    upIsGood: false,
  },
];

/**
 * Anima um valor com casas decimais reaproveitando `useCountUp`, que só conta
 * inteiros: conta a versão escalada e desescala na saída.
 */
function useAnimatedNumber(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return useCountUp(Math.round(value * scale)) / scale;
}

/** Texto do delta. Devolve `null` quando não há base para comparar. */
function deltaText(spec: KpiSpec, metric: ChurnMetric): string | null {
  if (spec.kind === 'percent') {
    if (metric.deltaPercentage === null) return null;
    return `${signed(metric.deltaPercentage, 0)}% vs período anterior`;
  }
  if (spec.kind === 'days') {
    const noun = Math.abs(metric.delta) === 1 ? 'dia' : 'dias';
    return `${signed(metric.delta, 0)} ${noun} vs período anterior`;
  }
  return `${signed(metric.delta)} ${spec.suffix}`;
}

function KpiCard({ spec, metric }: { spec: KpiSpec; metric: ChurnMetric }) {
  const animated = useAnimatedNumber(metric.current, spec.decimals);
  const Icon = spec.icon;
  const text = deltaText(spec, metric);

  const flat = metric.delta === 0;
  const improved = spec.upIsGood ? metric.delta > 0 : metric.delta < 0;
  const deltaColor = flat ? INK_MUTED : improved ? GOOD : BAD;
  const Arrow = metric.delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <span
          className="font-['Euclid_Circular_A',sans-serif] uppercase leading-snug"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: INK_MUTED }}
        >
          {spec.label}
        </span>
        <span
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 32, height: 32, background: spec.bg }}
          aria-hidden="true"
        >
          <Icon size={16} style={{ color: spec.tint }} />
        </span>
      </div>

      <p
        className="font-['Euclid_Circular_A',sans-serif] tabular-nums mt-4"
        style={{ fontSize: 34, fontWeight: 700, color: INK, lineHeight: 1.1 }}
      >
        {fixed(animated, spec.decimals)}
        {spec.unit && (
          <span style={{ fontSize: 15, fontWeight: 600, color: INK_MUTED }}> {spec.unit}</span>
        )}
      </p>

      <p
        className="font-['Euclid_Circular_A',sans-serif] flex items-center gap-1 mt-2 min-h-[18px]"
        style={{ fontSize: 12, fontWeight: 500, color: deltaColor }}
      >
        {text ? (
          <>
            {!flat && <Arrow size={14} aria-hidden="true" />}
            {text}
          </>
        ) : (
          <span style={{ color: INK_MUTED }}>sem base de comparação</span>
        )}
      </p>
    </Card>
  );
}

// ------------------------------------------------------------------ barras

function TypeBars({ byType }: { byType: ChurnTypeMetric[] }) {
  const total = byType.reduce((acc, t) => acc + t.playsCount, 0);
  const max = byType.reduce((acc, t) => Math.max(acc, t.playsCount), 0);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <CardTitle
          title="Tipos e plays agrupadas"
          subtitle="Distribuição por tipo de play e média de touchpoints em cada grupo"
        />
        <span
          className="font-['Euclid_Circular_A',sans-serif] rounded-full px-3 py-1 whitespace-nowrap shrink-0"
          style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED, background: '#F4F5F7' }}
        >
          {br(total)} plays no total
        </span>
      </div>

      {total === 0 ? (
        <p
          className="font-['Euclid_Circular_A',sans-serif] mt-8"
          style={{ fontSize: 13, color: INK_MUTED }}
        >
          Sem dados para o período selecionado.
        </p>
      ) : (
        <div className="flex flex-col justify-center flex-1 gap-6 mt-6">
          {byType.map((metric) => (
            <div
              key={metric.type}
              className="flex items-center gap-4"
              title={`${CHURN_TYPE_LABEL[metric.type]}: ${br(metric.playsCount)} plays · ${fixed(metric.avgTouchpoints, 2)} touchpoints por play · ${br(metric.open)} abertas · ${br(metric.closed)} fechadas`}
            >
              <span className="w-[86px] shrink-0">
                <TypeBadge type={metric.type} />
              </span>

              <div className="flex-1 h-3 rounded-full" style={{ background: '#F1F2F4' }}>
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: max > 0 ? `${(metric.playsCount / max) * 100}%` : '0%',
                    background: TYPE_COLOR[metric.type],
                  }}
                />
              </div>

              <span
                className="font-['Euclid_Circular_A',sans-serif] tabular-nums text-right w-[150px] shrink-0"
                style={{ fontSize: 12, color: INK_MUTED }}
              >
                {fixed(metric.avgTouchpoints, 2)} touchpoints/play
              </span>
              <span
                className="font-['Euclid_Circular_A',sans-serif] tabular-nums text-right w-[36px] shrink-0"
                style={{ fontSize: 15, fontWeight: 700, color: INK }}
              >
                {br(metric.playsCount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ donuts

/**
 * Um donut com a legenda ao lado. Vive dentro do `StatusCard`, nunca sozinho:
 * dois cards separados deixavam a coluna muito mais alta que o card de barras
 * ao lado, e a linha inteira ficava com meia tela de espaço morto.
 */
function DonutRow({
  label,
  open,
  closed,
  openColor,
}: {
  label: string;
  open: number;
  closed: number;
  openColor?: string;
}) {
  const total = open + closed;
  const openPct = total > 0 ? (open / total) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <Donut open={open} closed={closed} openColor={openColor} label={label} />
      <div className="min-w-0">
        <p
          className="font-['Euclid_Circular_A',sans-serif] mb-3"
          style={{ fontSize: 13, fontWeight: 600, color: INK }}
        >
          {label}
        </p>
        <dl className="flex flex-col gap-3">
          <LegendRow
            color={openColor ?? '#FF5F39'}
            label="Abertas"
            value={open}
            pct={openPct}
          />
          <LegendRow color="#1A2E4A" label="Fechadas" value={closed} pct={100 - openPct} />
        </dl>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-full shrink-0"
        style={{ width: 9, height: 9, background: color }}
        aria-hidden="true"
      />
      <dt
        className="font-['Euclid_Circular_A',sans-serif] w-[62px] shrink-0"
        style={{ fontSize: 12, color: INK_MUTED }}
      >
        {label}
      </dt>
      <dd
        className="font-['Euclid_Circular_A',sans-serif] tabular-nums"
        style={{ fontSize: 16, fontWeight: 700, color: INK }}
      >
        {br(value)}{' '}
        <span style={{ fontSize: 12, fontWeight: 500, color: INK_MUTED }}>
          {br(pct, 1)}%
        </span>
      </dd>
    </div>
  );
}

function StatusCard({
  total,
  oneToFew,
}: {
  total: { open: number; closed: number };
  oneToFew: { open: number; closed: number };
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardTitle
        title="Abertas vs fechadas"
        subtitle="Situação atual do portfólio, e a fatia One-to-few em separado"
      />
      <div className="flex flex-col justify-center flex-1 gap-5 mt-4">
        <DonutRow label="Todas as plays" open={total.open} closed={total.closed} />
        <div style={{ borderTop: `1px solid ${BORDER}` }} />
        <DonutRow
          label="One-to-few"
          open={oneToFew.open}
          closed={oneToFew.closed}
          openColor={TYPE_COLOR.OneToFewPlay}
        />
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ tabelas

function Th({
  children,
  numeric = false,
}: {
  children: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`font-['Euclid_Circular_A',sans-serif] uppercase pb-2 px-2 whitespace-nowrap ${numeric ? 'text-right' : 'text-left'}`}
      style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: INK_MUTED }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  numeric = false,
  strong = false,
}: {
  children: React.ReactNode;
  numeric?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={`font-['Euclid_Circular_A',sans-serif] py-2.5 px-2 whitespace-nowrap ${numeric ? 'text-right tabular-nums' : 'text-left'}`}
      style={{ fontSize: 13, fontWeight: strong ? 700 : 500, color: strong ? INK : '#374151' }}
    >
      {children}
    </td>
  );
}

/**
 * Métrica de "dias até fechar" só tem sentido com algo fechado no período.
 * Sem base, travessão — não "0 dias", que leria como fechamento instantâneo.
 */
function daysToCloseText(metric: { closed: number; avgDaysToClose: number }): string {
  return metric.closed > 0 ? br(metric.avgDaysToClose, 0) : '—';
}

function TypePerformanceTable({ byType }: { byType: ChurnTypeMetric[] }) {
  return (
    <Card>
      <CardTitle
        title="Desempenho por tipo de play"
        subtitle="Fechamento e engajamento médio de cada tipo dentro da janela"
      />
      <div className="overflow-x-auto mt-4 -mx-2">
        <table className="w-full border-collapse" aria-label="Desempenho por tipo de play">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <Th>Tipo</Th>
              <Th numeric>Plays</Th>
              <Th numeric>Abertas</Th>
              <Th numeric>Fechadas</Th>
              <Th numeric>% fechadas</Th>
              <Th numeric>Touchpoints/play</Th>
              <Th numeric>Contatos/play</Th>
              <Th numeric>Interações/play</Th>
              <Th numeric>Dias até fechar</Th>
            </tr>
          </thead>
          <tbody>
            {byType.map((metric) => (
              <tr key={metric.type} style={{ borderBottom: `1px solid #F3F4F6` }}>
                <Td>
                  <TypeBadge type={metric.type} />
                </Td>
                <Td numeric strong>
                  {br(metric.playsCount)}
                </Td>
                <Td numeric>{br(metric.open)}</Td>
                <Td numeric>{br(metric.closed)}</Td>
                <Td numeric>{percent(metric.closedPercentage)}</Td>
                <Td numeric>{fixedOrDash(metric.avgTouchpoints, 2)}</Td>
                <Td numeric>{fixedOrDash(metric.avgContacts, 2)}</Td>
                <Td numeric>{fixedOrDash(metric.avgInteractions, 2)}</Td>
                <Td numeric>{daysToCloseText(metric)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Consolidado de vários tipos: contagens somam, médias ponderam pelo volume. */
function rollUp(byType: ChurnTypeMetric[]) {
  let playsCount = 0;
  let open = 0;
  let closed = 0;
  let sumTouchpoints = 0;
  let sumContacts = 0;
  let sumInteractions = 0;
  let sumDaysToClose = 0;

  for (const metric of byType) {
    playsCount += metric.playsCount;
    open += metric.open;
    closed += metric.closed;
    sumTouchpoints += metric.avgTouchpoints * metric.playsCount;
    sumContacts += metric.avgContacts * metric.playsCount;
    sumInteractions += metric.avgInteractions * metric.playsCount;
    // dias até fechar pondera pelo que de fato fechou, não pelo total
    sumDaysToClose += metric.avgDaysToClose * metric.closed;
  }

  return {
    playsCount,
    open,
    closed,
    closedPercentage: playsCount ? ((closed / playsCount) * 100).toFixed(1) : '0',
    avgTouchpoints: playsCount ? sumTouchpoints / playsCount : 0,
    avgContacts: playsCount ? sumContacts / playsCount : 0,
    avgInteractions: playsCount ? sumInteractions / playsCount : 0,
    avgDaysToClose: closed ? sumDaysToClose / closed : 0,
  };
}

// ------------------------------------------------------------------ tela

export function PlaysDashboard() {
  const [windowKey, setWindowKey] = useState<ChurnWindowKey>('30d');
  const data = CHURN_ANALYSIS.windows[windowKey];

  const totals = useMemo(() => rollUp(data.total.byType), [data]);
  const oneToFew = data.total.byType.find((t) => t.type === 'OneToFewPlay');

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            className="font-['Euclid_Circular_A',sans-serif]"
            style={{ fontSize: 20, fontWeight: 700, color: INK }}
          >
            Dashboard de plays
          </h2>
          <p
            className="font-['Euclid_Circular_A',sans-serif] mt-0.5"
            style={{ fontSize: 13, color: INK_MUTED }}
          >
            Visão geral de tipos, engajamento e performance das suas plays
          </p>
        </div>

        <div
          className="flex items-center gap-1 rounded-full p-1 shrink-0"
          role="radiogroup"
          aria-label="Janela do dashboard de plays"
          style={{ background: '#F4F5F7' }}
        >
          {CHURN_WINDOW_OPTIONS.map((option) => {
            const active = option.key === windowKey;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setWindowKey(option.key)}
                className="font-['Euclid_Circular_A',sans-serif] rounded-full px-4 py-1.5 transition-colors whitespace-nowrap"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? ORANGE : 'transparent',
                  color: active ? '#FFFFFF' : INK_MUTED,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {KPIS.map((spec) => (
          <KpiCard key={spec.key} spec={spec} metric={data.summary[spec.key]} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TypeBars byType={data.total.byType} />
        </div>
        <StatusCard
          total={{ open: totals.open, closed: totals.closed }}
          oneToFew={{
            open: oneToFew ? oneToFew.open : 0,
            closed: oneToFew ? oneToFew.closed : 0,
          }}
        />
      </div>

      <TypePerformanceTable byType={data.total.byType} />
    </div>
  );
}
