// Modelo de layout do overlay do anúncio.
//
// Vive fora de `types.ts` porque é a única parte da configuração de imagem lida
// por DOIS renderizadores: o preview em DOM (`OverlayCanvas.tsx`) e o resvg no
// servidor (`overlaySvg.ts`). As funções puras daqui são o contrato que faz os
// dois caírem no mesmo pixel.
//
// Convenções válidas em todo o módulo:
//   - `x`/`y` são frações 0–1 do canvas e apontam para o CENTRO da camada.
//   - `sizePx` é absoluto, em px do canvas de referência. Os DOIS formatos têm
//     1200 de largura, então o número que a UI mostra é o número que o
//     servidor usa — sem conversão no meio.

export type AdFormat = 'square' | 'banner';
export type LogoWrap = 'circle' | 'square' | 'rect' | 'none';
export type TextBackdrop = 'box' | 'shadow' | 'none';

export interface TextLayer {
  x: number;
  y: number;
  sizePx: number;
  color: string;
  backdrop: TextBackdrop;
}

export interface LogoLayer {
  enabled: boolean;
  x: number;
  y: number;
  sizePx: number;   // LARGURA do wrap; a altura sai de LOGO_WRAP_ASPECT
  wrap: LogoWrap;
}

export interface OverlayLayout {
  destaque: TextLayer;
  complementar: TextLayer;
  advertiserLogo: LogoLayer;  // "Meu logo"      → brandKit.logo
  targetLogo: LogoLayer;      // "Logo da conta" → logo.dev
  paired: boolean;            // atalho co-branded
}

/** Retângulo em px do canvas de referência, ancorado no canto superior esquerdo. */
export interface Rect { x: number; y: number; w: number; h: number }

export const AD_FORMAT_SIZE: Record<AdFormat, { w: number; h: number }> = {
  square: { w: 1200, h: 1200 },
  banner: { w: 1200, h: 628 },
};

// ESPELHADO em `supabase/functions/make-server-a4d5bbe0/overlaySvg.ts`.
// O edge function roda em Deno e não pode importar de `src/`, então a
// duplicação é inevitável — `overlayLayout.test.ts` importa os dois módulos e
// falha se algum número divergir.
export const OVERLAY_STYLE = {
  boxPadX: 22,
  boxPadY: 12,
  boxRadius: 14,
  boxFill: 'rgba(0,0,0,0.55)',
  logoCardFill: '#FFFFFF',
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

/** Gap entre os dois logos no modo par, em px do canvas de referência. */
export const PAIR_GAP_PX = 28;

// Defaults que APROXIMAM o visual anterior (texto no canto superior esquerdo,
// logo da conta no superior direito). Não reproduzem ao pixel: as constantes
// antigas eram ancoradas à esquerda e este modelo é centro-ancorado, então o x
// exato dependeria do comprimento do texto. Ver spec §1.
export function createDefaultOverlayLayout(showTargetLogo = true): OverlayLayout {
  return {
    destaque:       { x: 0.30, y: 0.14, sizePx: 56, color: '#FFFFFF', backdrop: 'box' },
    complementar:   { x: 0.30, y: 0.26, sizePx: 28, color: '#FFFFFF', backdrop: 'box' },
    advertiserLogo: { enabled: false, x: 0.14, y: 0.85, sizePx: 140, wrap: 'rect' },
    targetLogo:     { enabled: showTargetLogo, x: 0.86, y: 0.15, sizePx: 140, wrap: 'square' },
    paired: false,
  };
}

// Campanhas salvas antes do editor não têm `layout`. `showTargetLogo` era a
// única expressão de "leva logo da conta?" e precisa sobreviver à migração.
export function withLayoutDefaults(
  layout: OverlayLayout | undefined,
  showTargetLogo: boolean | undefined,
): OverlayLayout {
  return layout ?? createDefaultOverlayLayout(showTargetLogo ?? true);
}

export function textLayerRect(layer: TextLayer, textWidthPx: number, format: AdFormat): Rect {
  const { w: cw, h: ch } = AD_FORMAT_SIZE[format];
  const w = textWidthPx + OVERLAY_STYLE.boxPadX * 2;
  const h = layer.sizePx + OVERLAY_STYLE.boxPadY * 2;
  return { x: layer.x * cw - w / 2, y: layer.y * ch - h / 2, w, h };
}

export function logoLayerRect(layer: LogoLayer, format: AdFormat): Rect {
  const { w: cw, h: ch } = AD_FORMAT_SIZE[format];
  const w = layer.sizePx;
  const h = layer.sizePx / LOGO_WRAP_ASPECT[layer.wrap];
  return { x: layer.x * cw - w / 2, y: layer.y * ch - h / 2, w, h };
}

// Padding interno do wrap. O círculo precisa de mais folga que o retângulo
// porque a área útil inscrita é menor; 'none' não tem cartão para respeitar.
export function logoInnerPadPx(wrap: LogoWrap, boxW: number): number {
  if (wrap === 'none') return 0;
  const ratio = wrap === 'circle' ? OVERLAY_STYLE.padRatioCircle : OVERLAY_STYLE.padRatioDefault;
  return boxW * ratio;
}

// Trava o CENTRO para que a bounding box inteira fique dentro do canvas.
export function clampCenter(
  x: number, y: number, boxW: number, boxH: number, format: AdFormat,
): { x: number; y: number } {
  const { w: cw, h: ch } = AD_FORMAT_SIZE[format];
  const halfX = boxW / 2 / cw;
  const halfY = boxH / 2 / ch;
  // Caixa maior que o canvas: centraliza. Sem esta guarda o clamp teria
  // min > max e devolveria lixo.
  return {
    x: halfX * 2 >= 1 ? 0.5 : Math.min(Math.max(x, halfX), 1 - halfX),
    y: halfY * 2 >= 1 ? 0.5 : Math.min(Math.max(y, halfY), 1 - halfY),
  };
}

export const MIN_TEXT_SIZE_PX = 16;
export const MAX_TEXT_SIZE_PX = 160;

// Maior `sizePx` em que o texto ainda cabe na largura do canvas, dada a largura
// já medida em `atSizePx`. A largura de um texto é linear no tamanho da fonte,
// então uma regra de três basta — não precisa remedir a cada passo do slider.
export function maxTextSizePx(
  measuredWidthPx: number,
  atSizePx: number,
  format: AdFormat,
): number {
  if (measuredWidthPx <= 0 || atSizePx <= 0) return MAX_TEXT_SIZE_PX;
  const disponivel = AD_FORMAT_SIZE[format].w - OVERLAY_STYLE.boxPadX * 2;
  const cabe = Math.floor((disponivel / measuredWidthPx) * atSizePx);
  return Math.max(MIN_TEXT_SIZE_PX, Math.min(MAX_TEXT_SIZE_PX, cabe));
}

export function pairedTargetLayer(advertiser: LogoLayer, format: AdFormat): LogoLayer {
  const { w: cw } = AD_FORMAT_SIZE[format];
  return {
    ...advertiser,
    enabled: true,
    x: advertiser.x + (advertiser.sizePx + PAIR_GAP_PX) / cw,
  };
}

// Layout EFETIVO: no modo par o logo da conta deixa de ser independente e passa
// a ser derivado do anunciante. Preview e payload chamam isto, nunca o layout
// cru — é o que garante que a imagem gerada seja a que estava na tela.
export function effectiveLayout(layout: OverlayLayout, format: AdFormat): OverlayLayout {
  if (!layout.paired) return layout;
  return {
    ...layout,
    advertiserLogo: { ...layout.advertiserLogo, enabled: true },
    targetLogo: pairedTargetLayer(layout.advertiserLogo, format),
  };
}
