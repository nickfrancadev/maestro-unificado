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
    const filter = t.backdrop === "shadow" ? ` filter="url(#textShadow)"` : "";
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
        `fill="${OVERLAY_STYLE.logoCardFill}" filter="url(#cardShadow)"/>`,
      );
    } else if (l.wrap !== "none") {
      parts.push(
        `<rect x="${r(boxX)}" y="${r(boxY)}" width="${r(boxW)}" height="${r(boxH)}" ` +
        `rx="${OVERLAY_STYLE.logoCardRadius}" ry="${OVERLAY_STYLE.logoCardRadius}" ` +
        `fill="${OVERLAY_STYLE.logoCardFill}" filter="url(#cardShadow)"/>`,
      );
    }

    const pad = logoInnerPadPx(l.wrap, boxW);
    parts.push(
      `<image x="${r(boxX + pad)}" y="${r(boxY + pad)}" width="${r(boxW - pad * 2)}" ` +
      `height="${r(boxH - pad * 2)}" href="${l.href}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.18"/>
    </filter>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.75"/>
    </filter>
  </defs>
  <image x="0" y="0" width="${CW}" height="${CH}" href="${opts.baseHref}" preserveAspectRatio="xMidYMid slice"/>
  ${parts.join("\n  ")}
</svg>`;
}
