import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import type { Company, Health, Signal } from '../data/types';
import type { UsageMetrics } from '../lib/selectors';
import type { BucketTenure } from '../lib/cs';
import { BUCKET_META } from '../lib/health';
import { PLAYBOOK, bucketTransition, daysToRenewal, formatTenure, journeyStage } from '../lib/cs';
import { recordAction } from '../lib/notes';
import { formatBRL, formatDaysAgo, formatNumber } from '../lib/format';
import { HealthScoreRing } from './HealthScoreRing';
import { SignalChips } from './SignalChips';

interface CompanyCardProps {
  company: Company;
  health: Health;
  metrics: UsageMetrics;
  /** atividade por semana (ex.: `activityByWeek(company, 12)`) */
  sparkline: number[];
  /** saúde do período anterior — habilita o badge de transição de faixa */
  prevHealth?: Health;
  /** tempo no bucket atual (ver `bucketTenure`) */
  tenure?: BucketTenure | null;
  /** sinais antecedentes (champion sumiu, tickets, NPS) — ver `antecedentSignals` */
  antecedents?: Signal[];
  onClick: () => void;
}

const REST_SHADOW = '0 1px 3px rgba(0,0,0,0.05)';
const HOVER_SHADOW = '0 8px 20px rgba(33,42,70,0.12)';

const NAVY = '#212A46';
const MUTED = '#64748B';
const ORANGE = '#FF5F39';

/** Renovação a ≤ este horizonte ganha peso visual — é o que prioriza a fila. */
const RENEWAL_SOON_DAYS = 45;

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/**
 * A company fantasma — zero atividade no período — é exatamente quem este
 * dashboard caça. A sparkline dela precisa ser uma linha reta no chão, não um
 * gráfico vazio: por isso o domínio do Y é fixado em `[0, max || 1]`.
 *
 * Estrutura (mudou com o feedback do CS): o card era um `<button>` único, mas
 * ganhou botões PRÓPRIOS (ação do playbook) — botão dentro de botão é HTML
 * inválido e rouba o clique. Agora segue o padrão da `CompanyTable`: o wrapper
 * é um `<div>` clicável por conveniência e o NOME é o `<button>`-âncora que dá
 * o alvo de teclado; ações internas fazem `stopPropagation`.
 */
export function CompanyCard({
  company,
  health,
  metrics,
  sparkline,
  prevHealth,
  tenure = null,
  antecedents = [],
  onClick,
}: CompanyCardProps) {
  const [hover, setHover] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const meta = BUCKET_META[health.bucket];

  const series = sparkline.length > 0 ? sparkline : [0, 0];
  const data = series.map((value, i) => ({ i, value }));
  const max = Math.max(...series);

  const renewalDays = daysToRenewal(company);
  const stage = journeyStage(company);
  const tenureLabel = formatTenure(tenure);
  const transition = prevHealth ? bucketTransition(health, prevHealth) : null;
  const playbook = PLAYBOOK[health.bucket];

  const signals = [...health.signals, ...antecedents].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full text-left bg-white rounded-xl p-5 border border-[#d8d8d8] flex flex-col gap-3 font-['Euclid_Circular_A',sans-serif] cursor-pointer"
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
          {/* âncora de teclado do card — como a célula-nome da tabela */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            aria-label={`${company.name} — health score ${health.score}, ${meta.label} — abrir detalhe`}
            className="block max-w-full truncate text-left leading-tight rounded cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF5F39]"
            style={{ fontSize: 15, fontWeight: 600, color: NAVY }}
            title={company.name}
          >
            {company.name}
          </button>
          <p
            className="truncate leading-tight mt-0.5 tabular-nums"
            style={{ fontSize: 12, color: MUTED }}
          >
            {company.plan} · {formatNumber(company.seats)}{' '}
            {company.seats === 1 ? 'assento' : 'assentos'}
          </p>
          {/* MRR + renovação: o que prioriza a fila (feedback Spina) */}
          <p className="truncate leading-tight mt-0.5 tabular-nums" style={{ fontSize: 12, color: MUTED }}>
            <span style={{ fontWeight: 600, color: NAVY }}>{formatBRL(company.mrr)}</span>
            {renewalDays !== null && (
              <span
                style={
                  renewalDays <= RENEWAL_SOON_DAYS
                    ? { fontWeight: 600, color: NAVY }
                    : undefined
                }
              >
                {' '}· renova em {renewalDays}d
              </span>
            )}
          </p>
        </div>
      </div>

      {/* dono + último contato + estágio */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="truncate leading-tight tabular-nums" style={{ fontSize: 12, color: MUTED }}>
          {company.csm ? `CSM ${company.csm}` : 'Sem CSM'}
          {company.lastCsContactAt !== undefined &&
            ` · contato ${formatDaysAgo(company.lastCsContactAt)}`}
        </p>
        <span
          className="inline-flex items-center rounded-full border px-2 py-0.5 leading-none whitespace-nowrap"
          style={{ fontSize: 10, fontWeight: 600, color: MUTED, borderColor: '#CBD5E1', background: '#F8FAFC' }}
        >
          {stage.label}
        </span>
      </div>

      {/* tempo no estado + gatilho de transição: "crítico há 3d" ≠ "há 60d" */}
      {(tenureLabel || transition) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-tight" style={{ fontSize: 12 }}>
          {tenureLabel && (
            <span className="tabular-nums" style={{ fontWeight: 600, color: meta.color }}>
              {meta.label} {tenureLabel}
            </span>
          )}
          {transition && (
            <span
              className="inline-flex items-center rounded px-1.5 py-0.5 leading-none whitespace-nowrap"
              style={
                transition.dir === 'worsened'
                  ? { fontSize: 11, fontWeight: 600, background: '#FFFBEB', color: '#92400E' }
                  : { fontSize: 11, fontWeight: 600, background: '#F1F5F9', color: MUTED }
              }
            >
              {BUCKET_META[transition.from].label} → {BUCKET_META[transition.to].label}
              {transition.dir === 'worsened' ? ' — intervir cedo' : ''}
            </span>
          )}
        </p>
      )}

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

      {/* sinais do score + antecedentes (máx. 3) — cor nunca é o único indicador */}
      {signals.length > 0 && <SignalChips signals={signals} max={3} />}

      {/* rodapé */}
      <p
        className="tabular-nums leading-none"
        style={{ fontSize: 12, color: MUTED }}
      >
        {formatNumber(metrics.playsCreated)} plays ·{' '}
        {formatNumber(metrics.touchpointsCreated)} touch ·{' '}
        {formatNumber(metrics.activeUsers)} usuários
      </p>

      {/* ação sugerida (playbook) + botão — saudável não tem ação a disparar */}
      {playbook.cta && (
        <div className="flex items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: '#E2E8F0' }}>
          <span className="leading-tight" style={{ fontSize: 11, color: MUTED }}>
            {playbook.label}
          </span>
          <button
            type="button"
            disabled={actionDone}
            onClick={(e) => {
              e.stopPropagation();
              recordAction(company.id, `${playbook.label} — disparada pelo card`);
              setActionDone(true);
            }}
            className="shrink-0 rounded-lg border px-2.5 py-1.5 leading-none transition-colors hover:bg-[#FFF3EF] disabled:cursor-default disabled:hover:bg-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: actionDone ? MUTED : ORANGE,
              borderColor: actionDone ? '#CBD5E1' : ORANGE,
            }}
          >
            {actionDone ? 'Ação registrada ✓' : playbook.cta}
          </button>
        </div>
      )}
    </div>
  );
}
