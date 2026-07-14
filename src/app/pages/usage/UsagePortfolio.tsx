/**
 * Tela 1 — Portfólio (`/uso-clientes`).
 *
 * Responde "onde eu olho primeiro?": os clientes ordenados por risco de churn,
 * com os 5 KPIs agregados no topo e o "como calculamos o score" ao alcance —
 * o score só é útil se o time confiar nele, e confiança exige o método à vista.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { HelpCircle, LayoutGrid, Table2 } from 'lucide-react';
import { COMPANIES } from './data/mockData';
import { periodSearch, usePeriodParam } from './usePeriodParam';
import { WEIGHTS, computeHealth } from './lib/health';
import {
  activityByWeek,
  computeMetrics,
  lastAccessAt,
  previousPeriod,
} from './lib/selectors';
import { daysAgo, formatDelta } from './lib/format';
import { PeriodFilter } from './components/PeriodFilter';
import { StatTile } from './components/StatTile';
import { CompanyTable, type CompanyRow } from './components/CompanyTable';
import { RiskBoard, type RiskBoardRow } from './components/RiskBoard';

const ORANGE = '#FF5F39';
const NAVY = '#212A46';
const MUTED = '#64748B';

/**
 * MRR é dinheiro e precisa do símbolo — "137.000" solto lê como contagem.
 * `StatTile.format` (frozen) não tem modo moeda, mas aceita `value: string`,
 * então formatamos aqui. (Trocamos a animação do `useCountUp` pelo símbolo:
 * um KPI de receita ambíguo é pior que um KPI que não anima.)
 */
const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** Sparkline do card: 12 semanas. */
const SPARK_WEEKS = 12;

/** Sem acesso há N dias ou mais → cliente "frio". */
const STALE_DAYS = 7;

type View = 'board' | 'table';

/**
 * As 4 dimensões do score, com o peso LIDO de `WEIGHTS`. Se alguém retunar os
 * pesos, este popover acompanha — hardcodar "35%" no texto faria a explicação
 * mentir na primeira reafinação, e um score cuja explicação mente é um score
 * que o time ignora.
 */
const DIMENSION_COPY: { key: keyof typeof WEIGHTS; label: string; how: string }[] = [
  {
    key: 'recency',
    label: 'Recência',
    how: 'Dias desde o acesso/atividade mais recente. Até 3 dias = nota cheia; 30+ dias = zero.',
  },
  {
    key: 'trend',
    label: 'Tendência',
    how: 'Atividade do período ÷ período anterior de mesmo tamanho. Queda de mais de 50% zera.',
  },
  {
    key: 'depth',
    label: 'Profundidade',
    how: 'Média entre taxa de plays fechadas, touchpoints no prazo e taxa de interação.',
  },
  {
    key: 'concentration',
    label: 'Concentração',
    how: 'Dispersão da atividade entre usuários. Um único usuário fazendo tudo é penalidade máxima.',
  },
];

function ScoreMethodPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d8d8] bg-white px-2.5 py-1.5 font-['Euclid_Circular_A',sans-serif] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] focus-visible:ring-offset-2"
          style={{ fontSize: 12, fontWeight: 600, color: MUTED }}
        >
          <HelpCircle size={14} aria-hidden="true" />
          como calculamos o score
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[380px] rounded-xl border border-[#d8d8d8] bg-white p-4 font-['Euclid_Circular_A',sans-serif]"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
            Health score — 0 a 100
          </h3>
          <p className="mt-1" style={{ fontSize: 12, color: MUTED }}>
            Média ponderada de quatro dimensões. O score ordena; os chips de sinal
            explicam. Os pesos abaixo são lidos do próprio cálculo.
          </p>

          <dl className="mt-3 flex flex-col gap-3">
            {DIMENSION_COPY.map((d) => (
              <div key={d.key}>
                <dt
                  className="flex items-baseline justify-between gap-2"
                  style={{ fontSize: 12, fontWeight: 600, color: NAVY }}
                >
                  <span>{d.label}</span>
                  <span className="tabular-nums" style={{ color: ORANGE }}>
                    {Math.round(WEIGHTS[d.key] * 100)}%
                  </span>
                </dt>
                <dd className="mt-0.5" style={{ fontSize: 11, color: MUTED }}>
                  {d.how}
                </dd>
              </div>
            ))}
          </dl>

          <p
            className="mt-3 border-t border-[#E2E8F0] pt-2 tabular-nums"
            style={{ fontSize: 11, color: MUTED }}
          >
            Faixas: Crítico &lt; 30 · Em risco 30–54 · Atenção 55–74 · Saudável ≥ 75
          </p>

          <Popover.Arrow style={{ fill: '#ffffff' }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const options: { id: View; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'board', label: 'Board', icon: LayoutGrid },
    { id: 'table', label: 'Tabela', icon: Table2 },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Modo de visualização"
      className="inline-flex items-center gap-1 rounded-xl border border-[#d8d8d8] bg-white p-1"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-['Euclid_Circular_A',sans-serif] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
            style={{
              fontSize: 13,
              fontWeight: 600,
              // laranja de marca = seleção, nunca dado
              background: active ? ORANGE : 'transparent',
              color: active ? '#ffffff' : MUTED,
            }}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function UsagePortfolio() {
  const navigate = useNavigate();
  const [period, setPeriod] = usePeriodParam();
  const [view, setView] = useState<View>('board');

  const rows = useMemo(
    () =>
      COMPANIES.map((company) => ({
        company,
        health: computeHealth(company, period),
        metrics: computeMetrics(company, period),
        prevMetrics: computeMetrics(company, previousPeriod(period)),
        sparkline: activityByWeek(company, SPARK_WEEKS),
      })),
    [period],
  );

  const kpis = useMemo(() => {
    const total = rows.length;

    const mrrAtRisk = rows
      .filter((r) => r.health.bucket === 'critical' || r.health.bucket === 'at_risk')
      .reduce((s, r) => s + r.company.mrr, 0);

    // "Ativo" = teve alguma atividade no período (plays ou touchpoints criados).
    const isActive = (m: { playsCreated: number; touchpointsCreated: number }) =>
      m.playsCreated + m.touchpointsCreated > 0;
    const active = rows.filter((r) => isActive(r.metrics)).length;
    const activePrev = rows.filter((r) => isActive(r.prevMetrics)).length;

    // Sem acesso há 7d+ — inclui quem NUNCA acessou (daysAgo === null).
    const stale = rows.filter((r) => {
      const d = daysAgo(lastAccessAt(r.company));
      return d === null || d >= STALE_DAYS;
    }).length;

    const mean = (xs: number[]) =>
      xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;

    const closeRate = mean(rows.map((r) => r.metrics.playsCloseRate));
    const closeRatePrev = mean(rows.map((r) => r.prevMetrics.playsCloseRate));
    const interactionRate = mean(rows.map((r) => r.metrics.interactionRate));
    const interactionRatePrev = mean(rows.map((r) => r.prevMetrics.interactionRate));

    return {
      total,
      mrrAtRisk,
      active,
      activePrev,
      stale,
      closeRate,
      closeRatePrev,
      interactionRate,
      interactionRatePrev,
    };
  }, [rows]);

  const boardRows: RiskBoardRow[] = rows;
  const tableRows: CompanyRow[] = rows;

  // O período viaja junto: o detalhe abre no MESMO recorte que produziu o score
  // que motivou o clique.
  const openCompany = (id: string) =>
    navigate(`/uso-clientes/${id}${periodSearch(period)}`);

  return (
    <div className="flex-1 overflow-auto bg-[#edf2f5] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6 font-['Euclid_Circular_A',sans-serif]">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>
              Uso de Clientes
            </h1>
            <p className="mt-1 tabular-nums" style={{ fontSize: 13, color: MUTED }}>
              {kpis.total} clientes · {kpis.active} com atividade no período
            </p>
            <div className="mt-2">
              <ScoreMethodPopover />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PeriodFilter period={period} onChange={setPeriod} />
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        {/* 5 KPIs agregados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatTile
            label="MRR em risco"
            value={BRL.format(kpis.mrrAtRisk)}
            hint="Soma do MRR de clientes em Crítico + Em risco"
          />
          <StatTile
            label="Clientes ativos"
            value={`${kpis.active}/${kpis.total}`}
            delta={formatDelta(kpis.active, kpis.activePrev)}
            hint="Com atividade registrada no período"
          />
          <StatTile
            label="Sem acesso há 7d+"
            value={kpis.stale}
            hint="Inclui quem nunca acessou"
            pending
          />
          <StatTile
            label="Taxa média de plays fechadas"
            value={kpis.closeRate}
            format="pct"
            delta={formatDelta(kpis.closeRate, kpis.closeRatePrev)}
            hint="Média entre clientes"
          />
          <StatTile
            label="Taxa média de interação"
            value={kpis.interactionRate}
            format="pct"
            delta={formatDelta(kpis.interactionRate, kpis.interactionRatePrev)}
            hint="Contatos que responderam ÷ envolvidos"
          />
        </div>

        {view === 'board' ? (
          <RiskBoard rows={boardRows} onSelect={openCompany} />
        ) : (
          <CompanyTable rows={tableRows} onRowClick={openCompany} />
        )}
      </div>
    </div>
  );
}
