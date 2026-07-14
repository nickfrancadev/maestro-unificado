/**
 * Agregações puras sobre `Company`. Nenhum import de React.
 *
 * Convenções de período (todas half-open-inclusive: `start <= d <= end`):
 * - um play "conta" no período se `createdAt` cai dentro dele;
 * - um play é "fechado no período" se `endDate` cai dentro dele;
 * - idem para touchpoints.
 */
import type { Company, Period, Play, PlayType, Touchpoint, User } from '../data/types';
import { TODAY } from '../data/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface UsageMetrics {
  playsCreated: number;
  /** Plays fechadas DENTRO do período, independente de quando nasceram. Métrica de display. */
  playsClosed: number;
  /** Das plays CRIADAS no período, quantas já estão fechadas (coorte fechada). */
  playsCreatedThatClosed: number;
  /** `playsCreatedThatClosed / playsCreated`, 0-1. Zero criadas → 0. */
  playsCloseRate: number;
  playsOpen: number;
  touchpointsCreated: number;
  touchpointsClosed: number;
  touchpointsLate: number;
  /** 0-1 */
  touchpointsLateRate: number;
  avgTouchpointsPerPlay: number;
  avgContactsPerPlay: number;
  avgInteractionsPerPlay: number;
  /** interações / contatos envolvidos, 0-1 */
  interactionRate: number;
  /** Denominador de `interactionRate`: contatos envolvidos nos touchpoints do período. */
  contactsInvolved: number;
  /**
   * Numerador de `interactionRate`: interações registradas nos touchpoints do
   * período. Exposto porque uma taxa agregada do portfólio precisa somar
   * numeradores e denominadores separadamente (taxa POOLED) — reconstruir o
   * numerador a partir de `interactionRate * contactsInvolved` perderia o
   * excedente descartado pelo clamp `Math.min(1, …)`.
   */
  interactions: number;
  /** null se nenhuma play fechada no período */
  avgDaysToClose: number | null;
  /** usuários com atividade no período */
  activeUsers: number;
}

function inPeriod(d: Date | null | undefined, period: Period): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= period.start.getTime() && t <= period.end.getTime();
}

/** Touchpoint atrasado: vencido e não finalizado. */
function isLate(tp: Touchpoint, today: Date = TODAY): boolean {
  return tp.endDate === null && tp.dueDate.getTime() < today.getTime();
}

function playsIn(company: Company, period: Period): Play[] {
  return company.plays.filter((p) => inPeriod(p.createdAt, period));
}

function touchpointsIn(company: Company, period: Period): Touchpoint[] {
  const out: Touchpoint[] = [];
  for (const play of company.plays) {
    for (const tp of play.touchpoints) {
      if (inPeriod(tp.createdAt, period)) out.push(tp);
    }
  }
  return out;
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function computeMetrics(company: Company, period: Period): UsageMetrics {
  const plays = playsIn(company, period);
  const playsCreated = plays.length;

  // "Fechadas no período" olha TODAS as plays da company (uma play criada antes
  // do período pode ter sido fechada dentro dele).
  const closedInPeriod = company.plays.filter((p) => inPeriod(p.endDate, period));
  const playsClosed = closedInPeriod.length;

  const tps = touchpointsIn(company, period);
  const touchpointsCreated = tps.length;
  const touchpointsClosed = company.plays
    .flatMap((p) => p.touchpoints)
    .filter((tp) => inPeriod(tp.endDate, period)).length;
  const touchpointsLate = tps.filter((tp) => isLate(tp)).length;

  const contactsInvolved = tps.reduce((s, tp) => s + tp.contactsInvolved, 0);
  const interactions = tps.reduce((s, tp) => s + tp.interactions, 0);

  const playContacts = plays.reduce((s, p) => s + p.contactsInvolved, 0);

  const daysToClose = closedInPeriod.map(
    (p) => (p.endDate!.getTime() - p.createdAt.getTime()) / MS_PER_DAY,
  );

  const active = userStats(company, period).filter((u) => u.plays + u.touchpoints > 0);

  // Close-rate com COORTE ÚNICA: numerador e denominador falam das MESMAS plays
  // — as criadas no período. Misturar "fechadas no período" (que podem ter
  // nascido antes) com "criadas no período" produzia taxas > 1 (mascaradas por
  // um clamp) e dava 1.0 de graça a quem parou de criar plays e deixou uma
  // antiga fechar. Zero criadas → 0 (não se ganha crédito por não fazer nada);
  // `health.ts` trata esse caso como "sem denominador" e o exclui de `depth`.
  const playsCreatedThatClosed = plays.filter((p) => p.endDate !== null).length;

  return {
    playsCreated,
    playsClosed,
    playsCreatedThatClosed,
    playsCloseRate: safeDiv(playsCreatedThatClosed, playsCreated),
    playsOpen: plays.filter((p) => p.endDate === null).length,
    touchpointsCreated,
    touchpointsClosed,
    touchpointsLate,
    touchpointsLateRate: safeDiv(touchpointsLate, touchpointsCreated),
    avgTouchpointsPerPlay: safeDiv(
      plays.reduce((s, p) => s + p.touchpoints.length, 0),
      playsCreated,
    ),
    avgContactsPerPlay: safeDiv(playContacts, playsCreated),
    avgInteractionsPerPlay: safeDiv(
      plays.reduce((s, p) => s + p.touchpoints.reduce((t, tp) => t + tp.interactions, 0), 0),
      playsCreated,
    ),
    interactionRate: Math.min(1, safeDiv(interactions, contactsInvolved)),
    contactsInvolved,
    interactions,
    avgDaysToClose:
      daysToClose.length === 0
        ? null
        : daysToClose.reduce((s, d) => s + d, 0) / daysToClose.length,
    activeUsers: active.length,
  };
}

/**
 * Taxa POOLED (Σ numeradores ÷ Σ denominadores) de uma lista de métricas.
 *
 * NÃO é a média das taxas por company. A média das taxas trata `safeDiv(0, 0) = 0`
 * — "não criou nenhuma play" — como "fechou 0% das suas plays", e quem não fez
 * NADA passa a puxar o agregado para baixo como se tivesse falhado. O efeito é
 * inversor: estreitando o período de 30d para 7d, o número de companies com zero
 * plays sobe de 2 para 13 e a "média" DESPENCA (46,9% → 24,7%) enquanto a taxa
 * real entre quem de fato rodou plays MELHORA (46,4% → 53,8%). O KPI andava para
 * o lado errado no gesto mais comum do dashboard.
 *
 * Na taxa pooled, uma company sem denominador contribui 0 dos dois lados e
 * simplesmente não participa — sem distorcer nem ganhar peso. E uma company
 * minúscula com 1 play fechada (100%) não pesa igual a uma grande com 200 plays
 * e 40 fechadas.
 *
 * `basis` = quantas companies têm denominador > 0, isto é, sobre quantas a taxa
 * foi de fato calculada. A UI mostra esse número: uma taxa agregada sem a sua
 * base é uma taxa que não se pode auditar.
 */
export interface PooledRate {
  /** 0–1. Σ numeradores ÷ Σ denominadores. Sem denominador algum → 0. */
  rate: number;
  numerator: number;
  denominator: number;
  /** Companies que contribuíram (denominador > 0). */
  basis: number;
}

export function pooledRate<T>(
  items: T[],
  numerator: (item: T) => number,
  denominator: (item: T) => number,
): PooledRate {
  let num = 0;
  let den = 0;
  let basis = 0;
  for (const item of items) {
    const d = denominator(item);
    if (d <= 0) continue; // sem denominador = ausência de evidência, não um zero
    num += numerator(item);
    den += d;
    basis += 1;
  }
  return { rate: Math.min(1, safeDiv(num, den)), numerator: num, denominator: den, basis };
}

/** Janela de mesmo tamanho, imediatamente anterior, sem sobrepor. */
export function previousPeriod(period: Period): Period {
  const span = period.end.getTime() - period.start.getTime();
  const end = new Date(period.start.getTime() - 1);
  const start = new Date(end.getTime() - span);
  return { start, end };
}

function maxDate(dates: (Date | null)[]): Date | null {
  let best: Date | null = null;
  for (const d of dates) {
    if (d && (!best || d.getTime() > best.getTime())) best = d;
  }
  return best;
}

/** Máximo `lastAccessAt` entre os usuários (MOCK — pendente de instrumentação). */
export function lastAccessAt(company: Company): Date | null {
  return maxDate(company.users.map((u) => u.lastAccessAt));
}

/**
 * Última atividade real: o evento mais recente entre criação/fechamento de
 * plays e touchpoints. (Derivável do backend real.)
 */
export function lastActivityAt(company: Company): Date | null {
  const dates: (Date | null)[] = [];
  for (const p of company.plays) {
    dates.push(p.createdAt, p.endDate);
    for (const tp of p.touchpoints) {
      dates.push(tp.createdAt, tp.endDate);
    }
  }
  return maxDate(dates);
}

/** Todos os eventos de atividade (datas) da company. */
function activityEvents(company: Company): Date[] {
  const out: Date[] = [];
  for (const p of company.plays) {
    out.push(p.createdAt);
    if (p.endDate) out.push(p.endDate);
    for (const tp of p.touchpoints) {
      out.push(tp.createdAt);
      if (tp.endDate) out.push(tp.endDate);
    }
  }
  return out;
}

/**
 * Contagem de eventos por semana, do mais antigo (índice 0) ao mais recente
 * (índice `weeks - 1`, a semana que termina em `today`). Para sparkline.
 */
export function activityByWeek(company: Company, weeks: number, today: Date = TODAY): number[] {
  const buckets = new Array<number>(weeks).fill(0);
  const end = today.getTime();
  for (const d of activityEvents(company)) {
    const diffDays = Math.floor((end - d.getTime()) / MS_PER_DAY);
    if (diffDays < 0) continue;
    const weekBack = Math.floor(diffDays / 7);
    if (weekBack >= weeks) continue;
    buckets[weeks - 1 - weekBack] += 1;
  }
  return buckets;
}

/**
 * Grade semana × dia-da-semana. `week` 0 = mais antiga; `day` 0 = domingo.
 */
export function activityHeatmap(
  company: Company,
  weeks: number,
  today: Date = TODAY,
): { week: number; day: number; count: number }[] {
  const grid = new Map<string, number>();
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) grid.set(`${w}:${d}`, 0);
  }
  const end = today.getTime();
  for (const d of activityEvents(company)) {
    const diffDays = Math.floor((end - d.getTime()) / MS_PER_DAY);
    if (diffDays < 0) continue;
    const weekBack = Math.floor(diffDays / 7);
    if (weekBack >= weeks) continue;
    const key = `${weeks - 1 - weekBack}:${d.getUTCDay()}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }
  const out: { week: number; day: number; count: number }[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      out.push({ week: w, day: d, count: grid.get(`${w}:${d}`) ?? 0 });
    }
  }
  return out;
}

const PLAY_TYPES: PlayType[] = ['PrePlay', 'SalesPlay', 'CsPlay', 'OneToFewPlay'];

export function playTypeMix(
  company: Company,
  period: Period,
): { type: PlayType; count: number }[] {
  const plays = playsIn(company, period);
  return PLAY_TYPES.map((type) => ({
    type,
    count: plays.filter((p) => p.type === type).length,
  }));
}

/** Contas → Contatos → Dossiês → Plays → Touchpoints → Interações → Plays fechadas. */
export function adoptionFunnel(
  company: Company,
  period: Period,
): { stage: string; value: number }[] {
  const m = computeMetrics(company, period);
  const tps = touchpointsIn(company, period);
  const interactions = tps.reduce((s, tp) => s + tp.interactions, 0);
  return [
    { stage: 'Contas', value: company.accountsCount },
    { stage: 'Contatos', value: company.contactsCount },
    { stage: 'Dossiês', value: company.dossiersCount },
    { stage: 'Plays', value: m.playsCreated },
    { stage: 'Touchpoints', value: m.touchpointsCreated },
    { stage: 'Interações', value: interactions },
    { stage: 'Plays fechadas', value: m.playsClosed },
  ];
}

/**
 * Atividade por usuário no período: plays que ele criou (`ownerEmail`) +
 * touchpoints em que é responsável (`responsibles`).
 *
 * CRÉDITO FRACIONÁRIO: um touchpoint com N responsáveis dá `1/N` a cada um.
 * Contar 1 inteiro por responsável inflava o total da company (um touchpoint
 * co-owned virava 2 unidades de atividade) e, pior, FAZIA A COLABORAÇÃO SUBIR
 * o score de concentração — adicionar nomes ao `responsibles` era um exploit.
 * Com a fração, vale a invariante:
 *
 *     Σ(plays + touchpoints) === activityVolume(company, period)
 *
 * `share` = fração da atividade total da company (soma ~1 quando há atividade).
 * `touchpoints` é fracionário (ex.: 2.5); `plays` é inteiro (um dono só).
 */
export function userStats(
  company: Company,
  period: Period,
): { user: User; plays: number; touchpoints: number; share: number }[] {
  const plays = playsIn(company, period);
  const tps = touchpointsIn(company, period);

  const rows = company.users.map((user) => {
    const p = plays.filter((pl) => pl.ownerEmail === user.email).length;
    const t = tps.reduce((s, tp) => {
      if (tp.responsibles.length === 0) return s;
      return tp.responsibles.includes(user.email) ? s + 1 / tp.responsibles.length : s;
    }, 0);
    return { user, plays: p, touchpoints: t, share: 0 };
  });

  const total = rows.reduce((s, r) => s + r.plays + r.touchpoints, 0);
  return rows.map((r) => ({
    ...r,
    share: total === 0 ? 0 : (r.plays + r.touchpoints) / total,
  }));
}

/** Volume bruto de atividade (plays criadas + touchpoints criados) no período. */
export function activityVolume(company: Company, period: Period): number {
  return playsIn(company, period).length + touchpointsIn(company, period).length;
}
