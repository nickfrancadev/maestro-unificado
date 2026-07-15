/**
 * Tela 2 — Detalhe do Cliente (`/uso-clientes/:companyId`).
 *
 * Responde "por que esse cliente está em risco?" e "o que acontece dentro dele?".
 * Seis seções na ordem do spec: saúde → StatTiles com Δ → funil + mix →
 * evolução do score → usuários.
 */
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import { getCompany } from './data/mockData';
import { periodSearch, usePeriodParam } from './usePeriodParam';
import { BUCKET_META, WEIGHTS, computeHealth } from './lib/health';
import {
  adoptionFunnel,
  computeMetrics,
  lastAccessAt,
  lastActivityAt,
  playTypeMix,
  previousPeriod,
  userStats,
} from './lib/selectors';
import { scoreTimeline } from './lib/timeline';
import { formatDaysAgo, formatDelta, formatNumber } from './lib/format';
import { PeriodFilter } from './components/PeriodFilter';
import { StatTile } from './components/StatTile';
import { HealthScoreRing } from './components/HealthScoreRing';
import { SignalChips } from './components/SignalChips';
import { PendingMarker } from './components/PendingMarker';
import { AdoptionFunnel } from './components/AdoptionFunnel';
import { PlayTypeMix } from './components/PlayTypeMix';
import { ScoreTimeline } from './components/ScoreTimeline';
import { UsersTable } from './components/UsersTable';

const NAVY = '#212A46';
const MUTED = '#64748B';
const GRID = '#E2E8F0';

/** Alcance fixo do gráfico de evolução; o período do filtro fica sombreado dentro. */
const TIMELINE_WEEKS = 12;

const DIMENSION_LABEL: Record<keyof typeof WEIGHTS, string> = {
  recency: 'Recência',
  trend: 'Tendência',
  depth: 'Profundidade',
  concentration: 'Concentração',
};

const DIMENSIONS = Object.keys(DIMENSION_LABEL) as (keyof typeof WEIGHTS)[];

function NotFound({ companyId }: { companyId?: string }) {
  return (
    <div className="flex-1 overflow-auto bg-[#edf2f5] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6 font-['Euclid_Circular_A',sans-serif]">
        <div
          className="bg-white rounded-xl border border-[#d8d8d8] p-10 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>
            Cliente não encontrado
          </h1>
          <p className="mt-2" style={{ fontSize: 13, color: MUTED }}>
            Nenhum cliente com o identificador
            {companyId ? ` “${companyId}”` : ''} existe no portfólio.
          </p>
          <Link
            to="/uso-clientes"
            className="mt-5 inline-flex items-center rounded-lg px-3 py-2 text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] focus-visible:ring-offset-2"
            style={{ background: '#FF5F39', fontSize: 13, fontWeight: 600 }}
          >
            Voltar ao portfólio
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Barra de uma dimensão do breakdown. Navy — isto é composição do score, não risco. */
function DimensionBar({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>
          {label}{' '}
          <span className="tabular-nums" style={{ fontWeight: 400, color: MUTED }}>
            (peso {Math.round(weight * 100)}%)
          </span>
        </span>
        <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>
          {value}
        </span>
      </div>
      <div
        className="mt-1 h-2 w-full rounded-full overflow-hidden"
        style={{ background: GRID }}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value} de 100`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: NAVY }}
        />
      </div>
    </div>
  );
}

/**
 * Δ só existe onde existe DENOMINADOR — nos dois períodos.
 *
 * Um cliente que morreu vê `touchpointsLate` cair de 7 para 0 e
 * `touchpointsLateRate` de 100% para 0%. Com `invertDelta`, "menos atraso" é
 * bom, e os dois tiles pintavam VERDE — a página cuja única função é gritar
 * "esta conta está morrendo" parabenizava o defunto. O número não caiu porque o
 * cliente melhorou; caiu porque ele parou de existir: sem touchpoints criados,
 * não há atraso a medir.
 *
 * Idem para as médias `por play`: `safeDiv(0, 0) = 0` não é "zero contatos por
 * play", é a ausência de razão. Renderizar isso como "-100%" inventa uma queda.
 *
 * Um tile sem Δ é honesto. Um tile verde num cliente moribundo não é.
 *
 * @param delta  o Δ calculado
 * @param currDen denominador no período atual
 * @param prevDen denominador no período anterior
 */
function deltaIfMeasurable(
  delta: ReturnType<typeof formatDelta>,
  currDen: number,
  prevDen: number,
): ReturnType<typeof formatDelta> | undefined {
  return currDen > 0 && prevDen > 0 ? delta : undefined;
}

/** Texto que explica a AUSÊNCIA do Δ — o vazio precisa se justificar. */
function noDeltaHint(currDen: number, prevDen: number, unit: string): string | undefined {
  if (currDen > 0 && prevDen > 0) return undefined;
  if (currDen === 0 && prevDen === 0) return `Sem ${unit} em nenhum dos dois períodos`;
  if (currDen === 0) return `Sem ${unit} no período — não há razão a medir`;
  return `Sem ${unit} no período anterior — não há base de comparação`;
}

function FactRow({
  label,
  value,
  pending = false,
}: {
  label: string;
  value: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0" style={{ borderColor: GRID }}>
      <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: MUTED }}>
        {label}
        {pending && <PendingMarker />}
      </span>
      <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
        {value}
      </span>
    </div>
  );
}

export function UsageCompanyDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = usePeriodParam();

  const company = companyId ? getCompany(companyId) : undefined;

  /** Volta ao portfólio no MESMO período — o filtro sobrevive à navegação. */
  const backHref = `/uso-clientes${periodSearch(period)}`;

  const data = useMemo(() => {
    if (!company) return null;
    const prev = previousPeriod(period);
    return {
      health: computeHealth(company, period),
      metrics: computeMetrics(company, period),
      prevMetrics: computeMetrics(company, prev),
      funnel: adoptionFunnel(company, period),
      mix: playTypeMix(company, period),
      timeline: scoreTimeline(company, period, TIMELINE_WEEKS),
      users: userStats(company, period),
    };
  }, [company, period]);

  if (!company || !data) return <NotFound companyId={companyId} />;

  const { health, metrics: m, prevMetrics: p, funnel, mix, timeline, users } = data;
  const meta = BUCKET_META[health.bucket];

  return (
    <div className="flex-1 overflow-auto bg-[#edf2f5] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6 font-['Euclid_Circular_A',sans-serif]">
        {/* breadcrumb + período */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Trilha de navegação" className="flex items-center gap-1">
            <Link
              to={backHref}
              className="rounded transition-colors hover:text-[#212A46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
              style={{ fontSize: 13, fontWeight: 600, color: MUTED }}
            >
              Uso de Clientes
            </Link>
            <ChevronRight size={14} style={{ color: MUTED }} aria-hidden="true" />
            <span aria-current="page" style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
              {company.name}
            </span>
          </nav>

          <PeriodFilter period={period} onChange={setPeriod} />
        </div>

        {/* 1 — cabeçalho de saúde */}
        <section
          className="bg-white rounded-xl border border-[#d8d8d8] p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          aria-label="Saúde do cliente"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-6 items-start">
            {/* ring + nome */}
            <div className="flex flex-col items-center gap-3">
              <HealthScoreRing
                score={health.score}
                bucket={health.bucket}
                size={120}
                showLabel
              />
              <h1
                className="text-center leading-tight"
                style={{ fontSize: 18, fontWeight: 700, color: NAVY }}
              >
                {company.name}
              </h1>
              <SignalChips signals={health.signals} />
            </div>

            {/* breakdown das 4 dimensões */}
            <div className="flex flex-col gap-3">
              <h2 style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                Composição do score
              </h2>
              {DIMENSIONS.map((d) => (
                <DimensionBar
                  key={d}
                  label={DIMENSION_LABEL[d]}
                  value={health.breakdown[d]}
                  weight={WEIGHTS[d]}
                />
              ))}
              <p style={{ fontSize: 11, color: MUTED }}>
                Bucket atual: <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
              </p>
            </div>

            {/* fatos */}
            <div className="flex flex-col">
              <h2 className="mb-1" style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                Conta
              </h2>
              <FactRow
                label="Último acesso"
                value={formatDaysAgo(lastAccessAt(company))}
                pending
              />
              <FactRow
                label="Última atividade"
                value={formatDaysAgo(lastActivityAt(company))}
              />
              <FactRow label="Plano" value={company.plan} />
              <FactRow
                label="Usuários (ativos/total)"
                value={`${formatNumber(m.activeUsers)}/${formatNumber(company.users.length)}`}
              />
              <FactRow label="Assentos" value={formatNumber(company.seats)} />
              <p className="mt-2 inline-flex items-center gap-1.5" style={{ fontSize: 11, color: MUTED }}>
                <Users size={12} aria-hidden="true" />
                {formatNumber(company.accountsCount)} contas ·{' '}
                {formatNumber(company.contactsCount)} contatos
              </p>
            </div>
          </div>
        </section>

        {/* 2 — StatTiles com Δ vs. período anterior */}
        <section aria-label="Métricas do período">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatTile
              label="Plays criadas"
              value={m.playsCreated}
              delta={formatDelta(m.playsCreated, p.playsCreated)}
            />
            {/*
             * Coorte diferente da de "Plays criadas": fecha no período quem
             * fecha no período, tenha nascido quando tiver nascido. Por isso
             * "fechadas" pode passar de "criadas" sem que nada esteja errado —
             * e por isso o rótulo diz de quem está falando.
             */}
            <StatTile
              label="Plays fechadas no período"
              value={m.playsClosed}
              delta={formatDelta(m.playsClosed, p.playsClosed)}
              hint="Fechadas dentro do período, independente de quando foram criadas"
            />
            <StatTile
              label="Touchpoints criados"
              value={m.touchpointsCreated}
              delta={formatDelta(m.touchpointsCreated, p.touchpointsCreated)}
            />
            <StatTile
              label="Touchpoints finalizados no período"
              value={m.touchpointsClosed}
              delta={formatDelta(m.touchpointsClosed, p.touchpointsClosed)}
              hint="Finalizados dentro do período, independente de quando foram criados"
            />
            {/*
             * subir é RUIM: invertDelta. Mas o Δ SÓ aparece se houver
             * touchpoints criados nos dois períodos — ver `deltaIfMeasurable`.
             * Sem denominador, "0 atrasados" não é uma melhora, é um vazio.
             */}
            <StatTile
              label="Touchpoints atrasados"
              value={m.touchpointsLate}
              delta={deltaIfMeasurable(
                formatDelta(m.touchpointsLate, p.touchpointsLate),
                m.touchpointsCreated,
                p.touchpointsCreated,
              )}
              hint={noDeltaHint(m.touchpointsCreated, p.touchpointsCreated, 'touchpoints criados')}
              invertDelta
            />
            <StatTile
              label="% de touchpoints atrasados"
              value={m.touchpointsLateRate}
              format="pct"
              delta={deltaIfMeasurable(
                formatDelta(m.touchpointsLateRate, p.touchpointsLateRate),
                m.touchpointsCreated,
                p.touchpointsCreated,
              )}
              hint={noDeltaHint(m.touchpointsCreated, p.touchpointsCreated, 'touchpoints criados')}
              invertDelta
            />
            {/* Médias "por play": o denominador é `playsCreated`. */}
            <StatTile
              label="Média de touchpoints por play"
              value={m.avgTouchpointsPerPlay}
              delta={deltaIfMeasurable(
                formatDelta(m.avgTouchpointsPerPlay, p.avgTouchpointsPerPlay),
                m.playsCreated,
                p.playsCreated,
              )}
              hint={noDeltaHint(m.playsCreated, p.playsCreated, 'plays criadas')}
            />
            <StatTile
              label="Média de contatos por play"
              value={m.avgContactsPerPlay}
              delta={deltaIfMeasurable(
                formatDelta(m.avgContactsPerPlay, p.avgContactsPerPlay),
                m.playsCreated,
                p.playsCreated,
              )}
              hint={noDeltaHint(m.playsCreated, p.playsCreated, 'plays criadas')}
            />
            <StatTile
              label="Média de interações por play"
              value={m.avgInteractionsPerPlay}
              delta={deltaIfMeasurable(
                formatDelta(m.avgInteractionsPerPlay, p.avgInteractionsPerPlay),
                m.playsCreated,
                p.playsCreated,
              )}
              hint={noDeltaHint(m.playsCreated, p.playsCreated, 'plays criadas')}
            />
            <StatTile
              label="Dias até fechamento"
              value={m.avgDaysToClose === null ? '—' : m.avgDaysToClose}
              format="days"
              hint={m.avgDaysToClose === null ? 'Nenhuma play fechada no período' : undefined}
            />
          </div>
        </section>

        {/* 3 — funil + mix (ambos já trazem o próprio card) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <AdoptionFunnel stages={funnel} />
          <PlayTypeMix mix={mix} />
        </div>

        {/* 4 — evolução do score (12 semanas fixas; período do filtro sombreado) */}
        <ScoreTimeline points={timeline} period={period} weeks={TIMELINE_WEEKS} />

        {/* 5 — usuários */}
        <section aria-label="Usuários">
          <h2 className="mb-3" style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
            Usuários
          </h2>
          <UsersTable rows={users} />
        </section>

        <button
          type="button"
          onClick={() => navigate(backHref)}
          className="rounded-lg border border-[#d8d8d8] bg-white px-3 py-2 transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] focus-visible:ring-offset-2"
          style={{ fontSize: 13, fontWeight: 600, color: MUTED }}
        >
          ← Voltar ao portfólio
        </button>
      </div>
    </div>
  );
}
