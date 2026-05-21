// Shared types for the Campaign Wizard flow

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


// A single campaign entry inside a Campaign Group
export interface CampaignEntry {
  id: string;       // local UUID (used as idempotency key)
  name: string;     // e.g. "Nubank — Q1 2026 Brand Awareness"
}

// Campaign configuration — lifted to wizard parent level
export interface CampaignConfig {
  campaignGroupName: string;
  campaigns: CampaignEntry[];           // 1+ campaigns inside the group
  objective: string;
  campaignType: string;
  costType: string;
  budgetType: 'daily' | 'total';
  budgetAmount: string;                 // per-campaign budget
  startDate: string;
  endDate: string;
  autoActivate: boolean;
  biddingStrategy: 'automated' | 'manual_cpm' | 'manual_cpc';
  unitCostAmount: string;
}

export function createCampaignEntry(name = ''): CampaignEntry {
  return { id: crypto.randomUUID(), name };
}

export function createDefaultCampaignConfig(): CampaignConfig {
  return {
    campaignGroupName: '',
    campaigns: [createCampaignEntry()],
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

// Image generation mode for an ad creative. Each mode produces a different
// kind of asset and exposes different controls in the UI.
//   template_logo: programmatic composition over a user-provided base image
//                  with the target company's logo + fixed brand texts (no AI).
//   photo_ai:      Gemini generates a realistic editorial photograph.
//   graphic_ai:    Gemini generates an abstract/illustrative graphic.
export type ImageMode = 'template_logo' | 'photo_ai' | 'graphic_ai';

// Per-company override on top of the template creative. status reflects how
// far the user has pushed personalization for this company.
export interface CompanyCreativeOverride {
  brief?: BrandBrief;
  headline?: string;
  bodyText?: string;
  imageUrl?: string;
  imageFileName?: string;
  imageMode?: ImageMode;        // mode used to produce imageUrl for this company
  status: 'template' | 'brief_only' | 'fully_personalized';
}

// Campaign-wide visual identity used by the AI composer. Lives at the
// template level because the base image + texts are reused across every
// company; the target company's logo varies per ad. The AI decides where
// each element goes — we only declare the content.
export interface TemplateLogoConfig {
  baseImageUrl: string | null;   // base image (uploaded OR AI-generated, signed URL)
  baseImageSource?: 'upload' | 'photo_ai' | 'graphic_ai';  // how base was produced
  textoDestaque: string;         // primary headline rendered into the image (e.g. "WORKSHOP ABM")
  textoComplementar: string;     // secondary line (e.g. "Convite exclusivo VIP")
  showTargetLogo: boolean;       // ask AI to place the target company's logo
  fontFamily?: string;           // Google Font name (e.g. "Inter") — sent to the IA composer
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
  clientVoice: string;           // tone-of-voice description from the advertiser
  clientBrandContext: string;    // 1-2 sentences describing what the advertiser does
  clientWebsiteUrl: string;      // advertiser's own website, used to auto-extract voice + context
  clientProductService: string;  // mock dropdown selection — wired to real source later
  clientAudienceMarket: string;
  clientPersona: string;
  clientBrandColors: { primary: string; secondary: string; accent: string };  // hex codes; used as palette hints in generate-copy
}

export function createDefaultCreativeData(): CreativeData {
  return {
    imageUrl: null,
    imageFileName: null,
    headline: '1:1 personalization for {{company.name}}',
    bodyText: 'Hi there, teams at {{company.name}} are winning big deals by scaling their ABM programs with tailored 1:1 experiences across...',
    landingPageUrl: 'https://maestro.abm/p/{{account.slug}}',
    cta: 'LEARN_MORE',
    imageMode: 'template_logo',
    templateLogo: {
      baseImageUrl: null,
      baseImageSource: undefined,
      textoDestaque: 'WORKSHOP ABM',
      textoComplementar: 'Convite exclusivo VIP',
      showTargetLogo: true,
      fontFamily: 'Inter',
    },
    overrides: {},
    clientVoice: '',
    clientBrandContext: '',
    clientWebsiteUrl: '',
    clientProductService: '',
    clientAudienceMarket: '',
    clientPersona: '',
    clientBrandColors: { primary: '', secondary: '', accent: '' },
  };
}

// Returns the effective creative for a given target company. Falls back to
// the template values when an override is missing, with template variables
// substituted by the company name.
export function resolveCreativeForCompany(
  data: CreativeData,
  company: { id: string; label: string; industry?: string } | null,
): { headline: string; bodyText: string; imageUrl: string | null; imageFileName: string | null; usedOverride: boolean } {
  const override = company ? data.overrides[company.id] : undefined;
  const substituted = (s: string) =>
    s
      .replace(/\{\{company\.name\}\}/g, company?.label || '')
      .replace(/\{\{company\.industry\}\}/g, company?.industry || '');
  return {
    headline: override?.headline ?? substituted(data.headline),
    bodyText: override?.bodyText ?? substituted(data.bodyText),
    imageUrl: override?.imageUrl ?? data.imageUrl,
    imageFileName: override?.imageFileName ?? data.imageFileName,
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