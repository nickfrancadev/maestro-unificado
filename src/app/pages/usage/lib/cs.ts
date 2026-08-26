/**
 * Camada de CS — seletores puros para o feedback do time (Spina/Bernardo).
 * Nenhum import de React. `health.ts` fica intocado: nada aqui altera o score;
 * tudo aqui EXPLICA e PRESCREVE em volta dele.
 */
import type { Company, Health, Period, RiskBucket, Signal } from '../data/types';
import { TODAY } from '../data/types';
import { previousPeriod, userStats } from './selectors';
import { scoreTimeline } from './timeline';
import { daysAgo } from './format';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Renovação e prioridade                                              */
/* ------------------------------------------------------------------ */

/** Dias até a renovação. `null` quando a conta não tem `renewalAt` (mock antigo). */
export function daysToRenewal(company: Company, today: Date = TODAY): number | null {
  if (!company.renewalAt) return null;
  return Math.max(0, Math.round((company.renewalAt.getTime() - today.getTime()) / MS_PER_DAY));
}

/**
 * Prioridade "MRR × renovação" (pedido literal do feedback): MRR em jogo por
 * dia até a renovação — R$ 30k renovando em 30d (1.000/dia) fura a fila na
 * frente de R$ 30k renovando em 300d (100/dia). Sem `renewalAt`, só o MRR.
 */
export function renewalPriority(company: Company, today: Date = TODAY): number {
  const days = daysToRenewal(company, today);
  if (days === null) return company.mrr;
  return company.mrr / Math.max(1, days);
}

/* ------------------------------------------------------------------ */
/* Estágio da jornada                                                  */
/* ------------------------------------------------------------------ */

export type JourneyStageId = 'onboarding' | 'adoption' | 'renewal';

export interface JourneyStage {
  id: JourneyStageId;
  label: string;
}

/** Onboarding ≤ 90d de casa; Renovação ≤ 90d do contrato virar; senão Adoção. */
export const JOURNEY_WINDOW_DAYS = 90;

/**
 * Estágio derivado do cadastro (nada é fabricado): onboarding ≠ risco de churn
 * — os mesmos números pedem leituras diferentes conforme o estágio.
 */
export function journeyStage(company: Company, today: Date = TODAY): JourneyStage {
  const sinceOnboarding = daysAgo(company.onboardedAt, today);
  if (sinceOnboarding !== null && sinceOnboarding <= JOURNEY_WINDOW_DAYS) {
    return { id: 'onboarding', label: 'Onboarding' };
  }
  const toRenewal = daysToRenewal(company, today);
  if (toRenewal !== null && toRenewal <= JOURNEY_WINDOW_DAYS) {
    return { id: 'renewal', label: 'Renovação' };
  }
  return { id: 'adoption', label: 'Adoção' };
}

/* ------------------------------------------------------------------ */
/* Tempo no estado e transição                                         */
/* ------------------------------------------------------------------ */

export interface BucketTenure {
  /** Dias (piso, granularidade semanal) que a conta está no bucket atual. */
  days: number;
  /** true = o bucket é o mesmo desde o início do histórico disponível ("≥"). */
  sinceDataStart: boolean;
}

/**
 * Há quanto tempo a conta está no bucket atual — "crítico há 3 dias" pede outra
 * conversa que "crítico há 60". Reusa a série do `scoreTimeline` (mesma
 * convenção de janela deslizante, mesmo clamp de histórico): anda para trás
 * enquanto o bucket não muda. Granularidade semanal — o número é um PISO.
 */
export function bucketTenure(
  company: Company,
  period: Period,
  weeks = 26,
  today: Date = TODAY,
): BucketTenure | null {
  const points = scoreTimeline(company, period, weeks, today);
  if (points.length === 0) return null;

  const current = points[points.length - 1].bucket;
  let first = points.length - 1;
  while (first > 0 && points[first - 1].bucket === current) first--;

  const days = Math.round(
    (points[points.length - 1].date.getTime() - points[first].date.getTime()) / MS_PER_DAY,
  );
  return { days, sinceDataStart: first === 0 };
}

/** "há <7d" | "há 21d" | "há 21d+" (desde o início do histórico). */
export function formatTenure(t: BucketTenure | null): string | null {
  if (t === null) return null;
  if (t.days === 0) return t.sinceDataStart ? 'desde o início do histórico' : 'há <7d';
  return `há ${t.days}d${t.sinceDataStart ? '+' : ''}`;
}

const BUCKET_RANK: Record<RiskBucket, number> = {
  critical: 0,
  at_risk: 1,
  watch: 2,
  healthy: 3,
};

export interface BucketTransition {
  from: RiskBucket;
  to: RiskBucket;
  dir: 'worsened' | 'improved';
}

/**
 * Gatilho por TRANSIÇÃO de estado (Saudável→Atenção), não pelo estado: quem
 * acabou de piorar é onde intervir cedo é mais barato. Compara o bucket do
 * período com o do período anterior; sem mudança → null.
 */
export function bucketTransition(health: Health, prevHealth: Health): BucketTransition | null {
  if (health.bucket === prevHealth.bucket) return null;
  return {
    from: prevHealth.bucket,
    to: health.bucket,
    dir: BUCKET_RANK[health.bucket] < BUCKET_RANK[prevHealth.bucket] ? 'worsened' : 'improved',
  };
}

/* ------------------------------------------------------------------ */
/* Playbook — ação sugerida por bucket                                 */
/* ------------------------------------------------------------------ */

export interface PlaybookEntry {
  /** A ação que o playbook prescreve para o bucket. */
  label: string;
  /** Rótulo curto do botão no card. `null` = sem ação a disparar (saudável). */
  cta: string | null;
}

/** Playbook do feedback: Atenção = e-mail / Em risco = tarefa / Crítico = alerta + call. */
export const PLAYBOOK: Record<RiskBucket, PlaybookEntry> = {
  critical: { label: 'Alerta + call obrigatória com o cliente', cta: 'Agendar call' },
  at_risk: { label: 'Abrir tarefa para o CSM', cta: 'Criar tarefa' },
  watch: { label: 'E-mail automático de reengajamento', cta: 'Enviar e-mail' },
  healthy: { label: 'Acompanhar — sem ação necessária', cta: null },
};

/* ------------------------------------------------------------------ */
/* Sinais antecedentes                                                 */
/* ------------------------------------------------------------------ */

/** Champion "sumiu" = sem atividade há mais dias que isto. */
export const CHAMPION_STALE_DAYS = 14;

/** Share mínimo no período anterior para alguém contar como champion. */
export const CHAMPION_MIN_SHARE = 0.3;

/**
 * O champion do período ANTERIOR que está sem atividade — o sinal chega antes
 * do "0 plays", que é sintoma tardio.
 */
export function championStatus(
  company: Company,
  period: Period,
  today: Date = TODAY,
): { name: string; inactiveDays: number } | null {
  const prevStats = userStats(company, previousPeriod(period));
  const top = prevStats.reduce(
    (best, s) => (best === null || s.share > best.share ? s : best),
    null as (typeof prevStats)[number] | null,
  );
  if (!top || top.share < CHAMPION_MIN_SHARE) return null;

  const inactive = daysAgo(top.user.lastActivityAt, today);
  if (inactive === null) return null; // nunca teve atividade: não era champion de fato
  return inactive > CHAMPION_STALE_DAYS ? { name: top.user.name, inactiveDays: inactive } : null;
}

/**
 * Sinais ANTECEDENTES (champion sumiu, tickets, NPS) — complementam os chips do
 * score sem tocar em `buildSignals`: o score segue medindo uso; estes chegam
 * antes de o uso cair. Mesma forma `Signal` para reusar o `SignalChips`.
 */
export function antecedentSignals(
  company: Company,
  period: Period,
  today: Date = TODAY,
): Signal[] {
  const out: Signal[] = [];

  const champion = championStatus(company, period, today);
  if (champion) {
    out.push({
      id: 'champion-gone',
      label: `Champion sem atividade há ${champion.inactiveDays}d`,
      severity: 'high',
    });
  }

  const tickets = company.openTickets ?? 0;
  if (tickets >= 3) {
    out.push({
      id: 'open-tickets',
      label: `${tickets} tickets abertos`,
      severity: tickets >= 5 ? 'high' : 'medium',
    });
  }

  if (typeof company.nps === 'number' && company.nps <= 6) {
    out.push({ id: 'nps-detractor', label: `NPS ${company.nps} (detrator)`, severity: 'medium' });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* E-mails de touchpoints atrasados (novo dado — Bernardo)             */
/* ------------------------------------------------------------------ */

export interface LateTpEmailStats {
  /** Envios no período. */
  sent: number;
  /** Σ destinatários dos envios do período (denominador das taxas). */
  recipients: number;
  opens: number;
  clicks: number;
  /** Σ opens ÷ Σ recipients, 0-1. Sem envio → 0 (a UI trata como "sem base"). */
  openRate: number;
  /** Σ clicks ÷ Σ recipients, 0-1. */
  clickRate: number;
  /** Data do envio mais recente do período, se houver. */
  lastSentAt: Date | null;
}

/** Agregado dos envios cujo `sentAt` cai no período (taxas pooled, como o resto da tela). */
export function lateTpEmailStats(company: Company, period: Period): LateTpEmailStats {
  const emails = (company.lateTouchpointEmails ?? []).filter((e) => {
    const t = e.sentAt.getTime();
    return t >= period.start.getTime() && t <= period.end.getTime();
  });

  const recipients = emails.reduce((s, e) => s + e.recipients, 0);
  const opens = emails.reduce((s, e) => s + e.opens, 0);
  const clicks = emails.reduce((s, e) => s + e.clicks, 0);
  const lastSentAt = emails.reduce(
    (best: Date | null, e) => (best === null || e.sentAt.getTime() > best.getTime() ? e.sentAt : best),
    null,
  );

  return {
    sent: emails.length,
    recipients,
    opens,
    clicks,
    openRate: recipients === 0 ? 0 : opens / recipients,
    clickRate: recipients === 0 ? 0 : clicks / recipients,
    lastSentAt,
  };
}
