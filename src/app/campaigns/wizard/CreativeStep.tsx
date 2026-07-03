import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Monitor,
  Image as ImageIcon,
  Layout,
  Info,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Send,
  Globe,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wand2,
  RotateCw,
  PaintBucket,
  Megaphone,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Camera,
  Palette,
  LayoutGrid,
  Link2,
  PencilLine,
  Plus,
} from 'lucide-react';
import { TargetAccount } from './types';
import type { CreativeData, BrandBrief, CompanyCreativeOverride, ImageMode } from './types';
import { resolveCreativeForCompany } from './types';
import { createDefaultBrandKit, MOCK_BRAND_FIXTURE } from './brandKit';
import type { BrandKit } from './brandKit';
import { BriefModal } from './BriefModal';
import type { BriefDraft } from './BriefModal';
import type { TargetingData, FacetItem } from './SegmentationStep';
import { uploadCreativeImageToStorage } from '@/lib/linkedin';
import {
  fetchBrandBrief,
  generateCopy,
  generateBaseImage,
  composeLogoOverlay,
  fetchClientVoice,
  saveClientVoice,
} from '@/lib/ai';
import { LandingPagePicker } from '@/app/landingPages/ads/LandingPagePicker';
import { buildAdLink } from '@/app/landingPages/ads/utm';
import { listPages, savePage } from '@/app/landingPages/store/repo';
import type { LandingPage } from '@/app/landingPages/store/model';

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'REGISTER', label: 'Register' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'REQUEST_DEMO', label: 'Request Demo' },
  { value: 'JOIN_NOW', label: 'Join Now' },
];

interface CreativeStepProps {
  selectedAccounts: TargetAccount[];
  targetingData?: TargetingData;
  creativeData?: CreativeData;
  onCreativeChange?: (data: CreativeData) => void;
  /**
   * Id of the campaign being edited, when known (only populated today for
   * `campaigns/:id/edit`; brand-new campaigns have no id until a campaign
   * repo exists). Used to record a best-effort reverse link
   * (`page.links.campaignIds`) when a landing page is selected here — if
   * absent, the LP is still selected but the reverse link is skipped.
   */
  campaignId?: string;
}

type CompanyStatus = 'template' | 'brief_only' | 'fully_personalized';

const TEMPLATE_TARGET = '__template__';

function statusOf(override: CompanyCreativeOverride | undefined): CompanyStatus {
  return override?.status ?? 'template';
}

const STATUS_META: Record<CompanyStatus, { label: string; color: string; dot: string }> = {
  template: { label: 'Template global', color: 'text-slate-500 bg-slate-100', dot: 'bg-slate-300' },
  brief_only: { label: 'Brief gerado', color: 'text-blue-700 bg-blue-50', dot: 'bg-blue-500' },
  fully_personalized: { label: 'Personalizado', color: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-500' },
};

function getAccountColor(name: string) {
  const colors: Record<string, string> = {
    NVIDIA: '#76b900', Revolut: '#0075EB', Datadog: '#632CA6', Figma: '#F24E1E',
    Stripe: '#635BFF', Snowflake: '#29b5e8', Databricks: '#FF3621', Notion: '#000000',
  };
  return colors[name] || '#6366f1';
}

export function CreativeStep({ selectedAccounts, targetingData, creativeData, onCreativeChange, campaignId }: CreativeStepProps) {
  const navigate = useNavigate();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const companies: FacetItem[] = targetingData?.companies?.included || [];
  const [editingTarget, setEditingTarget] = useState<string>(TEMPLATE_TARGET);
  const [briefDrawerOpen, setBriefDrawerOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // ----------------- Landing page picker (URL de destino) -----------------
  // 'manual' keeps the historical free-text URL input available (nothing
  // else in the wizard breaks); 'picker' binds landingPageUrl to an LP
  // created in the Landing Pages product via its /p/{slug} public path.
  const [urlMode, setUrlMode] = useState<'picker' | 'manual'>('manual');
  const [linkedPageId, setLinkedPageId] = useState<string | undefined>(undefined);

  const isTemplate = editingTarget === TEMPLATE_TARGET;
  const editingCompany = !isTemplate ? companies.find((c) => c.id === editingTarget) || null : null;

  // Defaults from props
  const headline = creativeData?.headline || '';
  const bodyText = creativeData?.bodyText || '';
  const landingPageUrl = creativeData?.landingPageUrl || 'https://maestro.abm/p/{{account.slug}}';
  const cta = creativeData?.cta || 'LEARN_MORE';
  const adImageUrl = creativeData?.imageUrl || null;
  const adImageFileName = creativeData?.imageFileName || null;
  const overrides = creativeData?.overrides || {};
  const brandKit = creativeData?.brandKit || createDefaultBrandKit();
  const clientVoice = brandKit.voice;
  const clientBrandContext = brandKit.context;
  const clientWebsiteUrl = brandKit.websiteUrl;
  const clientProductService = creativeData?.clientProductService || '';
  const clientAudienceMarket = creativeData?.clientAudienceMarket || '';
  const clientPersona = creativeData?.clientPersona || '';
  const clientBrandColors = brandKit.colors;
  const imageMode: ImageMode = creativeData?.imageMode || 'template_logo';
  const templateLogo = creativeData?.templateLogo || {
    baseImageUrl: null,
    baseImageSource: undefined as 'upload' | 'photo_ai' | 'graphic_ai' | undefined,
    textoDestaque: 'WORKSHOP ABM',
    textoComplementar: 'Convite exclusivo VIP',
    showTargetLogo: true,
  };

  const editingOverride = editingCompany ? overrides[editingCompany.id] : undefined;

  // Ref kept in sync with the latest creativeData so async update closures
  // (AI generation handlers) read fresh state instead of a stale snapshot
  // from the render that captured them. Without this, awaited writes to
  // updateOverride race with each other and the second call clobbers the
  // first because both see the same "prev".
  const creativeDataRef = useRef(creativeData);
  useEffect(() => { creativeDataRef.current = creativeData; }, [creativeData]);

  const updateCreative = (partial: Partial<CreativeData>) => {
    const current = creativeDataRef.current;
    if (!onCreativeChange || !current) return;
    const next = { ...current, ...partial };
    creativeDataRef.current = next;
    onCreativeChange(next);
  };

  // On mount (and whenever the URL is changed elsewhere), detect whether the
  // current landingPageUrl already points at a page created in the Landing
  // Pages product (path /p/{slug}) so the picker opens pre-selected instead
  // of defaulting users back into "manual" every time they revisit this step.
  useEffect(() => {
    const match = landingPageUrl.match(/\/p\/([^/?#]+)/);
    if (!match) return;
    const slug = match[1];
    const page = listPages().find((p) => p.slug === slug);
    if (page) {
      setLinkedPageId(page.id);
      setUrlMode('picker');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectLandingPage = (page: LandingPage) => {
    setLinkedPageId(page.id);
    updateCreative({ landingPageUrl: `/p/${page.slug}` });
    // Best-effort bidirectional link: only recorded when we actually know
    // the campaign id (brand-new campaigns have none yet — there's no
    // campaign repo to persist into in this prototype). The LP selection
    // itself always applies regardless.
    if (campaignId && !page.links.campaignIds.includes(campaignId)) {
      savePage({
        ...page,
        links: { ...page.links, campaignIds: [...page.links.campaignIds, campaignId] },
      });
    }
  };

  const handleCreateLpFromCampaign = () => {
    navigate('/landing-pages/new', {
      state: {
        // Not yet consumed by CreateSelector/AiBriefForm (out of scope for
        // this task — see report). Passed here so wiring up prefill later
        // is a small follow-up instead of a new integration.
        campaignName: creativeData?.headline || undefined,
        campaignMessage: creativeData?.bodyText || undefined,
      },
    });
  };

  const updateOverride = (companyId: string, partial: Partial<CompanyCreativeOverride>) => {
    const current = creativeDataRef.current;
    if (!onCreativeChange || !current) return;
    const prev = current.overrides[companyId] || { status: 'template' as const };
    const next: CompanyCreativeOverride = { ...prev, ...partial };
    const hasCopy = !!(next.headline || next.bodyText);
    const hasImage = !!next.imageUrl;
    if (hasCopy && hasImage) next.status = 'fully_personalized';
    else if (next.brief && !hasCopy && !hasImage) next.status = 'brief_only';
    else if (hasCopy || hasImage) next.status = 'fully_personalized';
    const nextData = {
      ...current,
      overrides: { ...current.overrides, [companyId]: next },
    };
    creativeDataRef.current = nextData;
    onCreativeChange(nextData);
  };

  const clearOverride = (companyId: string) => {
    if (!onCreativeChange || !creativeData) return;
    const next = { ...creativeData.overrides };
    delete next[companyId];
    onCreativeChange({ ...creativeData, overrides: next });
  };

  // Load saved client voice on mount
  useEffect(() => {
    if (!creativeData) return;
    if (clientVoice || clientBrandContext || clientWebsiteUrl) return;
    fetchClientVoice()
      .then((stored) => {
        if (
          stored.voice ||
          stored.brand_context ||
          stored.website_url ||
          stored.product_service ||
          stored.audience_market ||
          stored.persona
        ) {
          updateCreative({
            brandKit: {
              ...createDefaultBrandKit(),
              status: 'defined',
              voice: stored.voice,
              context: stored.brand_context,
              websiteUrl: stored.website_url,
              colors: stored.brand_colors || { primary: '', secondary: '', accent: '' },
            },
            clientProductService: stored.product_service || '',
            clientAudienceMarket: stored.audience_market || '',
            clientPersona: stored.persona || '',
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview source — what shows in the canvas
  const previewCompany: FacetItem | null = !isTemplate
    ? editingCompany
    : companies[0] || null;
  const resolved = useMemo(
    () => resolveCreativeForCompany(creativeData!, previewCompany ? { id: previewCompany.id, label: previewCompany.label, industry: previewCompany.industry } : null),
    [creativeData, previewCompany?.id, headline, bodyText, adImageUrl, overrides],
  );

  // ----------------- Image upload (manual) -----------------
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const adImageInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Arquivo excede o limite de 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Formato não suportado. Use JPG ou PNG.');
      return;
    }
    setIsUploadingImage(true);
    setUploadError(null);
    try {
      const result = await uploadCreativeImageToStorage(file);
      if (result.success && result.url) {
        // In template_logo mode at the template level, the upload becomes the
        // base image used by the composer (not the final ad). For everything
        // else it's the final ad image.
        if (isTemplate && imageMode === 'template_logo') {
          updateCreative({
            templateLogo: { ...templateLogo, baseImageUrl: result.url },
            imageUrl: result.url,
            imageFileName: result.filename || file.name,
          });
        } else if (isTemplate) {
          updateCreative({ imageUrl: result.url, imageFileName: result.filename || file.name });
        } else if (editingCompany) {
          updateOverride(editingCompany.id, { imageUrl: result.url, imageFileName: result.filename || file.name });
        }
      } else {
        setUploadError(result.error || 'Erro ao fazer upload da imagem.');
      }
    } catch (error: any) {
      setUploadError(error.message || 'Erro inesperado no upload.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) await processFile(e.target.files[0]);
  };
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) await processFile(e.dataTransfer.files[0]);
  }, [creativeData, editingTarget]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  // ----------------- AI generation -----------------
  const [aiBriefLoading, setAiBriefLoading] = useState<Record<string, boolean>>({});
  const [aiCopyLoading, setAiCopyLoading] = useState<Record<string, boolean>>({});
  const [aiImageLoading, setAiImageLoading] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const generateBriefFor = async (company: FacetItem): Promise<BrandBrief | null> => {
    setAiBriefLoading((s) => ({ ...s, [company.id]: true }));
    setAiError(null);
    try {
      const brief = await fetchBrandBrief({
        company_name: company.label,
        company_url: company.domain ? `https://${company.domain}` : undefined,
        company_domain: company.domain || undefined,
      });
      updateOverride(company.id, { brief });
      return brief;
    } catch (err: any) {
      setAiError(`Brief para ${company.label}: ${err.message}`);
      return null;
    } finally {
      setAiBriefLoading((s) => { const next = { ...s }; delete next[company.id]; return next; });
    }
  };

  const generateCopyFor = async (company: FacetItem, brief?: BrandBrief): Promise<boolean> => {
    setAiCopyLoading((s) => ({ ...s, [company.id]: true }));
    setAiError(null);
    try {
      const data = creativeDataRef.current!;
      let useBrief = brief || data.overrides[company.id]?.brief;
      // Without a brief we can still write copy — just pass an empty brief
      // and the model will lean on the company name + client voice. This
      // matters for template_logo flow where users may skip brief generation.
      if (!useBrief) {
        const generated = await generateBriefFor(company);
        useBrief = generated || ({
          industry: '',
          value_proposition: '',
          visual_style_keywords: [],
          primary_colors: [],
          key_messaging_themes: [],
          target_persona_hint: '',
          generated_at: new Date().toISOString(),
        } as BrandBrief);
      }
      const result = await generateCopy({
        brand_brief: useBrief,
        client_voice: data.brandKit.voice,
        client_brand_colors: data.brandKit.colors,
        target_company_name: company.label,
        objective: 'brand_awareness',
        cta: data.cta,
      });
      updateOverride(company.id, { headline: result.headline, bodyText: result.bodyText });
      return true;
    } catch (err: any) {
      setAiError(`Texto para ${company.label}: ${err.message}`);
      return false;
    } finally {
      setAiCopyLoading((s) => { const next = { ...s }; delete next[company.id]; return next; });
    }
  };

  // Generate the campaign-wide base image (single canvas reused across all
  // target companies). Modes: 'photo_ai' or 'graphic_ai' use the IA generator;
  // 'template_logo' relies on the user uploading the base manually elsewhere.
  // Returns the URL of the new base image, or null on failure.
  const [baseImageLoading, setBaseImageLoading] = useState(false);

  const generateBaseImageFor = async (mode: 'photo_ai' | 'graphic_ai', promptBrief?: string): Promise<string | null> => {
    setBaseImageLoading(true);
    setAiError(null);
    try {
      const data = creativeDataRef.current!;
      const result = await generateBaseImage({
        mode,
        client_brand_context: data.brandKit.context,
        prompt_brief: promptBrief,
      });
      updateCreative({
        templateLogo: { ...data.templateLogo, baseImageUrl: result.url, baseImageSource: mode },
        imageFileName: result.filename,
      });
      return result.url;
    } catch (err: any) {
      setAiError(`Imagem-base (${mode}): ${err.message}`);
      return null;
    } finally {
      setBaseImageLoading(false);
    }
  };

  // Apply the IA composer (texts + target logo) for one company on top of the
  // shared base image. Same pipeline regardless of how the base was produced.
  const composeOverlayFor = async (company: FacetItem): Promise<boolean> => {
    const tpl = creativeDataRef.current?.templateLogo;
    if (!tpl?.baseImageUrl) {
      setAiError(`Configure uma imagem-base no template antes de compor para ${company.label}.`);
      return false;
    }
    setAiImageLoading((s) => ({ ...s, [company.id]: true }));
    setAiError(null);
    try {
      const result = await composeLogoOverlay({
        base_image_url: tpl.baseImageUrl,
        target_company_name: company.label,
        target_company_domain: company.domain || null,
        show_target_logo: tpl.showTargetLogo,
        texto_destaque: tpl.textoDestaque,
        texto_complementar: tpl.textoComplementar,
        font_family: creativeDataRef.current?.brandKit.fontFamily,
      });
      updateOverride(company.id, {
        imageUrl: result.url,
        imageFileName: result.filename,
        imageMode: creativeDataRef.current!.imageMode,
      });
      return true;
    } catch (err: any) {
      setAiError(`Composição para ${company.label}: ${err.message}`);
      return false;
    } finally {
      setAiImageLoading((s) => { const next = { ...s }; delete next[company.id]; return next; });
    }
  };

  // Single per-company image pipeline: ensure a base image exists (generating
  // one with IA if needed) and then compose the per-company overlay on top.
  const generateImageFor = async (company: FacetItem): Promise<boolean> => {
    const data = creativeDataRef.current!;
    if (!data.templateLogo.baseImageUrl) {
      if (data.imageMode === 'template_logo') {
        setAiError(`Suba uma imagem-base no Template antes de gerar para ${company.label}.`);
        return false;
      }
      // Auto-generate the base image once for the campaign
      const newBase = await generateBaseImageFor(data.imageMode);
      if (!newBase) return false;
    }
    return composeOverlayFor(company);
  };

  const generateAllFor = async (company: FacetItem) => {
    // Sequential: generateImageFor may auto-create the base image first,
    // and we want any thrown errors to abort cleanly. Brief is generated
    // implicitly by generateCopyFor when missing.
    await generateCopyFor(company);
    await generateImageFor(company);
  };

  const generateForAllCompanies = async () => {
    if (!clientVoice.trim()) {
      setVoiceModalOpen(true);
      return;
    }
    setBulkProgress({ done: 0, total: companies.length });
    let done = 0;
    // Run sequentially to avoid hammering the Gemini API
    for (const company of companies) {
      await generateAllFor(company);
      done += 1;
      setBulkProgress({ done, total: companies.length });
    }
    setBulkProgress(null);
  };

  // ----------------- Brief modal handlers -----------------
  const [briefDraft, setBriefDraft] = useState<BriefDraft>({
    voice: '', context: '', websiteUrl: '',
    productService: '', audienceMarket: '', persona: '',
    brandColors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [], graphics: [],
    source: null,
    extractedRef: '',
  });
  useEffect(() => {
    setBriefDraft({
      voice: brandKit.voice,
      context: brandKit.context,
      websiteUrl: brandKit.websiteUrl,
      productService: clientProductService,
      audienceMarket: clientAudienceMarket,
      persona: clientPersona,
      brandColors: brandKit.colors,
      fontFamily: brandKit.fontFamily,
      logos: brandKit.logos,
      icons: brandKit.icons,
      graphics: brandKit.graphics,
      source: null,
      extractedRef: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    brandKit.status,
    brandKit.voice,
    brandKit.context,
    brandKit.websiteUrl,
    brandKit.fontFamily,
    brandKit.colors.primary,
    brandKit.colors.secondary,
    brandKit.colors.accent,
    clientProductService,
    clientAudienceMarket,
    clientPersona,
  ]);

  // Extraction UI state
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractWarning, setExtractWarning] = useState<string | null>(null);

  const persistVoice = async () => {
    updateCreative({
      brandKit: {
        ...(creativeDataRef.current?.brandKit || createDefaultBrandKit()),
        status: 'defined',
        voice: briefDraft.voice,
        context: briefDraft.context,
        websiteUrl: briefDraft.websiteUrl,
        colors: briefDraft.brandColors,
        fontFamily: briefDraft.fontFamily,
        logos: briefDraft.logos,
        icons: briefDraft.icons,
        graphics: briefDraft.graphics,
      },
      clientProductService: briefDraft.productService,
      clientAudienceMarket: briefDraft.audienceMarket,
      clientPersona: briefDraft.persona,
    });
    try {
      await saveClientVoice({
        voice: briefDraft.voice,
        brand_context: briefDraft.context,
        website_url: briefDraft.websiteUrl,
        product_service: briefDraft.productService,
        audience_market: briefDraft.audienceMarket,
        persona: briefDraft.persona,
        brand_colors: briefDraft.brandColors,
      });
    } catch (_e) { /* non-fatal */ }
    setVoiceModalOpen(false);
  };

  const applyFixtureToDraft = (source: 'brandbook' | 'website', ref: string) => {
    setBriefDraft((d) => ({
      ...d,
      voice: MOCK_BRAND_FIXTURE.voice,
      context: MOCK_BRAND_FIXTURE.context,
      brandColors: MOCK_BRAND_FIXTURE.colors,
      fontFamily: MOCK_BRAND_FIXTURE.fontFamily,
      logos: MOCK_BRAND_FIXTURE.logos,
      icons: MOCK_BRAND_FIXTURE.icons,
      graphics: MOCK_BRAND_FIXTURE.graphics,
      source,
      extractedRef: ref,
    }));
  };

  const handleExtract = async () => {
    const url = briefDraft.websiteUrl.trim();
    if (!url) return;
    setExtracting(true);
    setExtractError(null);
    setExtractWarning(null);
    // Mock: simula latência de rede e preenche a partir da fixture.
    await new Promise((r) => setTimeout(r, 900));
    applyFixtureToDraft('website', url);
    setExtractWarning('Extração simulada (mock) — revise os campos antes de salvar.');
    setExtracting(false);
  };

  const handleBrandBookUpload = async (file: File) => {
    setExtracting(true);
    setExtractError(null);
    setExtractWarning(null);
    await new Promise((r) => setTimeout(r, 900));
    applyFixtureToDraft('brandbook', file.name);
    setExtractWarning('Brand Book lido (mock) — revise os campos antes de salvar.');
    setExtracting(false);
  };

  const handleResetExtraction = () => {
    setExtractWarning(null);
    setExtractError(null);
    setBriefDraft((d) => ({
      ...d,
      // websiteUrl e fontFamily são mantidos de propósito (pré-preenche um retry).
      source: null,
      extractedRef: '',
      voice: '',
      context: '',
      brandColors: { primary: '', secondary: '', accent: '' },
      logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
      icons: [],
      graphics: [],
    }));
  };

  const ctaLabel = CTA_OPTIONS.find((o) => o.value === cta)?.label || 'Learn More';

  // What the editor edits — template OR a specific company override
  const editorHeadline = isTemplate ? headline : (editingOverride?.headline ?? '');
  const editorBody = isTemplate ? bodyText : (editingOverride?.bodyText ?? '');
  const editorImageUrl = isTemplate
    ? (imageMode === 'template_logo' ? templateLogo.baseImageUrl : adImageUrl)
    : (editingOverride?.imageUrl ?? null);
  const editorImageFileName = isTemplate ? adImageFileName : (editingOverride?.imageFileName ?? null);

  const setEditorHeadline = (v: string) => {
    if (v.length > 200) return;
    if (isTemplate) updateCreative({ headline: v });
    else if (editingCompany) updateOverride(editingCompany.id, { headline: v });
  };
  const setEditorBody = (v: string) => {
    if (v.length > 600) return;
    if (isTemplate) updateCreative({ bodyText: v });
    else if (editingCompany) updateOverride(editingCompany.id, { bodyText: v });
  };

  const insertVariable = (variable: string) => {
    if (!isTemplate) return; // variables only meaningful in template
    const current = bodyText;
    updateCreative({ bodyText: current + (current.endsWith(' ') || current === '' ? '' : ' ') + variable });
  };

  const VariableChip = ({ value, label }: { value: string; label: string }) => (
    <button
      onClick={() => insertVariable(value)}
      disabled={!isTemplate}
      className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF1ED] text-[#E54A26] border border-[#FFE3DA] hover:bg-[#FFE3DA] disabled:opacity-40 disabled:cursor-not-allowed font-mono"
      title={isTemplate ? `Inserir ${value}` : 'Variáveis só funcionam no template'}
    >
      {label}
    </button>
  );

  const briefForEditing = editingCompany ? overrides[editingCompany.id]?.brief : undefined;
  const needsBaseImage = imageMode === 'template_logo' && !templateLogo.baseImageUrl;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 -m-8">
      {/* ============= COLUMN 1 — Companies & client voice ============= */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#FF5F39]" />
            Empresas-alvo
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Edite o template ou personalize criativo por empresa com IA.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Brief entry — opens the Brief modal (client voice + context + dropdowns) */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 border-l-4 border-l-transparent transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-[#FFE3DA] flex items-center justify-center shrink-0">
              <PaintBucket className="w-4 h-4 text-[#FF5F39]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-700">Brief</div>
              <div className="text-[10px] text-slate-500 truncate">
                {clientVoice || <span className="italic text-slate-400">Configure tom de voz e contexto</span>}
              </div>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {/* Template entry */}
          <button
            onClick={() => { setEditingTarget(TEMPLATE_TARGET); setBriefDrawerOpen(false); }}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 transition-colors ${
              isTemplate ? 'bg-[#FFF1ED] border-l-4 border-l-[#FF5F39]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
            }`}
          >
            <div className="w-8 h-8 rounded-md bg-[#FFE3DA] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#FF5F39]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${isTemplate ? 'font-bold text-[#212A46]' : 'font-semibold text-slate-700'}`}>
                Template global
              </div>
              <div className="text-[10px] text-slate-500">Aplicado a todas sem override</div>
            </div>
          </button>

          {/* Companies */}
          {companies.length === 0 && (
            <div className="px-4 py-8 text-center">
              <div className="text-xs text-slate-400">
                Nenhuma empresa selecionada na Segmentação. Volte ao Step 2 para adicionar empresas-alvo.
              </div>
            </div>
          )}

          {companies.map((company) => {
            const ovr = overrides[company.id];
            const status = statusOf(ovr);
            const meta = STATUS_META[status];
            const isActive = editingTarget === company.id;
            const isLoading = !!(aiBriefLoading[company.id] || aiCopyLoading[company.id] || aiImageLoading[company.id]);
            return (
              <button
                key={company.id}
                onClick={() => { setEditingTarget(company.id); setBriefDrawerOpen(false); }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-slate-100 transition-colors ${
                  isActive ? 'bg-[#FFF1ED] border-l-4 border-l-[#FF5F39]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt=""
                    className="w-8 h-8 rounded-md object-contain bg-white border border-slate-100 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: getAccountColor(company.label) }}
                  >
                    {company.label?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${isActive ? 'font-bold text-[#212A46]' : 'font-semibold text-slate-800'}`}>
                    {company.label}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${meta.color}`}>
                      {isLoading ? 'Gerando…' : meta.label}
                    </span>
                  </div>
                </div>
                {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#FF5F39] animate-spin shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>

      </aside>

      {/* ============= COLUMN 2 — Editor ============= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header strip */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {isTemplate ? (
                <><FileText className="w-4 h-4 text-[#FF5F39]" /> Editando: Template global</>
              ) : (
                <><Sparkles className="w-4 h-4 text-emerald-600" /> Editando: {editingCompany?.label}</>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTemplate
                ? 'Use variáveis como {{company.name}} para personalizar dinamicamente.'
                : 'Estas alterações só se aplicam a esta empresa, sobrescrevendo o template.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {bulkProgress && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF1ED] rounded-lg text-xs text-[#E54A26]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Gerando {bulkProgress.done}/{bulkProgress.total}…
              </div>
            )}
            {!isTemplate && editingCompany && (
              <>
                <button
                  onClick={() => setBriefDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  <Info className="w-3.5 h-3.5" />
                  Brand Brief
                  {briefForEditing && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                </button>
                <button
                  disabled={!clientVoice.trim() || needsBaseImage || aiBriefLoading[editingCompany.id] || aiCopyLoading[editingCompany.id] || aiImageLoading[editingCompany.id]}
                  onClick={() => generateAllFor(editingCompany)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !clientVoice.trim() ? 'Configure a voz da marca primeiro'
                    : needsBaseImage ? 'Suba uma imagem-base no Template global primeiro'
                    : `Gerar criativo para ${editingCompany.label}`
                  }
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Gerar com IA
                </button>
              </>
            )}
            {isTemplate && companies.length > 0 && (
              <button
                disabled={bulkProgress !== null || !clientVoice.trim() || needsBaseImage}
                onClick={generateForAllCompanies}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#FF5F39] to-violet-600 hover:from-[#E54A26] hover:to-violet-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !clientVoice.trim() ? 'Configure a voz da marca primeiro'
                  : needsBaseImage ? 'Suba uma imagem-base no Template primeiro'
                  : `Gerar para todas as ${companies.length} empresas`
                }
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar para todas ({companies.length})
              </button>
            )}
          </div>
        </header>

        {needsBaseImage && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span className="flex-1">
              <span className="font-semibold">Modo "Template + logo" selecionado:</span>{' '}
              suba uma imagem-base no Template global. Ela será reutilizada para gerar 1 anúncio por empresa.
            </span>
            {!isTemplate && (
              <button
                onClick={() => setEditingTarget(TEMPLATE_TARGET)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shadow-sm shrink-0"
              >
                Ir para Template global
              </button>
            )}
          </div>
        )}

        {aiError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">{aiError}</span>
            <button onClick={() => setAiError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* ---------- Editor form ---------- */}
          <div className="overflow-y-auto p-6 border-r border-slate-200 bg-white space-y-5">
            {/* Body text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase">
                  Texto do anúncio
                </label>
                {!isTemplate && editingCompany && (
                  <button
                    disabled={aiCopyLoading[editingCompany.id]}
                    onClick={() => generateCopyFor(editingCompany)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                  >
                    {aiCopyLoading[editingCompany.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                    Regenerar texto
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={editorBody}
                  onChange={(e) => setEditorBody(e.target.value)}
                  maxLength={600}
                  placeholder={isTemplate ? 'Ex: Hi {{company.name}} team, ABM teams in {{company.industry}} are…' : 'Texto específico para esta empresa (opcional — usa o template se vazio)'}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg h-28 resize-none focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed"
                />
                <span className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white px-1">
                  {editorBody.length}/600
                </span>
              </div>
              {isTemplate && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 mr-1">Inserir:</span>
                  <VariableChip value="{{company.name}}" label="company.name" />
                  <VariableChip value="{{company.industry}}" label="company.industry" />
                </div>
              )}
            </div>

            {/* Headline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase">Headline</label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={editorHeadline}
                  onChange={(e) => setEditorHeadline(e.target.value)}
                  maxLength={200}
                  placeholder={isTemplate ? 'Ex: Acelere seu ABM com {{company.name}}' : 'Headline específico (opcional)'}
                  className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none font-medium"
                />
                <span className="absolute top-2.5 right-2.5 text-[10px] text-slate-400">
                  {editorHeadline.length}/200
                </span>
              </div>
            </div>

            {/* Image — mode selector + content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">
                  {isTemplate ? 'Imagem (modo de geração)' : 'Imagem do anúncio'}
                </label>
                {!isTemplate && editingCompany && (
                  <button
                    disabled={aiImageLoading[editingCompany.id] || needsBaseImage}
                    onClick={() => generateImageFor(editingCompany)}
                    title={needsBaseImage ? 'Suba uma imagem-base no Template global primeiro' : ''}
                    className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiImageLoading[editingCompany.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {imageMode === 'template_logo' ? 'Aplicar overlay' : 'Gerar com IA'}
                  </button>
                )}
              </div>

              {/* Mode selector + overlay config — always visible, but the
                  values are template-level (apply to every company). When
                  editing a single company, we surface that with a hint. */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Modo de geração
                </span>
                {!isTemplate && (
                  <span className="text-[10px] text-slate-400 italic">configuração global do template</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-3 p-1 bg-slate-100 rounded-lg">
                <ModeButton
                  icon={<LayoutGrid className="w-3.5 h-3.5" />}
                  label="Template + logo"
                  sub="Foto base + logo"
                  active={imageMode === 'template_logo'}
                  onClick={() => updateCreative({ imageMode: 'template_logo' })}
                />
                <ModeButton
                  icon={<Camera className="w-3.5 h-3.5" />}
                  label="Foto IA"
                  sub="Realista"
                  active={imageMode === 'photo_ai'}
                  onClick={() => updateCreative({ imageMode: 'photo_ai' })}
                />
                <ModeButton
                  icon={<Palette className="w-3.5 h-3.5" />}
                  label="Gráfico IA"
                  sub="Ilustrado"
                  active={imageMode === 'graphic_ai'}
                  onClick={() => updateCreative({ imageMode: 'graphic_ai' })}
                />
              </div>

              {/* Campaign visual identity — shared across all companies. The
                  texts + logo toggle apply to every ad regardless of mode;
                  the IA composer decides where to place each element. */}
              <div className="mb-3 p-3 bg-[#FFF1ED]/50 border border-[#FFE3DA] rounded-lg space-y-2.5">
                <p className="text-[10px] text-[#E54A26] leading-relaxed">
                  Os textos abaixo e o logo da empresa-alvo são aplicados pela IA
                  em cima da imagem-base. {isTemplate
                    ? 'Compartilhados entre todas as empresas da campanha.'
                    : 'Configuração global do template.'}
                </p>

                <div className="grid grid-cols-1 gap-2">
                  <TextField
                    label="Texto destaque (principal)"
                    value={templateLogo.textoDestaque}
                    onChange={(v) => updateCreative({ templateLogo: { ...templateLogo, textoDestaque: v } })}
                    placeholder="WORKSHOP ABM"
                  />
                  <TextField
                    label="Texto complementar"
                    value={templateLogo.textoComplementar}
                    onChange={(v) => updateCreative({ templateLogo: { ...templateLogo, textoComplementar: v } })}
                    placeholder="Convite exclusivo VIP"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium pt-1">
                    <input
                      type="checkbox"
                      checked={templateLogo.showTargetLogo}
                      onChange={(e) => updateCreative({ templateLogo: { ...templateLogo, showTargetLogo: e.target.checked } })}
                      className="rounded"
                    />
                    Aplicar logo da empresa-alvo na imagem
                  </label>
                </div>
              </div>

              {/* Base image management — depends on the active mode */}
              {!isTemplate && (
                <div className="mb-3 flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md">
                  {templateLogo.baseImageUrl ? (
                    <img
                      src={templateLogo.baseImageUrl}
                      alt="Imagem-base"
                      className="w-16 h-10 object-cover rounded border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-10 bg-slate-100 rounded border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Imagem-base da campanha</div>
                    <div className="text-xs text-slate-600 truncate">
                      {templateLogo.baseImageUrl
                        ? `${adImageFileName || 'Definida'}${templateLogo.baseImageSource && templateLogo.baseImageSource !== 'upload' ? ' (gerada por IA)' : ''}`
                        : 'Nenhuma — configure no Template'}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingTarget(TEMPLATE_TARGET)}
                    className="text-[10px] font-semibold text-[#FF5F39] hover:text-[#212A46] px-2 py-1 rounded hover:bg-[#FFF1ED] shrink-0"
                  >
                    {templateLogo.baseImageUrl ? 'Trocar' : 'Configurar'}
                  </button>
                </div>
              )}

              {/* IA base-image generator — only shown at template level, for
                  the IA modes. template_logo mode uses the file uploader below. */}
              {isTemplate && imageMode !== 'template_logo' && (
                <div className="mb-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-2">
                  <p className="text-[10px] text-emerald-800 leading-relaxed">
                    {imageMode === 'photo_ai'
                      ? 'A IA vai gerar uma foto editorial corporativa para usar como imagem-base. Sem texto na imagem — os textos serão aplicados depois.'
                      : 'A IA vai gerar uma ilustração abstrata para usar como imagem-base. Sem texto na imagem — os textos serão aplicados depois.'}
                  </p>
                  <button
                    disabled={baseImageLoading}
                    onClick={() => generateBaseImageFor(imageMode === 'photo_ai' ? 'photo_ai' : 'graphic_ai')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {baseImageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    {templateLogo.baseImageUrl && templateLogo.baseImageSource === imageMode
                      ? 'Regenerar imagem-base'
                      : 'Gerar imagem-base com IA'}
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={adImageInputRef}
                onChange={handleAdImageUpload}
                className="hidden"
                accept="image/png,image/jpeg"
              />
              {editorImageUrl ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <img src={editorImageUrl} alt="Ad creative" className="w-full h-40 object-cover" />
                  <div className="px-3 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-700 font-medium truncate">{editorImageFileName}</span>
                    </div>
                    {!isTemplate && editingCompany && (
                      <button
                        onClick={() => updateOverride(editingCompany.id, { imageUrl: undefined, imageFileName: undefined })}
                        className="text-xs text-slate-500 hover:text-red-600"
                      >
                        Usar template
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => adImageInputRef.current?.click()}
                    className="w-full px-3 py-2 text-xs font-medium text-[#FF5F39] hover:bg-[#FFF1ED] border-t border-slate-100 transition-colors"
                  >
                    Trocar imagem
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isUploadingImage && adImageInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 transition-colors cursor-pointer ${
                    isDragging ? 'border-[#FF5F39] bg-[#FFF1ED]'
                      : isUploadingImage ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-300 hover:border-[#FF7A59] hover:bg-[#FFF1ED]/30'
                  }`}
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 text-[#FF5F39] animate-spin" />
                      <span className="text-xs text-[#FF5F39] font-medium">Fazendo upload…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-xs text-slate-600 font-medium">Clique ou arraste uma imagem</span>
                      <span className="text-[10px] text-slate-400 text-center">
                        JPG ou PNG • 1200×628px ou 1200×1200px • Máx 5MB
                      </span>
                    </>
                  )}
                </div>
              )}
              {uploadError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {uploadError}
                </p>
              )}
            </div>

            {/* CTA + URL — only meaningful in template */}
            {isTemplate && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase">URL de destino</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUrlMode((m) => (m === 'picker' ? 'manual' : 'picker'))}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#FF5F39] hover:text-[#E54A26]"
                      >
                        {urlMode === 'picker' ? (
                          <><PencilLine className="w-3 h-3" /> Usar URL manual</>
                        ) : (
                          <><Link2 className="w-3 h-3" /> Escolher landing page</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateLpFromCampaign}
                        className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-[#E54A26] border border-slate-200 hover:border-[#FFD0C2] rounded-full px-2 py-0.5"
                        title="Abre o fluxo de criação de landing page com IA"
                      >
                        <Plus className="w-3 h-3" /> Criar LP a partir desta campanha
                      </button>
                    </div>
                  </div>

                  {urlMode === 'picker' ? (
                    <LandingPagePicker value={linkedPageId} onSelect={handleSelectLandingPage} />
                  ) : (
                    <input
                      type="text"
                      value={landingPageUrl}
                      onChange={(e) => { setLinkedPageId(undefined); updateCreative({ landingPageUrl: e.target.value }); }}
                      className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg text-blue-600 focus:ring-2 focus:ring-[#FF5F39] outline-none"
                    />
                  )}

                  <div className="mt-1.5 px-2.5 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                      Link efetivo do anúncio (com conta + UTMs)
                    </p>
                    <p className="text-[11px] font-mono text-slate-600 break-all">
                      {buildAdLink(landingPageUrl || '/p/{{account.slug}}', '{{account.id}}', {
                        utm_source: 'linkedin',
                        utm_medium: 'paid-social',
                        utm_campaign: '{{campaign.id}}',
                      })}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">CTA</label>
                  <select
                    value={cta}
                    onChange={(e) => updateCreative({ cta: e.target.value })}
                    className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none font-medium"
                  >
                    {CTA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {!isTemplate && editingCompany && editingOverride && (
              <button
                onClick={() => clearOverride(editingCompany.id)}
                className="w-full text-xs text-slate-500 hover:text-red-600 py-2 border-t border-slate-100 mt-2"
              >
                Limpar personalização e usar template
              </button>
            )}
          </div>

          {/* ---------- Preview ---------- */}
          <div className="overflow-y-auto bg-slate-100">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Layout className="w-3.5 h-3.5" />
                <span className="font-medium">Preview LinkedIn</span>
                {previewCompany && (
                  <span className="text-slate-400">— como aparece para <span className="font-semibold text-slate-700">{previewCompany.label}</span></span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Monitor className="w-4 h-4" />
                </button>
                <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 flex justify-center">
              <div
                className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col transition-all duration-300 ${
                  device === 'desktop' ? 'w-full max-w-[500px]' : 'w-[340px]'
                }`}
              >
                <div className="p-4 flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-yellow-400 font-bold text-xl">M</div>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-semibold text-slate-900 text-sm">Maestro ABM</h3>
                        <span className="text-slate-500 text-xs">• 3rd+</span>
                      </div>
                      <p className="text-xs text-slate-500">3,550 followers</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <span>Promoted</span>
                        <Globe className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <button className="text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
                </div>

                <div className="px-4 pb-2">
                  {resolved.bodyText ? (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {resolved.bodyText}
                      <span className="text-slate-500 cursor-pointer ml-1 hover:underline">…see more</span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Texto do anúncio aparecerá aqui…</p>
                  )}
                </div>

                <div className="relative aspect-[1200/628] bg-slate-100 overflow-hidden">
                  {resolved.imageUrl ? (
                    <img src={resolved.imageUrl} alt="Ad creative" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-10 h-10 mb-1.5" />
                      <span className="text-xs font-medium">Imagem aparecerá aqui</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-t border-slate-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase font-semibold text-slate-500 mb-0.5">maestro.abm.com</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {resolved.headline || 'Headline aparecerá aqui'}
                    </p>
                  </div>
                  <button className="ml-3 shrink-0 px-4 py-1.5 border border-slate-400 rounded-full text-sm font-semibold text-slate-700">
                    {ctaLabel}
                  </button>
                </div>

                <div className="px-2 py-1 flex items-center justify-between border-t border-slate-100">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><ThumbsUp className="w-5 h-5" /> Like</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><MessageCircle className="w-5 h-5" /> Comment</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><Share2 className="w-5 h-5" /> Repost</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><Send className="w-5 h-5" /> Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============= Brand Brief drawer ============= */}
      {briefDrawerOpen && editingCompany && (
        <BrandBriefDrawer
          company={editingCompany}
          brief={briefForEditing}
          loading={!!aiBriefLoading[editingCompany.id]}
          onClose={() => setBriefDrawerOpen(false)}
          onGenerate={() => generateBriefFor(editingCompany)}
          onSave={(b) => updateOverride(editingCompany.id, { brief: { ...b, manually_edited: true } })}
        />
      )}

      {/* ============= Brief modal ============= */}
      {voiceModalOpen && (
        <BriefModal
          draft={briefDraft}
          setDraft={setBriefDraft}
          status={brandKit.status}
          onClose={() => setVoiceModalOpen(false)}
          onSave={persistVoice}
          extracting={extracting}
          extractError={extractError}
          extractWarning={extractWarning}
          onExtractWebsite={handleExtract}
          onUploadBrandBook={handleBrandBookUpload}
          onResetExtraction={handleResetExtraction}
        />
      )}
    </div>
  );
}

// ============================================================
// Brand Brief drawer — editable structured view of the AI-extracted
// brand signals for a single target company.
// ============================================================
interface BrandBriefDrawerProps {
  company: FacetItem;
  brief: BrandBrief | undefined;
  loading: boolean;
  onClose: () => void;
  onGenerate: () => Promise<BrandBrief | null>;
  onSave: (brief: BrandBrief) => void;
}

function BrandBriefDrawer({ company, brief, loading, onClose, onGenerate, onSave }: BrandBriefDrawerProps) {
  const [draft, setDraft] = useState<BrandBrief | null>(brief || null);
  useEffect(() => { setDraft(brief || null); }, [brief]);

  const setField = <K extends keyof BrandBrief>(key: K, value: BrandBrief[K]) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-[90] flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-[460px] bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#FF5F39]" /> Brand Brief
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Sinais da marca <span className="font-semibold text-slate-700">{company.label}</span> usados pela IA na personalização.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!draft && !loading && (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-[#FF9C82] mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-4">
                Vamos analisar o site da {company.label} para extrair identidade visual e mensagens-chave.
              </p>
              <button
                onClick={onGenerate}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5F39] hover:bg-[#E54A26] text-white text-sm font-bold rounded-lg shadow-sm"
              >
                <Wand2 className="w-4 h-4" /> Gerar Brand Brief
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-[#FF5F39] mx-auto animate-spin mb-3" />
              <p className="text-sm text-slate-600">Analisando o site da {company.label}…</p>
              <p className="text-xs text-slate-400 mt-1">Coletando sinais e sintetizando com Gemini</p>
            </div>
          )}

          {draft && (
            <>
              {draft.scrape_status === 'limited' && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Site bloqueou acesso — brief inferido apenas a partir do nome. Edite os campos abaixo para corrigir.</span>
                </div>
              )}

              <Field label="Indústria">
                <input value={draft.industry} onChange={(e) => setField('industry', e.target.value)} className="w-full p-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none" />
              </Field>

              <Field label="Proposta de valor">
                <textarea value={draft.value_proposition} onChange={(e) => setField('value_proposition', e.target.value)} rows={2} className="w-full p-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none" />
              </Field>

              <Field label="Cores primárias">
                <div className="flex flex-wrap gap-2">
                  {draft.primary_colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg pl-1 pr-2 py-1">
                      <span className="w-5 h-5 rounded-md border border-slate-200" style={{ backgroundColor: c }} />
                      <input
                        value={c}
                        onChange={(e) => { const next = [...draft.primary_colors]; next[i] = e.target.value; setField('primary_colors', next); }}
                        className="text-xs font-mono bg-transparent w-16 outline-none"
                      />
                      <button onClick={() => setField('primary_colors', draft.primary_colors.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setField('primary_colors', [...draft.primary_colors, '#6366f1'])}
                    className="text-xs px-2 py-1 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
                  >
                    + cor
                  </button>
                </div>
              </Field>

              <Field label="Estilo visual">
                <ChipsEditor values={draft.visual_style_keywords} onChange={(v) => setField('visual_style_keywords', v)} placeholder="adicionar palavra-chave" />
              </Field>

              <Field label="Temas de mensagem">
                <ChipsEditor values={draft.key_messaging_themes} onChange={(v) => setField('key_messaging_themes', v)} placeholder="adicionar tema" />
              </Field>

              <Field label="Persona-alvo da empresa">
                <textarea value={draft.target_persona_hint} onChange={(e) => setField('target_persona_hint', e.target.value)} rows={2} className="w-full p-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none" />
              </Field>

              {draft.source_url && (
                <p className="text-[10px] text-slate-400 pt-2">
                  Fonte: <a href={draft.source_url} target="_blank" rel="noreferrer" className="text-[#FF5F39] hover:underline">{draft.source_url}</a>
                </p>
              )}
            </>
          )}
        </div>

        {draft && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <button onClick={onGenerate} className="text-xs text-slate-600 hover:text-[#E54A26] flex items-center gap-1 font-semibold">
              <RotateCw className="w-3 h-3" /> Regenerar
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">Cancelar</button>
              <button onClick={() => { onSave(draft); onClose(); }} className="px-3 py-1.5 text-xs font-bold text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm">
                Salvar brief
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function ModeButton({ icon, label, sub, active, onClick }: { icon: React.ReactNode; label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-md text-center transition-colors ${
        active ? 'bg-white shadow-sm border border-[#FFD0C2] text-[#E54A26]' : 'text-slate-600 hover:bg-white/60'
      }`}
    >
      <span className={active ? 'text-[#FF5F39]' : 'text-slate-400'}>{icon}</span>
      <span className="text-[11px] font-bold leading-tight">{label}</span>
      <span className="text-[9px] text-slate-500 leading-tight">{sub}</span>
    </button>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-[#FF5F39] outline-none"
      />
    </div>
  );
}

// Curated Google Fonts the IA composer recognizes well. Grouped by tone so
// the user can pick a vibe without scrolling through 1500 options.
const FONT_OPTIONS: { label: string; family: string; group: string }[] = [
  { group: 'Sans-serif moderna', family: 'Inter', label: 'Inter' },
  { group: 'Sans-serif moderna', family: 'Roboto', label: 'Roboto' },
  { group: 'Sans-serif moderna', family: 'Poppins', label: 'Poppins' },
  { group: 'Sans-serif moderna', family: 'Montserrat', label: 'Montserrat' },
  { group: 'Sans-serif moderna', family: 'DM Sans', label: 'DM Sans' },
  { group: 'Sans-serif moderna', family: 'Work Sans', label: 'Work Sans' },
  { group: 'Sans-serif geométrica', family: 'Manrope', label: 'Manrope' },
  { group: 'Sans-serif geométrica', family: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { group: 'Sans-serif geométrica', family: 'Space Grotesk', label: 'Space Grotesk' },
  { group: 'Serif clássica', family: 'Playfair Display', label: 'Playfair Display' },
  { group: 'Serif clássica', family: 'Lora', label: 'Lora' },
  { group: 'Serif clássica', family: 'Merriweather', label: 'Merriweather' },
  { group: 'Display / impacto', family: 'Bebas Neue', label: 'Bebas Neue' },
  { group: 'Display / impacto', family: 'Oswald', label: 'Oswald' },
  { group: 'Display / impacto', family: 'Archivo Black', label: 'Archivo Black' },
];

export function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groups = Array.from(new Set(FONT_OPTIONS.map((f) => f.group)));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Fonte</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-slate-200 rounded hover:border-slate-300 focus:ring-1 focus:ring-[#FF5F39] outline-none"
      >
        <span style={{ fontFamily: `"${value}", sans-serif` }} className="truncate">{value}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 sticky top-0">
                {g}
              </div>
              {FONT_OPTIONS.filter((f) => f.group === g).map((f) => {
                const isActive = f.family === value;
                return (
                  <button
                    key={f.family}
                    type="button"
                    onClick={() => { onChange(f.family); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-base transition-colors ${
                      isActive ? 'bg-[#FFF1ED] text-[#212A46]' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                    style={{ fontFamily: `"${f.family}", sans-serif` }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ChipsEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF1ED] border border-[#FFE3DA] rounded-full text-xs text-[#E54A26]">
          {v}
          <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-[#FF7A59] hover:text-[#E54A26]">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        placeholder={placeholder}
        className="text-xs px-2 py-0.5 bg-white border border-dashed border-slate-300 rounded-full outline-none focus:border-[#FF7A59] min-w-[120px]"
      />
    </div>
  );
}
