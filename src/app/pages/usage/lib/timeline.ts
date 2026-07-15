/**
 * Evolução do score — série temporal pura. Nenhum import de React.
 *
 * Cada ponto é o health score do cliente calculado sobre uma JANELA DESLIZANTE
 * do mesmo tamanho do período do filtro, terminando na data daquele ponto.
 * O último ponto usa exatamente o período do filtro, então seu score coincide
 * com o número grande no topo da tela.
 */
import type { Company, Period, RiskBucket } from '../data/types';
import { TODAY } from '../data/types';
import { computeHealth } from './health';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ScorePoint {
  /** Fim da janela deslizante deste ponto. */
  date: Date;
  /** 0–100, inteiro. */
  score: number;
  bucket: RiskBucket;
  /** `date` cai dentro de `[period.start, period.end]`? */
  inFilter: boolean;
}

/**
 * Série do score ao longo das últimas `weeks` semanas.
 *
 * A janela deslizante tem a mesma duração do filtro (`period.end - period.start`).
 * A semana `i` (0 = mais antiga, `weeks-1` = atual) termina em
 * `today - (weeks-1-i)*7d`; sua janela é `[end_i - duration, end_i]`.
 *
 * Pontos cuja janela COMEÇA antes de `company.onboardedAt` são omitidos — não se
 * inventa histórico pré-onboarding. Uma company nova rende menos pontos.
 */
export function scoreTimeline(
  company: Company,
  period: Period,
  weeks = 12,
  today: Date = TODAY,
): ScorePoint[] {
  const duration = period.end.getTime() - period.start.getTime();
  const todayMs = today.getTime();
  const onboardedMs = company.onboardedAt.getTime();
  const filterStartMs = period.start.getTime();
  const filterEndMs = period.end.getTime();

  const points: ScorePoint[] = [];

  for (let i = 0; i < weeks; i++) {
    const endMs = todayMs - (weeks - 1 - i) * 7 * MS_PER_DAY;
    const startMs = endMs - duration;

    // Não inventa histórico pré-onboarding.
    if (startMs < onboardedMs) continue;

    const end = new Date(endMs);
    const window: Period = { start: new Date(startMs), end };
    const h = computeHealth(company, window, today);

    points.push({
      date: end,
      score: h.score,
      bucket: h.bucket,
      inFilter: endMs >= filterStartMs && endMs <= filterEndMs,
    });
  }

  return points;
}
