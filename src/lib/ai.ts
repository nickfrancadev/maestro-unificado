// Gemini-powered creative AI helpers. All requests proxy through the
// Supabase Edge Function so GEMINI_API_KEY stays server-side.

import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { OverlayLayout } from '@/app/campaigns/wizard/overlayLayout';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0`;
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});

// Erro de uma rota /ai/*. `status` 422 = o servidor recusou o que a IA
// devolveu e a mensagem já vem em português, pronta para a tela; os outros
// status são falha técnica e a tela usa a própria frase amigável.
export class AiRequestError extends Error {
  status: number;
  details: string[];
  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'AiRequestError';
    this.status = status;
    this.details = details;
  }
}

async function throwAiError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new AiRequestError(
    data.error || `HTTP ${res.status}`,
    res.status,
    Array.isArray(data.reasons) ? data.reasons : Array.isArray(data.missing) ? data.missing : [],
  );
}

// ---------- Validação do que a IA devolve (espelho do servidor) ----------
// O servidor já valida (`supabase/functions/make-server-a4d5bbe0/aiGuards.ts`);
// a tela valida de novo antes de gravar, porque é ela quem sobrescreve o
// texto do usuário. `src/lib/ai.test.ts` compara os dois espelhos.

export const LINKEDIN_HEADLINE_MAX = 200;
export const LINKEDIN_INTRO_MAX = 600;

const MODEL_CHATTER: RegExp[] = [
  /n[ãa]o encontrad[oa]\s*[-–:]\s*input manual/i,
  /\binput manual\b/i,
  /se preferir,?\s+(eu\s+)?posso/i,
  /\bposso (te )?(ajudar|sugerir|gerar|criar|ajustar)\b/i,
  /^\s*(claro|certo|perfeito|ok|aqui est[áa]o?|segue[m]?)\b\s*[!,.:]/i,
  /como (um )?modelo de linguagem/i,
  /\b(as an ai|i can(?:'|no)t|i'?m sorry|here (is|are) )/i,
  /^\s*#{1,6}\s/m,
  /^\s*\d+[.)]\s*\*\*[^*]+\*\*/m,
  /^\s*\*\*[^*]+:?\*\*\s*:?/m,
  /\b(headline|body_?text|highlight_text|value_proposition)\s*:/i,
];

export function looksLikeModelChatter(text: string): boolean {
  return MODEL_CHATTER.some((re) => re.test(text));
}

const PARTNERSHIP = /\bparcer[ií]as?\b|\bparceir[oa]s?\b|\bpartners?(hip)?\b|\bem conjunto com\b|\bco-?brand|\bendoss|\bpatrocinad[oa] por\b|\bapoiad[oa] por\b/i;

export function impliesPartnership(text: string, targetName?: string): boolean {
  if (PARTNERSHIP.test(text)) return true;
  const name = (targetName || '').trim();
  if (!name) return false;
  const t = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const joined = new RegExp(`\\S\\s*[+×&]\\s*${t}|${t}\\s*[+×&]\\s*\\S|\\S\\s+x\\s+${t}(?![\\w])|${t}\\s+x\\s+\\S`, 'i');
  return joined.test(text);
}

const TEMPLATE_VARS = new Set(['company.name', 'company.industry']);

export function unsupportedMacro(text: string, allowTemplateVars: boolean): string | null {
  for (const m of text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
    if (!(allowTemplateVars && TEMPLATE_VARS.has(m[1]))) return m[0];
  }
  const linkedInMacro = text.match(/%[A-Z_]{3,}%/);
  if (linkedInMacro) return linkedInMacro[0];
  const bracket = text.match(/\[(empresa|nome|company|name|cargo|setor|sua empresa)\]/i);
  return bracket ? bracket[0] : null;
}

// Lista o que impede a copy de ser gravada. Vazia = pode gravar.
export function copyProblems(
  copy: { headline?: unknown; bodyText?: unknown },
  opts: { targetName: string; allowTemplateVars: boolean },
): string[] {
  const headline = typeof copy.headline === 'string' ? copy.headline.trim() : '';
  const bodyText = typeof copy.bodyText === 'string' ? copy.bodyText.trim() : '';
  const problems: string[] = [];
  if (!headline) problems.push('o título veio vazio');
  if (!bodyText) problems.push('o texto veio vazio');
  if (headline.length > LINKEDIN_HEADLINE_MAX) problems.push(`o título passou de ${LINKEDIN_HEADLINE_MAX} caracteres`);
  if (bodyText.length > LINKEDIN_INTRO_MAX) problems.push(`o texto passou de ${LINKEDIN_INTRO_MAX} caracteres`);
  const both = `${headline}\n${bodyText}`;
  if (looksLikeModelChatter(both)) problems.push('a resposta é uma mensagem da IA, não um anúncio');
  if (impliesPartnership(both, opts.targetName)) problems.push('o texto sugere parceria ou endosso com a empresa-alvo');
  const macro = unsupportedMacro(both, opts.allowTemplateVars);
  if (macro) problems.push(`o texto usa uma variável que a publicação não preenche (${macro})`);
  return problems;
}

// "a, b e c" — para listar numa frase só.
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function normalizeHex(value: unknown): string {
  if (typeof value !== 'string') return '';
  const m = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return '';
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return `#${h.toUpperCase()}`;
}

const cleanText = (v: unknown, max = 400): string => {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return !s || looksLikeModelChatter(s) ? '' : s.slice(0, max);
};
const cleanList = (v: unknown, maxItems: number, maxLen = 80): string[] =>
  Array.isArray(v) ? v.map((x) => cleanText(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];

export interface BrandBrief {
  industry: string;
  value_proposition: string;
  visual_style_keywords: string[];
  primary_colors: string[];
  key_messaging_themes: string[];
  target_persona_hint: string;
  scrape_status?: 'ok' | 'limited';
  source_url?: string | null;
  og_image?: string | null;
  // O que a extração não achou, em português ("cores", "setor"…).
  missing_fields?: string[];
  generated_at: string;
}

// Valida um brief antes de gravar: só os campos do schema, sem conversa do
// modelo, cores só em hex. `null` = nada aproveitável (a tela mantém o anterior).
export function sanitizeBrandBrief(raw: unknown): BrandBrief | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const brief: BrandBrief = {
    industry: cleanText(r.industry, 80),
    value_proposition: cleanText(r.value_proposition, 200),
    visual_style_keywords: cleanList(r.visual_style_keywords, 6),
    primary_colors: Array.isArray(r.primary_colors)
      ? [...new Set(r.primary_colors.map(normalizeHex).filter(Boolean))].slice(0, 4)
      : [],
    key_messaging_themes: cleanList(r.key_messaging_themes, 5),
    target_persona_hint: cleanText(r.target_persona_hint, 200),
    scrape_status: r.scrape_status === 'limited' ? 'limited' : 'ok',
    source_url: typeof r.source_url === 'string' ? r.source_url : null,
    og_image: typeof r.og_image === 'string' ? r.og_image : null,
    missing_fields: Array.isArray(r.missing_fields) ? r.missing_fields.filter((x): x is string => typeof x === 'string') : [],
    generated_at: typeof r.generated_at === 'string' ? r.generated_at : new Date().toISOString(),
  };
  const usable = !!(brief.industry || brief.value_proposition || brief.key_messaging_themes.length);
  return usable ? brief : null;
}

export interface ClientVoice {
  voice: string;
  brand_context: string;
  website_url: string;
  product_service: string;
  audience_market: string;
  persona: string;
  brand_colors: { primary: string; secondary: string; accent: string };
  updated_at: string | null;
}

export async function fetchBrandBrief(input: {
  company_url?: string;
  company_domain?: string;
  company_name?: string;
  force_refresh?: boolean;
}): Promise<BrandBrief> {
  const res = await fetch(`${SERVER_BASE}/ai/brand-brief`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAiError(res);
  return res.json();
}

// A resposta pode vir vazia ou inválida mesmo com 2xx (servidor antigo, proxy):
// quem chama valida com `copyProblems` antes de gravar.
export async function generateCopy(input: {
  brand_brief: BrandBrief | Partial<BrandBrief>;
  client_voice: string;
  client_brand_colors?: { primary: string; secondary: string; accent: string };
  // Contexto do anunciante (passo Marca): o que vende e para quem.
  client_brand_context?: string;
  product_service?: string;
  audience_market?: string;
  persona?: string;
  target_company_name: string;
  objective?: string;
  cta?: string;
}): Promise<{ headline: string; bodyText: string }> {
  const res = await fetch(`${SERVER_BASE}/ai/generate-copy`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAiError(res);
  return res.json();
}

// Generate a single reusable base image for the campaign. The same canvas
// is reused across every target company; per-company personalisation is
// applied later via composeLogoOverlay.
// `prompt_brief` is what steers the look now — the UI no longer asks the user
// to pick between "photo" and "graphic". We still send `photo_ai` because the
// endpoint requires a mode and photography is the safer B2B default; the
// server's style directive is scheduled to be neutralised when a prompt is
// present (see docs/superpowers/specs/2026-08-11-criativo-texto-imagem-design.md).
// `format` define a proporção pedida no prompt (1:1 ou 1.91:1) desde 2026-08-18.
// `baked_texts` só vai com "Textos pela IA" ligado: o servidor pede à IA
// exatamente esses textos e nenhum outro. Desligado (ou com os dois vazios),
// a base sai sem texto nenhum e a composição desenha os textos depois.
// A imagem volta com no mínimo 1200 px no lado maior, na proporção do formato.
export async function generateBaseImage(input: {
  client_brand_context?: string;
  prompt_brief?: string;
  format?: 'square' | 'banner';
  baked_texts?: { destaque?: string; complementar?: string };
}): Promise<{ success: boolean; url: string; filename: string; width?: number; height?: number }> {
  const res = await fetch(`${SERVER_BASE}/ai/generate-base-image`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...input, mode: 'photo_ai' }),
  });
  if (!res.ok) await throwAiError(res);
  return res.json();
}

// Compõe o anúncio final: os dois textos e os logos habilitados sobre a
// imagem-base, nas posições que o usuário arrastou. NÃO usa IA — o servidor
// monta um SVG a partir do layout e rasteriza com resvg.
export async function composeLogoOverlay(input: {
  base_image_url: string;
  target_company_name: string;
  target_company_domain?: string | null;
  advertiser_logo_url?: string | null;
  // Fallback quando `advertiser_logo_url` está ausente: `brandKit.logo` é
  // `null` por padrão, então sem isto o checkbox "Meu logo" não teria de
  // onde tirar imagem nenhuma. O servidor resolve o logo a partir do domínio
  // do mesmo jeito que já faz para `target_company_domain`.
  advertiser_domain?: string | null;
  texto_destaque?: string;
  texto_complementar?: string;
  font_family?: string;
  format?: 'square' | 'banner';
  layout: OverlayLayout;
  // Larguras medidas no cliente com a fonte real, no tamanho EFETIVO (já
  // depois do teto vivo) — é nesse tamanho que o servidor desenha a caixa de
  // fundo do texto. Sem elas o servidor cai num estimador por contagem de
  // caracteres e a caixa não bate com o preview.
  destaque_width_px?: number;
  complementar_width_px?: number;
}): Promise<{
  success: boolean; url: string; filename: string;
  logo_applied: boolean; advertiser_logo_applied: boolean;
}> {
  const res = await fetch(`${SERVER_BASE}/ai/compose-logo-overlay`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAiError(res);
  return res.json();
}

export async function fetchClientVoice(): Promise<ClientVoice> {
  const res = await fetch(`${SERVER_BASE}/ai/client-voice`, {
    headers: headers(),
  });
  if (!res.ok) {
    return {
      voice: '',
      brand_context: '',
      website_url: '',
      product_service: '',
      audience_market: '',
      persona: '',
      brand_colors: { primary: '', secondary: '', accent: '' },
      updated_at: null,
    };
  }
  return res.json();
}

export async function saveClientVoice(input: {
  voice: string;
  brand_context: string;
  website_url: string;
  product_service: string;
  audience_market: string;
  persona: string;
  brand_colors: { primary: string; secondary: string; accent: string };
}): Promise<ClientVoice> {
  const res = await fetch(`${SERVER_BASE}/ai/client-voice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface BrandExtraction {
  voice: string;
  voice_examples: string[];
  brand_context: string;
  brand_colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  // Cores vistas no CSS do site, para a tela oferecer como amostras.
  color_candidates?: string[];
  // O que não deu para extrair, em português ("cores", "tom de voz"…).
  missing_fields?: string[];
  scrape_status: 'ok' | 'limited';
  source_url: string | null;
  about_url: string | null;
}

// Valida a extração antes de gravar no rascunho da marca. `null` = nada
// aproveitável: a tela mostra o erro e mantém o que já estava preenchido.
export function sanitizeBrandExtraction(raw: unknown): BrandExtraction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const colors = (r.brand_colors && typeof r.brand_colors === 'object' ? r.brand_colors : {}) as Record<string, unknown>;
  const out: BrandExtraction = {
    voice: cleanText(r.voice, 800),
    voice_examples: cleanList(r.voice_examples, 3, 240),
    brand_context: cleanText(r.brand_context, 400),
    brand_colors: {
      primary: normalizeHex(colors.primary),
      secondary: normalizeHex(colors.secondary),
      accent: normalizeHex(colors.accent),
    },
    color_candidates: Array.isArray(r.color_candidates)
      ? [...new Set(r.color_candidates.map(normalizeHex).filter(Boolean))]
      : [],
    missing_fields: Array.isArray(r.missing_fields) ? r.missing_fields.filter((x): x is string => typeof x === 'string') : [],
    scrape_status: r.scrape_status === 'limited' ? 'limited' : 'ok',
    source_url: typeof r.source_url === 'string' ? r.source_url : null,
    about_url: typeof r.about_url === 'string' ? r.about_url : null,
  };
  return out.voice || out.brand_context ? out : null;
}

export async function extractBrandVoice(input: {
  website_url: string;
}): Promise<BrandExtraction> {
  const res = await fetch(`${SERVER_BASE}/ai/extract-brand-voice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAiError(res);
  return res.json();
}
