import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Monitor,
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
  AlertTriangle,
  Sparkles,
  Wand2,
  RotateCw,
  PaintBucket,
  Megaphone,
  X,
  ChevronDown,
  FileText,
  Link2,
  PencilLine,
  Plus,
  Square,
  RectangleHorizontal,
  Copy,
} from 'lucide-react';
import { TargetAccount } from './types';
import type { CreativeData, BrandBrief, CompanyCreativeOverride, ImageMode, AdFormat, ResolvedImageConfig } from './types';
import { resolveCreativeForCompany, resolveImageConfig, overriddenImageFields } from './types';
import {
  createDefaultOverlayLayout,
  withLayoutDefaults,
  aspectClass,
  AD_FORMAT_SIZE,
  maxTextSizePx,
  effectiveTextSize,
  effectiveLayout,
  MIN_TEXT_SIZE_PX,
  type OverlayLayout,
  type LogoLayer,
  type LogoWrap,
  type TextLayer,
} from './overlayLayout';
import { OverlayCanvas, type OverlayLayerId, measureTextWidthPx } from './OverlayCanvas';
import { createDefaultBrandKit, MOCK_BRAND_FIXTURE } from './brandKit';
import type { BrandKit } from './brandKit';
import { BriefPane, type BriefDraft } from './BriefPane';
import type { TargetingData, FacetItem } from './SegmentationStep';
import { uploadCreativeImageToStorage } from '@/lib/linkedin';
import { logoDevUrl } from '@/lib/linkedin/logo';
import {
  fetchBrandBrief,
  generateCopy,
  generateBaseImage,
  composeLogoOverlay,
  fetchClientVoice,
  saveClientVoice,
} from '@/lib/ai';
import { LandingPagePicker } from '@/app/landingPages/ads/LandingPagePicker';
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
const BRIEF_TARGET = '__brief__';

function statusOf(override: CompanyCreativeOverride | undefined): CompanyStatus {
  return override?.status ?? 'template';
}

const STATUS_META: Record<CompanyStatus, { label: string; color: string; dot: string }> = {
  template: { label: 'Segue o template', color: 'text-slate-500 bg-slate-100', dot: 'bg-slate-300' },
  brief_only: { label: 'Brief gerado', color: 'text-blue-700 bg-blue-50', dot: 'bg-blue-500' },
  fully_personalized: { label: 'Personalizado', color: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-500' },
};

const DEFAULT_TEMPLATE_LOGO = {
  baseImageUrl: null,
  baseImageSource: undefined as ImageMode | undefined,
  basePrompt: '',
  textoDestaque: 'WORKSHOP ABM',
  textoComplementar: 'Convite exclusivo VIP',
  showTargetLogo: true,
  format: 'banner' as AdFormat,
  layout: createDefaultOverlayLayout(true),
};

// `creativeData` reaches this component partially populated in some entry
// points (and in tests), so every read of the image config goes through this
// instead of touching the raw prop and blowing up on a missing sub-object.
function withImageDefaults(d?: CreativeData): CreativeData {
  const tpl = d?.templateLogo || DEFAULT_TEMPLATE_LOGO;
  return {
    ...(d as CreativeData),
    imageMode: d?.imageMode || 'upload',
    // O layout entra aqui e não só no default porque campanhas persistidas
    // antes do editor têm `templateLogo` sem `layout`.
    templateLogo: { ...tpl, layout: withLayoutDefaults(tpl.layout, tpl.showTargetLogo) },
    brandKit: d?.brandKit || createDefaultBrandKit(),
    overrides: d?.overrides || {},
  };
}

// Deriva um domínio nu (sem protocolo/path) de `brandKit.websiteUrl` para
// mandar como `advertiser_domain` na composição — o handler usa isso como
// fallback de "Meu logo" quando `advertiser_logo_url` está ausente ou falha,
// e `brandKit.logo` nasce `null` por padrão. Aceita tanto "https://acme.com"
// quanto um domínio avulso como "acme.com" (sem protocolo o `new URL` direto
// lançaria).
function deriveWebsiteDomain(websiteUrl: string): string | null {
  const trimmed = websiteUrl.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

// `brandKit.logo` pode ser um `blob:` — a única via de UI para logo próprio
// (`LogoGallery.pick()` em `BriefPane.tsx`) usa `URL.createObjectURL(file)`,
// e esse esquema só resolve dentro desta aba/sessão. O servidor busca a URL
// com `fetch()` puro (`fetchAsBase64`), nunca alcança um `blob:`, cai no
// catch e devolve `null` em silêncio — a composição degradaria pro fallback
// por domínio sem avisar ninguém. Filtrar aqui torna esse fallback uma
// escolha deliberada, não um acidente silencioso. Resolver de verdade (subir
// o logo pro Storage, como já se faz com a imagem-base) fica fora do escopo
// desta task.
function sendableAdvertiserLogoUrl(logo: string | null): string | null {
  return logo && logo.startsWith('blob:') ? null : logo;
}

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
  // Camada selecionada no editor — é ela que os controles do card 2 editam.
  const [selectedLayer, setSelectedLayer] = useState<OverlayLayerId | null>(null);
  // O editor ao vivo é o default; "Composto" existe só para conferir que o
  // resvg bateu com o que estava na tela.
  const [previewMode, setPreviewMode] = useState<'editor' | 'composed'>('editor');
  const companies: FacetItem[] = targetingData?.companies?.included || [];
  const [editingTarget, setEditingTarget] = useState<string>(BRIEF_TARGET);
  const [briefDrawerOpen, setBriefDrawerOpen] = useState(false);

  // ----------------- Landing page picker (URL de destino) -----------------
  // 'manual' keeps the historical free-text URL input available (nothing
  // else in the wizard breaks); 'picker' binds landingPageUrl to an LP
  // created in the Landing Pages product via its /p/{slug} public path.
  const [urlMode, setUrlMode] = useState<'picker' | 'manual'>('manual');
  const [linkedPageId, setLinkedPageId] = useState<string | undefined>(undefined);

  const isBrief = editingTarget === BRIEF_TARGET;
  const isTemplate = editingTarget === TEMPLATE_TARGET;
  const editingCompany = !isTemplate && !isBrief
    ? companies.find((c) => c.id === editingTarget) || null
    : null;

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
  const imageMode: ImageMode = creativeData?.imageMode || 'upload';
  const templateLogo = creativeData?.templateLogo || DEFAULT_TEMPLATE_LOGO;

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

  // Detect whether the URL of the target being edited already points at a page
  // created in the Landing Pages product (path /p/{slug}) so the picker opens
  // pre-selected. Re-runs on target switch — a company can point somewhere
  // else than the template — but deliberately NOT on every keystroke, which
  // would yank the user out of "picker" mode mid-selection.
  useEffect(() => {
    const match = editorLandingPageUrl.match(/\/p\/([^/?#]+)/);
    const page = match ? listPages().find((p) => p.slug === match[1]) : undefined;
    setLinkedPageId(page?.id);
    setUrlMode(page ? 'picker' : 'manual');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTarget]);

  const handleSelectLandingPage = (page: LandingPage) => {
    setLinkedPageId(page.id);
    setDestination({ landingPageUrl: `/p/${page.slug}` });
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

  // Preview source — what shows in the canvas.
  // `!isTemplate` sozinho classificaria o alvo Brief como "empresa" (e só não
  // quebra hoje porque `editingCompany` já é `null` nesse caso). Espelha a
  // condição de `editingCompany` para não virar armadilha na próxima edição.
  const previewCompany: FacetItem | null = !isTemplate && !isBrief
    ? editingCompany
    : companies[0] || null;
  const resolved = useMemo(
    () => resolveCreativeForCompany(
      { ...creativeData, headline, bodyText, imageUrl: adImageUrl, imageFileName: adImageFileName, cta, landingPageUrl, overrides } as CreativeData,
      previewCompany ? { id: previewCompany.id, label: previewCompany.label, industry: previewCompany.industry } : null,
    ),
    [creativeData, previewCompany?.id, headline, bodyText, adImageUrl, adImageFileName, overrides],
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
        // An upload is always a BASE image — the canvas the composer paints
        // texts and the target logo onto. At the template it is the shared
        // campaign base; on a company it belongs to that company alone.
        if (isTemplate) {
          updateCreative({
            templateLogo: { ...templateLogo, baseImageUrl: result.url, baseImageSource: 'upload' },
            imageUrl: result.url,
            imageFileName: result.filename || file.name,
          });
        } else if (editingCompany) {
          updateOverride(editingCompany.id, { baseImageUrl: result.url, baseImageSource: 'upload' });
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
  // target companies). Only relevant when the base image origin is 'ai' — the
  // 'upload' origin gets its base from the file picker instead.
  // Returns the URL of the new base image, or null on failure.
  const [baseImageLoading, setBaseImageLoading] = useState(false);

  // `company` null = generate the shared campaign base. With a company, the
  // base belongs to that company alone (it overrode the prompt or the origin).
  const generateBaseImageFor = async (company?: FacetItem | null): Promise<string | null> => {
    setBaseImageLoading(true);
    setAiError(null);
    try {
      const data = withImageDefaults(creativeDataRef.current);
      const cfg = resolveImageConfig(data, company?.id);
      const result = await generateBaseImage({
        client_brand_context: data.brandKit.context,
        prompt_brief: cfg.basePrompt?.trim() || undefined,
        format: cfg.format,
      });
      if (company) {
        updateOverride(company.id, { baseImageUrl: result.url, baseImageSource: 'ai' });
      } else {
        updateCreative({
          templateLogo: { ...data.templateLogo, baseImageUrl: result.url, baseImageSource: 'ai' },
          imageFileName: result.filename,
        });
      }
      return result.url;
    } catch (err: any) {
      setAiError(`Imagem-base${company ? ` (${company.label})` : ''}: ${err.message}`);
      return null;
    } finally {
      setBaseImageLoading(false);
    }
  };

  // Template-level copy generation. The template is company-agnostic, so we ask
  // the model to write for the literal `{{company.name}}` placeholder and then
  // normalise anything that slipped through as a real company name back into
  // the variable — the model does honour the placeholder most of the time, but
  // "most of the time" is not a contract we can ship without a safety net.
  const [templateCopyLoading, setTemplateCopyLoading] = useState(false);

  const generateTemplateCopy = async (): Promise<boolean> => {
    setTemplateCopyLoading(true);
    setAiError(null);
    try {
      const data = creativeDataRef.current!;
      const result = await generateCopy({
        brand_brief: {
          industry: '',
          value_proposition: '',
          visual_style_keywords: [],
          primary_colors: [],
          key_messaging_themes: [],
          target_persona_hint: '',
          generated_at: new Date().toISOString(),
        } as BrandBrief,
        client_voice: data.brandKit.voice,
        client_brand_colors: data.brandKit.colors,
        target_company_name: '{{company.name}}',
        objective: 'brand_awareness',
        cta: data.cta,
      });
      // Guard against the model echoing a concrete name from the client voice
      // instead of the placeholder: any first-listed target company name found
      // verbatim is folded back into the variable.
      const restore = (s: string) =>
        companies.reduce(
          (acc, c) => (c.label ? acc.split(c.label).join('{{company.name}}') : acc),
          s,
        );
      updateCreative({
        headline: restore(result.headline),
        bodyText: restore(result.bodyText),
      });
      return true;
    } catch (err: any) {
      setAiError(`Texto do template: ${err.message}`);
      return false;
    } finally {
      setTemplateCopyLoading(false);
    }
  };

  // Apply the IA composer (texts + target logo) for one company on top of the
  // shared base image. Same pipeline regardless of how the base was produced.
  const composeOverlayFor = async (company: FacetItem): Promise<boolean> => {
    const data = withImageDefaults(creativeDataRef.current);
    const cfg = resolveImageConfig(data, company.id);
    if (!cfg.baseImageUrl) {
      setAiError(`Defina uma imagem-base antes de compor para ${company.label}.`);
      return false;
    }
    setAiImageLoading((s) => ({ ...s, [company.id]: true }));
    setAiError(null);
    try {
      // 1) Mede no tamanho GRAVADO (`cfg.layout.*.sizePx`) — medir no efetivo
      // seria circular, já que o efetivo É o clamp derivado desta medição
      // (mesma regra do teto vivo, ver `effectiveTextSize`). Peso 700 no
      // destaque, 400 no complementar: são os pesos com que o preview e o
      // servidor desenham cada um — sem eles o teto subestima a largura do
      // texto em negrito.
      const measuredAtRecorded = {
        destaqueWidthPx: measureTextWidthPx(cfg.textoDestaque, cfg.layout.destaque.sizePx, cfg.fontFamily, 700),
        complementarWidthPx: measureTextWidthPx(cfg.textoComplementar, cfg.layout.complementar.sizePx, cfg.fontFamily, 400),
      };
      // 2) `effectiveLayout` resolve o teto vivo (tamanho efetivo dos dois
      // textos) e o modo par (geometria do logo da conta segue o
      // anunciante) ANTES de enviar. O payload manda SEMPRE este resultado,
      // nunca `cfg.layout` cru — é esse acordo preview↔PNG que esta task
      // existe para fechar: mandar o valor gravado faria o texto vazar do
      // canvas no PNG final sempre que o teto tivesse encolhido o que a tela
      // mostrou.
      const layout = effectiveLayout(cfg.layout, cfg.format, measuredAtRecorded);
      // 3) Remede no tamanho EFETIVO (pós-teto) para mandar a largura da
      // caixa de fundo: é NESSE tamanho — não no gravado — que o servidor
      // vai de fato desenhar o texto e a caixa atrás dele. Quando o teto não
      // encolheu nada, `layout.*.sizePx` é igual ao gravado e esta segunda
      // medição repete a primeira; quando encolheu, é a única largura
      // correta para a caixa que vai malhar de verdade.
      const destaqueWidthPx = measureTextWidthPx(cfg.textoDestaque, layout.destaque.sizePx, cfg.fontFamily, 700);
      const complementarWidthPx = measureTextWidthPx(cfg.textoComplementar, layout.complementar.sizePx, cfg.fontFamily, 400);
      const result = await composeLogoOverlay({
        base_image_url: cfg.baseImageUrl,
        target_company_name: company.label,
        target_company_domain: company.domain || null,
        advertiser_logo_url: sendableAdvertiserLogoUrl(data.brandKit.logo),
        // Fallback quando o Brand Kit não tem logo enviado: sem isto o
        // checkbox "Meu logo" nunca renderiza nada no PNG, já que
        // `brandKit.logo` nasce `null` (o servidor resolve o logo pelo
        // domínio do jeito que já faz para a empresa-alvo).
        advertiser_domain: deriveWebsiteDomain(data.brandKit.websiteUrl),
        texto_destaque: cfg.textoDestaque,
        texto_complementar: cfg.textoComplementar,
        font_family: cfg.fontFamily,
        format: cfg.format,
        layout,
        destaque_width_px: destaqueWidthPx,
        complementar_width_px: complementarWidthPx,
      });
      updateOverride(company.id, {
        imageUrl: result.url,
        imageFileName: result.filename,
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
    const data = withImageDefaults(creativeDataRef.current);
    const cfg = resolveImageConfig(data, company.id);
    if (!cfg.baseImageUrl) {
      if (cfg.imageMode === 'upload') {
        setAiError(`Envie uma imagem-base antes de gerar para ${company.label}.`);
        return false;
      }
      // Whoever owns the settings owns the base: a company that customised the
      // origin or the prompt gets its own canvas, otherwise we fill the shared
      // campaign one so the other companies benefit from the same call.
      const ownsBase = overriddenImageFields(data, company.id)
        .some((f) => f === 'imageMode' || f === 'basePrompt' || f === 'baseImageUrl');
      const newBase = await generateBaseImageFor(ownsBase ? company : null);
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
      setEditingTarget(BRIEF_TARGET);
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
    logo: null,
    source: null,
    extractedRef: '',
  });
  // DOIS efeitos, de propósito. Antes era um só, com os campos de campanha
  // (produto/público/persona) na lista de deps e reescrevendo o draft INTEIRO —
  // e como esses três gravam ao vivo em `creativeData`, o prop controlado dava
  // a volta pelo `CampaignWizard`, o efeito reagia e ressuscitava a marca
  // *salva* por cima do que o usuário tinha acabado de digitar/extrair.
  // O semeador da marca agora só reage ao `brandKit`; os campos de campanha
  // fazem patch cirúrgico das próprias chaves.
  useEffect(() => {
    setBriefDraft((d) => ({
      ...d,
      voice: brandKit.voice,
      context: brandKit.context,
      websiteUrl: brandKit.websiteUrl,
      brandColors: brandKit.colors,
      fontFamily: brandKit.fontFamily,
      logo: brandKit.logo,
      colorOptions: brandKit.colorOptions,
      // `source`/`extractedRef` NÃO são tocados aqui de propósito: quem os
      // possui são os handlers de extração (`applyFixtureToDraft` grava,
      // `handleResetExtraction` limpa). Zerá-los aqui fazia o chip de
      // procedência sumir exatamente ao salvar — o momento em que ele mais
      // importa —, já que salvar muda o `brandKit` e reacende este efeito.
    }));
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
  ]);

  useEffect(() => {
    setBriefDraft((d) => ({
      ...d,
      productService: clientProductService,
      audienceMarket: clientAudienceMarket,
      persona: clientPersona,
    }));
  }, [clientProductService, clientAudienceMarket, clientPersona]);

  // Extraction UI state
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractWarning, setExtractWarning] = useState<string | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  // Sem o modal fechando, sucesso e falha do save global ficavam
  // indistinguíveis (o botão ia pra "Salvando…" e voltava). Estes dois estados
  // dão o feedback que a dispensa do overlay levou embora.
  const [saveBrandError, setSaveBrandError] = useState<string | null>(null);
  const [brandSaved, setBrandSaved] = useState(false);

  const persistVoice = async () => {
    setSavingBrand(true);
    setSaveBrandError(null);
    setBrandSaved(false);
    updateCreative({
      brandKit: {
        ...(creativeDataRef.current?.brandKit || createDefaultBrandKit()),
        status: 'defined',
        voice: briefDraft.voice,
        context: briefDraft.context,
        websiteUrl: briefDraft.websiteUrl,
        colors: briefDraft.brandColors,
        // As candidatas precisam ir junto: o efeito de sync re-semeia o draft a
        // partir do brandKit depois deste write, e sem elas aqui as amostras
        // desapareceriam no instante em que o usuário salva.
        colorOptions: briefDraft.colorOptions,
        fontFamily: briefDraft.fontFamily,
        logo: briefDraft.logo,
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
      setBrandSaved(true);
    } catch (e: any) {
      // A escrita local (updateCreative acima) permanece — o que falhou foi o
      // envio pro servidor, e é isso que a mensagem precisa dizer.
      setSaveBrandError(`Não foi possível salvar a marca no servidor: ${e?.message || 'erro desconhecido'}`);
    }
    setSavingBrand(false);
  };

  // O "salvo" é confirmação momentânea, não estado permanente da tela.
  useEffect(() => {
    if (!brandSaved) return;
    const t = setTimeout(() => setBrandSaved(false), 4000);
    return () => clearTimeout(t);
  }, [brandSaved]);

  const applyFixtureToDraft = (source: 'brandbook' | 'website', ref: string) => {
    setBriefDraft((d) => ({
      ...d,
      voice: MOCK_BRAND_FIXTURE.voice,
      context: MOCK_BRAND_FIXTURE.context,
      brandColors: MOCK_BRAND_FIXTURE.colors,
      fontFamily: MOCK_BRAND_FIXTURE.fontFamily,
      logo: MOCK_BRAND_FIXTURE.logo,
      colorOptions: MOCK_BRAND_FIXTURE.colorOptions,
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
      logo: null,
    }));
  };

  // Resolved, not raw: the preview must show the CTA the previewed company
  // will actually run, which may be its own override rather than the template's.
  const ctaLabel = CTA_OPTIONS.find((o) => o.value === resolved.cta)?.label || 'Learn More';

  // What the editor edits — template OR a specific company override.
  // No image equivalent here on purpose: the composed ad is rendered by the
  // preview column, and the image card reads its own state from `imageCfg`.
  const editorHeadline = isTemplate ? headline : (editingOverride?.headline ?? '');
  const editorBody = isTemplate ? bodyText : (editingOverride?.bodyText ?? '');

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

  // Image settings for whatever is being edited: the template's values, with
  // this company's overrides on top. Both levels render the same fields from
  // this — a company is no longer a read-only spectator of the image block.
  const imageCfgSource = withImageDefaults(creativeData);
  const imageCfg = resolveImageConfig(imageCfgSource, editingCompany?.id);
  const imageOverrides = overriddenImageFields(imageCfgSource, editingCompany?.id);
  const needsBaseImage = imageCfg.imageMode === 'upload' && !imageCfg.baseImageUrl;
  const noVoice = !clientVoice.trim();

  // Logo do anunciante vem do Brand Kit. Logo da conta usa o que a segmentação
  // já trouxe e cai no logo.dev quando ela não trouxe nada. No Template global
  // não há empresa-alvo, então o preview usa `previewCompany` (companies[0])
  // como stand-in — mesma escolha que o resto do preview já faz.
  const advertiserLogoUrl = imageCfgSource.brandKit.logo;
  const targetLogoUrl = previewCompany
    ? (previewCompany.logoUrl || logoDevUrl(previewCompany.domain) || null)
    : null;
  const composedImageUrl = editingCompany ? (editingOverride?.imageUrl ?? null) : null;

  // Routes a field edit to the right home: a company writes an override, the
  // template writes to its own config (with the font living in the brand kit).
  const setImageField = (patch: Partial<ResolvedImageConfig>) => {
    if (editingCompany) {
      updateOverride(editingCompany.id, patch);
      return;
    }
    const { fontFamily, imageMode: mode, baseImageSource, ...tpl } = patch;
    if (fontFamily !== undefined) {
      updateCreative({ brandKit: { ...(creativeDataRef.current?.brandKit || createDefaultBrandKit()), fontFamily } });
    }
    if (mode !== undefined) updateCreative({ imageMode: mode });
    const rest = { ...tpl, ...(baseImageSource !== undefined && { baseImageSource }) };
    if (Object.keys(rest).length) {
      updateCreative({
        templateLogo: { ...(creativeDataRef.current?.templateLogo || DEFAULT_TEMPLATE_LOGO), ...rest },
      });
    }
  };

  // O layout é sobrescrito como objeto inteiro; `setImageField` já sabe mandar
  // para o override certo, então isto é só um atalho tipado.
  const setLayout = (next: OverlayLayout) => setImageField({ layout: next });

  // Destination follows the same inherit-then-override rule as the image block.
  const editorLandingPageUrl = editingOverride?.landingPageUrl ?? landingPageUrl;
  const editorCta = editingOverride?.cta ?? cta;
  const destinationOverridden = !!editingCompany
    && (editingOverride?.landingPageUrl !== undefined || editingOverride?.cta !== undefined);

  const setDestination = (patch: { landingPageUrl?: string; cta?: string }) => {
    if (editingCompany) updateOverride(editingCompany.id, patch);
    else updateCreative(patch);
  };

  const resetDestination = () => {
    if (!editingCompany) return;
    updateOverride(editingCompany.id, { landingPageUrl: undefined, cta: undefined });
  };

  const resetImageOverrides = () => {
    if (!editingCompany) return;
    updateOverride(editingCompany.id, {
      imageMode: undefined, baseImageUrl: undefined, baseImageSource: undefined,
      basePrompt: undefined, textoDestaque: undefined, textoComplementar: undefined,
      showTargetLogo: undefined, fontFamily: undefined, format: undefined,
      // `layout` também é um campo de IMAGE_OVERRIDE_FIELDS — faltando aqui,
      // um arrasto na empresa nunca voltava ao template mesmo depois deste
      // reset (o botão "Voltar ao template" ficava preso ligado para sempre).
      layout: undefined,
    });
  };

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
          {/* Brief entry — third editing target, sibling of Template global e das empresas */}
          <button
            onClick={() => { setEditingTarget(BRIEF_TARGET); setBriefDrawerOpen(false); }}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 transition-colors ${
              isBrief ? 'bg-[#FFF1ED] border-l-4 border-l-[#FF5F39]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
            }`}
          >
            <div className="w-8 h-8 rounded-md bg-[#FFE3DA] flex items-center justify-center shrink-0">
              <PaintBucket className="w-4 h-4 text-[#FF5F39]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${isBrief ? 'font-bold text-[#212A46]' : 'font-semibold text-slate-700'}`}>
                Brief
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {clientVoice || <span className="italic text-slate-400">Defina a marca</span>}
              </div>
            </div>
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
              {isBrief ? (
                <><PaintBucket className="w-4 h-4 text-[#FF5F39]" /> Editando: Brief</>
              ) : isTemplate ? (
                <><FileText className="w-4 h-4 text-[#FF5F39]" /> Editando: Template global</>
              ) : (
                <><Sparkles className="w-4 h-4 text-emerald-600" /> Editando: {editingCompany?.label}</>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBrief
                ? 'Define a marca e o brief usados por toda a campanha.'
                : isTemplate
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
            {/* One strong action per level: the company header generates both
                halves for that company, the template header fans out to every
                company. Per-block buttons live in each card's own header. */}
            {!isTemplate && editingCompany && (
              <button
                disabled={noVoice || needsBaseImage || aiBriefLoading[editingCompany.id] || aiCopyLoading[editingCompany.id] || aiImageLoading[editingCompany.id]}
                onClick={() => generateAllFor(editingCompany)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#FF5F39] hover:bg-[#E54A26] text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  noVoice ? 'Defina a voz da marca no Brief primeiro'
                  : needsBaseImage ? 'Envie uma imagem-base no Template global primeiro'
                  : `Gerar texto e imagem para ${editingCompany.label}`
                }
              >
                <Wand2 className="w-3.5 h-3.5" />
                Gerar texto + imagem
              </button>
            )}
            {isTemplate && companies.length > 0 && (
              <button
                disabled={bulkProgress !== null || noVoice || needsBaseImage}
                onClick={generateForAllCompanies}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#FF5F39] to-violet-600 hover:from-[#E54A26] hover:to-violet-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  noVoice ? 'Defina a voz da marca no Brief primeiro'
                  : needsBaseImage ? 'Envie uma imagem-base no card Imagem primeiro'
                  : `Gerar texto e imagem para as ${companies.length} empresas`
                }
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar para todas ({companies.length})
              </button>
            )}
          </div>
        </header>

        {aiError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">{aiError}</span>
            <button onClick={() => setAiError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isBrief ? (
          // A casca (`main`) tem altura fixa e `overflow-hidden`; sem este
          // wrapper com `flex-1 overflow-y-auto` o painel (>1000px) era cortado
          // sem barra de rolagem e o "Salvar marca" ficava inalcançável.
          // Mesma convenção do ramo irmão (template/empresa) logo abaixo.
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <BriefPane
              draft={briefDraft}
              setDraft={setBriefDraft}
              status={brandKit.status}
              savingBrand={savingBrand}
              saveError={saveBrandError}
              saveSucceeded={brandSaved}
              onSaveBrand={persistVoice}
              extracting={extracting}
              extractError={extractError}
              extractWarning={extractWarning}
              onExtractWebsite={handleExtract}
              onUploadBrandBook={handleBrandBookUpload}
              onResetExtraction={handleResetExtraction}
              onCampaignFieldChange={(patch) => updateCreative({
                ...(patch.productService !== undefined && { clientProductService: patch.productService }),
                ...(patch.audienceMarket !== undefined && { clientAudienceMarket: patch.audienceMarket }),
                ...(patch.persona !== undefined && { clientPersona: patch.persona }),
              })}
            />
          </div>
        ) : (
        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* ---------- Editor form ---------- */}
          <div className="overflow-y-auto p-5 border-r border-slate-200 bg-slate-50 space-y-3">

            {/* ============ 1 · TEXTO ============ */}
            <SectionCard
              index={1}
              title="Texto"
              action={
                isTemplate ? (
                  <CardAction
                    label="Gerar texto"
                    onClick={generateTemplateCopy}
                    loading={templateCopyLoading}
                    disabled={noVoice}
                    title={noVoice
                      ? 'Defina a voz da marca no Brief primeiro'
                      : 'Escreve a copy do template já com {{company.name}}'}
                  />
                ) : editingCompany ? (
                  <CardAction
                    label="Gerar texto"
                    onClick={() => generateCopyFor(editingCompany)}
                    loading={!!aiCopyLoading[editingCompany.id]}
                    disabled={noVoice}
                    title={noVoice
                      ? 'Defina a voz da marca no Brief primeiro'
                      : `Gerar texto para ${editingCompany.label}`}
                  />
                ) : null
              }
            >
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Corpo do anúncio
              </label>
              <div className="relative">
                <textarea
                  value={editorBody}
                  onChange={(e) => setEditorBody(e.target.value)}
                  maxLength={600}
                  placeholder={isTemplate
                    ? 'Ex: Hi {{company.name}} team, ABM teams in {{company.industry}} are…'
                    : 'Texto específico para esta empresa (vazio = usa o template)'}
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

              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-3 mb-1">
                Headline
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editorHeadline}
                  onChange={(e) => setEditorHeadline(e.target.value)}
                  maxLength={200}
                  placeholder={isTemplate
                    ? 'Ex: Acelere seu ABM com {{company.name}}'
                    : 'Headline específico (vazio = usa o template)'}
                  className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none font-medium"
                />
                <span className="absolute top-2.5 right-2.5 text-[10px] text-slate-400">
                  {editorHeadline.length}/200
                </span>
              </div>

              {/* The brand brief is the raw material the copy above is written
                  from — so its entry point lives here, not competing for
                  attention up in the page header. */}
              {!isTemplate && editingCompany && (
                <button
                  onClick={() => setBriefDrawerOpen(true)}
                  className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-[#E54A26]"
                >
                  <Info className="w-3 h-3" />
                  Brand Brief de {editingCompany.label}
                  {briefForEditing && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                </button>
              )}
            </SectionCard>

            {/* ============ 2 · IMAGEM ============ */}
            {/* Identical block at both levels. On a company the fields start
                pre-filled from the template and the first edit turns into an
                override for that company only. */}
            <SectionCard
              index={2}
              title="Imagem"
              action={
                imageCfg.imageMode === 'ai' ? (
                  <CardAction
                    label={editingCompany ? 'Gerar imagem' : (
                      imageCfg.baseImageUrl && imageCfg.baseImageSource === 'ai'
                        ? 'Regerar imagem-base'
                        : 'Gerar imagem-base'
                    )}
                    onClick={() => (editingCompany ? generateImageFor(editingCompany) : generateBaseImageFor(null))}
                    loading={editingCompany ? !!aiImageLoading[editingCompany.id] : baseImageLoading}
                  />
                ) : editingCompany ? (
                  <CardAction
                    label="Gerar imagem"
                    onClick={() => generateImageFor(editingCompany)}
                    loading={!!aiImageLoading[editingCompany.id]}
                    disabled={needsBaseImage}
                    title={needsBaseImage ? 'Envie uma imagem-base primeiro' : `Compor a imagem para ${editingCompany.label}`}
                  />
                ) : (
                  <CardAction
                    label="Enviar arquivo"
                    icon={<Upload className="w-3 h-3" />}
                    onClick={() => adImageInputRef.current?.click()}
                    loading={isUploadingImage}
                  />
                )
              }
            >
              <input
                type="file"
                ref={adImageInputRef}
                onChange={handleAdImageUpload}
                className="hidden"
                accept="image/png,image/jpeg"
              />

              {/* 1 · Formato — primeiro porque é ele que decide as dimensões
                  que a Origem/Imagem-base logo abaixo respeitam. */}
              <div className="mb-3">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                  Formato
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <FormatButton
                    format="square"
                    active={imageCfg.format === 'square'}
                    onClick={() => setImageField({ format: 'square' })}
                  />
                  <FormatButton
                    format="banner"
                    active={imageCfg.format === 'banner'}
                    onClick={() => setImageField({ format: 'banner' })}
                  />
                </div>
              </div>

              {/* 2 · Origem da imagem-base — disponível nos dois níveis agora. */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Origem da imagem-base
                </label>
                {editingCompany && imageOverrides.length > 0 && (
                  <button
                    onClick={resetImageOverrides}
                    className="text-[10px] font-semibold text-slate-500 hover:text-red-600"
                  >
                    Voltar ao template
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg mb-3">
                <ModeButton
                  icon={<Upload className="w-3.5 h-3.5" />}
                  label="Enviar imagem"
                  sub="Você envia o arquivo"
                  active={imageCfg.imageMode === 'upload'}
                  onClick={() => setImageField({ imageMode: 'upload' })}
                />
                <ModeButton
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  label="Gerar com IA"
                  sub="A IA cria a base"
                  active={imageCfg.imageMode === 'ai'}
                  onClick={() => setImageField({ imageMode: 'ai' })}
                />
              </div>

              {/* 3 · Imagem-base — o prompt (origem IA) vem logo acima do
                  bloco que mostra/recebe a imagem em si. */}
              {imageCfg.imageMode === 'ai' && (
                <div className="mb-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                    Prompt para imagem
                  </label>
                  <textarea
                    value={imageCfg.basePrompt}
                    onChange={(e) => setImageField({ basePrompt: e.target.value })}
                    placeholder="Descreva a imagem que deseja gerar"
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded h-14 resize-none focus:ring-1 focus:ring-[#FF5F39] outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Base image, deliberately compact. The preview column on the
                  right is where the result gets judged — repeating it here
                  (plus a second slot for the composed ad) meant the same
                  picture had three homes on one screen. What is left is only
                  what the preview cannot do: tell you the base exists, where
                  it came from, and let you replace it. */}
              {imageCfg.baseImageUrl ? (
                <div className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <img
                    src={imageCfg.baseImageUrl}
                    alt="Imagem-base"
                    className="w-14 h-9 object-cover rounded border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Imagem-base</div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {imageCfg.baseImageSource === 'ai' ? 'Gerada por IA' : 'Enviada'}
                      {editingCompany && imageOverrides.includes('baseImageUrl') && ` · só de ${editingCompany.label}`}
                    </div>
                  </div>
                  {imageCfg.imageMode === 'upload' && (
                    <button
                      onClick={() => adImageInputRef.current?.click()}
                      className="text-[10px] font-semibold text-[#FF5F39] hover:text-[#E54A26] px-2 py-1 rounded hover:bg-[#FFF1ED] shrink-0"
                    >
                      Trocar
                    </button>
                  )}
                </div>
              ) : imageCfg.imageMode === 'upload' ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isUploadingImage && adImageInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-lg p-5 flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                    isDragging ? 'border-[#FF5F39] bg-[#FFF1ED]'
                      : isUploadingImage ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-300 hover:border-[#FF7A59] hover:bg-[#FFF1ED]/30'
                  }`}
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-5 h-5 text-[#FF5F39] animate-spin" />
                      <span className="text-xs text-[#FF5F39] font-medium">Fazendo upload…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-600 font-medium">Clique ou arraste a imagem-base</span>
                      <span className="text-[10px] text-slate-400">
                        JPG ou PNG • {formatSizeLabel(imageCfg.format)} • Máx 5MB
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 text-center py-1.5">
                  A imagem-base será criada quando você usar{' '}
                  <span className="font-semibold text-[#E54A26]">
                    {editingCompany ? 'Gerar imagem' : 'Gerar imagem-base'}
                  </span>.
                </p>
              )}
              {uploadError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {uploadError}
                </p>
              )}

              {/* 4 · Divisor */}
              <div className="h-px bg-slate-200 my-3" />

              {/* 5 · Textos, 6 · Fonte */}
              <div className="p-3 bg-[#FFF1ED]/50 border border-[#FFE3DA] rounded-lg space-y-2.5">
                <p className="text-[10px] text-[#E54A26] leading-relaxed">
                  {editingCompany
                    ? `Os textos e os logos são aplicados sobre a imagem-base. Arraste no preview para posicionar. Alterar qualquer campo aqui vale só para ${editingCompany.label}.`
                    : 'Os textos e os logos são aplicados sobre a imagem-base. Arraste no preview para posicionar. Compartilhados entre todas as empresas da campanha.'}
                </p>

                <TextField
                  label="Texto destaque (principal)"
                  value={imageCfg.textoDestaque}
                  onChange={(v) => setImageField({ textoDestaque: v })}
                  placeholder="Texto principal na imagem"
                />
                <TextLayerControls
                  id="destaque"
                  label="destaque"
                  layer={imageCfg.layout.destaque}
                  text={imageCfg.textoDestaque}
                  fontFamily={imageCfg.fontFamily}
                  format={imageCfg.format}
                  weight={700}
                  palette={[imageCfgSource.brandKit.colors.primary, imageCfgSource.brandKit.colors.secondary, imageCfgSource.brandKit.colors.accent, '#FFFFFF']}
                  selected={selectedLayer === 'destaque'}
                  onSelect={() => setSelectedLayer('destaque')}
                  onChange={(next) => setLayout({ ...imageCfg.layout, destaque: next })}
                />

                <TextField
                  label="Texto complementar"
                  value={imageCfg.textoComplementar}
                  onChange={(v) => setImageField({ textoComplementar: v })}
                  placeholder="Texto secundário na imagem"
                />
                <TextLayerControls
                  id="complementar"
                  label="complementar"
                  layer={imageCfg.layout.complementar}
                  text={imageCfg.textoComplementar}
                  fontFamily={imageCfg.fontFamily}
                  format={imageCfg.format}
                  weight={400}
                  palette={[imageCfgSource.brandKit.colors.primary, imageCfgSource.brandKit.colors.secondary, imageCfgSource.brandKit.colors.accent, '#FFFFFF']}
                  selected={selectedLayer === 'complementar'}
                  onSelect={() => setSelectedLayer('complementar')}
                  onChange={(next) => setLayout({ ...imageCfg.layout, complementar: next })}
                />

                <FontPicker
                  value={imageCfg.fontFamily}
                  onChange={(v) => setImageField({ fontFamily: v })}
                />
              </div>

              {/* 7 · Divisor, e Logos */}
              <div className="h-px bg-slate-200 my-3" />

              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Logos</label>
                <button
                  type="button"
                  onClick={() => {
                    const pairing = !imageCfg.layout.paired;
                    setLayout({
                      ...imageCfg.layout,
                      paired: pairing,
                      // Ligar os dois é intenção explícita do clique em
                      // "Agrupar como par". "Desagrupar" só solta a geometria
                      // — não mexe em `enabled`, senão religaria em silêncio
                      // um logo que o usuário tivesse desligado enquanto
                      // pareado.
                      ...(pairing && {
                        advertiserLogo: { ...imageCfg.layout.advertiserLogo, enabled: true },
                        targetLogo: { ...imageCfg.layout.targetLogo, enabled: true },
                      }),
                    });
                  }}
                  disabled={!advertiserLogoUrl}
                  title={advertiserLogoUrl ? undefined : 'Defina o logo no Brand Kit primeiro'}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#FF5F39] hover:text-[#E54A26] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Copy className="w-3 h-3" />
                  {imageCfg.layout.paired ? 'Desagrupar' : 'Agrupar como par'}
                </button>
              </div>

              <LogoLayerControls
                id="advertiserLogo"
                label="Meu logo"
                layer={imageCfg.layout.advertiserLogo}
                disabled={!advertiserLogoUrl}
                disabledHint="Defina o logo no Brand Kit primeiro"
                selected={selectedLayer === 'advertiserLogo'}
                onSelect={() => setSelectedLayer('advertiserLogo')}
                onChange={(next) => setLayout({ ...imageCfg.layout, advertiserLogo: next })}
              />
              <LogoLayerControls
                id="targetLogo"
                label="Logo da conta"
                layer={imageCfg.layout.targetLogo}
                geometryLocked={imageCfg.layout.paired}
                geometryLockedHint="Segue o wrap e o tamanho do Meu logo enquanto estiverem agrupados"
                selected={selectedLayer === 'targetLogo'}
                onSelect={() => setSelectedLayer('targetLogo')}
                onChange={(next) => setLayout({ ...imageCfg.layout, targetLogo: next })}
              />
            </SectionCard>

            {/* ============ 3 · DESTINO ============ */}
            {/* Also per company: a target account can point at its own landing
                page and ask for a different CTA than the campaign default. */}
            <SectionCard
              index={3}
              title="Destino"
              action={destinationOverridden ? (
                <button
                  onClick={resetDestination}
                  className="text-[10px] font-semibold text-slate-500 hover:text-red-600 shrink-0"
                >
                  Voltar ao template
                </button>
              ) : undefined}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">URL de destino</label>
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
                    <Plus className="w-3 h-3" /> Criar LP
                  </button>
                </div>
              </div>

              {urlMode === 'picker' ? (
                <LandingPagePicker value={linkedPageId} onSelect={handleSelectLandingPage} />
              ) : (
                <input
                  type="text"
                  value={editorLandingPageUrl}
                  onChange={(e) => { setLinkedPageId(undefined); setDestination({ landingPageUrl: e.target.value }); }}
                  className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg text-blue-600 focus:ring-2 focus:ring-[#FF5F39] outline-none"
                />
              )}

              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-3 mb-1">CTA</label>
              <select
                value={editorCta}
                onChange={(e) => setDestination({ cta: e.target.value })}
                className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none font-medium"
              >
                {CTA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </SectionCard>

            {!isTemplate && editingCompany && editingOverride && (
              <button
                onClick={() => clearOverride(editingCompany.id)}
                className="w-full text-xs text-slate-500 hover:text-red-600 py-2"
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
              <div className="flex items-center">
                {composedImageUrl && (
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mr-2">
                    <button
                      onClick={() => setPreviewMode('editor')}
                      className={`px-2 py-1 text-[10px] font-bold rounded ${previewMode === 'editor' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Editor
                    </button>
                    <button
                      onClick={() => setPreviewMode('composed')}
                      className={`px-2 py-1 text-[10px] font-bold rounded ${previewMode === 'composed' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Composto
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
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

                {previewMode === 'composed' && composedImageUrl ? (
                  <div className={aspectClass(imageCfg.format)}>
                    <img src={composedImageUrl} alt="Anúncio composto" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <OverlayCanvas
                    format={imageCfg.format}
                    baseImageUrl={imageCfg.baseImageUrl}
                    layout={imageCfg.layout}
                    fontFamily={imageCfg.fontFamily}
                    destaque={imageCfg.textoDestaque}
                    complementar={imageCfg.textoComplementar}
                    advertiserLogoUrl={advertiserLogoUrl}
                    targetLogoUrl={targetLogoUrl}
                    selected={selectedLayer}
                    onSelect={setSelectedLayer}
                    onLayoutChange={setLayout}
                  />
                )}

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
        )}
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

// One numbered card per responsibility. The card owns the action that fills
// it — which is the whole point: the button you press is attached to the thing
// it produces, instead of floating in a header shared by everything.
function SectionCard({ index, title, action, children }: {
  index: number;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
        <h3 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
          <span className="w-4 h-4 rounded bg-[#FF5F39] text-white text-[9px] font-black flex items-center justify-center shrink-0">
            {index}
          </span>
          {title}
        </h3>
        {action}
      </header>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function CardAction({ label, onClick, loading, disabled, title, icon }: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md bg-[#FFF1ED] border border-[#FFD0C2] text-[#E54A26] hover:bg-[#FFE3DA] disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (icon ?? <Sparkles className="w-3 h-3" />)}
      {label}
    </button>
  );
}

// The icon is drawn to the real aspect ratio of the option it represents, so
// the shape itself carries the meaning and the numbers just confirm it.
const AD_FORMATS: Record<AdFormat, { label: string; ratio: string; icon: React.ReactNode }> = {
  square: { label: 'Quadrado', ratio: '1:1', icon: <Square className="w-4 h-4" strokeWidth={2.25} /> },
  banner: { label: 'Banner', ratio: '1.91:1', icon: <RectangleHorizontal className="w-4 h-4" strokeWidth={2.25} /> },
};

// O rótulo sai das dimensões reais do canvas — se um dia mudarem, o texto muda junto.
const formatSizeLabel = (f: AdFormat) => `${AD_FORMAT_SIZE[f].w} × ${AD_FORMAT_SIZE[f].h} px`;

function FormatButton({ format, active, onClick }: { format: AdFormat; active: boolean; onClick: () => void }) {
  const meta = AD_FORMATS[format];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
        active
          ? 'bg-[#FF5F39] border-[#FF5F39] text-white shadow-sm'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`}
    >
      <span className="flex items-center gap-1.5">
        {meta.icon}
        <span className="text-xs font-bold">{meta.label}</span>
      </span>
      <span className={`text-[9px] font-semibold tabular-nums ${active ? 'text-white/85' : 'text-slate-400'}`}>
        {formatSizeLabel(format)} · {meta.ratio}
      </span>
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

// Controles de uma camada de texto. Ficam no card e não flutuando sobre a
// imagem: o preview é para arrastar e olhar, o card é onde se ajusta número.
function TextLayerControls({ id, label, layer, text, fontFamily, format, weight, palette, selected, onSelect, onChange }: {
  id: string;
  label: string;
  layer: TextLayer;
  text: string;
  fontFamily: string;
  format: AdFormat;
  weight: number;
  palette: string[];
  selected: boolean;
  onSelect: () => void;
  onChange: (next: TextLayer) => void;
}) {
  // Teto vivo: um destaque longo não pode chegar aos 160px, senão vaza do
  // canvas e o PNG sai cortado. Mede uma vez no tamanho atual e escala. Passa
  // `weight` porque negrito é mais largo que regular no mesmo tamanho — medir
  // sem peso subestima a largura e o teto fica frouxo demais.
  const measuredWidthPx = measureTextWidthPx(text, layer.sizePx, fontFamily, weight);
  const maxSize = maxTextSizePx(measuredWidthPx, layer.sizePx, format);
  // Valor efetivo: DERIVADO a cada render pela mesma função que o preview usa
  // (`effectiveTextSize`), nunca gravado. Uma versão anterior clampava na
  // escrita via `useEffect` — e abrir uma empresa cujo layout herdado do
  // template já estava acima do teto criava um override sozinho, sem ação
  // nenhuma do usuário, porque o próprio efeito reescrevia `layer.sizePx` no
  // primeiro render. Derivar elimina a escrita: o valor gravado nunca muda
  // aqui, só o que a tela mostra. "Pedi 160; a 160 este texto renderiza 80;
  // encurto o texto e recupero os 160" — sem perder o que foi escolhido.
  const effectiveSize = effectiveTextSize(layer, measuredWidthPx, format);

  return (
    <div
      onFocus={onSelect}
      className={`mt-1.5 pl-2 border-l-2 ${selected ? 'border-[#FF5F39]' : 'border-slate-200'}`}
    >
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-size`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
          Tamanho do texto {label}
        </label>
        <input
          id={`${id}-size`}
          type="range"
          min={MIN_TEXT_SIZE_PX}
          max={maxSize}
          step={1}
          value={effectiveSize}
          onChange={(e) => onChange({ ...layer, sizePx: Number(e.target.value) })}
          className="flex-1 accent-[#FF5F39]"
        />
        <span className="text-[10px] font-bold text-slate-600 tabular-nums w-10 text-right">{effectiveSize}px</span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cor</span>
        {palette.filter(Boolean).map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            aria-label={`Cor ${c} para ${label}`}
            onClick={() => onChange({ ...layer, color: c })}
            style={{ backgroundColor: c }}
            className={`w-4 h-4 rounded border ${layer.color === c ? 'border-[#FF5F39] ring-1 ring-[#FF5F39]' : 'border-slate-300'}`}
          />
        ))}
        <input
          type="color"
          aria-label={`Cor personalizada para ${label}`}
          value={layer.color}
          onChange={(e) => onChange({ ...layer, color: e.target.value })}
          className="w-6 h-5 rounded border border-slate-200 bg-white p-0"
        />
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Fundo</span>
        {(['box', 'shadow', 'none'] as const).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={layer.backdrop === b}
            onClick={() => onChange({ ...layer, backdrop: b })}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
              layer.backdrop === b
                ? 'bg-[#FF5F39] border-[#FF5F39] text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {b === 'box' ? 'Caixa' : b === 'shadow' ? 'Sombra' : 'Nenhum'}
          </button>
        ))}
      </div>
    </div>
  );
}

const WRAP_LABEL: Record<LogoWrap, string> = {
  circle: 'Círculo', square: 'Quadrado', rect: 'Retângulo', none: 'Sem fundo',
};

function LogoLayerControls({ id, label, layer, disabled, disabledHint, geometryLocked, geometryLockedHint, selected, onSelect, onChange }: {
  id: string;
  label: string;
  layer: LogoLayer;
  disabled?: boolean;
  disabledHint?: string;
  // No modo par, a geometria (wrap/tamanho) do logo da conta é DERIVADA da do
  // anunciante (ver `effectiveLayout`) — editar aqui não tem efeito nenhum no
  // preview nem no PNG final. `enabled` continua sendo desta camada, então só
  // Wrap e Tamanho ficam bloqueados, não o checkbox inteiro.
  geometryLocked?: boolean;
  geometryLockedHint?: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (next: LogoLayer) => void;
}) {
  return (
    <div className={`mt-2 pl-2 border-l-2 ${selected ? 'border-[#FF5F39]' : 'border-slate-200'}`}>
      <label
        htmlFor={`${id}-enabled`}
        title={disabled ? disabledHint : undefined}
        className={`flex items-center gap-1.5 text-[11px] font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}
      >
        <input
          id={`${id}-enabled`}
          type="checkbox"
          disabled={disabled}
          checked={layer.enabled && !disabled}
          onChange={(e) => { onSelect(); onChange({ ...layer, enabled: e.target.checked }); }}
          className="rounded"
        />
        {label}
      </label>

      {layer.enabled && !disabled && (
        <>
          <div className="flex items-center gap-1.5 mt-1" title={geometryLocked ? geometryLockedHint : undefined}>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Wrap</span>
            {(['circle', 'square', 'rect', 'none'] as const).map((w) => (
              <button
                key={w}
                type="button"
                disabled={geometryLocked}
                aria-pressed={layer.wrap === w}
                aria-label={`${WRAP_LABEL[w]} para ${label}`}
                onClick={() => { onSelect(); onChange({ ...layer, wrap: w }); }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border disabled:opacity-40 disabled:cursor-not-allowed ${
                  layer.wrap === w
                    ? 'bg-[#FF5F39] border-[#FF5F39] text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {WRAP_LABEL[w]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-1" title={geometryLocked ? geometryLockedHint : undefined}>
            <label htmlFor={`${id}-size`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
              Tamanho do {label}
            </label>
            <input
              id={`${id}-size`}
              type="range"
              min={60}
              max={420}
              step={10}
              disabled={geometryLocked}
              value={layer.sizePx}
              onChange={(e) => { onSelect(); onChange({ ...layer, sizePx: Number(e.target.value) }); }}
              className="flex-1 accent-[#FF5F39] disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <span className="text-[10px] font-bold text-slate-600 tabular-nums w-10 text-right">{layer.sizePx}px</span>
          </div>
          {geometryLocked && (
            <p className="text-[9px] text-slate-400 mt-0.5">{geometryLockedHint}</p>
          )}
        </>
      )}
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
