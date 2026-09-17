/**
 * Tokens visuais e formatadores do Dashboard de plays.
 *
 * As cores dos tipos de play são as do produto real re-escalonadas para passar
 * nos checks de contraste/daltonismo sobre fundo branco (o amarelo original,
 * `#FCBF37`, fica claro demais e colide com o verde em visão protan). O matiz
 * de cada tipo continua reconhecível; só o passo mudou. Ainda assim a
 * identidade nunca depende só da cor: toda barra carrega o badge com o nome do
 * tipo e os números ao lado.
 */
import type { ChurnPlayType } from './churnAnalysis.types';

export const INK = '#212A46';
export const INK_MUTED = '#6B7280';
export const BORDER = '#E5E7EB';
export const ORANGE = '#FF5F39';

/** Verde/vermelho de delta — só aparecem acompanhados de sinal (+/−) e texto. */
export const GOOD = '#15803D';
export const BAD = '#DC2626';

/** Donut "abertas vs fechadas": laranja da marca + navy recessivo. */
export const OPEN_COLOR = '#FF5F39';
export const CLOSED_COLOR = '#1A2E4A';

/** Ordem fixa de matizes por tipo de play — nunca ciclada, nunca por ranking. */
export const TYPE_COLOR: Record<ChurnPlayType, string> = {
  PrePlay: '#A855D9',
  SalesPlay: '#3F8F2B',
  CsPlay: '#D99A0B',
  OneToFewPlay: '#2B7FD4',
};

/** Fundo do badge de tipo — mesma família, bem mais clara, para texto escuro. */
export const TYPE_BADGE_BG: Record<ChurnPlayType, string> = {
  PrePlay: '#F5EBFC',
  SalesPlay: '#E9F5E3',
  CsPlay: '#FDF3DC',
  OneToFewPlay: '#E7F0FB',
};

export const TYPE_BADGE_INK: Record<ChurnPlayType, string> = {
  PrePlay: '#7B32B0',
  SalesPlay: '#2D6B1E',
  CsPlay: '#8A6207',
  OneToFewPlay: '#1C5FA3',
};

/** Número em pt-BR: separador decimal vírgula, sem casas inúteis. */
export function br(value: number, maxDigits = 2): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: maxDigits });
}

/** Delta sempre com sinal explícito — "+0,94", "−16", "0". */
export function signed(value: number, maxDigits = 2): string {
  if (value > 0) return `+${br(value, maxDigits)}`;
  return br(value, maxDigits);
}

/** Percentual que veio como string do payload (`'16.7'`) exibido em pt-BR. */
export function percent(text: string): string {
  const value = Number(text);
  return Number.isFinite(value) ? `${br(value, 1)}%` : '—';
}

/**
 * Número com casas decimais FIXAS.
 *
 * Numa fileira de KPIs, `br(4, 2)` devolveria "4" ao lado de "11,63" e "1,47" —
 * a mesma grandeza com larguras diferentes lê como precisão diferente. Aqui a
 * casa é preenchida: "4,00".
 */
export function fixed(value: number, decimals: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Versão de `fixed` que tolera ausência — para colunas numéricas de tabela,
 * onde alinhar a casa decimal é o que permite comparar a coluna de relance.
 */
export function fixedOrDash(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return fixed(value, decimals);
}
