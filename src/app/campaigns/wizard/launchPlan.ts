import { buildTargetingCriteria, resolveTargetingForAccount } from './SegmentationStep';
import type { TargetingData } from './SegmentationStep';
import { resolveCreativeForCompany, effectiveCostType, OBJECTIVE_MAP, MIN_BUDGET_PER_AD_SET } from './types';
import type { CampaignConfig, CreativeData } from './types';
import type { CampaignPipelineParams } from '@/lib/linkedin';

export interface AdSetCreative {
  headline: string;
  bodyText: string;
  imageUrl: string | null;
  landingPageUrl: string;
  cta: string;
}

export interface AdSetPlan {
  /** Id usado como chave de idempotência no servidor: lançamento + empresa. */
  id: string;
  companyId: string;
  companyName: string;
  /** A empresa tem segmentação própria (override), diferente da padrão. */
  customTargeting: boolean;
  name: string;
  criteria: any;
  creative: AdSetCreative;
}

/** "Itaú Unibanco" → "itau-unibanco": o slug que {{account.slug}} vira na URL. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * O que o Go Live publica: um conjunto de anúncio (campanha no LinkedIn) por
 * empresa-alvo, cada um com a sua segmentação E o seu criativo.
 *
 * Vive fora do OrchestrationStep para ser testável: antes, o lançamento mandava
 * o criativo do template só para o primeiro conjunto (sem trocar as variáveis
 * da empresa) e criava os demais sem anúncio nenhum.
 */
export function buildLaunchPlan(
  config: CampaignConfig,
  targeting: TargetingData,
  creativeData: CreativeData,
  options: { runId?: string } = {},
): AdSetPlan[] {
  return targeting.companies.included.map((acc) => {
    const resolved = resolveCreativeForCompany(creativeData, acc);
    const slug = slugify(acc.label);
    // resolveCreativeForCompany só troca variáveis no texto do template; o
    // texto escrito para a empresa também pode usar {{company.name}}.
    const fill = (text: string) => text
      .replace(/\{\{company\.name\}\}/g, acc.label)
      .replace(/\{\{company\.industry\}\}/g, (acc as { industry?: string }).industry || '');
    return {
      // O servidor deduplica cada passo pela chave campaign_id. Só o id da
      // empresa fazia uma campanha nova para a mesma empresa reaproveitar os
      // IDs da antiga ("idempotent hit"). O runId separa um lançamento do outro.
      id: options.runId ? `${options.runId}-${acc.id}` : acc.id,
      companyId: acc.id,
      companyName: acc.label,
      customTargeting: !!targeting.overrides[acc.id],
      name: config.campaignName.includes('{{company.name}}')
        ? config.campaignName.replace(/\{\{company\.name\}\}/g, acc.label)
        : `${config.campaignName} — ${acc.label}`,
      criteria: buildTargetingCriteria(acc, resolveTargetingForAccount(targeting, acc.id)),
      creative: {
        headline: fill(resolved.headline),
        bodyText: fill(resolved.bodyText),
        imageUrl: resolved.imageUrl,
        landingPageUrl: resolved.landingPageUrl
          .replace(/\{\{account\.slug\}\}/g, slug)
          .replace(/\{\{company\.name\}\}/g, encodeURIComponent(acc.label)),
        cta: resolved.cta,
      },
    };
  });
}

/** Fallback que a IA do produto grava quando não consegue gerar o texto. */
const AI_ERROR_TEXT = /n[ãa]o encontrado\s*-\s*input manual/i;
const UNRESOLVED_VAR = /\{\{\s*[\w.]+\s*\}\}/;

/**
 * Problemas que impedem publicar, por empresa (chave = id da empresa). Lista
 * vazia para todas = pode publicar. A Revisão mostra a lista ao lado de cada
 * conjunto e trava o botão de publicar enquanto houver algum.
 */
export function validateLaunchPlan(plan: AdSetPlan[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const adSet of plan) {
    const issues: string[] = [];
    const { headline, bodyText, imageUrl, landingPageUrl } = adSet.creative;

    if (!imageUrl) issues.push('Sem imagem');
    if (!headline.trim()) issues.push('Sem título');
    else if (AI_ERROR_TEXT.test(headline)) issues.push('O título é uma mensagem de erro da IA, não um texto de anúncio');
    if (!bodyText.trim()) issues.push('Sem texto do anúncio');
    else if (AI_ERROR_TEXT.test(bodyText)) issues.push('O texto é uma mensagem de erro da IA, não um texto de anúncio');

    const headlineVar = headline.match(UNRESOLVED_VAR);
    if (headlineVar) issues.push(`O título tem uma variável que não foi preenchida: ${headlineVar[0]}`);
    const bodyVar = bodyText.match(UNRESOLVED_VAR);
    if (bodyVar) issues.push(`O texto tem uma variável que não foi preenchida: ${bodyVar[0]}`);

    if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(landingPageUrl.trim())) {
      issues.push('A URL de destino precisa começar com https://');
    } else if (UNRESOLVED_VAR.test(landingPageUrl)) {
      issues.push('A URL de destino tem uma variável que não foi preenchida');
    }

    if (issues.length > 0) result[adSet.companyId] = issues;
  }
  return result;
}

/**
 * O que vai ao servidor para um conjunto. Fora do componente para que o teste
 * prove que a Revisão mostra o que é enviado: "Ao publicar: Pausada/Ativa" sai
 * de `auto_activate`, a cobrança sai de `effectiveCostType` e o orçamento do
 * grupo é a soma dos conjuntos.
 */
export function buildPipelineParams(
  adSet: AdSetPlan,
  plan: AdSetPlan[],
  config: CampaignConfig,
  ctx: { adAccountId: string; currency: string; campaignGroupId?: string | null },
): CampaignPipelineParams {
  const perAdSet = parseFloat(config.budgetAmount) || 0;
  const obj = OBJECTIVE_MAP[config.objective];
  // Lance manual que o objetivo não aceita vira automático: mandar o valor
  // junto faria o LinkedIn recusar a campanha.
  const manual = config.biddingStrategy !== 'automated'
    && !!obj?.manualBidding.includes(config.biddingStrategy)
    && !!config.unitCostAmount;
  return {
    campaign_id: adSet.id,
    ad_account_id: ctx.adAccountId,
    group_name: config.campaignName,
    campaign_name: adSet.name,
    objective: config.objective,
    targeting_criteria: adSet.criteria,
    budget_type: config.budgetType,
    budget_amount: perAdSet,
    currency: ctx.currency,
    start_date: config.startDate,
    end_date: config.endDate || undefined,
    auto_activate: config.autoActivate,
    campaign_type: config.campaignType,
    cost_type: effectiveCostType(config),
    bidding_strategy: manual ? config.biddingStrategy : 'automated',
    unit_cost: manual ? { amount: config.unitCostAmount, currency_code: ctx.currency } : undefined,
    group_budget_amount: perAdSet * plan.length,
    image_url: adSet.creative.imageUrl || undefined,
    headline: adSet.creative.headline || undefined,
    description: adSet.creative.bodyText || undefined,
    cta: adSet.creative.cta || undefined,
    landing_page_url: adSet.creative.landingPageUrl || undefined,
    // O primeiro conjunto cria o grupo; os demais reaproveitam o mesmo.
    existing_campaign_group_id: ctx.campaignGroupId || undefined,
  };
}

// ---- Checklist da Revisão ----

export type ChecklistStatus = 'ok' | 'attention' | 'blocked';

export interface ChecklistItem {
  id: string;
  status: ChecklistStatus;
  label: string;
  detail?: string;
  /** Trava o "Publicar campanha". Todo item 'blocked' trava; 'attention' só quando dito. */
  blocking: boolean;
  /** Passo do wizard que resolve o item, com o texto do link ("Ir para Criativos · Nubank"). */
  fix?: { step: number; label: string; companyId?: string };
}

export interface ChecklistInput {
  config: CampaignConfig;
  plan: AdSetPlan[];
  /** Saída de validateLaunchPlan. */
  creativeIssues: Record<string, string[]>;
  audience: { pending: boolean; small: string[] };
  linkedInReady: boolean;
  /** null = ainda não verificado. */
  hasBilling: boolean | null;
}

const STEP_NAMES: Record<number, string> = { 1: 'Configuração', 2: 'Segmentação', 3: 'Marca', 4: 'Criativos' };

function fixLink(step: number, companyName?: string, companyId?: string) {
  return { step, label: `Ir para ${STEP_NAMES[step]}${companyName ? ` · ${companyName}` : ''}`, companyId };
}

/**
 * A lista que a Revisão mostra ao lado do botão de publicar. Um item por
 * pendência, cada bloqueio com o link para o passo que o resolve. Pura para
 * ser testada: a regra "não publica enquanto houver bloqueio" mora aqui.
 */
export function buildReviewChecklist(input: ChecklistInput): ChecklistItem[] {
  const { config, plan, creativeIssues, audience, linkedInReady, hasBilling } = input;
  const items: ChecklistItem[] = [];

  items.push(linkedInReady
    ? { id: 'linkedin', status: 'ok', label: 'Conta do LinkedIn conectada', blocking: false }
    : { id: 'linkedin', status: 'blocked', label: 'Conecte o LinkedIn e escolha a conta de anúncios', detail: 'Em Integrações.', blocking: true });

  const budget = parseFloat(config.budgetAmount);
  items.push(config.campaignName.trim() && budget >= MIN_BUDGET_PER_AD_SET
    ? { id: 'config', status: 'ok', label: 'Nome e orçamento definidos', blocking: false }
    : { id: 'config', status: 'blocked', label: !config.campaignName.trim() ? 'A campanha está sem nome' : `Orçamento abaixo do mínimo de ${MIN_BUDGET_PER_AD_SET} por empresa`, blocking: true, fix: fixLink(1) });

  if (plan.length === 0) {
    items.push({ id: 'companies', status: 'blocked', label: 'Nenhuma empresa-alvo escolhida', blocking: true, fix: fixLink(2) });
  }

  if (plan.length > 0) {
    if (audience.pending) {
      items.push({ id: 'audience', status: 'attention', label: 'Calculando o público de cada empresa…', blocking: true });
    } else {
      const small = plan.filter((a) => audience.small.includes(a.companyId));
      if (small.length === 0) {
        items.push({ id: 'audience', status: 'ok', label: `Público acima de 300 pessoas em ${plan.length === 1 ? 'a empresa' : `todas as ${plan.length} empresas`}`, blocking: false });
      }
      for (const a of small) {
        items.push({
          id: `audience-${a.companyId}`, status: 'blocked', blocking: true,
          label: `${a.companyName}: público abaixo de 300 pessoas`,
          detail: 'O LinkedIn não aceita. Amplie a localização ou tire filtros de senioridade e função.',
          fix: fixLink(2, a.companyName, a.companyId),
        });
      }
    }

    const withIssues = plan.filter((a) => creativeIssues[a.companyId]?.length);
    if (withIssues.length === 0) {
      items.push({ id: 'creatives', status: 'ok', label: 'Anúncios completos: imagem, título, texto e URL', blocking: false });
    }
    for (const a of withIssues) {
      items.push({
        id: `creative-${a.companyId}`, status: 'blocked', blocking: true,
        label: `${a.companyName}: ${creativeIssues[a.companyId].map((t, i) => (i === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1))).join('; ')}`,
        fix: fixLink(4, a.companyName, a.companyId),
      });
    }
  }

  if (hasBilling === false) {
    items.push({
      id: 'billing', status: 'attention', blocking: false,
      label: 'Conta de anúncios sem meio de pagamento',
      detail: config.autoActivate ? 'A ativação pode falhar. Considere publicar pausada.' : 'Configure antes de ativar.',
    });
  }

  return items;
}

export function canPublishChecklist(items: ChecklistItem[]): boolean {
  return items.every((i) => !i.blocking);
}
