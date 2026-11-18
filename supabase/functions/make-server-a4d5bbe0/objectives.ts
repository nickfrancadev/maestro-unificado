// Objetivos de campanha: UMA tabela para a tela e o servidor.
//
// Antes a tela (`src/app/campaigns/wizard/types.ts`) dizia CPM para "Visitas
// ao site" e "Engajamento" e o servidor criava CPC. Como o servidor sempre
// envia a otimização do objetivo (MAX_CLICK) e o LinkedIn recusa CPC junto de
// MAX_CLICK, a cobrança desses dois é CPM: o LinkedIn otimiza para cliques e
// cobra por mil impressões. A tela importa esta tabela; não há espelho.
//
// Puro (sem Deno nem npm): roda no Vitest e é importado pelo front.

export type CostType = "CPM" | "CPC" | "CPV";
export type ManualBidding = "manual_cpm" | "manual_cpc";

export interface CampaignObjective {
  /** Campos que vão ao LinkedIn. */
  objectiveType: string;
  type: string;
  format: string;
  /** Cobrança no lance automático. */
  costType: CostType;
  optimizationTargetType: string;
  /** Lances manuais que o LinkedIn aceita junto da otimização acima. */
  manualBidding: ManualBidding[];
  /** Textos da tela, em português. */
  label: string;
  description: string;
  costLabel: string;
  /** O que o texto do anúncio precisa provocar, para o prompt da IA. */
  copyGoal: string;
}

export const DEFAULT_OBJECTIVE = "brand_awareness";

export const CAMPAIGN_OBJECTIVES: Record<string, CampaignObjective> = {
  brand_awareness: {
    objectiveType: "BRAND_AWARENESS", type: "SPONSORED_UPDATES", format: "STANDARD_UPDATE",
    costType: "CPM", optimizationTargetType: "MAX_REACH", manualBidding: ["manual_cpm"],
    label: "Reconhecimento da marca",
    description: "Mostra o anúncio para o máximo de pessoas das empresas-alvo. Recomendado para ABM.",
    costLabel: "Cobra por mil impressões (CPM)",
    copyGoal: "Fazer a empresa-alvo lembrar da marca do anunciante: mensagem memorável, sem pedir ação imediata.",
  },
  website_visits: {
    objectiveType: "WEBSITE_VISITS", type: "SPONSORED_UPDATES", format: "STANDARD_UPDATE",
    costType: "CPM", optimizationTargetType: "MAX_CLICK", manualBidding: ["manual_cpm"],
    label: "Visitas ao site",
    description: "O LinkedIn entrega para quem tende a clicar e levar o tráfego à sua página.",
    costLabel: "Otimiza para cliques, cobra por mil impressões (CPM)",
    copyGoal: "Levar a pessoa a clicar e visitar a página: dê um motivo concreto para clicar agora.",
  },
  engagement: {
    objectiveType: "ENGAGEMENT", type: "SPONSORED_UPDATES", format: "STANDARD_UPDATE",
    costType: "CPM", optimizationTargetType: "MAX_CLICK", manualBidding: ["manual_cpm"],
    label: "Engajamento",
    description: "O LinkedIn entrega para quem tende a interagir com o anúncio.",
    costLabel: "Otimiza para cliques, cobra por mil impressões (CPM)",
    copyGoal: "Provocar interação (reagir, comentar, compartilhar): pergunta ou provocação que a pessoa queira responder.",
  },
  lead_generation: {
    objectiveType: "LEAD_GENERATION", type: "SPONSORED_UPDATES", format: "LEAD_GENERATION_FORM_SPONSORED_CONTENT",
    costType: "CPM", optimizationTargetType: "MAX_LEAD", manualBidding: ["manual_cpm"],
    label: "Geração de leads",
    description: "Coleta contatos direto no LinkedIn, com o formulário do próprio LinkedIn.",
    costLabel: "Cobra por mil impressões (CPM)",
    copyGoal: "Fazer a pessoa deixar o contato no formulário: deixe claro o que ela recebe em troca.",
  },
  video_views: {
    objectiveType: "VIDEO_VIEWS", type: "SPONSORED_UPDATES", format: "SINGLE_VIDEO",
    costType: "CPV", optimizationTargetType: "MAX_VIDEO_VIEW", manualBidding: [],
    label: "Visualizações de vídeo",
    description: "Otimiza para reproduções de vídeo.",
    costLabel: "Cobra por visualização de vídeo (CPV)",
    copyGoal: "Fazer a pessoa assistir ao vídeo: desperte curiosidade pelo que ele mostra.",
  },
};

export function objectiveFor(key: string | null | undefined): CampaignObjective {
  return CAMPAIGN_OBJECTIVES[(key || "").toLowerCase()] ?? CAMPAIGN_OBJECTIVES[DEFAULT_OBJECTIVE];
}

/**
 * Cobrança que vai ao LinkedIn. Lance manual escolhe a cobrança se o objetivo
 * aceita; qualquer outra coisa (inclusive um `cost_type` antigo como CPC em
 * "Visitas ao site") cai na do objetivo, que o LinkedIn aceita.
 */
export function resolveCostType(objectiveKey: string | null | undefined, biddingStrategy?: string | null): CostType {
  const obj = objectiveFor(objectiveKey);
  if (biddingStrategy === "manual_cpm" && obj.manualBidding.includes("manual_cpm")) return "CPM";
  if (biddingStrategy === "manual_cpc" && obj.manualBidding.includes("manual_cpc")) return "CPC";
  return obj.costType;
}

/**
 * Bloco <campaign> do prompt de texto: o objetivo em português e o que o
 * texto precisa provocar. Antes o prompt recebia o enum cru, e a tela sempre
 * mandava "brand_awareness" — o texto ignorava o objetivo escolhido.
 */
export function copyObjectiveBlock(objectiveKey: string | null | undefined, cta?: string | null): string {
  const obj = objectiveFor(objectiveKey);
  return [
    "<campaign>",
    `Objetivo da campanha: ${obj.label}`,
    `O texto precisa: ${obj.copyGoal}`,
    `CTA: ${cta || "LEARN_MORE"}`,
    "</campaign>",
  ].join("\n");
}
