// Guardas puras das rotas /ai/*: o que a IA devolve passa por aqui ANTES de
// sair do servidor. Sem Deno nem npm de propósito, para rodar no Vitest ao lado
// de `overlaySvg.ts`. O front tem um espelho enxuto em `src/lib/ai.ts`
// (`copyProblems`) — `src/lib/ai.test.ts` compara os dois.
//
// Mensagens em português simples: elas chegam até a tela como estão.

// Limites do LinkedIn para Single Image Ad.
export const LINKEDIN_HEADLINE_MAX = 200;
export const LINKEDIN_INTRO_MAX = 600;

// Lado maior mínimo da imagem do anúncio. Os dois formatos têm 1200 de largura.
export const MIN_IMAGE_LONG_SIDE = 1200;

// Texto que é o modelo falando com a gente, não um anúncio: falha conhecida da
// geração ("Não encontrado - input manual"), oferta de ajuda, cabeçalhos de
// prompt numerados, markdown e nome de campo vazado.
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

// Parceria, endosso ou co-branding com a empresa-alvo. A conta-alvo é o
// público do anúncio, não uma aliada: insinuar relação comercial é o que fez o
// produto publicar "Maestro ABM + Nubank: uma parceria…".
const PARTNERSHIP = /\bparcer[ií]as?\b|\bparceir[oa]s?\b|\bpartners?(hip)?\b|\bem conjunto com\b|\bco-?brand|\bendoss|\bpatrocinad[oa] por\b|\bapoiad[oa] por\b/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function impliesPartnership(text: string, targetName?: string): boolean {
  if (PARTNERSHIP.test(text)) return true;
  const name = (targetName || "").trim();
  if (!name) return false;
  const t = escapeRegExp(name);
  // "Marca + Empresa", "Empresa × Marca", "Marca & Empresa", "Marca x Empresa".
  const joined = new RegExp(`\\S\\s*[+×&]\\s*${t}|${t}\\s*[+×&]\\s*\\S|\\S\\s+x\\s+${t}(?![\\w])|${t}\\s+x\\s+\\S`, "i");
  return joined.test(text);
}

// Variáveis que a publicação NÃO resolve. Só `{{company.name}}` e
// `{{company.industry}}` existem, e apenas no template; numa empresa nenhuma
// variável sobrevive. Macros do LinkedIn (%FIRSTNAME%) e placeholders entre
// colchetes ([Empresa]) não são suportados pelo Single Image Ad.
const TEMPLATE_VARS = new Set(["company.name", "company.industry"]);

export function unsupportedMacro(text: string, allowTemplateVars: boolean): string | null {
  for (const m of text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
    if (!(allowTemplateVars && TEMPLATE_VARS.has(m[1]))) return m[0];
  }
  const linkedInMacro = text.match(/%[A-Z_]{3,}%/);
  if (linkedInMacro) return linkedInMacro[0];
  const bracket = text.match(/\[(empresa|nome|company|name|cargo|setor|sua empresa)\]/i);
  return bracket ? bracket[0] : null;
}

// Limpa o que veio do modelo: só string, sem aspas em volta nem espaços sobrando.
export function cleanModelText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^["“”']+|["“”']+$/g, "").trim();
}

export interface CopyCheckOptions {
  targetName: string;
  // true no template global, que escreve para `{{company.name}}`.
  allowTemplateVars: boolean;
}

// Lista o que impede a copy de ir ao ar. Vazia = válida.
export function copyProblems(
  copy: { headline: string; bodyText: string },
  opts: CopyCheckOptions,
): string[] {
  const problems: string[] = [];
  const { headline, bodyText } = copy;
  if (!headline) problems.push("o título veio vazio");
  if (!bodyText) problems.push("o texto veio vazio");
  if (headline.length > LINKEDIN_HEADLINE_MAX) {
    problems.push(`o título passou de ${LINKEDIN_HEADLINE_MAX} caracteres`);
  }
  if (bodyText.length > LINKEDIN_INTRO_MAX) {
    problems.push(`o texto passou de ${LINKEDIN_INTRO_MAX} caracteres`);
  }
  const both = `${headline}\n${bodyText}`;
  if (looksLikeModelChatter(both)) problems.push("a resposta é uma mensagem da IA, não um anúncio");
  // No template o nome é a própria variável; o co-branding com ela também conta.
  if (impliesPartnership(both, opts.targetName)) {
    problems.push("o texto sugere parceria ou endosso com a empresa-alvo");
  }
  const macro = unsupportedMacro(both, opts.allowTemplateVars);
  if (macro) problems.push(`o texto usa uma variável que a publicação não preenche (${macro})`);
  return problems;
}

// ---------- Brand brief (empresa-alvo) e marca do anunciante ----------

export function normalizeHex(value: unknown): string {
  if (typeof value !== "string") return "";
  const m = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return "";
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return `#${h.toUpperCase()}`;
}

// Campo de texto vindo do modelo: string, sem conversa de modelo, com teto.
export function cleanBriefText(value: unknown, max = 400): string {
  const s = cleanModelText(value);
  if (!s || looksLikeModelChatter(s)) return "";
  return s.slice(0, max);
}

function cleanList(value: unknown, maxItems: number, maxLen = 80): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => cleanBriefText(v, maxLen)).filter(Boolean).slice(0, maxItems);
}

export interface SanitizedBrandBrief {
  brief: {
    industry: string;
    value_proposition: string;
    visual_style_keywords: string[];
    primary_colors: string[];
    key_messaging_themes: string[];
    target_persona_hint: string;
  };
  // Rótulos em português do que ficou vazio, para a tela pedir preenchimento manual.
  missing: string[];
  usable: boolean;
}

export function sanitizeBrandBrief(raw: unknown): SanitizedBrandBrief {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const brief = {
    industry: cleanBriefText(r.industry, 80),
    value_proposition: cleanBriefText(r.value_proposition, 200),
    visual_style_keywords: cleanList(r.visual_style_keywords, 6),
    // "Nenhuma cor encontrada" é resposta válida: a paleta fica vazia.
    primary_colors: Array.isArray(r.primary_colors)
      ? [...new Set(r.primary_colors.map(normalizeHex).filter(Boolean))].slice(0, 4)
      : [],
    key_messaging_themes: cleanList(r.key_messaging_themes, 5),
    target_persona_hint: cleanBriefText(r.target_persona_hint, 200),
  };
  const missing: string[] = [];
  if (!brief.industry) missing.push("setor");
  if (!brief.value_proposition) missing.push("proposta de valor");
  if (!brief.key_messaging_themes.length) missing.push("temas de mensagem");
  if (!brief.target_persona_hint) missing.push("persona");
  if (!brief.primary_colors.length) missing.push("cores");
  const usable = !!(brief.industry || brief.value_proposition || brief.key_messaging_themes.length);
  return { brief, missing, usable };
}

export interface SanitizedBrandVoice {
  voice: string;
  voice_examples: string[];
  brand_context: string;
  brand_colors: { primary: string; secondary: string; accent: string };
  missing: string[];
  usable: boolean;
}

export function sanitizeBrandVoice(raw: unknown): SanitizedBrandVoice {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const colors = (r.brand_colors && typeof r.brand_colors === "object" ? r.brand_colors : {}) as Record<string, unknown>;
  const out = {
    voice: cleanBriefText(r.voice, 800),
    voice_examples: cleanList(r.voice_examples, 3, 240),
    brand_context: cleanBriefText(r.brand_context, 400),
    brand_colors: {
      primary: normalizeHex(colors.primary),
      secondary: normalizeHex(colors.secondary),
      accent: normalizeHex(colors.accent),
    },
  };
  const missing: string[] = [];
  if (!out.voice) missing.push("tom de voz");
  if (!out.brand_context) missing.push("contexto da marca");
  if (!out.brand_colors.primary) missing.push("cores");
  return { ...out, missing, usable: !!(out.voice || out.brand_context) };
}

// "a, b e c" — para listar o que falta numa frase só.
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

// ---------- Dimensões da imagem gerada ----------

// Lê largura/altura do cabeçalho de PNG, JPEG ou WebP sem decodificar a imagem.
// `null` quando o formato não é reconhecido.
export function imageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const u32 = (o: number) => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
  const u16 = (o: number) => (bytes[o] << 8) | bytes[o + 1];
  const le16 = (o: number) => bytes[o] | (bytes[o + 1] << 8);
  const le24 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16);
  // PNG: assinatura + IHDR.
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { width: u32(16), height: u32(20) };
  }
  // JPEG: percorre os marcadores até um SOFn.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let o = 2;
    while (o + 9 < bytes.length) {
      if (bytes[o] !== 0xff) { o++; continue; }
      const marker = bytes[o + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { o += 2; continue; }
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: u16(o + 5), width: u16(o + 7) };
      o += 2 + u16(o + 2);
    }
    return null;
  }
  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X.
  if (bytes.length >= 30 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === "VP8 ") return { width: le16(26) & 0x3fff, height: le16(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = bytes.subarray(21, 25);
      return {
        width: 1 + (((b[1] & 0x3f) << 8) | b[0]),
        height: 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") return { width: 1 + le24(24), height: 1 + le24(27) };
  }
  return null;
}

// A imagem precisa ser normalizada (upscale + recorte no formato) quando é
// menor que o mínimo, tem proporção diferente da pedida ou não deu para ler.
export function needsImageNormalization(
  dims: { width: number; height: number } | null,
  target: { w: number; h: number },
): boolean {
  if (!dims || !dims.width || !dims.height) return true;
  if (Math.max(dims.width, dims.height) < MIN_IMAGE_LONG_SIDE) return true;
  const ratio = dims.width / dims.height;
  const want = target.w / target.h;
  return Math.abs(ratio - want) / want > 0.03;
}
