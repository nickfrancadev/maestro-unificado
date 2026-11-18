// /ai/extract-brand-book — extração da marca a partir do brand book em PDF.
//
// O PDF já foi enviado ao Storage pelo cliente (mesma rota `/creative-upload`
// da imagem-base). Aqui ele é lido do bucket pelo caminho, vai ao Gemini como
// documento e volta no MESMO formato e com o MESMO tratamento de erro da
// extração pelo site (`/ai/extract-brand-voice`): `sanitizeBrandVoice` valida,
// sem voz nem contexto é 422 com o que preencher à mão.
//
// Módulo separado do index.ts de propósito (outra frente mexe nele): o
// index.ts só importa e chama `registerBrandBookRoute`. Sem import de
// Deno/npm aqui, para o teste rodar no Node sob o Vitest.
import { sanitizeBrandVoice } from "./aiGuards.ts";

export const BRAND_BOOK_MAX_BYTES = 15 * 1024 * 1024;

export interface BrandBookDeps {
  /** Baixa o arquivo do bucket de criativos. `null` = não achou. */
  download: (path: string) => Promise<Uint8Array | null>;
  /** Chama o modelo com o PDF anexado e devolve o JSON do schema. */
  generate: (opts: { systemInstruction: string; pdfBase64: string; responseSchema: unknown }) => Promise<unknown>;
}

export interface BrandBookResult {
  status: number;
  body: Record<string, unknown>;
}

const SYSTEM_INSTRUCTION = `Você é um estrategista de marca sênior. O documento anexado é o brand book (manual de marca) da empresa. Leia o documento e devolva JSON com:

- "voice": 3-4 frases descrevendo o TOM DE VOZ — registro (formal/informal), uso de jargão, atitude, pronome preferido (você/vocês/nós), tipo de argumento. Em português, sem genéricos como "moderno" e "inovador". Use o que o manual diz sobre tom de voz; se ele não falar, infira dos textos do próprio manual.
- "voice_examples": array com 2-3 FRASES REAIS do documento que ilustram o tom. Copie verbatim, não parafraseie.
- "brand_context": 1-2 frases sobre o que a empresa vende, para quem, e qual a proposta de valor central. Em português.
- "brand_colors": objeto com "primary", "secondary" e "accent" em hex (ex "#5B3FFF"), tirados da paleta oficial do manual (primary = cor de marca dominante, accent = cor de destaque/CTA, secondary = cor de apoio). Sem paleta no documento, devolva strings vazias: o usuário preenche à mão.

Não use markdown. Responda só com os valores pedidos, sem comentários nem ofertas de ajuda; campo que não der para extrair fica vazio.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    voice: { type: "string" },
    voice_examples: { type: "array", items: { type: "string" } },
    brand_context: { type: "string" },
    brand_colors: {
      type: "object",
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
        accent: { type: "string" },
      },
      required: ["primary"],
    },
  },
  required: ["voice", "voice_examples", "brand_context", "brand_colors"],
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isPdf(bytes: Uint8Array): boolean {
  // "%PDF" no começo do arquivo.
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function extractBrandFromBrandBook(
  deps: BrandBookDeps,
  input: { brandbook_path?: unknown; filename?: unknown },
): Promise<BrandBookResult> {
  const path = typeof input.brandbook_path === "string" ? input.brandbook_path.trim() : "";
  const filename = typeof input.filename === "string" && input.filename.trim() ? input.filename.trim() : "o PDF";
  if (!path) return { status: 400, body: { error: "brandbook_path é obrigatório" } };

  const bytes = await deps.download(path);
  if (!bytes) return { status: 404, body: { error: `Não encontramos ${filename} no armazenamento. Envie o PDF de novo.` } };
  if (!isPdf(bytes)) return { status: 422, body: { error: `${filename} não é um PDF válido. Envie o brand book em PDF.`, missing: [] } };
  if (bytes.byteLength > BRAND_BOOK_MAX_BYTES) {
    return { status: 422, body: { error: `${filename} passa de 15 MB. Envie uma versão menor do brand book.`, missing: [] } };
  }

  const generated = await deps.generate({
    systemInstruction: SYSTEM_INSTRUCTION,
    pdfBase64: toBase64(bytes),
    responseSchema: RESPONSE_SCHEMA,
  });

  const voiceOut = sanitizeBrandVoice(generated);
  if (!voiceOut.usable) {
    return {
      status: 422,
      body: {
        error: `Não conseguimos extrair a marca de ${filename}. Preencha manualmente o tom de voz, o contexto e as cores.`,
        missing: voiceOut.missing,
      },
    };
  }
  return {
    status: 200,
    body: {
      voice: voiceOut.voice,
      voice_examples: voiceOut.voice_examples,
      brand_context: voiceOut.brand_context,
      brand_colors: voiceOut.brand_colors,
      color_candidates: [],
      missing_fields: voiceOut.missing,
      scrape_status: "ok",
      source_url: null,
      about_url: null,
    },
  };
}

// deno-lint-ignore no-explicit-any
type AnyApp = { post: (path: string, handler: (c: any) => Promise<Response>) => unknown };

export function registerBrandBookRoute(app: AnyApp, deps: BrandBookDeps): void {
  // deno-lint-ignore no-explicit-any
  app.post("/make-server-a4d5bbe0/ai/extract-brand-book", async (c: any) => {
    try {
      const input = await c.req.json().catch(() => ({}));
      const result = await extractBrandFromBrandBook(deps, input);
      return c.json(result.body, result.status);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("[Extract Brand Book] Erro:", message);
      return c.json({ error: message }, 500);
    }
  });
}

/** Corpo do pedido ao Gemini com o PDF anexado (inline_data). */
export function geminiPdfRequestBody(opts: { systemInstruction: string; pdfBase64: string; responseSchema: unknown }) {
  return {
    systemInstruction: { parts: [{ text: opts.systemInstruction }] },
    contents: [{
      role: "user",
      parts: [
        { inline_data: { mime_type: "application/pdf", data: opts.pdfBase64 } },
        { text: "Extraia a marca deste brand book." },
      ],
    }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
    },
  };
}
