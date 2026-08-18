// Shared types for the Campaign Wizard flow
import type { BrandKit } from './brandKit';
import { createDefaultBrandKit } from './brandKit';
import type { OverlayLayout, AdFormat } from './overlayLayout';
import { createDefaultOverlayLayout, withLayoutDefaults } from './overlayLayout';

export interface BuyingCommitteeContact {
  id: number;
  name: string;
  email: string;
  title: string;
  seniority: 'C-Level' | 'VP-Level' | 'Director' | 'Manager' | 'Individual Contributor';
  jobFunction: string;
}

export interface LinkedInValidation {
  status: 'pending' | 'validating' | 'validated' | 'failed';
  organizationUrn?: string;
  audienceSize?: number;
  estimatedReach?: { min: number; max: number };
  suggestedBid?: { amount: string; currency: string };
}

export interface TargetingCriteria {
  seniorities: string[];
  jobFunctions: string[];
  jobTitles: string[];
  yearsOfExperience?: { min: number; max: number };
  estimatedAudience: number;
  audienceStatus: 'calculating' | 'ready' | 'too_small' | 'too_large';
}

export interface TargetAccount {
  id: string;
  source: 'maestro_crm' | 'linkedin_manual';
  name: string;
  logo: string;
  website: string;
  industry: string;
  location: string;
  engagement?: number;
  employees?: number;
  buyingCommittee: BuyingCommitteeContact[];
  activePlays: boolean;
  lastTouch?: string;
  linkedInUrn?: string;
  linkedInValidation: LinkedInValidation | null;
  targeting?: TargetingCriteria;
}


// Campaign configuration — lifted to wizard parent level.
// One campaign per wizard run; the LinkedIn Campaign Group is created
// implicitly at launch (named after the campaign), and each target account
// becomes its own ad set under it.
export interface CampaignConfig {
  campaignName: string;
  objective: string;
  campaignType: string;
  costType: string;
  budgetType: 'daily' | 'total';
  budgetAmount: string;                 // per ad set budget
  startDate: string;
  endDate: string;
  autoActivate: boolean;
  biddingStrategy: 'automated' | 'manual_cpm' | 'manual_cpc';
  unitCostAmount: string;
}

export function createDefaultCampaignConfig(): CampaignConfig {
  return {
    campaignName: '',
    objective: 'brand_awareness',
    campaignType: 'SPONSORED_UPDATES',
    costType: 'CPM',
    budgetType: 'daily',
    budgetAmount: '500',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    autoActivate: false,
    biddingStrategy: 'automated',
    unitCostAmount: '',
  };
}

// Brand brief — auto-generated per target company; describes the target's
// visual identity and messaging themes. The TONE OF VOICE is NOT here — it
// belongs to the Maestro client (the advertiser), not the target.
export interface BrandBrief {
  industry: string;
  value_proposition: string;
  visual_style_keywords: string[];
  primary_colors: string[];           // hex codes
  key_messaging_themes: string[];
  target_persona_hint: string;
  scrape_status?: 'ok' | 'limited';
  source_url?: string | null;
  og_image?: string | null;
  generated_at: string;
  manually_edited?: boolean;
}

// Where the campaign's BASE image comes from. It is only about origin — the
// final ad is composed the same way in both cases (texts + the target
// company's logo painted on top by composeLogoOverlay).
//   upload: the user uploads the base image file.
//   ai:     Gemini generates the base image from an optional prompt.
export type ImageMode = 'upload' | 'ai';

// `AdFormat` mora em `overlayLayout.ts`, junto das dimensões que ele nomeia.
// Re-exportado aqui porque é daqui que o resto do wizard sempre importou.
export type { AdFormat };

// Per-company override on top of the template creative. status reflects how
// far the user has pushed personalization for this company.
export interface CompanyCreativeOverride {
  brief?: BrandBrief;
  headline?: string;
  bodyText?: string;
  imageUrl?: string;            // the COMPOSED ad for this company
  imageFileName?: string;
  // Image composition, overridden for this company only. Every field is
  // optional: `undefined` means "inherit whatever the template says". Read
  // them through resolveImageConfig, never directly.
  imageMode?: ImageMode;
  baseImageUrl?: string;        // this company's own base canvas
  baseImageSource?: ImageMode;
  basePrompt?: string;
  textoDestaque?: string;
  textoComplementar?: string;
  showTargetLogo?: boolean;
  fontFamily?: string;
  format?: AdFormat;
  // Layout do overlay, sobrescrito por empresa. Objeto INTEIRO, não campo a
  // campo: um layout meio-herdado não tem leitura possível na UI.
  layout?: OverlayLayout;
  // Destination, overridden for this company only. Same rule: undefined inherits.
  landingPageUrl?: string;
  cta?: string;
  status: 'template' | 'brief_only' | 'fully_personalized';
}

// Fields of the image block that a company may override. Kept as data so the
// UI can tell the user exactly what it changed for this company.
export const IMAGE_OVERRIDE_FIELDS = [
  'imageMode', 'baseImageUrl', 'basePrompt', 'textoDestaque',
  'textoComplementar', 'showTargetLogo', 'fontFamily', 'format', 'layout',
] as const;

export type ImageOverrideField = typeof IMAGE_OVERRIDE_FIELDS[number];

export interface ResolvedImageConfig {
  imageMode: ImageMode;
  baseImageUrl: string | null;
  baseImageSource?: ImageMode;
  basePrompt: string;
  textoDestaque: string;
  textoComplementar: string;
  showTargetLogo: boolean;
  fontFamily: string;
  format: AdFormat;
  layout: OverlayLayout;
}

// Effective image settings for a target — the template's values, with any
// per-company override laid on top. `companyId` undefined = the template itself.
export function resolveImageConfig(data: CreativeData, companyId?: string): ResolvedImageConfig {
  const tpl = data.templateLogo;
  const ovr = companyId ? data.overrides[companyId] : undefined;
  return {
    imageMode: ovr?.imageMode ?? data.imageMode,
    baseImageUrl: ovr?.baseImageUrl ?? tpl.baseImageUrl,
    baseImageSource: ovr?.baseImageUrl ? ovr.baseImageSource : tpl.baseImageSource,
    basePrompt: ovr?.basePrompt ?? tpl.basePrompt,
    textoDestaque: ovr?.textoDestaque ?? tpl.textoDestaque,
    textoComplementar: ovr?.textoComplementar ?? tpl.textoComplementar,
    showTargetLogo: ovr?.showTargetLogo ?? tpl.showTargetLogo,
    fontFamily: ovr?.fontFamily ?? data.brandKit.fontFamily,
    format: ovr?.format ?? tpl.format,
    // `withLayoutDefaults` é o degrau da migração: campanhas salvas antes do
    // editor não têm `layout`, e `showTargetLogo` era a única expressão de
    // "leva logo da conta?".
    layout: ovr?.layout ?? withLayoutDefaults(tpl.layout, tpl.showTargetLogo),
  };
}

// Which image fields this company actually overrides — drives the
// "personalizado" chip and the reset affordance.
export function overriddenImageFields(data: CreativeData, companyId?: string): ImageOverrideField[] {
  const ovr = companyId ? data.overrides[companyId] : undefined;
  if (!ovr) return [];
  return IMAGE_OVERRIDE_FIELDS.filter((f) => ovr[f] !== undefined);
}

// Campaign-wide visual identity used by the AI composer. Lives at the
// template level because the base image + texts are reused across every
// company; the target company's logo varies per ad. The AI decides where
// each element goes — we only declare the content.
export interface TemplateLogoConfig {
  baseImageUrl: string | null;   // base image (uploaded OR AI-generated, signed URL)
  baseImageSource?: ImageMode;   // how the current base was actually produced
  basePrompt: string;            // free-text direction for the AI base image (origin 'ai')
  textoDestaque: string;         // primary headline rendered into the image (e.g. "WORKSHOP ABM")
  textoComplementar: string;     // secondary line (e.g. "Convite exclusivo VIP")
  showTargetLogo: boolean;       // LEGADO: semeia layout.targetLogo.enabled na migração
  format: AdFormat;              // formato do canvas — honrado no servidor desde 2026-08-18
  layout: OverlayLayout;         // posições, tamanhos e wraps do overlay
}

// Creative data — passed from CreativeStep to OrchestrationStep
export interface CreativeData {
  imageUrl: string | null;       // signed URL from Supabase Storage (or null if no image)
  imageFileName: string | null;  // original file name for display
  headline: string;
  bodyText: string;              // ad copy / description
  landingPageUrl: string;
  cta: string;                   // Call-to-action type (e.g. LEARN_MORE, SIGN_UP)
  imageMode: ImageMode;          // default mode used when generating per-company
  templateLogo: TemplateLogoConfig;
  // AI-personalization layer — empty record means every company uses the template above
  overrides: Record<string, CompanyCreativeOverride>;  // keyed by company.id
  brandKit: BrandKit;            // marca do anunciante (voz/contexto/paleta/fonte/logos/ícones/grafismos)
  clientProductService: string;  // mock dropdown selection — wired to real source later
  clientAudienceMarket: string;
  clientPersona: string;
}

export function createDefaultCreativeData(): CreativeData {
  return {
    imageUrl: null,
    imageFileName: null,
    headline: '1:1 personalization for {{company.name}}',
    bodyText: 'Hi there, teams at {{company.name}} are winning big deals by scaling their ABM programs with tailored 1:1 experiences across...',
    landingPageUrl: 'https://maestro.abm/p/{{account.slug}}',
    cta: 'LEARN_MORE',
    imageMode: 'upload',
    templateLogo: {
      baseImageUrl: null,
      baseImageSource: undefined,
      basePrompt: '',
      textoDestaque: 'WORKSHOP ABM',
      textoComplementar: 'Convite exclusivo VIP',
      showTargetLogo: true,
      format: 'banner',
      layout: createDefaultOverlayLayout(true),
    },
    overrides: {},
    brandKit: createDefaultBrandKit(),
    clientProductService: '',
    clientAudienceMarket: '',
    clientPersona: '',
  };
}

// Returns the effective creative for a given target company. Falls back to
// the template values when an override is missing, with template variables
// substituted by the company name.
export function resolveCreativeForCompany(
  data: CreativeData,
  company: { id: string; label: string; industry?: string } | null,
): {
  headline: string; bodyText: string; imageUrl: string | null; imageFileName: string | null;
  landingPageUrl: string; cta: string; usedOverride: boolean;
} {
  const override = company ? data.overrides[company.id] : undefined;
  const substituted = (s: string) =>
    s
      .replace(/\{\{company\.name\}\}/g, company?.label || '')
      .replace(/\{\{company\.industry\}\}/g, company?.industry || '');
  return {
    headline: override?.headline ?? substituted(data.headline),
    bodyText: override?.bodyText ?? substituted(data.bodyText),
    // Most specific first: the composed ad, then this company's own base
    // canvas (uploaded or generated but not composed yet), then the campaign
    // image. Without the middle step, uploading an image for one company left
    // the preview showing the template's — the ad it is NOT going to run.
    imageUrl: override?.imageUrl ?? override?.baseImageUrl ?? data.imageUrl,
    imageFileName: override?.imageFileName ?? data.imageFileName,
    landingPageUrl: override?.landingPageUrl ?? data.landingPageUrl,
    cta: override?.cta ?? data.cta,
    usedOverride: !!override && override.status !== 'template',
  };
}

// Objective → API type + costType mapping (synced with server CAMPAIGN_OBJECTIVE_MAP)
export const OBJECTIVE_MAP: Record<string, { type: string; costType: string; label: string; description: string }> = {
  brand_awareness:  { type: 'SPONSORED_UPDATES', costType: 'CPM', label: 'Brand Awareness', description: 'Maximiza impressões nas contas-alvo. Recomendado para ABM.' },
  website_visits:   { type: 'SPONSORED_UPDATES', costType: 'CPC', label: 'Website Visits', description: 'Direciona tráfego para landing pages personalizadas.' },
  engagement:       { type: 'SPONSORED_UPDATES', costType: 'CPC', label: 'Engagement', description: 'Aumenta interações com o conteúdo do anúncio.' },
  lead_generation:  { type: 'SPONSORED_UPDATES', costType: 'CPM', label: 'Lead Generation', description: 'Coleta leads diretamente no LinkedIn via Lead Gen Forms.' },
  video_views:      { type: 'SPONSORED_UPDATES', costType: 'CPV', label: 'Video Views', description: 'Otimiza para reproduções de vídeo.' },
};