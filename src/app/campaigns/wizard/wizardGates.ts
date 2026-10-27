import { resolveTargetingForAccount } from './SegmentationStep';
import type { TargetingData, AudienceCheck } from './SegmentationStep';
import { buildLaunchPlan, validateLaunchPlan } from './launchPlan';
import type { CampaignConfig, CreativeData } from './types';
import { MIN_BUDGET_PER_AD_SET } from './types';

export const WIZARD_STEPS = {
  config: 1,
  segmentation: 2,
  brand: 3,
  creatives: 4,
  review: 5,
} as const;

export interface WizardState {
  campaignConfig: CampaignConfig;
  targetingData: TargetingData;
  creativeData: CreativeData;
  /** Público por conjunto, informado pela Segmentação. Ausente = não checado. */
  audienceCheck?: AudienceCheck;
}

/**
 * Pendências de criativo por empresa, já com a herança do template resolvida.
 * Mesma regra que trava o "Publicar campanha" na Revisão: o passo Criativos
 * não pode liberar algo que a Revisão vai recusar, nem travar algo que ela
 * aceitaria (antes, voltar uma empresa ao título do template travava o botão).
 */
export function creativeIssues(state: WizardState): Record<string, string[]> {
  return validateLaunchPlan(buildLaunchPlan(state.campaignConfig, state.targetingData, state.creativeData));
}

/**
 * O que cada passo exige para liberar o "Próximo Passo".
 *
 * Vive fora do componente porque é a regra de negócio do wizard — e porque
 * cobrir os gates por unidade é muito mais barato do que dirigir a Segmentação
 * inteira pela UI só para chegar no passo seguinte.
 */
export function canProceedFromStep(step: number, state: WizardState): boolean {
  const { campaignConfig, targetingData, creativeData } = state;

  if (step === WIZARD_STEPS.config) {
    // Nome da campanha e orçamento por conjunto acima do mínimo do LinkedIn.
    // Antes o aviso de mínimo aparecia em vermelho mas não travava o avanço.
    const budget = parseFloat(campaignConfig.budgetAmount);
    return !!campaignConfig.campaignName.trim() && budget >= MIN_BUDGET_PER_AD_SET;
  }

  if (step === WIZARD_STEPS.segmentation) {
    // Segmentação: >=1 empresa-alvo E cada conjunto efetivo com >=1 localização.
    const accounts = targetingData.companies.included;
    if (accounts.length === 0) return false;
    // Cada conjunto precisa de >=300 pessoas; o LinkedIn recusa abaixo disso.
    if (state.audienceCheck && (state.audienceCheck.pending || state.audienceCheck.small.length > 0)) return false;
    return accounts.every((acc) => {
      const person = resolveTargetingForAccount(targetingData, acc.id);
      return person.locations.included.length > 0;
    });
  }

  if (step === WIZARD_STEPS.brand) {
    // Marca: a voz da marca é o insumo que a geração de criativo consome
    // (`CreativeStep` desabilita tudo sem ela). Gate no `brandKit`, não no
    // rascunho: só o "Salvar marca" promove o que foi digitado a marca real.
    return !!creativeData.brandKit?.voice?.trim();
  }

  if (step === WIZARD_STEPS.creatives) {
    // Criativos: URL e CTA no template, e cada empresa com título, texto e
    // imagem válidos depois de herdar do template o que não personalizou.
    if (!(creativeData.landingPageUrl?.trim() && creativeData.cta)) return false;
    const companies = targetingData.companies?.included || [];
    if (companies.length === 0) {
      return !!(creativeData.bodyText?.trim() && creativeData.headline?.trim() && creativeData.imageUrl);
    }
    return Object.keys(creativeIssues(state)).length === 0;
  }

  // Review is always valid
  return true;
}
