/**
 * Mock determinístico do "Dashboard de plays" (`/admin/health` no produto real).
 *
 * A estratégia não é escrever os números finais à mão: é gerar um universo de
 * plays com um PRNG semeado e depois AGREGAR com as mesmas contas do backend
 * (`aggregates.service.ts#aggChurnWindow`). Duas consequências valem o esforço:
 *
 *  1. As janelas se encaixam por construção — 30d ⊂ 90d ⊂ 365d, e o "período
 *     anterior" de cada uma sai da mesma base. Nenhum número briga com o outro.
 *  2. Quando o backend entrar, some só o gerador; `aggregateWindow` e a UI já
 *     falam a forma real do payload.
 *
 * Sem `Math.random()`: a tela é idêntica em todo reload.
 */
import {
  CHURN_PLAY_TYPES,
  CHURN_WINDOW_DAYS,
  type ChurnAnalysis,
  type ChurnCompany,
  type ChurnMetric,
  type ChurnPlayType,
  type ChurnSummary,
  type ChurnTypeMetric,
  type ChurnWindow,
  type ChurnWindowKey,
} from './churnAnalysis.types';

/** PRNG determinístico (mulberry32) — mesmo padrão de `pages/usage/data/mockData.ts`. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uma play já "achatada": só o que as agregações precisam ler. */
interface MockPlay {
  type: ChurnPlayType;
  /** Dias entre a criação e hoje. 0 = criada hoje. */
  daysAgo: number;
  /** `status: true` = aberta, como no backend. */
  open: boolean;
  touchpoints: number;
  contacts: number;
  interactions: number;
  /** Só existe em play fechada; alimenta `avgDaysToClose`. */
  daysToClose: number | null;
}

/**
 * A conta logada. O dashboard é escopado nela: a chamada real seria
 * `GET /aggregates/churnAnalysis?company_id=<própria>`, que traz só os números
 * desta empresa (a variante sem `company_id`, que devolve a carteira inteira,
 * é SYS_ADMIN e não é o que esta aba mostra).
 */
const ACCOUNT = { id: 'c-conta-logada', name: 'Minha conta' };

/** Mix de tipos: Pre-play domina, CS-play é raro. */
const TYPE_WEIGHTS: Record<ChurnPlayType, number> = {
  PrePlay: 0.53,
  SalesPlay: 0.16,
  CsPlay: 0.055,
  OneToFewPlay: 0.27,
};

/** Médias por tipo — o centro de cada distribuição, com jitter em volta. */
const TYPE_SHAPE: Record<
  ChurnPlayType,
  { touchpoints: number; contacts: number; interactions: number; daysToClose: number }
> = {
  PrePlay: { touchpoints: 12.7, contacts: 3.5, interactions: 1.2, daysToClose: 34 },
  SalesPlay: { touchpoints: 12.6, contacts: 5.0, interactions: 2.4, daysToClose: 52 },
  CsPlay: { touchpoints: 14.0, contacts: 4.0, interactions: 2.0, daysToClose: 41 },
  OneToFewPlay: { touchpoints: 5.2, contacts: 6.0, interactions: 1.3, daysToClose: 26 },
};

/** Dois anos de histórico: o suficiente para o período anterior da janela de 365d. */
const HISTORY_DAYS = 730;

/**
 * Plays criadas por dia. Cai nos últimos 30 dias de propósito — é a queda que o
 * KPI "quantidade de plays" reporta contra o período anterior.
 */
function playsPerDay(daysAgo: number): number {
  if (daysAgo < 30) return 1.55 * 0.69;
  if (daysAgo < 120) return 1.55;
  return 1.35;
}

/** Escolhe um índice respeitando os pesos (soma não precisa ser exatamente 1). */
function weightedIndex(rng: () => number, weights: number[]): number {
  const total = weights.reduce((acc, w) => acc + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

/** Jitter multiplicativo em torno de 1, amplitude `spread`. */
function jitter(rng: () => number, spread: number): number {
  return 1 + (rng() * 2 - 1) * spread;
}

function generatePlays(): MockPlay[] {
  const rng = mulberry32(0x5f39c0de);
  const plays: MockPlay[] = [];
  const typeWeights = CHURN_PLAY_TYPES.map((t) => TYPE_WEIGHTS[t]);

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo++) {
    const rate = playsPerDay(daysAgo);
    // parte inteira garantida + a fração vira probabilidade de mais uma play
    const count = Math.floor(rate) + (rng() < rate - Math.floor(rate) ? 1 : 0);

    for (let i = 0; i < count; i++) {
      const type = CHURN_PLAY_TYPES[weightedIndex(rng, typeWeights)];
      const shape = TYPE_SHAPE[type];

      // Play antiga teve tempo de fechar; play desta semana quase certamente
      // ainda está aberta. É isso que mantém o donut "abertas vs fechadas"
      // majoritariamente aberto sem ser 100%/0%.
      const closeChance = Math.min(0.8, 0.05 + daysAgo / 200);
      const closed = rng() < closeChance;

      plays.push({
        type,
        daysAgo,
        open: !closed,
        touchpoints: Math.max(1, Math.round(shape.touchpoints * jitter(rng, 0.55))),
        contacts: Math.max(1, Math.round(shape.contacts * jitter(rng, 0.6))),
        interactions: Math.max(0, Math.round(shape.interactions * jitter(rng, 0.9))),
        daysToClose: closed
          ? Math.max(1, Math.round(shape.daysToClose * jitter(rng, 0.5)))
          : null,
      });
    }
  }

  return plays;
}

const ALL_PLAYS = generatePlays();

// ------------------------------------------------------------------ agregações

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/** `formatPercentage` do backend: string com no máximo uma casa. */
function percentageText(value: number): string {
  return String(Number(value.toFixed(1)));
}

function summarize(plays: MockPlay[]): Record<keyof ChurnSummary, number> {
  const playsCount = plays.length;
  let sumTouchpoints = 0;
  let sumContacts = 0;
  let sumInteractions = 0;
  let sumDaysToClose = 0;
  let closedWithDates = 0;

  for (const play of plays) {
    sumTouchpoints += play.touchpoints;
    sumContacts += play.contacts;
    sumInteractions += play.interactions;
    if (play.daysToClose !== null) {
      sumDaysToClose += play.daysToClose;
      closedWithDates++;
    }
  }

  return {
    playsCount,
    avgTouchpoints: playsCount ? round2(sumTouchpoints / playsCount) : 0,
    avgContacts: playsCount ? round2(sumContacts / playsCount) : 0,
    avgInteractions: playsCount ? round2(sumInteractions / playsCount) : 0,
    avgDaysToClose: closedWithDates ? Math.round(sumDaysToClose / closedWithDates) : 0,
  };
}

/**
 * Par atual/anterior de um KPI.
 *
 * `deltaPercentage` fica `null` quando o período anterior foi zero: sem base,
 * qualquer percentual seria invenção — a UI omite a linha nesse caso.
 */
function buildMetric(current: number, previous: number): ChurnMetric {
  return {
    current,
    previous,
    delta: round2(current - previous),
    deltaPercentage: previous ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

function zeroTypeMetric(type: ChurnPlayType): ChurnTypeMetric {
  return {
    type,
    playsCount: 0,
    open: 0,
    closed: 0,
    closedPercentage: '0',
    avgTouchpoints: 0,
    avgContacts: 0,
    avgInteractions: 0,
    avgDaysToClose: 0,
  };
}

/** Métricas de um tipo. Os tipos sem play na janela voltam zerados, não somem. */
function typeMetrics(plays: MockPlay[]): ChurnTypeMetric[] {
  return CHURN_PLAY_TYPES.map((type) => {
    const ofType = plays.filter((play) => play.type === type);
    if (ofType.length === 0) return zeroTypeMetric(type);

    const stats = summarize(ofType);
    const open = ofType.filter((play) => play.open).length;
    const closed = ofType.length - open;

    return {
      type,
      playsCount: ofType.length,
      open,
      closed,
      closedPercentage: percentageText((closed / ofType.length) * 100),
      avgTouchpoints: stats.avgTouchpoints,
      avgContacts: stats.avgContacts,
      avgInteractions: stats.avgInteractions,
      avgDaysToClose: stats.avgDaysToClose,
    };
  });
}

/**
 * `byCompany` do payload real. Escopado na conta, volta uma entrada só — a
 * própria. Nada na tela lê este campo hoje; ele fica porque o tipo espelha o
 * payload 1:1, que é o que vai permitir trocar o mock pela chamada real.
 */
function companyBreakdown(plays: MockPlay[]): ChurnCompany[] {
  return [
    {
      company_id: ACCOUNT.id,
      company_name: ACCOUNT.name,
      byType: typeMetrics(plays),
    },
  ];
}

/** Uma janela completa: atual para os gráficos, anterior só para os deltas. */
function aggregateWindow(days: number): ChurnWindow {
  const current = ALL_PLAYS.filter((play) => play.daysAgo < days);
  const previous = ALL_PLAYS.filter(
    (play) => play.daysAgo >= days && play.daysAgo < days * 2
  );

  const now = summarize(current);
  const before = summarize(previous);

  const summary: ChurnSummary = {
    playsCount: buildMetric(now.playsCount, before.playsCount),
    avgTouchpoints: buildMetric(now.avgTouchpoints, before.avgTouchpoints),
    avgContacts: buildMetric(now.avgContacts, before.avgContacts),
    avgInteractions: buildMetric(now.avgInteractions, before.avgInteractions),
    avgDaysToClose: buildMetric(now.avgDaysToClose, before.avgDaysToClose),
  };

  return {
    summary,
    total: { byType: typeMetrics(current) },
    byCompany: companyBreakdown(current),
  };
}

/** O payload inteiro, com a mesma forma de `GET /aggregates/churnAnalysis`. */
export const CHURN_ANALYSIS: ChurnAnalysis = {
  windows: (Object.keys(CHURN_WINDOW_DAYS) as ChurnWindowKey[]).reduce(
    (acc, key) => {
      acc[key] = aggregateWindow(CHURN_WINDOW_DAYS[key]);
      return acc;
    },
    {} as Record<ChurnWindowKey, ChurnWindow>
  ),
};
