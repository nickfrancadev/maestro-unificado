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
export type BackdropMode = 'box' | 'shadow' | 'none';
export type TextAlign = 'left' | 'center' | 'right';

// A caixa atrás do texto tem controles próprios: ela é o que torna o texto
// legível sobre uma foto qualquer, e "preto 55%" não serve para toda arte.
export interface TextBackdrop {
  mode: BackdropMode;
  color: string;        // hex da caixa
  opacity: number;      // 0–100
  radius: number;       // arredondamento, px do canvas de referência
  borderColor: string;  // hex do contorno
  borderWidth: number;  // 0 = sem contorno
}

export interface TextLayer {
  x: number;
  y: number;
  sizePx: number;
  color: string;
  // `x` é a ÂNCORA, e o que ela significa depende do alinhamento: borda
  // esquerda da caixa em 'left', centro em 'center', borda direita em
  // 'right'. `y` continua sempre o centro vertical.
  align: TextAlign;
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
  paired: boolean;            // co-branded: os dois num cartão só
  // Os dois textos são um BLOCO: o complementar não tem posição própria, ele
  // é ancorado ao destaque com esta distância vertical entre as duas caixas.
  // Sem âncora, "espaçamento" entre dois pontos livres seria só mover um.
  textGapPx: number;
}

/** Retângulo em px do canvas de referência, ancorado no canto superior esquerdo. */
export interface Rect { x: number; y: number; w: number; h: number }

export const AD_FORMAT_SIZE: Record<AdFormat, { w: number; h: number }> = {
  square: { w: 1200, h: 1200 },
  banner: { w: 1200, h: 628 },
};

// Classe Tailwind do aspect-ratio do canvas, por formato — usada no preview
// (CreativeStep.tsx) e nos dois branches do OverlayCanvas (com e sem
// imagem-base). Strings literais de propósito, não montadas a partir de
// `AD_FORMAT_SIZE`: o scanner do Tailwind lê o texto-fonte, não executa JS,
// então uma classe arbitrária construída em runtime (`aspect-[${w}/${h}]`)
// não seria encontrada e o CSS não seria gerado.
export function aspectClass(format: AdFormat): string {
  return format === 'square' ? 'aspect-[1200/1200]' : 'aspect-[1200/628]';
}

// ESPELHADO em `supabase/functions/make-server-a4d5bbe0/overlaySvg.ts`.
// O edge function roda em Deno e não pode importar de `src/`, então a
// duplicação é inevitável — `overlayLayout.test.ts` (bloco "paridade cliente
// ↔ servidor") importa os dois módulos, falha se algum número aqui divergir
// do espelho, e compara também a geometria de `textLayerRect`/`logoLayerRect`
// contra o `<rect>` que `buildOverlaySvg` de fato escreve no SVG do servidor.
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
  // Lockup co-branded: respiro interno e espessura do divisor entre os dois
  // logos dentro do cartão único.
  pairDividerWidth: 2,
  pairDividerColor: '#CBD5E1',
} as const;

export const LOGO_WRAP_ASPECT: Record<LogoWrap, number> = {
  circle: 1,
  square: 1,
  none: 1,
  rect: OVERLAY_STYLE.rectWrapAspect,
};


// Defaults que APROXIMAM o visual anterior (texto no canto superior esquerdo,
// logo da conta no superior direito). Não reproduzem ao pixel: as constantes
// antigas eram ancoradas à esquerda e este modelo é centro-ancorado, então o x
// exato dependeria do comprimento do texto. Ver spec §1.
// Reproduz o visual anterior (preto 55%, raio 14, sem contorno), que era
// hardcoded quando `backdrop` ainda era só a string do modo.
export function createDefaultBackdrop(mode: BackdropMode = 'box'): TextBackdrop {
  return { mode, color: '#000000', opacity: 55, radius: OVERLAY_STYLE.boxRadius, borderColor: '#FFFFFF', borderWidth: 0 };
}

export function createDefaultOverlayLayout(showTargetLogo = true): OverlayLayout {
  return {
    destaque:       { x: 0.30, y: 0.14, sizePx: 56, color: '#FFFFFF', align: 'center', backdrop: createDefaultBackdrop() },
    // x/y do complementar são DERIVADOS do destaque em `effectiveLayout`;
    // os valores aqui são só o ponto de partida antes da primeira derivação.
    complementar:   { x: 0.30, y: 0.26, sizePx: 28, color: '#FFFFFF', align: 'center', backdrop: createDefaultBackdrop() },
    advertiserLogo: { enabled: false, x: 0.14, y: 0.85, sizePx: 140, wrap: 'rect' },
    targetLogo:     { enabled: showTargetLogo, x: 0.86, y: 0.15, sizePx: 140, wrap: 'square' },
    paired: false,
    textGapPx: 12,
  };
}

// Campanhas salvas antes do editor não têm `layout`. `showTargetLogo` era a
// única expressão de "leva logo da conta?" e precisa sobreviver à migração.
export function withLayoutDefaults(
  layout: OverlayLayout | undefined,
  showTargetLogo: boolean | undefined,
): OverlayLayout {
  if (!layout) return createDefaultOverlayLayout(showTargetLogo ?? true);
  return {
    ...layout,
    destaque: withTextLayerDefaults(layout.destaque),
    complementar: withTextLayerDefaults(layout.complementar),
    textGapPx: layout.textGapPx ?? 12,
  };
}

// Camadas de texto salvas antes destes campos têm `backdrop` como STRING
// ('box' | 'shadow' | 'none') e nenhum `align`. Perder a escolha de fundo de
// uma campanha já montada seria mudar o anúncio pelas costas do usuário.
export function withTextLayerDefaults(layer: TextLayer | undefined): TextLayer {
  const base = layer ?? { x: 0.30, y: 0.14, sizePx: 56, color: '#FFFFFF' } as TextLayer;
  const raw = base.backdrop as unknown;
  const backdrop = typeof raw === 'string'
    ? createDefaultBackdrop(raw as BackdropMode)
    : { ...createDefaultBackdrop(), ...(raw as Partial<TextBackdrop> | undefined) };
  return { ...base, align: base.align ?? 'center', backdrop };
}

// Deslocamento da caixa em relação à âncora, por alinhamento: 0 quando a
// âncora É a borda esquerda, metade quando é o centro, tudo quando é a borda
// direita. É a única peça que precisa saber o que `align` significa — DOM e
// SVG derivam a posição daqui.
export function alignOffsetPx(align: TextAlign, boxW: number): number {
  return align === 'left' ? 0 : align === 'right' ? boxW : boxW / 2;
}

export function textLayerRect(layer: TextLayer, textWidthPx: number, format: AdFormat): Rect {
  const { w: cw, h: ch } = AD_FORMAT_SIZE[format];
  const w = textWidthPx + OVERLAY_STYLE.boxPadX * 2;
  const h = layer.sizePx + OVERLAY_STYLE.boxPadY * 2;
  return { x: layer.x * cw - alignOffsetPx(layer.align, w), y: layer.y * ch - h / 2, w, h };
}

// Altura da caixa de um texto — não depende da medição, só do tamanho da
// fonte. É o que permite derivar a posição do complementar sem medir nada.
export function textBoxHeightPx(sizePx: number): number {
  return sizePx + OVERLAY_STYLE.boxPadY * 2;
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
// Trava a âncora de um texto: com `align` a caixa não é centrada no x, então
// clampar como se fosse empurrava a borda para fora e travava o arrasto para
// um dos lados. O que tem de caber é a CAIXA, não a âncora.
export function clampTextAnchor(
  x: number, y: number, boxW: number, boxH: number, format: AdFormat, align: TextAlign,
): { x: number; y: number } {
  const { w: cw, h: ch } = AD_FORMAT_SIZE[format];
  const offset = alignOffsetPx(align, boxW);
  const minX = offset / cw;
  const maxX = (cw - boxW + offset) / cw;
  const halfY = boxH / 2 / ch;
  return {
    x: boxW >= cw ? minX : Math.min(Math.max(x, minX), maxX),
    y: halfY * 2 >= 1 ? 0.5 : Math.min(Math.max(y, halfY), 1 - halfY),
  };
}

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
  const availableWidthPx = AD_FORMAT_SIZE[format].w - OVERLAY_STYLE.boxPadX * 2;
  const fittingSizePx = Math.floor((availableWidthPx / measuredWidthPx) * atSizePx);
  return Math.max(MIN_TEXT_SIZE_PX, Math.min(MAX_TEXT_SIZE_PX, fittingSizePx));
}


// Larguras medidas dos dois textos, NO TAMANHO GRAVADO (`layer.sizePx`, não
// o efetivo — seria circular). Quem mede é sempre quem vai desenhar (preview
// em DOM, resvg no servidor), porque a medição depende da fonte carregada.
export interface MeasuredTextWidths {
  destaqueWidthPx: number;
  complementarWidthPx: number;
}

// Tamanho efetivo de UMA camada de texto: o valor gravado, clampado pelo teto
// vivo dado quanto o texto mede nesse tamanho. Puramente derivado — não
// escreve nada em lugar nenhum. É a peça que o card (badge/slider) e o
// preview/payload (via `effectiveLayout` abaixo) compartilham, para nunca
// divergirem sobre "que tamanho isso realmente renderiza".
//
// Escolhido DERIVAR em vez de gravar depois que persistir o clamp (numa
// versão anterior, via efeito) se mostrou destrutivo: abrir uma empresa cujo
// layout herdado do template já estava acima do teto criava um override
// SOZINHO, sem nenhuma ação do usuário — e como o clamp reaparecia a cada
// render, "Voltar ao template" nunca conseguia limpar o override que ele
// mesmo recriava. Derivar elimina a escrita: "pedi 160; com este texto
// renderiza 80; encurto o texto e recupero 160" — sem perder o valor que o
// usuário escolheu.
export function effectiveTextSize(layer: TextLayer, measuredWidthPx: number, format: AdFormat): number {
  return Math.min(layer.sizePx, maxTextSizePx(measuredWidthPx, layer.sizePx, format));
}

// Layout EFETIVO: no modo par a GEOMETRIA do logo da conta deixa de ser
// independente (x/y/sizePx/wrap seguem o anunciante). `enabled` continua
// sendo de cada camada — "Agrupar como par" liga os dois no clique porque é
// um pedido explícito do usuário, mas depois disso desmarcar um checkbox tem
// que desligar o logo de verdade, mesmo com paired=true.
//
// `measured`, se vier, também deriva `destaque.sizePx`/`complementar.sizePx`
// pelo teto vivo (ver `effectiveTextSize`). Omitido, os dois textos saem como
// estão gravados — quem não mede (ainda) não quebra.
//
// Preview e payload chamam isto, nunca o layout cru — é o que garante que a
// imagem gerada seja a que estava na tela.
export function effectiveLayout(
  layout: OverlayLayout,
  format: AdFormat,
  measured?: MeasuredTextWidths,
): OverlayLayout {
  let result = layout;

  // No lockup os dois logos ocupam o MESMO retângulo — o cartão único que os
  // renderizadores desenham com os dois lado a lado e um divisor no meio.
  // Igualar a geometria aqui é o que faz DOM e SVG concordarem sem cada um
  // reinventar a conta.
  if (layout.paired) {
    result = {
      ...result,
      targetLogo: {
        ...layout.targetLogo,
        x: layout.advertiserLogo.x,
        y: layout.advertiserLogo.y,
        sizePx: layout.advertiserLogo.sizePx,
        wrap: layout.advertiserLogo.wrap,
      },
    };
  }

  // O tamanho efetivo precisa sair ANTES da posição do complementar: é a
  // altura das caixas (que depende do tamanho já clampado) que define onde a
  // segunda linha cai.
  if (measured) {
    result = {
      ...result,
      destaque: { ...result.destaque, sizePx: effectiveTextSize(layout.destaque, measured.destaqueWidthPx, format) },
      complementar: { ...result.complementar, sizePx: effectiveTextSize(layout.complementar, measured.complementarWidthPx, format) },
    };
  }

  return { ...result, complementar: stackedComplementar(result, format) };
}

// Posição DERIVADA do complementar: mesma âncora horizontal do destaque, e
// logo abaixo dele com `textGapPx` entre as duas caixas. O complementar não
// tem posição própria — arrastar o destaque leva os dois.
export function stackedComplementar(layout: OverlayLayout, format: AdFormat): TextLayer {
  const { h: ch } = AD_FORMAT_SIZE[format];
  const gap = layout.textGapPx ?? 0;
  const halfDestaque = textBoxHeightPx(layout.destaque.sizePx) / 2;
  const halfComplementar = textBoxHeightPx(layout.complementar.sizePx) / 2;
  return {
    ...layout.complementar,
    x: layout.destaque.x,
    y: layout.destaque.y + (halfDestaque + gap + halfComplementar) / ch,
  };
}
