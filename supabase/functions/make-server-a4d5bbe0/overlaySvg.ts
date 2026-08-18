// Construção do SVG do overlay do anúncio.
//
// Puro DE PROPÓSITO: nada de Deno, nada de `npm:`, nada de rede — assim roda no
// Vitest junto com o resto do projeto, mesmo arranjo de `tokenLifecycle.ts`. A
// rasterização com resvg fica em `index.ts`, que é quem tem as dependências.
//
// As constantes abaixo ESPELHAM `src/app/campaigns/wizard/overlayLayout.ts`.
// O edge function não pode importar de `src/`, então a paridade é garantida por
// `overlayLayout.test.ts`, que importa os dois módulos e compara.

export type AdFormat = "square" | "banner";
export type LogoWrap = "circle" | "square" | "rect" | "none";
export type TextBackdrop = "box" | "shadow" | "none";

export const AD_FORMAT_SIZE: Record<AdFormat, { w: number; h: number }> = {
  square: { w: 1200, h: 1200 },
  banner: { w: 1200, h: 628 },
};

export const OVERLAY_STYLE = {
  boxPadX: 22,
  boxPadY: 12,
  boxRadius: 14,
  boxFill: "rgba(0,0,0,0.55)",
  logoCardFill: "#FFFFFF",
  logoCardRadius: 14,
  rectWrapAspect: 2.5,
  padRatioDefault: 0.12,
  padRatioCircle: 0.18,
} as const;

export const LOGO_WRAP_ASPECT: Record<LogoWrap, number> = {
  circle: 1,
  square: 1,
  none: 1,
  rect: OVERLAY_STYLE.rectWrapAspect,
};

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Fallback para quando o cliente não mede. Glifos sans têm avanço médio de
// ~0.55em numa mistura maiúsculas/minúsculas; generoso o bastante para a caixa
// não cortar o texto. Só entra em jogo em chamadas que não mandam `widthPx` —
// o editor sempre manda, medido com `measureText` na fonte real.
export function estimateTextWidthPx(text: string, sizePx: number): number {
  return Math.ceil(text.length * sizePx * 0.55);
}

export interface SvgTextLayer {
  text: string;
  x: number;          // 0–1, centro
  y: number;          // 0–1, centro
  sizePx: number;
  color: string;
  backdrop: TextBackdrop;
  weight: number;     // 700 no destaque, 400 no complementar
  widthPx?: number;   // medido pelo cliente; ausente cai no estimador
}

export interface SvgLogoLayer {
  href: string;       // data: URL ou URL absoluta
  x: number;          // 0–1, centro
  y: number;          // 0–1, centro
  sizePx: number;     // LARGURA do wrap
  wrap: LogoWrap;
}

export interface BuildOverlaySvgOptions {
  format: AdFormat;
  baseHref: string;
  fontFamily: string;
  texts: SvgTextLayer[];
  logos: SvgLogoLayer[];
}

// Arredonda para 2 casas: SVG aceita decimais, mas números redondos deixam os
// testes legíveis e o diff estável.
const r = (n: number) => Math.round(n * 100) / 100;

function logoInnerPadPx(wrap: LogoWrap, boxW: number): number {
  if (wrap === "none") return 0;
  const ratio = wrap === "circle" ? OVERLAY_STYLE.padRatioCircle : OVERLAY_STYLE.padRatioDefault;
  return boxW * ratio;
}

// O resvg tem suporte irregular a SVG referenciado por `<image href="data:...">`.
// Para não apostar nisso, todo logo que chega como SVG vira `<svg>` ANINHADO —
// isso é núcleo do formato, o resvg renderiza com certeza. `href` só cai aqui
// quando é um data-URI `image/svg+xml`; qualquer outra coisa (raster, URL
// absoluta) continua pelo caminho `<image>` de sempre.
//
// Cobre os dois encodings comuns de data-URI: `;base64,` e o URL-encoded cru
// (`,` sem `;base64`) que é o formato do MOCK_LOGO em `src/app/campaigns/wizard/brandKit.ts`.
function decodeSvgDataUri(href: string): string | null {
  const match = href.match(/^data:image\/svg\+xml(;[^,]*)?,(.*)$/s);
  if (!match) return null;
  const params = match[1] ?? "";
  const payload = match[2];
  try {
    if (params.includes("base64")) {
      // `atob` devolve uma string "binária" (um char por byte); decodificar
      // como UTF-8 de verdade evita mojibake se o SVG tiver acento.
      const bytes = Uint8Array.from(atob(payload), (ch) => ch.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

// Remove tudo que só é legal no PRÓLOGO de um documento XML e nunca dentro do
// conteúdo de um elemento: a declaração `<?xml ...?>`, comentários que vêm
// antes da tag raiz e `<!DOCTYPE ...>` (com ou sem subset interno em `[...]`).
// Export padrão de Illustrator/Inkscape traz os três, nessa ordem — sobrando
// qualquer um deles dentro do `<svg>` wrapper, o parser do resvg aborta e
// devolve 500 na composição inteira. Repete até não sobrar nenhum na frente,
// porque a ordem entre eles não é garantida.
function stripXmlProlog(markup: string): string {
  let out = markup;
  let changed = true;
  while (changed) {
    changed = false;
    const trimmed = out.replace(/^\s+/, "");
    if (trimmed !== out) {
      out = trimmed;
      changed = true;
    }
    if (/^<\?xml[^>]*\?>/i.test(out)) {
      out = out.replace(/^<\?xml[^>]*\?>/i, "");
      changed = true;
      continue;
    }
    if (/^<!--/.test(out)) {
      const end = out.indexOf("-->");
      if (end !== -1) {
        out = out.slice(end + 3);
        changed = true;
        continue;
      }
    }
    if (/^<!DOCTYPE/i.test(out)) {
      const bracketIdx = out.indexOf("[");
      const firstGt = out.indexOf(">");
      const hasSubset = bracketIdx !== -1 && (firstGt === -1 || bracketIdx < firstGt);
      const closeIdx = hasSubset ? out.indexOf(">", out.indexOf("]", bracketIdx)) : firstGt;
      if (closeIdx !== -1) {
        out = out.slice(closeIdx + 1);
        changed = true;
        continue;
      }
    }
  }
  return out;
}

// Lê um atributo de uma tag de abertura, aceitando aspas simples OU duplas —
// `xmlns='...'` é o idioma canônico de SVG inline em CSS/HTML (cabe dentro de
// `url("...")`), tão comum quanto a variante com aspas duplas.
function getAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2];
}

// Remove um atributo (aspas simples ou duplas) de uma tag de abertura.
function stripAttr(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s+${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`, "i"), "");
}

// `getAttr` só devolve o texto cru; aqui validamos que é mesmo um número
// (com "px" opcional) antes de usar para derivar o viewBox — um `width="100%"`
// não tem tamanho intrínseco e não deve virar `viewBox="0 0 100% ..."`.
function numericAttr(tag: string, name: string): string | null {
  const raw = getAttr(tag, name);
  if (raw === null) return null;
  const trimmed = raw.trim().replace(/px$/i, "");
  return /^\d+(\.\d+)?$/.test(trimmed) ? trimmed : null;
}

// Checagem BARATA de boa-formação — de propósito, não é um parser XML (foi
// tentar validar SVG por regex que causou os bugs deste round). Só pega os
// sinais mais comuns de origem não confiável — download truncado, página de
// erro HTML servida com content-type errado, entidade não escapada — e, ao
// encontrar qualquer um deles, desiste. O caminho seguro é o default na
// dúvida: cair no `<image href="${escapeXml(...)}">` de sempre, que sempre
// produz XML válido mesmo que o logo não renderize, em vez de arriscar um
// `<svg>` aninhado malformado que derruba a composição inteira no resvg.
function looksWellFormed(markup: string): boolean {
  const trimmed = markup.trim();
  if (!/^<svg\b/i.test(trimmed)) return false;
  if (!/<\/svg>\s*$/i.test(trimmed)) return false;
  if (/<!DOCTYPE|<\?/i.test(trimmed)) return false;
  const opens = (trimmed.match(/</g) || []).length;
  const closes = (trimmed.match(/>/g) || []).length;
  if (opens !== closes) return false;
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(trimmed)) return false;
  return true;
}

// Prepara o markup do SVG interno para ser aninhado dentro do `<svg>` wrapper
// que carrega x/y/width/height/viewBox da caixa do logo. Devolve `null`
// quando o resultado não passa na checagem barata de boa-formação — o
// chamador cai de volta no `<image>` de sempre nesse caso.
function prepareNestedSvg(rawMarkup: string): { markup: string; viewBox: string } | null {
  let markup = stripXmlProlog(rawMarkup).trim();

  const svgTagMatch = markup.match(/<svg\b[^>]*>/i);
  const svgTag = svgTagMatch ? svgTagMatch[0] : "";

  // Sintetiza o viewBox: usa o do SVG interno se existir; senão deriva de
  // width/height dele; senão cai num quadrado 100x100. Sem viewBox o
  // conteúdo não escala e o logo sai no tamanho errado dentro do wrap.
  const viewBoxAttr = getAttr(svgTag, "viewBox");
  const widthAttr = numericAttr(svgTag, "width");
  const heightAttr = numericAttr(svgTag, "height");
  const viewBox = viewBoxAttr
    ? viewBoxAttr
    : widthAttr && heightAttr
    ? `0 0 ${widthAttr} ${heightAttr}`
    : "0 0 100 100";

  // `xmlns` duplicado (o documento externo já declara o namespace) e
  // `width`/`height` internos saem da tag <svg> interna — quem manda no
  // tamanho final é o wrapper; sem isso o logo ignoraria o `sizePx`
  // escolhido no editor e renderizaria sempre no tamanho nativo do SVG.
  if (svgTag) {
    const cleanedTag = stripAttr(stripAttr(stripAttr(svgTag, "xmlns"), "width"), "height");
    // Replacement como FUNÇÃO, não string: `String.replace(str, string)`
    // trata "$&", "$`", "$'", "$$" no segundo argumento como tokens
    // especiais mesmo quando o primeiro argumento é uma string comum, não
    // uma regex. Um `id="a$&b"` na tag raiz reinsere a tag inteira dentro
    // do próprio atributo se o replacement não for uma função.
    markup = markup.replace(svgTag, () => cleanedTag);
  }

  if (!looksWellFormed(markup)) return null;

  return { markup, viewBox };
}

export function buildOverlaySvg(opts: BuildOverlaySvgOptions): string {
  const { w: CW, h: CH } = AD_FORMAT_SIZE[opts.format];
  const parts: string[] = [];

  for (const t of opts.texts) {
    if (!t.text) continue;
    const width = t.widthPx ?? estimateTextWidthPx(t.text, t.sizePx);
    const boxW = width + OVERLAY_STYLE.boxPadX * 2;
    const boxH = t.sizePx + OVERLAY_STYLE.boxPadY * 2;
    const boxY = t.y * CH - boxH / 2;

    if (t.backdrop === "box") {
      parts.push(
        `<rect x="${r(t.x * CW - boxW / 2)}" y="${r(boxY)}" width="${r(boxW)}" height="${r(boxH)}" ` +
        `rx="${OVERLAY_STYLE.boxRadius}" ry="${OVERLAY_STYLE.boxRadius}" fill="${OVERLAY_STYLE.boxFill}"/>`,
      );
    }

    // `text-anchor="middle"` é o que torna a centro-ancoragem honesta: se a
    // largura medida errar, a caixa fica larga ou estreita demais, mas o texto
    // nunca sai torto dentro dela.
    const filter = t.backdrop === "shadow" ? ` filter="url(#ovl-textShadow)"` : "";
    parts.push(
      `<text x="${r(t.x * CW)}" y="${r(boxY + OVERLAY_STYLE.boxPadY + t.sizePx * 0.8)}" ` +
      `text-anchor="middle" font-family="${escapeXml(opts.fontFamily)}" font-weight="${t.weight}" ` +
      `font-size="${t.sizePx}" fill="${escapeXml(t.color)}"${filter}>${escapeXml(t.text)}</text>`,
    );
  }

  for (const l of opts.logos) {
    const boxW = l.sizePx;
    const boxH = l.sizePx / LOGO_WRAP_ASPECT[l.wrap];
    const boxX = l.x * CW - boxW / 2;
    const boxY = l.y * CH - boxH / 2;

    if (l.wrap === "circle") {
      parts.push(
        `<circle cx="${r(l.x * CW)}" cy="${r(l.y * CH)}" r="${r(boxW / 2)}" ` +
        `fill="${OVERLAY_STYLE.logoCardFill}" filter="url(#ovl-cardShadow)"/>`,
      );
    } else if (l.wrap !== "none") {
      parts.push(
        `<rect x="${r(boxX)}" y="${r(boxY)}" width="${r(boxW)}" height="${r(boxH)}" ` +
        `rx="${OVERLAY_STYLE.logoCardRadius}" ry="${OVERLAY_STYLE.logoCardRadius}" ` +
        `fill="${OVERLAY_STYLE.logoCardFill}" filter="url(#ovl-cardShadow)"/>`,
      );
    }

    const pad = logoInnerPadPx(l.wrap, boxW);
    const innerSvgMarkup = decodeSvgDataUri(l.href);
    const prepared = innerSvgMarkup !== null ? prepareNestedSvg(innerSvgMarkup) : null;
    if (prepared) {
      parts.push(
        `<svg x="${r(boxX + pad)}" y="${r(boxY + pad)}" width="${r(boxW - pad * 2)}" ` +
        `height="${r(boxH - pad * 2)}" viewBox="${escapeXml(prepared.viewBox)}" preserveAspectRatio="xMidYMid meet">${prepared.markup}</svg>`,
      );
    } else {
      parts.push(
        `<image x="${r(boxX + pad)}" y="${r(boxY + pad)}" width="${r(boxW - pad * 2)}" ` +
        `height="${r(boxH - pad * 2)}" href="${escapeXml(l.href)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">
  <defs>
    <filter id="ovl-cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.18"/>
    </filter>
    <filter id="ovl-textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.75"/>
    </filter>
  </defs>
  <image x="0" y="0" width="${CW}" height="${CH}" href="${escapeXml(opts.baseHref)}" preserveAspectRatio="xMidYMid slice"/>
  ${parts.join("\n  ")}
</svg>`;
}
