// Janela de datas do analytics. O padrão da tela é a VIDA da campanha (do
// início até hoje), não 30 dias fixos: uma campanha de 3 meses abria
// mostrando só o último mês, e uma de 1 semana mostrava 23 dias vazios.
//
// Puro (sem Deno nem npm) para rodar no Vitest.

const DAY = 24 * 60 * 60 * 1000;
/** O LinkedIn guarda as métricas por até 2 anos. */
export const MAX_LOOKBACK_DAYS = 730;

/**
 * Início da janela. "all" = vida da campanha: começa no início dela
 * (`campaignStart`, ms ou AAAA-MM-DD); sem ele, os últimos 365 dias.
 */
export function analyticsWindowStart(dateRange: string | null | undefined, campaignStart: string | number | null | undefined, now: Date): Date {
  const range = dateRange || "all";
  if (range === "7d") return new Date(now.getTime() - 7 * DAY);
  if (range === "30d") return new Date(now.getTime() - 30 * DAY);
  if (range === "90d") return new Date(now.getTime() - 90 * DAY);
  const floor = now.getTime() - MAX_LOOKBACK_DAYS * DAY;
  const parsed = campaignStart == null || campaignStart === ""
    ? NaN
    : typeof campaignStart === "number" || /^\d+$/.test(String(campaignStart))
    ? Number(campaignStart)
    : new Date(String(campaignStart)).getTime();
  if (Number.isNaN(parsed)) return new Date(now.getTime() - 365 * DAY);
  // Campanha que ainda não começou: janela de hoje (sem dados, sem erro).
  return new Date(Math.min(Math.max(parsed, floor), now.getTime()));
}
