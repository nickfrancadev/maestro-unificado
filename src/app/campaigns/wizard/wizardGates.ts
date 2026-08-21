import { resolveTargetingForAccount } from './SegmentationStep';
import type { TargetingData } from './SegmentationStep';
import type { CampaignConfig, CreativeData } from './types';

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
    // Config step: require a campaign name
    return !!campaignConfig.campaignName.trim();
  }

  if (step === WIZARD_STEPS.segmentation) {
    // Segmentação: >=1 empresa-alvo E cada conjunto efetivo com >=1 localização.
    const accounts = targetingData.companies.included;
    if (accounts.length === 0) return false;
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
    // Criativos: URL/CTA always required at template level. Each target
    // company must have either (a) full override (headline+body+image)
    // or (b) the template fully filled to fall back on.
    const urlAndCtaOk = !!(creativeData.landingPageUrl?.trim() && creativeData.cta);
    if (!urlAndCtaOk) return false;
    const templateComplete = !!(
      creativeData.bodyText?.trim() &&
      creativeData.headline?.trim() &&
      creativeData.imageUrl
    );
    const companies = targetingData.companies?.included || [];
    if (companies.length === 0) return templateComplete;
    const allCompaniesFullyOverridden = companies.every((c) => {
      const o = creativeData.overrides?.[c.id];
      return !!(o?.headline?.trim() && o?.bodyText?.trim() && o?.imageUrl);
    });
    return templateComplete || allCompaniesFullyOverridden;
  }

  // Review is always valid
  return true;
}
