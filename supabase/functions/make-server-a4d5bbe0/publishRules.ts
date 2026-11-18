// Regras da publicação no LinkedIn que o servidor aplica ANTES de chamar a API.
// Puras (sem Deno nem npm) para rodar no Vitest, no estilo de `aiGuards.ts`.
// Mensagens em português simples: chegam até a tela como estão.

// ---------- URNs ----------

export type UrnKind = "sponsoredAccount" | "sponsoredCampaignGroup" | "sponsoredCampaign";

/** "123" ou "urn:li:sponsoredCampaignGroup:123" → URN completo. */
export function toUrn(id: string | number, kind: UrnKind): string {
  const s = String(id);
  return s.startsWith("urn:") ? s : `urn:li:${kind}:${s}`;
}

/** URN ou id → só o id numérico do fim. */
export function urnId(urnOrId: string | number): string {
  return String(urnOrId).split(":").pop() || "";
}

// ---------- Ativar: o grupo vem junto ----------

/**
 * Grupo de campanhas de um conjunto, na ordem de confiança:
 * 1. o que a tela mandou (a lista conhece o `campaignGroup` de cada linha);
 * 2. o que o servidor gravou ao criar o conjunto;
 * 3. o grupo criado com a mesma chave de lançamento;
 * 4. o que o próprio LinkedIn diz do conjunto (consulta feita por quem chama).
 *
 * Antes só o 3 existia, com a chave errada vinda da lista (id do LinkedIn):
 * o grupo, que nasce pausado, nunca era ativado, e o conjunto "Ativo" dentro
 * dele não entregava.
 */
export function resolveCampaignGroupUrn(sources: {
  fromRequest?: string | number | null;
  fromCampaignRecord?: string | number | null;
  fromGroupRecord?: string | number | null;
  fromLinkedIn?: string | number | null;
}): string | null {
  const id = sources.fromRequest || sources.fromCampaignRecord || sources.fromGroupRecord || sources.fromLinkedIn;
  return id ? toUrn(id, "sponsoredCampaignGroup") : null;
}

/**
 * Status que a tela mostra para um conjunto: conjunto ativo dentro de grupo
 * que não está ativo não entrega, então aparece como pausado.
 */
export function effectiveCampaignStatus(campaignStatus: string, groupStatus?: string | null): string {
  if (campaignStatus === "ACTIVE" && groupStatus && groupStatus !== "ACTIVE") return "PAUSED";
  return campaignStatus;
}
