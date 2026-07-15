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
 * Menor `createdAt` observável na company: a primeira data em que houve atividade
 * REAL (play ou touchpoint criado). Varredura pura e local sobre `company.plays`
 * e seus `touchpoints`. Sem plays/touchpoints, não há piso de dados vindo de
 * atividade — retorna `null` e o piso cai só sobre `onboardedAt`.
 */
function firstActivityMs(company: Company): number | null {
  let min = Infinity;
  for (const play of company.plays) {
    if (play.createdAt.getTime() < min) min = play.createdAt.getTime();
    for (const tp of play.touchpoints) {
      if (tp.createdAt.getTime() < min) min = tp.createdAt.getTime();
    }
  }
  return min === Infinity ? null : min;
}

/**
 * Série do score ao longo das últimas `weeks` semanas.
 *
 * A janela deslizante tem a mesma duração do filtro (`period.end - period.start`).
 * A semana `i` (0 = mais antiga, `weeks-1` = mais recente) termina em
 * `period.end - (weeks-1-i)*7d`; sua janela é `[end_i - duration, end_i]`. Ancorar
 * em `period.end` (e não em `today`) garante que o último ponto use exatamente o
 * período do filtro — seu score coincide com `computeHealth(company, period)` para
 * QUALQUER período, inclusive os que não terminam hoje ("Este trimestre", range
 * customizado). `today` segue sendo o "agora" da dimensão de recência.
 *
 * Pontos cuja janela COMEÇA antes do PISO DE DADOS REAIS são omitidos — não se
 * inventa histórico. O piso é `max(onboardedAt, primeira atividade real)`:
 *  - pré-onboarding não existe;
 *  - antes da primeira atividade não há dado semeado, então `computeHealth`
 *    colapsaria trend/depth/concentration a 0 e só o termo de recência (medido
 *    globalmente contra `today`) sobreviveria, fabricando uma subida
 *    "em risco → saudável" para todo mundo. Clamp ESTRITO: a janela precisa
 *    caber inteira sobre dados reais (`window.start >= piso`).
 *
 * Uma company rende menos pontos (tipicamente ~4-5) — curva curta mas honesta.
 * Com um backend real de histórico longo, a série preenche até `weeks` sozinha.
 */
export function scoreTimeline(
  company: Company,
  period: Period,
  weeks = 12,
  today: Date = TODAY,
): ScorePoint[] {
  const duration = period.end.getTime() - period.start.getTime();
  const anchorMs = period.end.getTime();
  const onboardedMs = company.onboardedAt.getTime();
  const activityMs = firstActivityMs(company);
  // Piso de dados reais: nem pré-onboarding, nem antes da primeira atividade.
  const dataFloorMs = activityMs === null ? onboardedMs : Math.max(onboardedMs, activityMs);
  const filterStartMs = period.start.getTime();
  const filterEndMs = period.end.getTime();

  const points: ScorePoint[] = [];

  for (let i = 0; i < weeks; i++) {
    const endMs = anchorMs - (weeks - 1 - i) * 7 * MS_PER_DAY;
    const startMs = endMs - duration;

    // Clamp estrito: janela inteira sobre dados reais (não inventa histórico).
    if (startMs < dataFloorMs) continue;

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
