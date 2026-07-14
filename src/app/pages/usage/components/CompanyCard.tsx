import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import type { Company, Health } from '../data/types';
import type { UsageMetrics } from '../lib/selectors';
import { BUCKET_META } from '../lib/health';
import { formatNumber } from '../lib/format';
import { HealthScoreRing } from './HealthScoreRing';
import { SignalChips } from './SignalChips';

interface CompanyCardProps {
  company: Company;
  health: Health;
  metrics: UsageMetrics;
  /** atividade por semana (ex.: `activityByWeek(company, 12)`) */
  sparkline: number[];
  onClick: () => void;
}

const REST_SHADOW = '0 1px 3px rgba(0,0,0,0.05)';
const HOVER_SHADOW = '0 8px 20px rgba(33,42,70,0.12)';

/**
 * A company fantasma — zero atividade no período — é exatamente quem este
 * dashboard caça. A sparkline dela precisa ser uma linha reta no chão, não um
 * gráfico vazio: por isso o domínio do Y é fixado em `[0, max || 1]`.
 */
export function CompanyCard({
  company,
  health,
  metrics,
  sparkline,
  onClick,
}: CompanyCardProps) {
  const [hover, setHover] = useState(false);
  const meta = BUCKET_META[health.bucket];

  const series = sparkline.length > 0 ? sparkline : [0, 0];
  const data = series.map((value, i) => ({ i, value }));
  const max = Math.max(...series);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`${company.name} — health score ${health.score}, ${meta.label}`}
      className="w-full text-left bg-white rounded-xl p-5 border border-[#d8d8d8] flex flex-col gap-4 font-['Euclid_Circular_A',sans-serif] cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF5F39]"
      style={{
        // Hover/focus não muda tamanho, margem, padding nem borda — só transform
        // e sombra. Um board de 30 cards não pode tremer ao passar o mouse.
        boxShadow: hover ? HOVER_SHADOW : REST_SHADOW,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
      }}
    >
      {/* topo: ring + identificação */}
      <div className="flex items-center gap-3">
        <HealthScoreRing score={health.score} bucket={health.bucket} size={56} />
        <div className="min-w-0 flex-1">
          <p
            className="truncate leading-tight"
            style={{ fontSize: 15, fontWeight: 600, color: '#212A46' }}
            title={company.name}
          >
            {company.name}
          </p>
          <p
            className="truncate leading-tight mt-0.5 tabular-nums"
            style={{ fontSize: 12, color: '#64748B' }}
          >
            {company.plan} · {formatNumber(company.seats)}{' '}
            {company.seats === 1 ? 'assento' : 'assentos'}
          </p>
        </div>
      </div>

      {/* sparkline: sem eixos, sem grid, sem legenda, sem tooltip */}
      <div
        style={{ height: 32 }}
        aria-hidden="true"
        // decorativa: o rodapé já traz os números em texto
      >
        <ResponsiveContainer width="100%" height={32}>
          <LineChart
            data={data}
            margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
          >
            {/* domínio fixo: série toda-zero vira linha reta, não gráfico vazio */}
            <YAxis key="spark-y" hide domain={[0, max > 0 ? max : 1]} />
            <Line
              key="spark-line"
              type="monotone"
              dataKey="value"
              stroke={meta.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* sinais (máx. 2) — cor nunca é o único indicador */}
      {health.signals.length > 0 && (
        <SignalChips signals={health.signals} max={2} />
      )}

      {/* rodapé */}
      <p
        className="tabular-nums leading-none"
        style={{ fontSize: 12, color: '#64748B' }}
      >
        {formatNumber(metrics.playsCreated)} plays ·{' '}
        {formatNumber(metrics.touchpointsCreated)} touch ·{' '}
        {formatNumber(metrics.activeUsers)} usuários
      </p>
    </button>
  );
}
