// Regras da publicação no LinkedIn que o servidor aplica ANTES de chamar a API.
// Puras (sem Deno nem npm) para rodar no Vitest, no estilo de `aiGuards.ts`.
// Mensagens em português simples: chegam até a tela como estão.

import {
  looksLikeModelChatter,
  unsupportedMacro,
  LINKEDIN_HEADLINE_MAX,
  LINKEDIN_INTRO_MAX,
} from "./aiGuards.ts";

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

// ---------- Localização padrão (F052) ----------

export const LOCATIONS_FACET = "urn:li:adTargetingFacet:locations";
export const PROFILE_LOCATIONS_FACET = "urn:li:adTargetingFacet:profileLocations";
export const BRAZIL_GEO_URN = "urn:li:geo:106057199";
export const DEFAULT_LOCATION_LABEL = "Brasil";

/** O critério já diz onde a pessoa está? */
export function hasLocation(criteria: any): boolean {
  const and = criteria?.include?.and;
  if (!Array.isArray(and)) return false;
  return and.some((clause: any) => {
    const or = clause?.or || {};
    return [LOCATIONS_FACET, PROFILE_LOCATIONS_FACET].some((f) => Array.isArray(or[f]) && or[f].length > 0);
  });
}

/**
 * Critério que chega sem localização ganha Brasil, na estimativa de público e
 * na criação do conjunto. Sem isso o LinkedIn recusa (localização é
 * obrigatória) ou, na estimativa, conta o mundo inteiro.
 */
export function withDefaultLocation(criteria: any): { criteria: any; defaulted: boolean } {
  if (hasLocation(criteria)) return { criteria, defaulted: false };
  const base = criteria && typeof criteria === "object" ? criteria : {};
  const and = Array.isArray(base.include?.and) ? base.include.and : [];
  return {
    criteria: { ...base, include: { ...(base.include || {}), and: [...and, { or: { [LOCATIONS_FACET]: [BRAZIL_GEO_URN] } }] } },
    defaulted: true,
  };
}

// ---------- Público mínimo (F055) ----------

export const MIN_AUDIENCE = 300;

/**
 * Por que o público desta empresa não pode ir ao ar. `null` = pode. O LinkedIn
 * devolve 0 quando o público fica abaixo de 300 (piso de privacidade), e
 * `null` quando a estimativa não veio: sem o número, não publica no escuro.
 */
export function audienceProblem(companyName: string, count: number | null | undefined): string | null {
  const who = companyName || "esta empresa";
  if (count == null || Number.isNaN(count)) {
    return `Não foi possível conferir o público de ${who} no LinkedIn. Tente publicar de novo em instantes.`;
  }
  if (count < MIN_AUDIENCE) {
    return `O público de ${who} tem menos de ${MIN_AUDIENCE} pessoas. O mínimo do LinkedIn é ${MIN_AUDIENCE}: amplie a localização ou tire filtros de senioridade e função.`;
  }
  return null;
}

// ---------- Datas com orçamento total (F037) ----------

/**
 * Orçamento total precisa de data de fim: é ela que diz em quanto tempo o
 * total é gasto (sem ela o LinkedIn recusa ou gasta tudo de uma vez). Fim
 * antes do início também não vai. `null` = datas válidas. A tela e o servidor
 * usam esta mesma função; a tela mostra a frase ao lado do campo de fim.
 */
export function budgetDateProblem(input: {
  budgetType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): string | null {
  const end = (input.endDate || "").trim();
  if (input.budgetType === "total" && !end) {
    return "Com orçamento total, defina a data de encerramento.";
  }
  const start = (input.startDate || "").trim();
  if (end && start) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) {
      return "A data de encerramento precisa ser depois da data de início.";
    }
  }
  return null;
}

// ---------- Criativo ao publicar (F138) ----------

export interface CreativeToPublish {
  headline?: string | null;
  description?: string | null;
  /** Imagem enviada (URL, caminho no Storage ou asset do LinkedIn). */
  hasImage: boolean;
  landingPageUrl?: string | null;
}

/**
 * O que impede o anúncio desta empresa de ir ao ar, já com o nome da empresa
 * trocado no texto. Lista vazia = pode publicar. O servidor não confia na
 * tela: texto de erro da IA, título vazio, imagem ausente, variável que não
 * foi preenchida e texto acima do limite do LinkedIn DEPOIS da troca do nome
 * da empresa (o template cabia, "Itaú Unibanco Holding" pode não caber).
 */
export function creativeProblems(creative: CreativeToPublish): string[] {
  const headline = (creative.headline || "").trim();
  const body = (creative.description || "").trim();
  const out: string[] = [];
  if (!creative.hasImage) out.push("o anúncio está sem imagem");
  if (!headline) out.push("o título está vazio");
  if (!body) out.push("o texto do anúncio está vazio");
  if (headline && looksLikeModelChatter(headline)) out.push("o título é uma mensagem da IA, não um texto de anúncio");
  if (body && looksLikeModelChatter(body)) out.push("o texto é uma mensagem da IA, não um texto de anúncio");
  if (headline.length > LINKEDIN_HEADLINE_MAX) {
    out.push(`o título tem ${headline.length} caracteres com o nome da empresa; o LinkedIn aceita até ${LINKEDIN_HEADLINE_MAX}`);
  }
  if (body.length > LINKEDIN_INTRO_MAX) {
    out.push(`o texto tem ${body.length} caracteres com o nome da empresa; o LinkedIn aceita até ${LINKEDIN_INTRO_MAX}`);
  }
  const macro = unsupportedMacro(`${headline}\n${body}`, false);
  if (macro) out.push(`o texto usa uma variável que a publicação não preenche (${macro})`);
  const url = (creative.landingPageUrl || "").trim();
  if (url && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url)) out.push("a URL de destino precisa começar com https://");
  else if (/\{\{[^}]*\}\}/.test(url)) out.push("a URL de destino tem uma variável que não foi preenchida");
  return out;
}

/** "Nubank: o título está vazio e o anúncio está sem imagem." */
export function creativeMessage(companyName: string, problems: string[]): string {
  if (!problems.length) return "";
  const list = problems.length === 1 ? problems[0] : `${problems.slice(0, -1).join(", ")} e ${problems[problems.length - 1]}`;
  return `${companyName || "Empresa"}: ${list}.`;
}
