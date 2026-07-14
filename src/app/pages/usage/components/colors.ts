/**
 * Cores de tendência — deliberadamente FORA da rampa de risco.
 *
 * A rampa (`#DC2626` crítico, `#EA580C` em risco, `#CA8A04` atenção,
 * `#059669` saudável, ver `lib/health.ts`) é EXCLUSIVA de indicadores de
 * churn-risk: ring, chips, badge de bucket, stroke da sparkline. Se um Δ de
 * atividade usasse `#DC2626`, "vermelho crítico" passaria a significar também
 * "touchpoints caíram" — e a linguagem visual colapsa.
 *
 * Fonte única para os dois consumidores: `StatTile` e `CompanyTable`.
 */
export const TREND_GOOD = '#16A34A';
export const TREND_BAD = '#EF4444';
export const TREND_FLAT = '#64748B';
