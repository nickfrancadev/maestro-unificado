/**
 * Tipos do "Dashboard de plays" — a tela `/admin/health` do produto real.
 *
 * Espelham 1:1 o payload de `GET /aggregates/churnAnalysis`
 * (`maestro_api` → `aggregates.service.ts#getChurnAnalysis`). Manter a forma
 * idêntica é o que vai permitir trocar o mock pela chamada real sem tocar na UI:
 * basta substituir a origem dos dados, os componentes continuam iguais.
 *
 * Aqui é TUDO MOCKADO — nenhuma chamada de rede.
 */

/** As três janelas que o backend pré-calcula. Não há período customizado. */
export type ChurnWindowKey = '30d' | '90d' | '365d';

/** Ordem fixa dos tipos de play, como `Object.values(PlayType)` no backend. */
export type ChurnPlayType = 'PrePlay' | 'SalesPlay' | 'CsPlay' | 'OneToFewPlay';

export const CHURN_PLAY_TYPES: ChurnPlayType[] = [
  'PrePlay',
  'SalesPlay',
  'CsPlay',
  'OneToFewPlay',
];

/**
 * Um KPI do topo, sempre com o período anterior de mesmo tamanho ao lado.
 *
 * `deltaPercentage` é `null` quando o período anterior foi zero — divisão por
 * zero não vira "+100%", vira "sem base de comparação".
 */
export interface ChurnMetric {
  current: number;
  previous: number;
  delta: number;
  deltaPercentage: number | null;
}

export interface ChurnSummary {
  playsCount: ChurnMetric;
  avgTouchpoints: ChurnMetric;
  avgContacts: ChurnMetric;
  avgInteractions: ChurnMetric;
  avgDaysToClose: ChurnMetric;
}

/**
 * Métricas de um tipo de play dentro da janela.
 *
 * A tela real só desenha `playsCount` e `avgTouchpoints`; `closedPercentage`,
 * `avgContacts`, `avgInteractions` e `avgDaysToClose` já vêm no payload e não
 * são mostrados em lugar nenhum — é daí que sai a tabela "Desempenho por tipo".
 */
export interface ChurnTypeMetric {
  type: ChurnPlayType;
  playsCount: number;
  open: number;
  closed: number;
  /** String no payload real (`formatPercentage`), ex.: `'12.5'`. */
  closedPercentage: string;
  avgTouchpoints: number;
  avgContacts: number;
  avgInteractions: number;
  avgDaysToClose: number;
}

/** Breakdown por empresa — presente no payload real e não renderizado por lá. */
export interface ChurnCompany {
  company_id: string;
  company_name: string | null;
  byType: ChurnTypeMetric[];
}

export interface ChurnWindow {
  summary: ChurnSummary;
  total: { byType: ChurnTypeMetric[] };
  byCompany: ChurnCompany[];
}

export interface ChurnAnalysis {
  windows: Record<ChurnWindowKey, ChurnWindow>;
}

export const CHURN_WINDOW_DAYS: Record<ChurnWindowKey, number> = {
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

export const CHURN_WINDOW_OPTIONS: { key: ChurnWindowKey; label: string }[] = [
  { key: '30d', label: 'Últimos 30 dias' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: '365d', label: 'Últimos 365 dias' },
];

export const CHURN_TYPE_LABEL: Record<ChurnPlayType, string> = {
  PrePlay: 'Pre-play',
  SalesPlay: 'Sales-play',
  CsPlay: 'CS-play',
  OneToFewPlay: 'One-to-few',
};
