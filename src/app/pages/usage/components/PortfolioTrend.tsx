/**
 * Tendência da carteira (feedback Spina): quantos clientes em cada faixa de
 * risco, semana a semana — a pergunta "a carteira está piorando?" não se
 * responde olhando card por card.
 *
 * Reusa `scoreTimeline` por cliente (mesma janela deslizante, mesmo clamp de
 * histórico do gráfico do detalhe): cada cliente só entra na curva a partir do
 * próprio histórico disponível — semanas antigas contam menos clientes, e o
 * rodapé diz isso em texto em vez de deixar a área "crescer" parecer adoção.
 *
 * Cores por faixa: LIDAS de `BUCKET_META` (fonte única da rampa) — isto é um
 * indicador de risco, o único lugar onde a rampa é permitida.
 */
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Company, Health, Period, RiskBucket } from '../data/types';
import { BUCKET_META } from '../lib/health';
import { scoreTimeline } from '../lib/timeline';
import { bucketTransition } from '../lib/cs';
import { TREND_BAD, TREND_GOOD } from './colors';

const NAVY = '#212A46';
const MUTED = '#64748B';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PortfolioTrendRow {
  company: Company;
  health: Health;
  prevHealth: Health;
}

interface PortfolioTrendProps {
  rows: PortfolioTrendRow[];
  period: Period;
  weeks?: number;
}

/** Ordem de empilhamento: o pior na BASE — é o que o olho precisa achar primeiro. */
const STACK_ORDER: RiskBucket[] = ['critical', 'at_risk', 'watch', 'healthy'];

const DATE_LABEL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

interface WeekPoint {
  label: string;
  /** Quantos clientes JÁ têm histórico nesta semana (base da contagem). */
  known: number;
  critical: number;
  at_risk: number;
  watch: number;
  healthy: number;
}

export function PortfolioTrend({ rows, period, weeks = 12 }: PortfolioTrendProps) {
  const { points, movements } = useMemo(() => {
    // Grade de datas idêntica à do scoreTimeline: âncora em period.end.
    const anchorMs = period.end.getTime();
    const grid: number[] = [];
    for (let i = 0; i < weeks; i++) {
      grid.push(anchorMs - (weeks - 1 - i) * 7 * MS_PER_DAY);
    }

    const acc = new Map<number, WeekPoint>(
      grid.map((ms) => [
        ms,
        {
          label: DATE_LABEL.format(new Date(ms)),
          known: 0,
          critical: 0,
          at_risk: 0,
          watch: 0,
          healthy: 0,
        },
      ]),
    );

    for (const row of rows) {
      for (const p of scoreTimeline(row.company, period, weeks)) {
        const bucket = acc.get(p.date.getTime());
        if (!bucket) continue;
        bucket.known += 1;
        bucket[p.bucket] += 1;
      }
    }

    let worsened = 0;
    let improved = 0;
    for (const row of rows) {
      const t = bucketTransition(row.health, row.prevHealth);
      if (t?.dir === 'worsened') worsened += 1;
      if (t?.dir === 'improved') improved += 1;
    }

    return {
      // Semana sem NENHUM cliente com histórico não é dado, é vazio.
      points: grid.map((ms) => acc.get(ms)!).filter((p) => p.known > 0),
      movements: { worsened, improved },
    };
  }, [rows, period, weeks]);

  return (
    <section
      aria-label="Tendência da carteira"
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
            Tendência da carteira
          </h3>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Clientes por faixa de risco, semana a semana
          </p>
        </div>
        {/* Gatilhos por TRANSIÇÃO (não por estado): quem mudou de faixa no período */}
        <p className="text-xs tabular-nums" style={{ color: MUTED }}>
          vs. período anterior:{' '}
          <span style={{ fontWeight: 600, color: movements.worsened > 0 ? TREND_BAD : MUTED }}>
            {movements.worsened} {movements.worsened === 1 ? 'piorou' : 'pioraram'} de faixa
          </span>
          {' · '}
          <span style={{ fontWeight: 600, color: movements.improved > 0 ? TREND_GOOD : MUTED }}>
            {movements.improved} {movements.improved === 1 ? 'melhorou' : 'melhoraram'}
          </span>
        </p>
      </div>

      {points.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Sem histórico suficiente para desenhar a tendência.
        </p>
      ) : (
        <>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: MUTED }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: MUTED }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    BUCKET_META[name as RiskBucket]?.label ?? name,
                  ]}
                  labelFormatter={(label) => `Semana de ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#d8d8d8' }}
                />
                {STACK_ORDER.map((bucket) => (
                  <Area
                    key={bucket}
                    type="monotone"
                    dataKey={bucket}
                    stackId="buckets"
                    stroke={BUCKET_META[bucket].color}
                    fill={BUCKET_META[bucket].color}
                    fillOpacity={0.55}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* legenda textual — cor nunca é o único indicador */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {STACK_ORDER.map((bucket) => (
              <span
                key={bucket}
                className="inline-flex items-center gap-1.5"
                style={{ fontSize: 11, color: MUTED }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: BUCKET_META[bucket].color }}
                />
                {BUCKET_META[bucket].label}
              </span>
            ))}
            <span style={{ fontSize: 11, color: MUTED }}>
              · cada cliente entra na curva quando o próprio histórico começa — semanas
              antigas contam menos clientes
            </span>
          </div>
        </>
      )}
    </section>
  );
}
