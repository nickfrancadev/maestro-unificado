/**
 * Health Score — cálculo puro. Nenhum import de React.
 *
 * O score ordena; os sinais explicam. A UI nunca mostra o número sem os chips.
 */
import type { Company, Dimension, Health, Period, RiskBucket, Signal } from '../data/types';
import { TODAY } from '../data/types';
import {
  activityVolume,
  computeMetrics,
  lastAccessAt,
  lastActivityAt,
  previousPeriod,
  userStats,
} from './selectors';
import { daysAgo } from './format';

export const WEIGHTS = {
  recency: 0.35,
  trend: 0.25,
  depth: 0.25,
  concentration: 0.15,
} as const;

export const BUCKET_THRESHOLDS = {
  critical: 30,
  at_risk: 55,
  watch: 75,
} as const;

export const BUCKET_META: Record<
  RiskBucket,
  { label: string; color: string; icon: string }
> = {
  critical: { label: 'Crítico', color: '#DC2626', icon: 'OctagonAlert' },
  at_risk: { label: 'Em risco', color: '#EA580C', icon: 'TriangleAlert' },
  watch: { label: 'Atenção', color: '#CA8A04', icon: 'CircleDashed' },
  healthy: { label: 'Saudável', color: '#059669', icon: 'CircleCheck' },
};

export function bucketOf(score: number): RiskBucket {
  if (score < BUCKET_THRESHOLDS.critical) return 'critical';
  if (score < BUCKET_THRESHOLDS.at_risk) return 'at_risk';
  if (score < BUCKET_THRESHOLDS.watch) return 'watch';
  return 'healthy';
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** 0–3d → 100; decai linearmente até 30d → 0; nunca → 0. */
function recencyScore(days: number | null): number {
  if (days === null) return 0;
  if (days <= 3) return 100;
  if (days >= 30) return 0;
  return clamp(((30 - days) / 27) * 100);
}

/** Razão ≥1 → 100; ≤0.5 → 0; linear entre. Anterior 0 e atual > 0 → 100. */
function trendScore(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  const ratio = curr / prev;
  if (ratio >= 1) return 100;
  if (ratio <= 0.5) return 0;
  return clamp(((ratio - 0.5) / 0.5) * 100);
}

/** 1 - HHI, normalizado pelo número de usuários ativos. 1 usuário → 0. */
function concentrationScore(shares: number[]): number {
  const active = shares.filter((s) => s > 0);
  const n = active.length;
  if (n === 0) return 0;
  if (n === 1) return 0;
  const hhi = active.reduce((s, x) => s + x * x, 0);
  // Normaliza: HHI mínimo possível com n usuários é 1/n (uniforme).
  const normalized = (1 - hhi) / (1 - 1 / n);
  return clamp(normalized * 100);
}

/**
 * Média SÓ dos termos que têm denominador.
 *
 * Um termo sem denominador (0 plays criadas, 0 touchpoints, 0 contatos
 * envolvidos) não é "nota zero" nem "nota cheia": é ausência de evidência.
 * Antes, `touchpointsLateRate = 0` com zero touchpoints entrava como
 * `(1 - 0) = 1.0` na média — a company fantasma, que não fez NADA no período,
 * colhia `depth = 33`. Sem nenhum denominador, não há profundidade a medir: 0.
 */
function depthScore(m: ReturnType<typeof computeMetrics>): number {
  const terms: number[] = [];
  if (m.playsCreated > 0) terms.push(m.playsCloseRate);
  if (m.touchpointsCreated > 0) terms.push(1 - m.touchpointsLateRate);
  if (m.contactsInvolved > 0) terms.push(m.interactionRate);
  if (terms.length === 0) return 0;
  return clamp((terms.reduce((s, t) => s + t, 0) / terms.length) * 100);
}

export function computeHealth(company: Company, period: Period, today: Date = TODAY): Health {
  const m = computeMetrics(company, period);
  const prev = previousPeriod(period);

  const access = lastAccessAt(company);
  const activity = lastActivityAt(company);
  const lastTouch =
    access && activity
      ? new Date(Math.max(access.getTime(), activity.getTime()))
      : (access ?? activity);
  const idleDays = daysAgo(lastTouch, today);

  const currVol = activityVolume(company, period);
  const prevVol = activityVolume(company, prev);

  const stats = userStats(company, period);
  const shares = stats.map((s) => s.share);

  const breakdown: Record<Dimension, number> = {
    recency: Math.round(recencyScore(idleDays)),
    trend: Math.round(trendScore(currVol, prevVol)),
    depth: Math.round(depthScore(m)),
    concentration: Math.round(concentrationScore(shares)),
  };

  const score = Math.round(
    breakdown.recency * WEIGHTS.recency +
      breakdown.trend * WEIGHTS.trend +
      breakdown.depth * WEIGHTS.depth +
      breakdown.concentration * WEIGHTS.concentration,
  );

  const bucket = bucketOf(score);

  return {
    score,
    bucket,
    breakdown,
    signals: buildSignals(company, {
      idleDays,
      currVol,
      prevVol,
      metrics: m,
      shares,
      bucket,
    }),
  };
}

const SEVERITY_ORDER: Record<Signal['severity'], number> = { high: 0, medium: 1, low: 2 };

function buildSignals(
  company: Company,
  ctx: {
    idleDays: number | null;
    currVol: number;
    prevVol: number;
    metrics: ReturnType<typeof computeMetrics>;
    shares: number[];
    bucket: RiskBucket;
  },
): Signal[] {
  const { idleDays, currVol, prevVol, metrics: m, shares, bucket } = ctx;
  const out: Signal[] = [];

  if (idleDays === null) {
    out.push({ id: 'never-accessed', label: 'Nunca acessou', severity: 'high' });
  } else if (idleDays > 7) {
    out.push({
      id: 'stale-access',
      label: `Sem acesso há ${idleDays}d`,
      severity: idleDays > 21 ? 'high' : 'medium',
    });
  }

  // Mesma coorte do rótulo: "das N que abriu, 0 fecharam".
  if (m.playsCreated >= 5 && m.playsCreatedThatClosed === 0) {
    out.push({
      id: 'no-closed-plays',
      label: `0 de ${m.playsCreated} plays fechadas`,
      severity: 'high',
    });
  }

  if (prevVol > 0) {
    const dropPct = Math.round(((prevVol - currVol) / prevVol) * 100);
    if (dropPct > 30) {
      out.push({
        id: 'activity-drop',
        label: `-${dropPct}% de atividade`,
        severity: dropPct > 50 ? 'high' : 'medium',
      });
    }
  }

  const topShare = shares.length ? Math.max(...shares) : 0;
  if (topShare > 0.8) {
    out.push({
      id: 'concentration',
      label: `1 usuário concentra ${Math.round(topShare * 100)}%`,
      severity: 'medium',
    });
  }

  if (m.touchpointsLateRate > 0.5) {
    out.push({
      id: 'late-touchpoints',
      label: `${Math.round(m.touchpointsLateRate * 100)}% dos touchpoints atrasados`,
      severity: 'medium',
    });
  }

  if (m.interactionRate < 0.2 && m.touchpointsCreated > 10) {
    out.push({
      id: 'low-interaction',
      label: `Baixa taxa de interação (${Math.round(m.interactionRate * 100)}%)`,
      severity: 'medium',
    });
  }

  const neverAccessed = company.users.filter((u) => u.lastAccessAt === null).length;
  if (neverAccessed > 0) {
    out.push({
      id: 'unused-seats',
      label: `${neverAccessed} ${neverAccessed === 1 ? 'assento nunca usado' : 'assentos nunca usados'}`,
      severity: 'low',
    });
  }

  if (out.length === 0) {
    out.push(
      bucket === 'healthy'
        ? { id: 'healthy', label: 'Uso saudável', severity: 'low' }
        : { id: 'no-signal', label: 'Sem sinais relevantes', severity: 'low' },
    );
  }

  // Garante 1..3 chips, priorizando severidade.
  out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return out.slice(0, 3);
}
