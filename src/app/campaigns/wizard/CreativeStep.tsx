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
  Megaphone,
  X,
  ChevronDown,
  FileText,
  Link2,
  PencilLine,
  Plus,
  Square,
  RectangleHorizontal,
  Copy, AlignLeft, AlignCenter, AlignRight,
  Trash2,
} from 'lucide-react';
import { TargetAccount } from './types';
import type { CreativeData, BrandBrief, CompanyCreativeOverride, ImageMode, AdFormat, ResolvedImageConfig } from './types';
import { resolveCreativeForCompany, resolveImageConfig, overriddenImageFields, createDefaultCreativeData } from './types';
import {
  createDefaultOverlayLayout,
  withLayoutDefaults,
  aspectClass,
  AD_FORMAT_SIZE,
  maxTextSizePx,
  effectiveTextSize,
  effectiveLayout,
  MIN_TEXT_SIZE_PX,
  legibilityNote,
  type OverlayLayout,
  type LogoLayer,
  type LogoWrap,
  type TextLayer,
  type TextAlign,
} from './overlayLayout';
import { OverlayCanvas, type OverlayLayerId, measureTextWidthPx } from './OverlayCanvas';
import { FontPicker } from './FontPicker';
import { CompanyAvatar, resolveCompanyLogoUrl } from './CompanyAvatar';
import { createDefaultBrandKit } from './brandKit';
import { ctaLabel } from '../labels';
import type { TargetingData, FacetItem } from './SegmentationStep';
import { uploadCreativeImageToStorage } from '@/lib/linkedin';
import {
  fetchBrandBrief,
  generateCopy,
  generateBaseImage,
  composeLogoOverlay,
  AiRequestError,
  copyProblems,
  impliesPartnership,
  sanitizeBrandBrief,
  joinPt,
} from '@/lib/ai';
import { LandingPagePicker } from '@/app/landingPages/ads/LandingPagePicker';
import { listPages, savePage } from '@/app/landingPages/store/repo';
import type { LandingPage } from '@/app/landingPages/store/model';

// Valores são os enums da API do LinkedIn; o rótulo vem do helper compartilhado
// para o anunciante ver o CTA em português em todo lugar (select, resumo, preview).
const CTA_OPTIONS = [
  'LEARN_MORE', 'SIGN_UP', 'REGISTER', 'DOWNLOAD', 'GET_QUOTE',
  'APPLY_NOW', 'SUBSCRIBE', 'CONTACT_US', 'REQUEST_DEMO', 'JOIN_NOW',
].map((value) => ({ value, label: ctaLabel(value) }));

// Monta a URL ABSOLUTA de uma landing page publicada. O LinkedIn rejeita
// caminho relativo ("/p/slug"), e o app pode estar servido sob um BASE_URL
// (ex.: "/maestro/") — por isso o caminho entra SEM barra inicial, para ser
// resolvido relativo à base e não à raiz do domínio.
export function buildLandingPageUrl(slug: string): string {
  const rawBase = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  return new URL(`p/${slug}`, `${window.location.origin}${base}`).toString();
}

// Domínio exibido sob a imagem do anúncio, como o LinkedIn mostra: hostname
// sem "www.", em caixa alta. URL inválida (ou com variável ainda não
// resolvida) não mostra nada — melhor vazio que um domínio inventado.
export function displayDomain(url: string | null | undefined): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  try {
    const host = new URL(trimmed).hostname;
    if (!host || /[{}]|%7b|%7d/i.test(host)) return '';
    return host.replace(/^www\./, '').toUpperCase();
  } catch {
    return '';
  }
}

// Iniciais para o avatar quando a marca não tem logo ("Maestro ABM" → "MA").
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

// Erros de IA/upload viram mensagem amigável: o que falhou e o que fazer.
// O erro cru vai para o console, onde quem depura consegue ler.
type FailureKind = 'brief' | 'copy' | 'templateCopy' | 'baseImage' | 'compose' | 'upload';

function friendlyError(kind: FailureKind, err: unknown, label?: string): string {
  console.error(`[CreativeStep] falha em ${kind}${label ? ` (${label})` : ''}:`, err);
  // 422 = o servidor recusou o resultado da IA e já explicou em português o
  // que fazer. Repetir uma frase genérica por cima esconderia o motivo.
  if (err instanceof AiRequestError && err.status === 422) return err.message;
  switch (kind) {
    case 'brief':
      return `Não conseguimos analisar a marca de ${label} agora. Tente de novo em instantes; os textos ainda podem ser gerados sem essa análise.`;
    case 'copy':
      return `Não conseguimos gerar os textos para ${label} agora. Tente de novo em instantes; se persistir, escreva manualmente.`;
    case 'templateCopy':
      return 'Não conseguimos gerar os textos do template agora. Tente de novo em instantes; se persistir, escreva manualmente.';
    case 'baseImage':
      return `Não conseguimos gerar a imagem-base${label ? ` de ${label}` : ''} agora. Tente de novo em instantes ou envie uma imagem própria.`;
    case 'compose':
      return `Não conseguimos montar o anúncio de ${label} agora. Confira se a imagem-base abre corretamente e tente de novo.`;
    case 'upload':
      return 'Não conseguimos enviar a imagem. Verifique sua conexão e tente de novo.';
  }
}

// Aviso de IA na faixa do topo. `key` evita duplicar o mesmo aviso e deixa
// uma empresa limpar o seu sem apagar o das outras.
interface AiNotice {
  key: string;
  message: string;
  retry?: () => void;
}

// Item que falta para gerar: a frase entra na mensagem única; o botão leva ao
// campo ou à etapa onde ele se resolve.
interface MissingInput {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

function partnershipInImageMessage(text: string, companyLabel?: string): string {
  return `O texto da imagem "${text}" sugere parceria ou endosso${companyLabel ? ` com ${companyLabel}` : ' com a empresa-alvo'}. Ajuste o texto e gere de novo.`;
}

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
  /**
   * Leva de volta ao step "Marca". A geração só roda com o tom de voz
   * definido, e ele agora mora num passo anterior — sem isto o usuário fica
   * com os botões desabilitados e nenhum caminho até a causa.
   */
  onEditBrand?: () => void;
  /**
   * Empresa a abrir no editor (id da empresa-alvo; `undefined` = Template
   * global). Aplicado na montagem e sempre que o valor muda — é o que deixa
   * um atalho da Revisão ("Ir para Criativos · <empresa>") cair direto nela.
   */
  initialTarget?: string;
}

type CompanyStatus = 'template' | 'brief_only' | 'fully_personalized';

const TEMPLATE_TARGET = '__template__';

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

export function CreativeStep({ selectedAccounts, targetingData, creativeData, onCreativeChange, campaignId, onEditBrand, initialTarget }: CreativeStepProps) {
  const navigate = useNavigate();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  // Camada selecionada no editor — é ela que os controles do card 2 editam.
  const [selectedLayer, setSelectedLayer] = useState<OverlayLayerId | null>(null);
  // Qual logo não carregou — o preview já cai no avatar de letra, e o card
  // diz em texto por que, para o usuário não achar que é escolha de design.
  const [brokenLogo, setBrokenLogo] = useState<Record<string, boolean>>({});
  // O editor ao vivo é o default; "Composto" existe só para conferir que o
  // resvg bateu com o que estava na tela.
  const [previewMode, setPreviewMode] = useState<'editor' | 'composed'>('editor');
  const companies: FacetItem[] = targetingData?.companies?.included || [];
  const [editingTarget, setEditingTarget] = useState<string>(
    initialTarget && companies.some((c) => c.id === initialTarget) ? initialTarget : TEMPLATE_TARGET,
  );
  const [briefDrawerOpen, setBriefDrawerOpen] = useState(false);
  // Segue `initialTarget` quando ele muda (id que não está na segmentação cai
  // no Template global, em vez de abrir um editor sem empresa).
  useEffect(() => {
    if (initialTarget === undefined) return;
    setEditingTarget(companies.some((c) => c.id === initialTarget) ? initialTarget : TEMPLATE_TARGET);
    setBriefDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTarget]);

  // ----------------- Landing page picker (URL de destino) -----------------
  // 'manual' keeps the historical free-text URL input available (nothing
  // else in the wizard breaks); 'picker' binds landingPageUrl to an LP
  // created in the Landing Pages product via its /p/{slug} public path.
  const [urlMode, setUrlMode] = useState<'picker' | 'manual'>('manual');
  const [linkedPageId, setLinkedPageId] = useState<string | undefined>(undefined);

  // Acordeão dos cards do editor: um aberto por vez, todos fechados por
  // padrão — a coluna de controles não compete com o preview.
  const [openSection, setOpenSection] = useState<'text' | 'image' | 'destination' | null>(null);
  const toggleSection = (section: 'text' | 'image' | 'destination') =>
    setOpenSection((cur) => (cur === section ? null : section));

  const isTemplate = editingTarget === TEMPLATE_TARGET;
  const editingCompany = !isTemplate
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
    // Trocar o alvo de edição também recolhe o acordeão: o contexto mudou e o
    // card aberto era do alvo anterior.
    setOpenSection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTarget]);

  const handleSelectLandingPage = (page: LandingPage) => {
    setLinkedPageId(page.id);
    setDestination({ landingPageUrl: buildLandingPageUrl(page.slug) });
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

  // Preview source — what shows in the canvas. No Template global não há
  // empresa-alvo, então `companies[0]` entra como stand-in.
  const previewCompany: FacetItem | null = !isTemplate
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
        setUploadError(friendlyError('upload', result.error));
      }
    } catch (error: unknown) {
      setUploadError(friendlyError('upload', error));
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
  // Avisos de IA, um por chave (`copy:<id>`, `compose:<id>`…). Lista e não uma
  // string só: no "Gerar para todas" o erro da primeira empresa não pode ser
  // apagado pela segunda. Cada aviso pode trazer "Tentar de novo".
  const [aiErrors, setAiErrors] = useState<AiNotice[]>([]);
  const reportError = (key: string, message: string, retry?: () => void) =>
    setAiErrors((list) => [...list.filter((e) => e.key !== key), { key, message, retry }]);
  const clearError = (key: string) => setAiErrors((list) => list.filter((e) => e.key !== key));
  // O que falta para gerar, numa mensagem só, com um atalho para cada item.
  const [missingInputs, setMissingInputs] = useState<MissingInput[] | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  // Último texto que a IA escreveu por empresa — referência para saber se o
  // usuário mexeu no texto depois. Ref porque só é lido em handlers.
  const aiCopyRef = useRef<Record<string, { headline: string; bodyText: string }>>({});
  // Idem para o template global.
  const aiTemplateCopyRef = useRef<{ headline: string; bodyText: string } | null>(null);
  // Confirmação inline do "Gerar para todas" quando há textos editados.
  const [bulkConfirm, setBulkConfirm] = useState<{ editedIds: string[] } | null>(null);
  // Mesma confirmação para UMA empresa (ou o template): "Gerar texto" e
  // "Gerar texto + imagem" também nunca reescrevem texto do usuário sem
  // perguntar. `withImage` = veio do botão que gera os dois.
  const [copyConfirm, setCopyConfirm] = useState<{ target: string; withImage: boolean } | null>(null);

  // Contexto do anunciante que o passo Marca coletou: sem ele a IA escreve
  // sem saber o que está sendo vendido.
  const advertiserContext = (data: CreativeData) => ({
    client_brand_context: data.brandKit.context || undefined,
    product_service: data.clientProductService || undefined,
    audience_market: data.clientAudienceMarket || undefined,
    persona: data.clientPersona || undefined,
  });

  const generateBriefFor = async (company: FacetItem): Promise<BrandBrief | null> => {
    const key = `brief:${company.id}`;
    setAiBriefLoading((s) => ({ ...s, [company.id]: true }));
    clearError(key);
    const retry = () => { void generateBriefFor(company); };
    try {
      const raw = await fetchBrandBrief({
        company_name: company.label,
        company_url: company.domain ? `https://${company.domain}` : undefined,
        company_domain: company.domain || undefined,
      });
      // Nada cru do modelo vai para o estado: sem campo aproveitável é falha,
      // e o brief anterior (se houver) continua valendo.
      const brief = sanitizeBrandBrief(raw);
      if (!brief) {
        const hadBrief = !!creativeDataRef.current?.overrides?.[company.id]?.brief;
        reportError(key, hadBrief
          ? `Não conseguimos analisar a marca de ${company.label}. O brief anterior foi mantido; se quiser, ajuste setor, proposta de valor e temas no Brand Brief.`
          : `Não conseguimos analisar a marca de ${company.label}. Os textos podem ser gerados sem essa análise; se quiser, preencha setor, proposta de valor e temas no Brand Brief.`, retry);
        return null;
      }
      updateOverride(company.id, { brief });
      return brief;
    } catch (err: unknown) {
      reportError(key, friendlyError('brief', err, company.label), retry);
      return null;
    } finally {
      setAiBriefLoading((s) => { const next = { ...s }; delete next[company.id]; return next; });
    }
  };

  const generateCopyFor = async (company: FacetItem, brief?: BrandBrief): Promise<boolean> => {
    const key = `copy:${company.id}`;
    setAiCopyLoading((s) => ({ ...s, [company.id]: true }));
    clearError(key);
    const retry = () => requestCopy(company, false);
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
        ...advertiserContext(data),
        target_company_name: company.label,
        objective: 'brand_awareness',
        cta: data.cta,
      });
      // A IA nunca apaga texto: resposta vazia, frase de falha, variável sem
      // resolver ou parceria com a empresa-alvo não é gravada. O texto atual
      // fica onde está e o aviso diz por quê, com "Tentar de novo".
      const problems = copyProblems(result ?? {}, { targetName: company.label, allowTemplateVars: false });
      if (problems.length) {
        reportError(key, `A IA não devolveu um texto válido para ${company.label}: ${joinPt(problems)}. Seu texto atual foi mantido.`, retry);
        return false;
      }
      const copy = { headline: result.headline.trim(), bodyText: result.bodyText.trim() };
      updateOverride(company.id, copy);
      // Guarda o que a IA escreveu: enquanto o texto continuar igual a isto,
      // ele não conta como "editado pelo usuário" e pode ser regerado.
      aiCopyRef.current[company.id] = copy;
      return true;
    } catch (err: unknown) {
      reportError(key, friendlyError('copy', err, company.label), retry);
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
  // `retry` é o que "Tentar de novo" refaz — a geração da empresa inteira
  // quando a base foi pedida no meio dela.
  const generateBaseImageFor = async (company?: FacetItem | null, retry?: () => void): Promise<string | null> => {
    const key = `base:${company?.id ?? TEMPLATE_TARGET}`;
    setBaseImageLoading(true);
    clearError(key);
    const again = retry ?? (() => { void generateBaseImageFor(company); });
    try {
      const data = withImageDefaults(creativeDataRef.current);
      const cfg = resolveImageConfig(data, company?.id);
      // "Textos pela IA": os textos vão separados do prompt e o servidor pede
      // à IA exatamente esses, nenhum outro. São opcionais: vazios ficam fora
      // da imagem e nunca bloqueiam a geração.
      const baked = cfg.imageMode === 'ai' && cfg.aiTexts
        ? { destaque: cfg.textoDestaque?.trim() || '', complementar: cfg.textoComplementar?.trim() || '' }
        : null;
      const partnerText = [baked?.destaque, baked?.complementar]
        .find((t) => t && impliesPartnership(t, company?.label));
      if (partnerText) {
        reportError(key, partnershipInImageMessage(partnerText, company?.label));
        return null;
      }
      const result = await generateBaseImage({
        client_brand_context: data.brandKit.context,
        prompt_brief: cfg.basePrompt?.trim() || undefined,
        format: cfg.format,
        ...(baked && (baked.destaque || baked.complementar) && {
          baked_texts: {
            ...(baked.destaque && { destaque: baked.destaque }),
            ...(baked.complementar && { complementar: baked.complementar }),
          },
        }),
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
    } catch (err: unknown) {
      reportError(key, friendlyError('baseImage', err, company?.label), again);
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
    const key = `copy:${TEMPLATE_TARGET}`;
    setTemplateCopyLoading(true);
    clearError(key);
    const retry = () => requestTemplateCopy();
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
        ...advertiserContext(data),
        target_company_name: '{{company.name}}',
        objective: 'brand_awareness',
        cta: data.cta,
      });
      // Guard against the model echoing a concrete name from the client voice
      // instead of the placeholder: any first-listed target company name found
      // verbatim is folded back into the variable.
      const restore = (s: unknown) =>
        companies.reduce(
          (acc, c) => (c.label ? acc.split(c.label).join('{{company.name}}') : acc),
          typeof s === 'string' ? s.trim() : '',
        );
      const copy = { headline: restore(result?.headline), bodyText: restore(result?.bodyText) };
      const problems = copyProblems(copy, { targetName: '{{company.name}}', allowTemplateVars: true });
      if (problems.length) {
        reportError(key, `A IA não devolveu um texto válido para o template: ${joinPt(problems)}. Seu texto atual foi mantido.`, retry);
        return false;
      }
      updateCreative(copy);
      aiTemplateCopyRef.current = copy;
      return true;
    } catch (err: unknown) {
      reportError(key, friendlyError('templateCopy', err), retry);
      return false;
    } finally {
      setTemplateCopyLoading(false);
    }
  };

  // Apply the IA composer (texts + target logo) for one company on top of the
  // shared base image. Same pipeline regardless of how the base was produced.
  const composeOverlayFor = async (company: FacetItem): Promise<boolean> => {
    const key = `compose:${company.id}`;
    const data = withImageDefaults(creativeDataRef.current);
    const cfg = resolveImageConfig(data, company.id);
    clearError(key);
    if (!cfg.baseImageUrl) {
      reportError(key, `Defina uma imagem-base antes de compor para ${company.label}.`);
      return false;
    }
    // "Textos pela IA": a base já veio com os textos pintados pela geração,
    // então a composição manda strings vazias e sobrepõe apenas os logos.
    const composeAiTexts = cfg.imageMode === 'ai' && !!cfg.aiTexts;
    const textoDestaque = composeAiTexts ? '' : cfg.textoDestaque;
    const textoComplementar = composeAiTexts ? '' : cfg.textoComplementar;
    // Mesma regra da copy: texto na imagem que insinue parceria com a conta
    // não vai para a composição (o servidor recusaria do mesmo jeito).
    const partnerText = [textoDestaque, textoComplementar]
      .find((t) => t?.trim() && impliesPartnership(t, company.label));
    if (partnerText) {
      reportError(key, partnershipInImageMessage(partnerText, company.label));
      return false;
    }
    setAiImageLoading((s) => ({ ...s, [company.id]: true }));
    try {
      // 1) Mede no tamanho GRAVADO (`cfg.layout.*.sizePx`) — medir no efetivo
      // seria circular, já que o efetivo É o clamp derivado desta medição
      // (mesma regra do teto vivo, ver `effectiveTextSize`). Peso 700 no
      // destaque, 400 no complementar: são os pesos com que o preview e o
      // servidor desenham cada um — sem eles o teto subestima a largura do
      // texto em negrito.
      const measuredAtRecorded = {
        destaqueWidthPx: measureTextWidthPx(textoDestaque, cfg.layout.destaque.sizePx, cfg.fontFamily, 700),
        complementarWidthPx: measureTextWidthPx(textoComplementar, cfg.layout.complementar.sizePx, cfg.fontFamily, 400),
      };
      // 2) `effectiveLayout` resolve o teto vivo (tamanho efetivo dos dois
      // textos), o modo par (geometria do logo da conta segue o anunciante) e
      // o contraste garantido dos textos ANTES de enviar. O payload manda
      // SEMPRE este resultado, nunca `cfg.layout` cru — é esse acordo
      // preview↔PNG que esta task existe para fechar: mandar o valor gravado
      // faria o texto vazar do canvas no PNG final sempre que o teto tivesse
      // encolhido o que a tela mostrou.
      const layout = effectiveLayout(cfg.layout, cfg.format, measuredAtRecorded);
      // 3) Remede no tamanho EFETIVO (pós-teto) para mandar a largura da
      // caixa de fundo: é NESSE tamanho — não no gravado — que o servidor
      // vai de fato desenhar o texto e a caixa atrás dele. Quando o teto não
      // encolheu nada, `layout.*.sizePx` é igual ao gravado e esta segunda
      // medição repete a primeira; quando encolheu, é a única largura
      // correta para a caixa que vai malhar de verdade.
      const destaqueWidthPx = measureTextWidthPx(textoDestaque, layout.destaque.sizePx, cfg.fontFamily, 700);
      const complementarWidthPx = measureTextWidthPx(textoComplementar, layout.complementar.sizePx, cfg.fontFamily, 400);
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
        texto_destaque: textoDestaque,
        texto_complementar: textoComplementar,
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
    } catch (err: unknown) {
      reportError(key, friendlyError('compose', err, company.label), () => requestImage(company));
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
    const overridden = overriddenImageFields(data, company.id);
    // Whoever owns the settings owns the base: a company that customised the
    // origin or the prompt gets its own canvas, otherwise we fill the shared
    // campaign one so the other companies benefit from the same call. Com
    // "Textos pela IA" os textos fazem parte da base, então mudar os textos
    // (ou o próprio toggle) também pede uma base só desta empresa.
    const aiTextsOn = cfg.imageMode === 'ai' && !!cfg.aiTexts;
    const ownsBase = overridden.some((f) =>
      f === 'imageMode' || f === 'basePrompt' || f === 'baseImageUrl' || f === 'aiTexts'
      || (aiTextsOn && (f === 'textoDestaque' || f === 'textoComplementar')));
    const hasOwnBase = overridden.includes('baseImageUrl');
    // Base herdada do template quando a empresa tem configuração própria de IA
    // seria a imagem errada (prompt ou textos do template): gera a dela.
    const needsOwnBase = cfg.imageMode === 'ai' && ownsBase && !hasOwnBase;
    if (!cfg.baseImageUrl || needsOwnBase) {
      if (cfg.imageMode === 'upload') {
        reportError(`compose:${company.id}`, `Envie uma imagem-base antes de gerar para ${company.label}.`);
        return false;
      }
      const newBase = await generateBaseImageFor(ownsBase ? company : null, () => requestImage(company));
      if (!newBase) return false;
    }
    return composeOverlayFor(company);
  };

  const generateAllFor = async (company: FacetItem) => {
    // Sequential: generateImageFor may auto-create the base image first,
    // and we want any thrown errors to abort cleanly. Brief is generated
    // implicitly by generateCopyFor when missing. Uma falha no texto não
    // impede a imagem: o texto anterior fica, e o aviso fica na tela.
    await generateCopyFor(company);
    await generateImageFor(company);
  };

  // Um texto da empresa é "do usuário" quando não está vazio e difere tanto do
  // template (cru ou já com o nome resolvido) quanto do último texto da IA.
  // Comparar valores (em vez de uma flag de sessão) protege também textos
  // editados antes de o componente remontar — e um texto que a IA escreveu
  // antes do remount conta como editado, o lado seguro do erro.
  const isCopyUserEdited = (company: FacetItem): boolean => {
    const data = creativeDataRef.current;
    const ovr = data?.overrides?.[company.id];
    const ai = aiCopyRef.current[company.id];
    const fromTemplate = (tpl: string) => [tpl, tpl.split('{{company.name}}').join(company.label)];
    const edited = (value: string | undefined, tpl: string, aiValue: string | undefined) => {
      const v = (value || '').trim();
      if (!v) return false;
      if (aiValue !== undefined && v === aiValue.trim()) return false;
      return !fromTemplate(tpl || '').some((t) => t.trim() === v);
    };
    return edited(ovr?.headline, data?.headline || '', ai?.headline)
      || edited(ovr?.bodyText, data?.bodyText || '', ai?.bodyText);
  };

  // No template, "do usuário" = diferente do texto inicial da campanha e do
  // último que a IA escreveu.
  const isTemplateCopyUserEdited = (): boolean => {
    const data = creativeDataRef.current;
    const initial = createDefaultCreativeData();
    const ai = aiTemplateCopyRef.current;
    const edited = (value: string | undefined, initialValue: string, aiValue: string | undefined) => {
      const v = (value || '').trim();
      if (!v) return false;
      if (aiValue !== undefined && v === aiValue.trim()) return false;
      return v !== initialValue.trim();
    };
    return edited(data?.headline, initial.headline, ai?.headline)
      || edited(data?.bodyText, initial.bodyText, ai?.bodyText);
  };

  // O que falta para gerar, para listar numa frase só com atalho para cada
  // item. Os textos da imagem NÃO entram: são opcionais.
  const missingFor = (what: 'copy' | 'image' | 'all', company: FacetItem | null): MissingInput[] => {
    const list: MissingInput[] = [];
    const data = withImageDefaults(creativeDataRef.current);
    if (what !== 'image' && !data.brandKit.voice.trim()) {
      list.push({ message: 'defina o tom de voz na etapa Marca', actionLabel: 'Ir para Marca', onAction: () => onEditBrand?.() });
    }
    const cfg = resolveImageConfig(data, company?.id);
    if (what !== 'copy' && cfg.imageMode === 'upload' && !cfg.baseImageUrl) {
      list.push({ message: 'envie uma imagem-base no card Imagem', actionLabel: 'Abrir Imagem', onAction: () => setOpenSection('image') });
    }
    return list;
  };

  // `true` = pode gerar. Senão, mostra a mensagem do que falta e não gera.
  const checkInputs = (what: 'copy' | 'image' | 'all', company: FacetItem | null): boolean => {
    const missing = missingFor(what, company);
    setMissingInputs(missing.length ? missing : null);
    return missing.length === 0;
  };

  // Entradas dos botões de texto: checam o que falta e perguntam antes de a
  // IA reescrever texto do usuário (o mesmo "Manter os editados" do
  // "Gerar para todas").
  const requestCopy = (company: FacetItem, withImage: boolean) => {
    if (!checkInputs(withImage ? 'all' : 'copy', company)) return;
    if (isCopyUserEdited(company)) {
      setCopyConfirm({ target: company.id, withImage });
      return;
    }
    void (withImage ? generateAllFor(company) : generateCopyFor(company));
  };

  const requestTemplateCopy = () => {
    if (!checkInputs('copy', null)) return;
    if (isTemplateCopyUserEdited()) {
      setCopyConfirm({ target: TEMPLATE_TARGET, withImage: false });
      return;
    }
    void generateTemplateCopy();
  };

  // `replace` false = "Manter os editados": o texto fica intocado; se o
  // pedido incluía a imagem, ela é gerada mesmo assim.
  const resolveCopyConfirm = (replace: boolean) => {
    const pending = copyConfirm;
    setCopyConfirm(null);
    if (!pending) return;
    if (pending.target === TEMPLATE_TARGET) {
      if (replace) void generateTemplateCopy();
      return;
    }
    const company = companies.find((c) => c.id === pending.target);
    if (!company) return;
    if (replace) void (pending.withImage ? generateAllFor(company) : generateCopyFor(company));
    else if (pending.withImage) void generateImageFor(company);
  };

  const requestImage = (company: FacetItem | null) => {
    if (!checkInputs('image', company)) return;
    void (company ? generateImageFor(company) : generateBaseImageFor(null));
  };

  // `keepEdited`: empresas com texto do usuário recebem só a imagem; o texto
  // fica intocado. Sem empresas editadas o parâmetro não faz diferença.
  const runBulkGeneration = async (keepEdited: boolean) => {
    setBulkConfirm(null);
    const skipCopy = new Set(keepEdited ? companies.filter(isCopyUserEdited).map((c) => c.id) : []);
    setBulkProgress({ done: 0, total: companies.length });
    let done = 0;
    // Run sequentially to avoid hammering the Gemini API
    for (const company of companies) {
      if (skipCopy.has(company.id)) await generateImageFor(company);
      else await generateAllFor(company);
      done += 1;
      setBulkProgress({ done, total: companies.length });
    }
    setBulkProgress(null);
  };

  const generateForAllCompanies = async () => {
    if (!checkInputs('all', null)) return;
    // Gerar nunca descarta em silêncio o que o usuário escreveu: havendo
    // texto editado, pergunta antes (inline, sem window.confirm).
    const editedIds = companies.filter(isCopyUserEdited).map((c) => c.id);
    if (editedIds.length > 0) {
      setBulkConfirm({ editedIds });
      return;
    }
    await runBulkGeneration(false);
  };

  // Resolved, not raw: the preview must show the CTA the previewed company
  // will actually run, which may be its own override rather than the template's.
  const previewCtaLabel = ctaLabel(resolved.cta || 'LEARN_MORE');

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
  // Obrigatórios só acusam depois de o usuário passar pelo campo (blur) —
  // nunca "Campo obrigatório" antes de digitar. Tentar avançar sem eles é
  // tratado pelo rodapé do wizard.
  const [touched, setTouched] = useState<Record<'headline' | 'body' | 'url', boolean>>({ headline: false, body: false, url: false });
  const touch = (field: 'headline' | 'body' | 'url') => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  // Toggle "Textos pela IA" só faz sentido na origem 'ai': é a geração que
  // pinta os textos na base. No upload, quem desenha texto é o compositor
  // determinístico — que usa exatamente os controles que o toggle esconde.
  const aiTextsOn = imageCfg.imageMode === 'ai' && !!imageCfg.aiTexts;

  // Logo do anunciante vem do Brand Kit. Logo da conta usa o que a segmentação
  // já trouxe e cai no logo.dev quando ela não trouxe nada. No Template global
  // não há empresa-alvo, então o preview usa `previewCompany` (companies[0])
  // como stand-in — mesma escolha que o resto do preview já faz.
  const advertiserLogoUrl = imageCfgSource.brandKit.logo;
  // O servidor monta URLs de logo sem checar se a chave do logo.dev existe, e
  // sai `?token=undefined` — que o logo.dev responde com 401. Como é string
  // truthy, ela venceria o `||` e afogaria a versão do cliente, que TEM a
  // guarda. Descartar aqui é o que impede o logo quebrado dentro do anúncio.
  // Último degrau: derivar o domínio do NOME da conta, que é o mesmo palpite
  // que a Segmentação já usa para as empresas similares. Sem ele, uma conta
  // que veio da busca do LinkedIn sem `domain` cai direto no avatar de letra
  // mesmo existindo logo publicado — e o anúncio perde o logo à toa.
  // Mesma cadeia de resolução que o avatar da sidebar usa (ver
  // `resolveCompanyLogoUrl`), para o logo dentro do anúncio nunca divergir do
  // que a lista mostra.
  const targetLogoUrl = previewCompany ? resolveCompanyLogoUrl(previewCompany) : null;
  const composedImageUrl = editingCompany ? (editingOverride?.imageUrl ?? null) : null;

  // ----------------- Cabeçalho do anúncio (anunciante) -----------------
  // O Brand Kit ainda não tem nome nem seguidores; lê os campos se existirem
  // (Configurações globais vão trazê-los) e cai para o domínio do site.
  const advertiserKit = imageCfgSource.brandKit as typeof imageCfgSource.brandKit & { name?: string; followers?: number };
  const siteDomain = deriveWebsiteDomain(advertiserKit.websiteUrl || '');
  const siteName = siteDomain ? siteDomain.split('.')[0] : '';
  const advertiserName = advertiserKit.name?.trim()
    || (siteName ? siteName.charAt(0).toUpperCase() + siteName.slice(1) : 'Minha marca');
  // Chaveado pela URL: trocar o logo no Brand Kit dá nova chance ao <img>.
  const advertiserAvatarUrl = advertiserKit.logo && !brokenLogo[`avatar:${advertiserKit.logo}`] ? advertiserKit.logo : null;
  const advertiserFollowers = typeof advertiserKit.followers === 'number'
    ? `${advertiserKit.followers.toLocaleString('pt-BR')} seguidores`
    : '3.550 seguidores';
  // Domínio sob a imagem: o da URL de destino que esta empresa vai de fato usar.
  const previewDomain = displayDomain(resolved.landingPageUrl);

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

  // ----------------- Resumos dos cards colapsados -----------------
  // Uma linha por card com o estado EFETIVO (override ?? template), para o
  // acordeão fechado continuar informando o que cada bloco contém.
  const effHeadline = (isTemplate ? headline : (editingOverride?.headline?.trim() || headline)).trim();
  const effBody = (isTemplate ? bodyText : (editingOverride?.bodyText?.trim() || bodyText)).trim();
  const textOverridden = !!editingCompany
    && !!(editingOverride?.headline?.trim() || editingOverride?.bodyText?.trim());
  const textSummary = !(effHeadline || effBody)
    ? 'Sem texto ainda'
    : editingCompany && !textOverridden
      ? 'Segue o template'
      : (effHeadline || effBody);
  const imageSummary = [
    imageCfg.format === 'square' ? 'Quadrado 1:1' : 'Banner 1.91:1',
    imageCfg.imageMode === 'ai' ? 'Gerada com IA' : 'Upload',
    ...(aiTextsOn ? ['textos pela IA'] : []),
    ...(imageCfg.baseImageUrl ? [] : ['sem imagem-base']),
  ].join(' · ');
  const editorCtaLabel = ctaLabel(editorCta);
  const destinationSummary = editorLandingPageUrl.trim()
    ? `${editorCtaLabel} · ${editorLandingPageUrl}`
    : 'Defina a URL de destino';
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
      aiTexts: undefined, showTargetLogo: undefined, fontFamily: undefined, format: undefined,
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
                <CompanyAvatar company={company} />
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
            {/* Nota de ajuda: tamanho de texto de apoio, nunca maior que os rótulos. */}
            <p className="text-[10px] text-slate-500 mt-0.5">
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
            {/* One strong action per level: the company header generates both
                halves for that company, the template header fans out to every
                company. Per-block buttons live in each card's own header. */}
            {!isTemplate && editingCompany && (
              <button
                disabled={!!(aiBriefLoading[editingCompany.id] || aiCopyLoading[editingCompany.id] || aiImageLoading[editingCompany.id])}
                onClick={() => requestCopy(editingCompany, true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#FF5F39] hover:bg-[#E54A26] text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Gerar texto e imagem para ${editingCompany.label}`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Gerar texto + imagem
              </button>
            )}
            {isTemplate && companies.length > 0 && (
              <button
                disabled={bulkProgress !== null || bulkConfirm !== null}
                onClick={generateForAllCompanies}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#FF5F39] to-violet-600 hover:from-[#E54A26] hover:to-violet-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Gerar texto e imagem para as ${companies.length} empresas`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar para todas ({companies.length})
              </button>
            )}
          </div>
        </header>

        {/* O que falta para gerar: uma mensagem só, com um atalho para cada
            item em vez de botões desabilitados sem explicação. */}
        {missingInputs && (
          <div role="alert" className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-900 flex flex-wrap items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span className="flex-1 min-w-[200px]">
              Para gerar, {joinPt(missingInputs.map((m) => m.message))}.
            </span>
            {missingInputs.map((m) => (
              <button
                key={m.actionLabel}
                onClick={() => { setMissingInputs(null); m.onAction(); }}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 font-semibold text-amber-900 hover:bg-amber-100"
              >
                {m.actionLabel}
              </button>
            ))}
            <button onClick={() => setMissingInputs(null)} aria-label="Fechar aviso" className="text-amber-600 hover:text-amber-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {aiErrors.map((notice) => (
          <div key={notice.key} role="alert" className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">{notice.message}</span>
            {notice.retry && (
              <button
                onClick={() => { clearError(notice.key); notice.retry?.(); }}
                className="shrink-0 px-2.5 py-1 rounded-md bg-white border border-red-200 font-semibold text-red-700 hover:bg-red-100"
              >
                Tentar de novo
              </button>
            )}
            <button onClick={() => clearError(notice.key)} aria-label="Fechar aviso" className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Mesma pergunta do "Gerar para todas", para uma empresa ou para o
            template: a IA nunca reescreve texto do usuário sem perguntar. */}
        {copyConfirm && (
          <div role="alert" className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-900 flex flex-wrap items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span className="flex-1 min-w-[200px]">
              {copyConfirm.target === TEMPLATE_TARGET
                ? 'O template tem textos escritos por você.'
                : `${companies.find((c) => c.id === copyConfirm.target)?.label ?? 'Esta empresa'} tem textos editados por você.`}
              {' '}Substituir pelos textos da IA?
            </span>
            <button
              onClick={() => resolveCopyConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-[#FF5F39] hover:bg-[#E54A26] font-semibold text-white"
            >
              Manter os editados
            </button>
            <button
              onClick={() => resolveCopyConfirm(true)}
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 font-semibold text-amber-900 hover:bg-amber-100"
            >
              Substituir pelos textos da IA
            </button>
            <button onClick={() => setCopyConfirm(null)} aria-label="Cancelar geração" className="text-amber-600 hover:text-amber-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {bulkConfirm && (
          <div role="alert" className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-900 flex flex-wrap items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span className="flex-1 min-w-[200px]">
              {bulkConfirm.editedIds.length === 1
                ? `${companies.find((c) => c.id === bulkConfirm.editedIds[0])?.label ?? '1 empresa'} tem textos editados por você.`
                : `${bulkConfirm.editedIds.length} empresas têm textos editados por você.`}
              {' '}O que fazer com eles ao gerar para todas?
            </span>
            <button
              onClick={() => runBulkGeneration(true)}
              className="px-3 py-1.5 rounded-lg bg-[#FF5F39] hover:bg-[#E54A26] font-semibold text-white"
            >
              Manter os editados
            </button>
            <button
              onClick={() => runBulkGeneration(false)}
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 font-semibold text-amber-900 hover:bg-amber-100"
            >
              Substituir também os textos editados
            </button>
            <button onClick={() => setBulkConfirm(null)} aria-label="Cancelar geração" className="text-amber-600 hover:text-amber-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* ---------- Editor form ---------- */}
          <div className="overflow-y-auto p-5 border-r border-slate-200 bg-slate-50 space-y-3">

            {/* ============ 1 · TEXTO ============ */}
            <SectionCard
              index={1}
              title="Texto"
              summary={textSummary}
              open={openSection === 'text'}
              onToggle={() => toggleSection('text')}
              action={
                isTemplate ? (
                  <CardAction
                    label="Gerar texto"
                    onClick={requestTemplateCopy}
                    loading={templateCopyLoading}
                    title={noVoice
                      ? 'Defina o tom de voz no passo Marca primeiro'
                      : 'Escreve a copy do template já com {{company.name}}'}
                  />
                ) : editingCompany ? (
                  <CardAction
                    label="Gerar texto"
                    onClick={() => requestCopy(editingCompany, false)}
                    loading={!!aiCopyLoading[editingCompany.id]}
                    title={noVoice
                      ? 'Defina o tom de voz no passo Marca primeiro'
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
                  onBlur={() => touch('body')}
                  aria-invalid={isTemplate && touched.body && !editorBody.trim()}
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
              {isTemplate && touched.body && !editorBody.trim() && (
                <p className="mt-1 text-[10px] text-red-600">Escreva o texto do anúncio.</p>
              )}
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
                  onBlur={() => touch('headline')}
                  aria-invalid={isTemplate && touched.headline && !editorHeadline.trim()}
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
              {isTemplate && touched.headline && !editorHeadline.trim() && (
                <p className="mt-1 text-[10px] text-red-600">Escreva o título do anúncio.</p>
              )}

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
              summary={imageSummary}
              open={openSection === 'image'}
              onToggle={() => toggleSection('image')}
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
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
                <p className="text-[10px] text-slate-400 text-center py-1.5">
                  A imagem-base será criada quando você usar{' '}
                  <span className="font-semibold text-[#E54A26]">
                    {editingCompany
                      ? 'Gerar imagem'
                      : imageCfg.aiTexts
                        ? 'Gerar criativo com IA'
                        : 'Gerar imagem com IA'}
                  </span>.
                </p>
              )}
              {uploadError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> {uploadError}
                </p>
              )}

              {/* Toggle "Textos pela IA" — só na origem 'ai'. Ligado, a IA
                  absorve os textos digitados e os aplica direto na composição;
                  os controles manuais de estilo deixam de existir. */}
              {imageCfg.imageMode === 'ai' && (
                <div className="mt-3 flex items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Textos pela IA</div>
                    <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                      {imageCfg.aiTexts
                        ? 'Ligado: a IA escreve na imagem exatamente os textos que você digitou, e nenhum outro. Posição e estilo ficam com ela. Campo vazio fica fora da imagem.'
                        : 'Desligado: você posiciona e estiliza os textos sobre a imagem. Ligue para a IA escrevê-los na própria imagem.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!imageCfg.aiTexts}
                    aria-label="Textos pela IA"
                    onClick={() => setImageField({ aiTexts: !imageCfg.aiTexts })}
                    className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${
                      imageCfg.aiTexts ? 'bg-[#FF5F39]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        imageCfg.aiTexts ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* A ação de gerar mora AQUI, no fluxo do conteúdo, e não no
                  header do card: no upload a dropzone acima já É a ação, e o
                  botão de gerar pertence ao passo que ele conclui. Só existe
                  quando há o que gerar — template em modo IA, ou a composição
                  de uma empresa. */}
              {(imageCfg.imageMode === 'ai' || editingCompany) && (() => {
                const generating = editingCompany ? !!aiImageLoading[editingCompany.id] : baseImageLoading;
                // Sem imagem-base o botão continua clicável: o clique explica o
                // que falta e leva até lá, em vez de um disabled mudo.
                const blocked = !!editingCompany && needsBaseImage;
                return (
                  <button
                    type="button"
                    onClick={() => requestImage(editingCompany)}
                    disabled={generating}
                    title={blocked
                      ? 'Envie uma imagem-base primeiro'
                      : editingCompany
                        ? `Compor a imagem para ${editingCompany.label}`
                        : imageCfg.aiTexts
                          ? 'A IA cria a imagem já com os seus textos aplicados'
                          : 'A IA cria a imagem-base a partir do prompt'}
                    className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                      generating
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : blocked
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-[#FF5F39] hover:bg-[#E54A26] text-white shadow-sm'
                    }`}
                  >
                    {generating
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5" />}
                    {editingCompany
                      ? 'Gerar imagem'
                      : imageCfg.aiTexts
                        ? 'Gerar criativo com IA'
                        : 'Gerar imagem com IA'}
                  </button>
                );
              })()}

              {/* 4 · Divisor */}
              <div className="h-px bg-slate-200 my-3" />

              {/* 5 · Textos, 6 · Fonte */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                {/* Uma explicação só, com UM escopo: ou vale só para a empresa, ou
                    é compartilhado entre todas — nunca as duas frases juntas. */}
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {aiTextsOn
                    ? 'A IA escreve estes textos na imagem-base, com estilo e posição dela. Os dois são opcionais. '
                    : 'Os textos e os logos são aplicados sobre a imagem-base. Arraste no preview para posicionar. Os dois textos são opcionais. '}
                  {editingCompany
                    ? (aiTextsOn
                      ? `Vale só para ${editingCompany.label}, que ganha uma imagem-base própria com estes textos.`
                      : `Vale só para ${editingCompany.label}.`)
                    : 'Compartilhado entre todas as empresas da campanha.'}
                </p>

                {/* Cada texto é um grupo fechado: o input fica sempre à mão,
                    mas os controles de estilo só abrem quando a camada está
                    ATIVA — foco no input ou clique no próprio texto dentro do
                    preview. Sem isso, os dois conjuntos de sliders empilhados
                    liam como um bloco só e afogavam o card. */}
                <div className={`rounded-lg border bg-white p-2.5 transition-colors ${
                  !aiTextsOn && selectedLayer === 'destaque' ? 'border-slate-400 shadow-sm' : 'border-slate-200'
                }`}>
                  <TextField
                    label="Texto destaque (principal)"
                    value={imageCfg.textoDestaque}
                    onChange={(v) => setImageField({ textoDestaque: v })}
                    placeholder="Texto principal na imagem"
                    onFocus={() => setSelectedLayer('destaque')}
                    onRemove={() => { setImageField({ textoDestaque: '' }); setSelectedLayer(null); }}
                  />
                  {!aiTextsOn && selectedLayer === 'destaque' && (
                    <TextLayerControls
                      id="destaque"
                      label="destaque"
                      layer={imageCfg.layout.destaque}
                      text={imageCfg.textoDestaque}
                      fontFamily={imageCfg.fontFamily}
                      format={imageCfg.format}
                      weight={700}
                      palette={[imageCfgSource.brandKit.colors.primary, imageCfgSource.brandKit.colors.secondary, imageCfgSource.brandKit.colors.accent, '#FFFFFF']}
                      onSelect={() => setSelectedLayer('destaque')}
                      onChange={(next) => setLayout({ ...imageCfg.layout, destaque: next })}
                    />
                  )}
                </div>

                <div className={`rounded-lg border bg-white p-2.5 transition-colors ${
                  !aiTextsOn && selectedLayer === 'complementar' ? 'border-slate-400 shadow-sm' : 'border-slate-200'
                }`}>
                  <TextField
                    label="Texto complementar"
                    value={imageCfg.textoComplementar}
                    onChange={(v) => setImageField({ textoComplementar: v })}
                    placeholder="Texto secundário na imagem"
                    onFocus={() => setSelectedLayer('complementar')}
                    onRemove={() => { setImageField({ textoComplementar: '' }); setSelectedLayer(null); }}
                  />
                  {!aiTextsOn && selectedLayer === 'complementar' && (
                    <TextLayerControls
                      id="complementar"
                      label="complementar"
                      layer={imageCfg.layout.complementar}
                      text={imageCfg.textoComplementar}
                      fontFamily={imageCfg.fontFamily}
                      format={imageCfg.format}
                      weight={400}
                      palette={[imageCfgSource.brandKit.colors.primary, imageCfgSource.brandKit.colors.secondary, imageCfgSource.brandKit.colors.accent, '#FFFFFF']}
                      onSelect={() => setSelectedLayer('complementar')}
                      onChange={(next) => setLayout({ ...imageCfg.layout, complementar: next })}
                    />
                  )}
                </div>

                {/* Alinhamento e espaçamento são do BLOCO (os dois textos), não
                    de cada linha — por isso vivem num grupo próprio, e só
                    enquanto se edita texto. */}
                {!aiTextsOn && (selectedLayer === 'destaque' || selectedLayer === 'complementar') && (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      Bloco de texto (os dois juntos)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Alinhamento</span>
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          aria-pressed={imageCfg.layout.destaque.align === a}
                          aria-label={ALIGN_LABEL[a]}
                          onClick={() => setLayout({
                            ...imageCfg.layout,
                            destaque: { ...imageCfg.layout.destaque, align: a },
                            complementar: { ...imageCfg.layout.complementar, align: a },
                          })}
                          className={`px-2 py-1 rounded border ${
                            imageCfg.layout.destaque.align === a
                              ? 'bg-slate-700 border-slate-700 text-white'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {a === 'left' ? <AlignLeft className="w-3 h-3" /> : a === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="text-gap" className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                          Espaçamento entre os textos
                        </label>
                        <span className="text-[10px] font-bold text-slate-600 tabular-nums">{imageCfg.layout.textGapPx}px</span>
                      </div>
                      <input
                        id="text-gap"
                        type="range"
                        min={0}
                        max={200}
                        step={2}
                        value={imageCfg.layout.textGapPx}
                        onChange={(e) => setLayout({ ...imageCfg.layout, textGapPx: Number(e.target.value) })}
                        className="w-full accent-slate-500 mt-0.5"
                      />
                    </div>
                  </div>
                )}

                {!aiTextsOn && (
                  <FontPicker
                    value={imageCfg.fontFamily}
                    onChange={(v) => setImageField({ fontFamily: v })}
                  />
                )}
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

              {(brokenLogo.advertiserLogo || brokenLogo.targetLogo) && (
                <p className="flex items-start gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>
                    {brokenLogo.advertiserLogo && brokenLogo.targetLogo
                      ? 'Nenhum dos dois logos carregou'
                      : brokenLogo.advertiserLogo ? 'O seu logo não carregou' : 'O logo da conta não carregou'}
                    {' '}— o preview está mostrando as iniciais. O anúncio gerado sai sem esse logo.
                  </span>
                </p>
              )}

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
              summary={destinationSummary}
              open={openSection === 'destination'}
              onToggle={() => toggleSection('destination')}
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
                  onBlur={() => touch('url')}
                  aria-invalid={touched.url && !editorLandingPageUrl.trim()}
                  className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg text-blue-600 focus:ring-2 focus:ring-[#FF5F39] outline-none"
                />
              )}
              {urlMode === 'manual' && touched.url && !editorLandingPageUrl.trim() && (
                <p className="mt-1 text-[10px] text-red-600">Informe a URL de destino.</p>
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
                    {advertiserAvatarUrl ? (
                      <img
                        src={advertiserAvatarUrl}
                        alt={`Logo de ${advertiserName}`}
                        onError={() => setBrokenLogo((b) => ({ ...b, [`avatar:${advertiserAvatarUrl}`]: true }))}
                        className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg" aria-hidden>
                        {initialsOf(advertiserName)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{advertiserName}</h3>
                        <span className="text-slate-500 text-xs">• 3º+</span>
                      </div>
                      <p className="text-xs text-slate-500">{advertiserFollowers}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <span>Promovido</span>
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
                      <span className="text-slate-500 cursor-pointer ml-1 hover:underline">…ver mais</span>
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
                    destaque={aiTextsOn ? '' : imageCfg.textoDestaque}
                    complementar={aiTextsOn ? '' : imageCfg.textoComplementar}
                    advertiserLogoUrl={advertiserLogoUrl}
                    targetLogoUrl={targetLogoUrl}
                    advertiserLabel={imageCfgSource.brandKit.context || 'Minha marca'}
                    targetLabel={previewCompany?.label}
                    onLogoError={(which) => setBrokenLogo((b) => ({ ...b, [which]: true }))}
                    selected={selectedLayer}
                    onSelect={setSelectedLayer}
                    onLayoutChange={setLayout}
                  />
                )}

                <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-t border-slate-100">
                  <div className="min-w-0 flex-1">
                    {previewDomain && (
                      <p className="text-xs uppercase font-semibold text-slate-500 mb-0.5">{previewDomain}</p>
                    )}
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {resolved.headline || 'Headline aparecerá aqui'}
                    </p>
                  </div>
                  <button className="ml-3 shrink-0 px-4 py-1.5 border border-slate-400 rounded-full text-sm font-semibold text-slate-700">
                    {previewCtaLabel}
                  </button>
                </div>

                <div className="px-2 py-1 flex items-center justify-between border-t border-slate-100">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><ThumbsUp className="w-5 h-5" /> Gostei</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><MessageCircle className="w-5 h-5" /> Comentar</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><Share2 className="w-5 h-5" /> Compartilhar</button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-slate-50 rounded-lg text-slate-600 text-sm font-medium"><Send className="w-5 h-5" /> Enviar</button>
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

              {/* O que a análise não achou fica vazio para preencher à mão,
                  em vez de um palpite inventado (ex.: cores do setor). */}
              {!!draft.missing_fields?.length && (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  A análise não encontrou {joinPt(draft.missing_fields)}. Preencha abaixo, se quiser.
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
function SectionCard({ index, title, summary, open, onToggle, action, children }: {
  index: number;
  title: string;
  /** Uma linha com o estado efetivo, mostrada só colapsado — o card fechado não pode ser caixa-preta. */
  summary?: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* A ação é IRMÃ do toggle, não filha: além de <button> dentro de
          <button> ser HTML inválido, é o que garante que "Gerar texto" não
          abre/fecha o card por acidente. */}
      <header className={`flex items-center gap-2 pr-3.5 bg-slate-50 ${open ? 'border-b border-slate-200' : ''}`}>
        <button
          type="button"
          aria-label={title}
          aria-expanded={open}
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 px-3.5 py-3 text-left min-w-0 group"
        >
          <span className="w-6 h-6 rounded-md bg-[#FF5F39] text-white text-xs font-black flex items-center justify-center shrink-0">
            {index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-slate-800 uppercase tracking-wide leading-tight">
              {title}
            </span>
            {!open && summary && (
              <span className="block text-xs text-slate-500 truncate mt-0.5 normal-case font-normal">
                {summary}
              </span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {action}
      </header>
      {open && <div className="p-3.5">{children}</div>}
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

// Com `onRemove`, o campo ganha "Remover da imagem": texto vazio = camada fora
// da composição (é o mesmo que o modo "Textos pela IA" manda ao servidor).
function TextField({ label, value, onChange, placeholder, onFocus, onRemove }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; onFocus?: () => void; onRemove?: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
        {onRemove && value.trim() && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 hover:text-red-600"
          >
            <Trash2 className="w-3 h-3" />
            Remover da imagem
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-[#FF5F39] outline-none"
      />
    </div>
  );
}

// Controles de uma camada de texto. Ficam no card e não flutuando sobre a
// imagem: o preview é para arrastar e olhar, o card é onde se ajusta número.
function TextLayerControls({ id, label, layer, text, fontFamily, format, weight, palette, onSelect, onChange }: {
  id: string;
  label: string;
  layer: TextLayer;
  text: string;
  fontFamily: string;
  format: AdFormat;
  weight: number;
  palette: string[];
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
    // Sem recuo próprio: a moldura do grupo (input + controles) já delimita a
    // camada. Sliders em duas linhas — rótulo em cima, trilho na largura
    // inteira — porque era a linha única (rótulo + trilho + valor) que vazava
    // da moldura na horizontal.
    <div onFocus={onSelect} className="mt-2 space-y-2">
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${id}-size`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
            Tamanho do texto {label}
          </label>
          <span className="text-[10px] font-bold text-slate-600 tabular-nums">{effectiveSize}px</span>
        </div>
        <input
          id={`${id}-size`}
          type="range"
          min={MIN_TEXT_SIZE_PX}
          max={maxSize}
          step={1}
          value={effectiveSize}
          onChange={(e) => onChange({ ...layer, sizePx: Number(e.target.value) })}
          className="w-full accent-slate-500 mt-0.5"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cor</span>
        {palette.filter(Boolean).map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            aria-label={`Cor ${c} para ${label}`}
            onClick={() => onChange({ ...layer, color: c })}
            style={{ backgroundColor: c }}
            className={`w-4 h-4 rounded border ${layer.color === c ? 'border-slate-700 ring-1 ring-slate-700' : 'border-slate-300'}`}
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

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Fundo</span>
        {(['box', 'shadow', 'none'] as const).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={layer.backdrop.mode === b}
            onClick={() => onChange({ ...layer, backdrop: { ...layer.backdrop, mode: b } })}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
              layer.backdrop.mode === b
                ? 'bg-slate-700 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {b === 'box' ? 'Caixa' : b === 'shadow' ? 'Sombra' : 'Nenhum'}
          </button>
        ))}
      </div>
      {/* O preview e o PNG usam o fundo efetivo (`legibleTextLayer`): quando
          ele difere do escolhido, o card diz por quê. */}
      {legibilityNote(layer) && (
        <p className="text-[9px] text-slate-500 leading-snug">{legibilityNote(layer)}</p>
      )}

      {/* A caixa é o que torna o texto legível sobre uma foto qualquer, então
          ela ganha controles próprios em vez de ficar presa no preto 55%. */}
      {layer.backdrop.mode === 'box' && (
        <div className="pl-2 border-l border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cor da caixa</span>
            {palette.filter(Boolean).map((c, i) => (
              <button
                key={`bg-${c}-${i}`}
                type="button"
                aria-label={`Cor da caixa ${c} para ${label}`}
                onClick={() => onChange({ ...layer, backdrop: { ...layer.backdrop, color: c } })}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded border ${layer.backdrop.color === c ? 'border-slate-700 ring-1 ring-slate-700' : 'border-slate-300'}`}
              />
            ))}
            <input
              type="color"
              aria-label={`Cor personalizada da caixa para ${label}`}
              value={layer.backdrop.color}
              onChange={(e) => onChange({ ...layer, backdrop: { ...layer.backdrop, color: e.target.value } })}
              className="w-6 h-5 rounded border border-slate-200 bg-white p-0"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`${id}-bg-opacity`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                Opacidade da caixa {label}
              </label>
              <span className="text-[10px] font-bold text-slate-600 tabular-nums">{layer.backdrop.opacity}%</span>
            </div>
            <input
              id={`${id}-bg-opacity`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={layer.backdrop.opacity}
              onChange={(e) => onChange({ ...layer, backdrop: { ...layer.backdrop, opacity: Number(e.target.value) } })}
              className="w-full accent-slate-500 mt-0.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`${id}-bg-radius`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                Cantos da caixa {label}
              </label>
              <span className="text-[10px] font-bold text-slate-600 tabular-nums">{layer.backdrop.radius}px</span>
            </div>
            <input
              id={`${id}-bg-radius`}
              type="range"
              min={0}
              max={60}
              step={1}
              value={layer.backdrop.radius}
              onChange={(e) => onChange({ ...layer, backdrop: { ...layer.backdrop, radius: Number(e.target.value) } })}
              className="w-full accent-slate-500 mt-0.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`${id}-bg-border`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                Contorno da caixa {label}
              </label>
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 tabular-nums">{layer.backdrop.borderWidth}px</span>
                <input
                  type="color"
                  aria-label={`Cor do contorno da caixa para ${label}`}
                  value={layer.backdrop.borderColor}
                  onChange={(e) => onChange({ ...layer, backdrop: { ...layer.backdrop, borderColor: e.target.value } })}
                  className="w-6 h-5 rounded border border-slate-200 bg-white p-0 shrink-0"
                />
              </span>
            </div>
            <input
              id={`${id}-bg-border`}
              type="range"
              min={0}
              max={12}
              step={1}
              value={layer.backdrop.borderWidth}
              onChange={(e) => onChange({ ...layer, backdrop: { ...layer.backdrop, borderWidth: Number(e.target.value) } })}
              className="w-full accent-slate-500 mt-0.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const ALIGN_LABEL: Record<TextAlign, string> = {
  left: 'Alinhar à esquerda', center: 'Centralizar', right: 'Alinhar à direita',
};

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
    <div className={`mt-2 pl-2 border-l-2 ${selected ? 'border-slate-500' : 'border-slate-200'}`}>
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
