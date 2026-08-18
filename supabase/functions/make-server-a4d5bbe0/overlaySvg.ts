// Construção do SVG do overlay do anúncio.
//
// Puro DE PROPÓSITO: nada de Deno, nada de `npm:`, nada de rede — assim roda no
// Vitest junto com o resto do projeto, mesmo arranjo de `tokenLifecycle.ts`. A
// rasterização com resvg fica em `index.ts`, que é quem tem as dependências.
//
// As constantes abaixo ESPELHAM `src/app/campaigns/wizard/overlayLayout.ts`.
// O edge function não pode importar de `src/`, então a duplicação é
// inevitável. `overlayLayout.test.ts` (bloco "paridade cliente ↔ servidor")
// compara essas constantes com o cliente E, à parte, a geometria que este
// arquivo reescreve à mão dentro de `buildOverlaySvg` — boxW/boxH/x/y de
// texto e de logo — contra o `Rect` que `textLayerRect`/`logoLayerRect`
// devolvem no cliente. NÃO cobre tudo: o círculo do logo (cx/cy/r, sem
// `<rect>`), a baseline do `<text>`, o padding interno do wrap e o viewBox
// seguem sem checagem cruzada.

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
  // Desliga o caminho de `<svg>` aninhado inteiro — todo logo vai por
  // `<image href="${escapeXml(...)}">`, mesmo que seja um SVG que passaria
  // em `looksWellFormed`. `looksWellFormed` é uma checagem barata, não um
  // parser XML; pode deixar passar má-formação que só o resvg detecta de
  // verdade (ex.: prefixo de namespace não declarado). `index.ts` usa esta
  // opção como segunda camada de defesa: se a rasterização com SVG aninhado
  // lançar, recompõe com `forceImageLogos: true` e tenta de novo — sempre
  // produz XML válido, mesmo que algum logo específico não renderize.
  forceImageLogos?: boolean;
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
// `url("...")`), tão comum quanto a variante com aspas duplas. Exige espaço
// (não só "limite de palavra") antes do nome: `\b` casava dentro de
// `stroke-width` ou `data-width` (o "-" já é limite de palavra), lendo o
// valor errado e derivando um viewBox absurdo — mesmo critério de `stripAttr`.
function getAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s+${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
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

// Um token de tag encontrado por `scanTags`.
interface ScannedTag {
  name: string;
  kind: "open" | "close" | "self";
  raw: string;
}

// Percorre o markup tag a tag, pulando comentários e CDATA e respeitando
// aspas dentro de atributos (para não confundir um '>' de um valor de
// atributo com o fim da tag). NÃO é um parser XML completo — não entende
// namespace nem DTD — mas é o suficiente para as checagens estruturais logo
// abaixo. Devolve `null` se achar uma tag/comentário/CDATA sem fechamento,
// em vez de adivinhar; nunca fica presa (cada ramo avança `i` para frente).
function scanTags(markup: string): ScannedTag[] | null {
  const tags: ScannedTag[] = [];
  let i = 0;
  const n = markup.length;
  while (i < n) {
    const lt = markup.indexOf("<", i);
    if (lt === -1) break;
    if (markup.startsWith("<!--", lt)) {
      const end = markup.indexOf("-->", lt);
      if (end === -1) return null;
      i = end + 3;
      continue;
    }
    if (markup.startsWith("<![CDATA[", lt)) {
      const end = markup.indexOf("]]>", lt);
      if (end === -1) return null;
      i = end + 3;
      continue;
    }
    let j = lt + 1;
    let quote: string | null = null;
    let gt = -1;
    while (j < n) {
      const ch = markup[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        gt = j;
        break;
      }
      j++;
    }
    if (gt === -1) return null;
    const raw = markup.slice(lt, gt + 1);
    const isClose = raw[1] === "/";
    const isSelf = !isClose && raw[raw.length - 2] === "/";
    const nameMatch = raw.match(isClose ? /^<\/\s*([^\s>/]+)/ : /^<\s*([^\s>/]+)/);
    if (!nameMatch) return null;
    tags.push({ name: nameMatch[1], kind: isClose ? "close" : isSelf ? "self" : "open", raw });
    i = gt + 1;
  }
  return tags;
}

// Um "=" fora de aspas que não é seguido por aspas é valor sem aspas
// (`width=10`) — o resvg rejeita.
function hasUnquotedAttr(raw: string): boolean {
  let quote: string | null = null;
  for (let k = 0; k < raw.length; k++) {
    const ch = raw[k];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "=" && raw[k + 1] !== '"' && raw[k + 1] !== "'") return true;
  }
  return false;
}

// O mesmo atributo não pode aparecer duas vezes na mesma tag.
function hasDuplicateAttr(raw: string): boolean {
  const names: string[] = [];
  const re = /\s([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"[^"]*"|'[^']*')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) names.push(m[1].toLowerCase());
  return new Set(names).size !== names.length;
}

// Checagem estrutural: profundidade de abertura/fechamento com o NOME
// batendo. Fecha o furo do round 1 — `opens === closes` (contagem crua de
// "<"/">") se CANCELA: uma tag de abertura a mais e uma de fechamento a
// menos dão a mesma contagem total, mas são documentos diferentes (tag que
// nunca fecha, fecha com nome errado, fecha algo que nunca abriu). Também
// pega atributo sem aspas e atributo duplicado, que não mudam a contagem de
// tags mas também invalidam o XML.
//
// NÃO cobre tudo — prefixo de namespace não declarado (`<foo:bar/>`), por
// exemplo, passa por aqui sem ser pego. Esse resíduo é aceito de propósito:
// tentar prever mais casos por regex foi o que causou os furos anteriores.
// A segunda camada de defesa (retry com `forceImageLogos` em `index.ts`
// quando o resvg rejeita o documento de verdade) cobre o que esta função
// não prevê.
function structureLooksSane(markup: string): boolean {
  const tags = scanTags(markup);
  if (!tags) return false;
  const stack: string[] = [];
  for (const tag of tags) {
    if (tag.kind !== "close" && (hasUnquotedAttr(tag.raw) || hasDuplicateAttr(tag.raw))) {
      return false;
    }
    if (tag.kind === "self") continue;
    if (tag.kind === "open") {
      stack.push(tag.name);
    } else if (stack.pop() !== tag.name) {
      return false;
    }
  }
  return stack.length === 0;
}

// Checagem BARATA de boa-formação — de propósito, não é um parser XML (foi
// tentar validar SVG por regex que causou os bugs dos rounds anteriores). Só
// pega os sinais mais comuns de origem não confiável — download truncado,
// página de erro HTML servida com content-type errado, entidade não
// escapada, tag mal-fechada/mal-aninhada, atributo duplicado ou sem aspas —
// e, ao encontrar qualquer um deles, desiste. O caminho seguro é o default
// na dúvida: cair no `<image href="${escapeXml(...)}">` de sempre, que
// sempre produz XML válido mesmo que o logo não renderize, em vez de
// arriscar um `<svg>` aninhado malformado que derruba a composição inteira
// no resvg.
function looksWellFormed(markup: string): boolean {
  const trimmed = markup.trim();
  if (!/^<svg\b/i.test(trimmed)) return false;
  if (!/<\/svg>\s*$/i.test(trimmed)) return false;
  if (/<!DOCTYPE|<\?/i.test(trimmed)) return false;
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(trimmed)) return false;
  if (!structureLooksSane(trimmed)) return false;
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
    const innerSvgMarkup = opts.forceImageLogos ? null : decodeSvgDataUri(l.href);
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
