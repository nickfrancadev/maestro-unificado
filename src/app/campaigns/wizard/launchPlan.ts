import { buildTargetingCriteria, resolveTargetingForAccount } from './SegmentationStep';
import type { TargetingData } from './SegmentationStep';
import { resolveCreativeForCompany } from './types';
import type { CampaignConfig, CreativeData } from './types';

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
