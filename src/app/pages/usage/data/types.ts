/**
 * Tipos do dashboard interno de uso de clientes.
 *
 * Espelham o modelo do backend real (NestJS + MongoDB) descrito em
 * `docs/superpowers/specs/2026-07-13-uso-clientes-design.md`.
 *
 * Distinção crítica: `Company` é o CLIENTE PAGANTE (tenant) do Maestro — não é
 * uma conta-alvo de prospecção (essas são `accountsCount`).
 */

export type PlayType = 'PrePlay' | 'SalesPlay' | 'CsPlay' | 'OneToFewPlay';

export type TouchpointType =
  | 'Relacionamento'
  | 'Atenção'
  | 'Autoridade'
  | 'Encantamento'
  | 'Descoberta'
  | 'Engajamento'
  | 'Negociação';

export type Profile = 'ADMIN' | 'AGENCY' | 'EDITOR' | 'VIEWER';

export interface Company {
  id: string;
  name: string;
  plan: string;
  seats: number;
  onboardedAt: Date;
  mrr: number;
  users: User[];
  plays: Play[];
  accountsCount: number;
  contactsCount: number;
  dossiersCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profile: Profile;
  /** MOCK — o backend real não rastreia login (JWT stateless). Pendente de instrumentação. */
  lastAccessAt: Date | null;
  /** Derivável do backend real: data mais recente em que criou/fechou play ou touchpoint. */
  lastActivityAt: Date | null;
}

export interface Play {
  id: string;
  name: string;
  type: PlayType;
  ownerEmail: string;
  createdAt: Date;
  startDate: Date;
  expectedEndDate: Date;
  /** Não-nulo = play fechada. */
  endDate: Date | null;
  archived: boolean;
  touchpoints: Touchpoint[];
  contactsInvolved: number;
  saleClosed?: boolean;
}

export interface Touchpoint {
  id: string;
  type: TouchpointType;
  channel: string;
  responsibles: string[];
  createdAt: Date;
  dueDate: Date;
  /** Não-nulo = touchpoint finalizado. `dueDate` no passado + `endDate: null` = atrasado. */
  endDate: Date | null;
  contactsInvolved: number;
  /** Contatos que de fato responderam. */
  interactions: number;
}

export type RiskBucket = 'critical' | 'at_risk' | 'watch' | 'healthy';

export type Dimension = 'recency' | 'trend' | 'depth' | 'concentration';

export interface Signal {
  id: string;
  /** ex: "Sem atividade há 24d" — o rótulo nomeia a grandeza que de fato mede. */
  label: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Health {
  /** 0-100, inteiro. */
  score: number;
  bucket: RiskBucket;
  /** cada dimensão 0-100. */
  breakdown: Record<Dimension, number>;
  signals: Signal[];
}

export interface Period {
  start: Date;
  end: Date;
}

/**
 * "Agora" do dashboard. Vive aqui (e não em `mockData`) para que `lib/` seja
 * puro: importar um seletor não pode arrastar o gerador do mock junto.
 * `mockData.ts` re-exporta este símbolo por compatibilidade.
 */
export const TODAY = new Date('2026-07-13T12:00:00Z');
