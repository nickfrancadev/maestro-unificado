# Editor de Overlay do Card Imagem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o card Imagem do Step Criativo aceitar upload antes dos textos, refletir o formato escolhido no preview e no PNG final, e deixar o usuário posicionar texto e dois logos (anunciante + conta-alvo) arrastando sobre a imagem-base.

**Architecture:** Um único `OverlayLayout` com coordenadas normalizadas (0–1, centro-ancoradas) e tamanhos em px sobre um canvas de referência de 1200 de largura. O preview em DOM e o construtor de SVG do servidor leem os mesmos números — nenhuma coordenada é calculada duas vezes de formas diferentes. A lógica pura vive em dois módulos sem dependência de framework (`overlayLayout.ts` no cliente, `overlaySvg.ts` no servidor), com um teste de paridade que falha se as constantes de estilo divergirem.

**Tech Stack:** React 18 + TypeScript + Tailwind (Vite), Vitest + Testing Library (jsdom para `.test.tsx`, node para `.test.ts`), Supabase Edge Functions (Deno) + `@resvg/resvg-wasm` 2.6.2.

**Spec:** [../specs/2026-08-18-editor-overlay-imagem-design.md](../specs/2026-08-18-editor-overlay-imagem-design.md)

## Global Constraints

- **Branch:** `feat/criativo-editor-overlay` (já criada, com o spec commitado).
- **Canvas de referência:** largura **1200** nos dois formatos. `square` = 1200×1200, `banner` = 1200×628.
- **Coordenadas:** `x`/`y` são frações **0–1** do canvas e apontam para o **centro** da camada. `sizePx` é **absoluto**, em px do canvas de referência.
- **Texto é sempre de linha única e centro-ancorado.** Sem alinhamento configurável, sem multi-linha. Fora de escopo.
- **Idioma:** UI e comentários de código em **pt-BR**, seguindo os arquivos vizinhos. Nomes de identificadores em inglês, como no resto do wizard.
- **Paleta:** laranja de ação `#FF5F39`, hover `#E54A26`, fundo suave `#FFF1ED`, borda suave `#FFE3DA`.
- **O edge function não pode importar de `src/`.** Constantes compartilhadas são duplicadas e a paridade é garantida por teste.
- **Comando de teste:** `npx vitest run <caminho>` para um arquivo; `npm test` para tudo.
- **Cada task termina em commit.** Mensagens em pt-BR, prefixo `feat(criativo):` / `test(criativo):` / `refactor(criativo):`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/app/campaigns/wizard/overlayLayout.ts` **(criar)** | Tipos e funções puras do layout: defaults, tamanhos de formato, bounding boxes, clamp, modo par. Owner de `AdFormat`. |
| `src/app/campaigns/wizard/overlayLayout.test.ts` **(criar)** | Testes puros + guarda de paridade com o módulo do servidor. |
| `src/app/campaigns/wizard/OverlayCanvas.tsx` **(criar)** | Editor visual: desenha as camadas sobre a imagem-base, arrasta, seleciona. Não conhece template nem empresa. |
| `src/app/campaigns/wizard/OverlayCanvas.test.tsx` **(criar)** | Testes de render, seleção e arrasto. |
| `src/app/campaigns/wizard/types.ts` | Passa a hospedar `layout` em `TemplateLogoConfig`, `CompanyCreativeOverride` e `ResolvedImageConfig`. Re-exporta `AdFormat`. |
| `src/app/campaigns/wizard/types.overlay.test.ts` **(criar)** | Resolução herda/sobrescreve e migração de `showTargetLogo`. |
| `src/app/campaigns/wizard/CreativeStep.tsx` | Reordena o card, adiciona os controles, troca o slot de imagem do preview pelo editor. |
| `src/app/campaigns/wizard/CreativeStep.overlay.test.tsx` **(criar)** | Testes de integração do card + preview. |
| `src/lib/ai.ts` | Contrato de `composeLogoOverlay` e `generateBaseImage`. |
| `supabase/functions/make-server-a4d5bbe0/overlaySvg.ts` **(criar)** | Construção pura do SVG do overlay. Zero Deno, zero `npm:`. |
| `supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts` **(criar)** | Testes do SVG gerado. |
| `supabase/functions/make-server-a4d5bbe0/index.ts` | Passa a usar `overlaySvg.ts`, resolve o logo do anunciante, parametriza o canvas. |
| `src/app/campaigns/wizard/brandKit.ts` | Nenhuma task o modifica. Se a verificação da **Task 3** falhar, o fallback dela resolve em `overlaySvg.ts` + handler, sem tocar aqui. |

A ordem das tasks põe o **servidor antes da UI** de propósito: o risco de o resvg não renderizar o logo do anunciante (spec §5) mata metade da feature, e precisa ser descoberto cedo.

---

### Task 1: Modelo puro de layout

**Files:**
- Create: `src/app/campaigns/wizard/overlayLayout.ts`
- Test: `src/app/campaigns/wizard/overlayLayout.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AdFormat`, `LogoWrap`, `TextBackdrop`, `TextLayer`, `LogoLayer`, `OverlayLayout`, `Rect`, `AD_FORMAT_SIZE`, `OVERLAY_STYLE`, `LOGO_WRAP_ASPECT`, `PAIR_GAP_PX`, `createDefaultOverlayLayout(showTargetLogo?: boolean): OverlayLayout`, `withLayoutDefaults(layout: OverlayLayout | undefined, showTargetLogo: boolean | undefined): OverlayLayout`, `textLayerRect(layer: TextLayer, textWidthPx: number, format: AdFormat): Rect`, `logoLayerRect(layer: LogoLayer, format: AdFormat): Rect`, `logoInnerPadPx(wrap: LogoWrap, boxW: number): number`, `clampCenter(x: number, y: number, boxW: number, boxH: number, format: AdFormat): { x: number; y: number }`, `pairedTargetLayer(advertiser: LogoLayer, format: AdFormat): LogoLayer`, `effectiveLayout(layout: OverlayLayout, format: AdFormat): OverlayLayout`, `maxTextSizePx(measuredWidthPx: number, atSizePx: number, format: AdFormat): number`, `MIN_TEXT_SIZE_PX`, `MAX_TEXT_SIZE_PX`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/campaigns/wizard/overlayLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  AD_FORMAT_SIZE,
  createDefaultOverlayLayout,
  withLayoutDefaults,
  textLayerRect,
  logoLayerRect,
  clampCenter,
  pairedTargetLayer,
  effectiveLayout,
  maxTextSizePx,
  OVERLAY_STYLE,
  LOGO_WRAP_ASPECT,
  PAIR_GAP_PX,
} from './overlayLayout';

describe('createDefaultOverlayLayout', () => {
  it('nasce com o logo do anunciante DESLIGADO — brandKit.logo é null por default, e ligá-lo mostraria um buraco', () => {
    expect(createDefaultOverlayLayout().advertiserLogo.enabled).toBe(false);
  });

  it('herda o "leva logo da conta?" do showTargetLogo legado', () => {
    expect(createDefaultOverlayLayout(true).targetLogo.enabled).toBe(true);
    expect(createDefaultOverlayLayout(false).targetLogo.enabled).toBe(false);
  });

  it('põe destaque e complementar no mesmo x, para empilharem alinhados', () => {
    const l = createDefaultOverlayLayout();
    expect(l.destaque.x).toBe(l.complementar.x);
    expect(l.destaque.y).toBeLessThan(l.complementar.y);
  });
});

describe('withLayoutDefaults', () => {
  it('devolve o layout salvo quando existe', () => {
    const saved = createDefaultOverlayLayout();
    saved.destaque.sizePx = 99;
    expect(withLayoutDefaults(saved, true).destaque.sizePx).toBe(99);
  });

  // Campanhas salvas antes do editor não têm `layout`; `showTargetLogo` era a
  // única expressão de "leva logo da conta?" e não pode ser perdida.
  it('migra showTargetLogo=false de campanha antiga', () => {
    expect(withLayoutDefaults(undefined, false).targetLogo.enabled).toBe(false);
  });

  it('assume que leva logo quando nem layout nem showTargetLogo existem', () => {
    expect(withLayoutDefaults(undefined, undefined).targetLogo.enabled).toBe(true);
  });
});

describe('textLayerRect', () => {
  it('centraliza a caixa no ponto da camada, com o padding dos dois lados', () => {
    const layer = { x: 0.5, y: 0.5, sizePx: 50, color: '#FFF', backdrop: 'box' as const };
    const r = textLayerRect(layer, 200, 'banner');
    expect(r.w).toBe(200 + OVERLAY_STYLE.boxPadX * 2);
    expect(r.h).toBe(50 + OVERLAY_STYLE.boxPadY * 2);
    expect(r.x).toBe(600 - r.w / 2);
    expect(r.y).toBe(314 - r.h / 2);
  });
});

describe('logoLayerRect', () => {
  it('wrap quadrado e circular são 1:1', () => {
    const base = { enabled: true, x: 0.5, y: 0.5, sizePx: 140 };
    expect(logoLayerRect({ ...base, wrap: 'square' }, 'square').h).toBe(140);
    expect(logoLayerRect({ ...base, wrap: 'circle' }, 'square').h).toBe(140);
  });

  it('wrap retangular usa sizePx como LARGURA e deriva a altura', () => {
    const r = logoLayerRect({ enabled: true, x: 0.5, y: 0.5, sizePx: 250, wrap: 'rect' }, 'square');
    expect(r.w).toBe(250);
    expect(r.h).toBe(100); // 250 / 2.5
  });
});

describe('clampCenter', () => {
  it('trava a caixa dentro do canvas nas quatro bordas', () => {
    // Caixa de 200×100 no banner (1200×628): meio-lado = 100/1200 e 50/628.
    expect(clampCenter(-1, 0.5, 200, 100, 'banner').x).toBeCloseTo(100 / 1200);
    expect(clampCenter(2, 0.5, 200, 100, 'banner').x).toBeCloseTo(1 - 100 / 1200);
    expect(clampCenter(0.5, -1, 200, 100, 'banner').y).toBeCloseTo(50 / 628);
    expect(clampCenter(0.5, 2, 200, 100, 'banner').y).toBeCloseTo(1 - 50 / 628);
  });

  it('não mexe em quem já está dentro', () => {
    expect(clampCenter(0.5, 0.5, 200, 100, 'banner')).toEqual({ x: 0.5, y: 0.5 });
  });

  // Sem esta guarda o clamp produziria min > max e devolveria NaN/valor invertido.
  it('centraliza quando a caixa é maior que o canvas', () => {
    expect(clampCenter(0.1, 0.5, 2000, 100, 'banner').x).toBe(0.5);
  });
});

describe('pairedTargetLayer', () => {
  it('põe o logo da conta à direita do anunciante, mesmo tamanho e mesmo wrap', () => {
    const adv = { enabled: true, x: 0.2, y: 0.8, sizePx: 140, wrap: 'rect' as const };
    const t = pairedTargetLayer(adv, 'banner');
    expect(t.y).toBe(0.8);
    expect(t.sizePx).toBe(140);
    expect(t.wrap).toBe('rect');
    expect(t.enabled).toBe(true);
    expect(t.x).toBeCloseTo(0.2 + (140 + PAIR_GAP_PX) / 1200);
  });
});

describe('effectiveLayout', () => {
  it('sem par, devolve o layout intacto', () => {
    const l = createDefaultOverlayLayout();
    expect(effectiveLayout(l, 'banner')).toBe(l);
  });

  // No modo par o logo da conta deixa de ser independente: quem arrasta é o
  // anunciante e o outro é derivado. Preview e payload chamam isto, nunca o cru.
  it('com par, deriva o logo da conta e força os dois ligados', () => {
    const l = { ...createDefaultOverlayLayout(false), paired: true };
    const e = effectiveLayout(l, 'banner');
    expect(e.advertiserLogo.enabled).toBe(true);
    expect(e.targetLogo.enabled).toBe(true);
    expect(e.targetLogo.y).toBe(e.advertiserLogo.y);
  });
});

describe('maxTextSizePx', () => {
  it('texto curto pode ir até o teto duro', () => {
    // 40px de largura a 50px de fonte cabe muitas vezes na linha; o teto vem antes.
    expect(maxTextSizePx(40, 50, 'banner')).toBe(160);
  });

  // A regressão que este teste tranca: um destaque longo com a fonte no talo
  // vazava para fora do canvas e o PNG saía com o texto cortado.
  it('texto largo derruba o teto para caber no canvas', () => {
    // Úteis = 1200 - 22*2 = 1156. A 50px o texto mede 1000 → cabe até 57px.
    expect(maxTextSizePx(1000, 50, 'banner')).toBe(57);
  });

  it('nunca desce abaixo do mínimo, mesmo com texto absurdo', () => {
    expect(maxTextSizePx(50000, 50, 'banner')).toBe(16);
  });

  // jsdom e o primeiro render (fonte ainda carregando) devolvem 0 na medição.
  // Travar o slider nesse caso puniria o usuário por um detalhe de timing.
  it('sem medição confiável, libera o teto em vez de travar o slider', () => {
    expect(maxTextSizePx(0, 50, 'banner')).toBe(160);
  });
});

describe('AD_FORMAT_SIZE', () => {
  it('os dois formatos têm 1200 de largura — é o que faz sizePx ser absoluto', () => {
    expect(AD_FORMAT_SIZE.square.w).toBe(1200);
    expect(AD_FORMAT_SIZE.banner.w).toBe(1200);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/campaigns/wizard/overlayLayout.test.ts`
Expected: FAIL — `Failed to resolve import "./overlayLayout"`.

- [ ] **Step 3: Implementar o módulo**

Criar `src/app/campaigns/wizard/overlayLayout.ts`:

```ts
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/app/campaigns/wizard/overlayLayout.test.ts`
Expected: PASS — 20 testes.

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/wizard/overlayLayout.ts src/app/campaigns/wizard/overlayLayout.test.ts
git commit -m "feat(criativo): modelo puro de layout do overlay"
```

---

### Task 2: Construtor puro do SVG no servidor

**Files:**
- Create: `supabase/functions/make-server-a4d5bbe0/overlaySvg.ts`
- Test: `supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts`

**Interfaces:**
- Consumes: nada. **Este módulo não pode importar nada de `npm:`, `https://` ou de `src/`** — precisa rodar no Vitest sob Node, igual a `tokenLifecycle.ts`.
- Produces: `AdFormat`, `LogoWrap`, `TextBackdrop`, `AD_FORMAT_SIZE`, `OVERLAY_STYLE`, `LOGO_WRAP_ASPECT`, `escapeXml(s: string): string`, `estimateTextWidthPx(text: string, sizePx: number): number`, `SvgTextLayer`, `SvgLogoLayer`, `buildOverlaySvg(opts: BuildOverlaySvgOptions): string`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildOverlaySvg,
  estimateTextWidthPx,
  escapeXml,
  AD_FORMAT_SIZE,
} from './overlaySvg';

const BASE = 'data:image/png;base64,AAAA';

const svgFor = (over: Partial<Parameters<typeof buildOverlaySvg>[0]> = {}) =>
  buildOverlaySvg({
    format: 'banner',
    baseHref: BASE,
    fontFamily: 'Inter',
    texts: [],
    logos: [],
    ...over,
  });

describe('buildOverlaySvg — canvas', () => {
  it('usa 1200x628 no banner', () => {
    const svg = svgFor({ format: 'banner' });
    expect(svg).toContain('width="1200" height="628"');
    expect(svg).toContain('viewBox="0 0 1200 628"');
  });

  // A regressão que este teste tranca: CANVAS_W/H eram constantes e escolher
  // "Quadrado" devolvia um banner.
  it('usa 1200x1200 no quadrado', () => {
    const svg = svgFor({ format: 'square' });
    expect(svg).toContain('width="1200" height="1200"');
    expect(svg).toContain('viewBox="0 0 1200 1200"');
  });

  it('recorta a imagem-base em vez de esticá-la', () => {
    expect(svgFor()).toContain('preserveAspectRatio="xMidYMid slice"');
  });
});

describe('buildOverlaySvg — texto', () => {
  const texto = (over = {}) => ({
    text: 'WORKSHOP ABM', x: 0.5, y: 0.5, sizePx: 50,
    color: '#FFFFFF', backdrop: 'box' as const, weight: 700, ...over,
  });

  it('ancora o texto pelo centro', () => {
    const svg = svgFor({ texts: [texto()] });
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('x="600"');
  });

  it('usa a largura medida pelo cliente quando ela vem', () => {
    const svg = svgFor({ texts: [texto({ widthPx: 300 })] });
    // 300 + 22*2 de padding = 344, centrado em 600 → x = 428.
    expect(svg).toContain('width="344"');
    expect(svg).toContain('x="428"');
  });

  // Chamadas antigas (e qualquer caminho que não meça) não podem quebrar.
  it('cai no estimador quando a largura não vem', () => {
    const svg = svgFor({ texts: [texto({ widthPx: undefined })] });
    const esperado = estimateTextWidthPx('WORKSHOP ABM', 50) + 44;
    expect(svg).toContain(`width="${esperado}"`);
  });

  it('backdrop "box" desenha o retângulo e não a sombra', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'box' })] });
    expect(svg).toContain('rgba(0,0,0,0.55)');
    expect(svg).not.toContain('filter="url(#textShadow)"');
  });

  it('backdrop "shadow" aplica o filtro e não desenha retângulo', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'shadow' })] });
    expect(svg).toContain('filter="url(#textShadow)"');
    expect(svg).not.toContain('rgba(0,0,0,0.55)');
  });

  it('backdrop "none" não desenha nem retângulo nem sombra', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'none' })] });
    expect(svg).not.toContain('rgba(0,0,0,0.55)');
    expect(svg).not.toContain('filter="url(#textShadow)"');
  });

  it('respeita a cor escolhida', () => {
    expect(svgFor({ texts: [texto({ color: '#FF5F39' })] })).toContain('fill="#FF5F39"');
  });

  it('ignora texto vazio', () => {
    expect(svgFor({ texts: [texto({ text: '' })] })).not.toContain('<text');
  });

  it('escapa XML no conteúdo do texto', () => {
    const svg = svgFor({ texts: [texto({ text: 'Fast & <Loose>' })] });
    expect(svg).toContain('Fast &amp; &lt;Loose&gt;');
  });
});

describe('buildOverlaySvg — logos', () => {
  const logo = (over = {}) => ({
    href: 'data:image/png;base64,BBBB', x: 0.5, y: 0.5,
    sizePx: 200, wrap: 'square' as const, ...over,
  });

  it('wrap "square" desenha cartão arredondado', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'square' })] });
    expect(svg).toContain('<rect');
    expect(svg).toContain('rx="14"');
  });

  it('wrap "circle" desenha círculo com o raio igual a metade do sizePx', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'circle' })] });
    expect(svg).toContain('<circle');
    expect(svg).toContain('r="100"');
  });

  it('wrap "rect" achata o cartão em 2.5:1', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'rect', sizePx: 250 })] });
    expect(svg).toContain('width="250"');
    expect(svg).toContain('height="100"');
  });

  it('wrap "none" não desenha cartão nenhum', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'none' })] });
    expect(svg).not.toContain('<rect');
    expect(svg).not.toContain('<circle');
    expect(svg).toContain('<image');
  });

  // Os dois logos são o mesmo tipo de objeto — o servidor não sabe qual é qual.
  it('desenha os dois logos quando vêm dois', () => {
    const svg = svgFor({ logos: [logo({ href: 'A' }), logo({ href: 'B', x: 0.8 })] });
    expect(svg).toContain('href="A"');
    expect(svg).toContain('href="B"');
  });

  it('encaixa o logo dentro do cartão sem distorcer', () => {
    expect(svgFor({ logos: [logo()] })).toContain('preserveAspectRatio="xMidYMid meet"');
  });
});

describe('escapeXml', () => {
  it('escapa os cinco caracteres perigosos', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('AD_FORMAT_SIZE', () => {
  it('bate com o formato anunciado na UI', () => {
    expect(AD_FORMAT_SIZE).toEqual({
      square: { w: 1200, h: 1200 },
      banner: { w: 1200, h: 628 },
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts`
Expected: FAIL — `Failed to resolve import "./overlaySvg"`.

- [ ] **Step 3: Implementar o módulo**

Criar `supabase/functions/make-server-a4d5bbe0/overlaySvg.ts`:

```ts
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts`
Expected: PASS — 20 testes.

- [ ] **Step 5: Adicionar a guarda de paridade entre cliente e servidor**

Acrescentar ao final de `src/app/campaigns/wizard/overlayLayout.test.ts`:

```ts
// O edge function roda em Deno e não pode importar de `src/`, então as
// constantes de estilo existem duas vezes. Este teste é o que impede que
// divirjam — sem ele, mudar o padding num lado só faz o preview mentir sobre o
// PNG que vai rodar no LinkedIn, e ninguém percebe até olhar o anúncio.
import {
  OVERLAY_STYLE as SERVER_STYLE,
  AD_FORMAT_SIZE as SERVER_SIZE,
  LOGO_WRAP_ASPECT as SERVER_ASPECT,
} from '../../../../supabase/functions/make-server-a4d5bbe0/overlaySvg';

describe('paridade cliente ↔ servidor', () => {
  it('OVERLAY_STYLE é idêntico nos dois módulos', () => {
    expect({ ...OVERLAY_STYLE }).toEqual({ ...SERVER_STYLE });
  });

  it('AD_FORMAT_SIZE é idêntico nos dois módulos', () => {
    expect(AD_FORMAT_SIZE).toEqual(SERVER_SIZE);
  });

  it('LOGO_WRAP_ASPECT é idêntico nos dois módulos', () => {
    expect(LOGO_WRAP_ASPECT).toEqual(SERVER_ASPECT);
  });
});
```

`LOGO_WRAP_ASPECT` já está no bloco de import do topo do arquivo (Step 1); só os três imports do servidor são novos.

- [ ] **Step 6: Rodar os dois arquivos e confirmar que passam**

Run: `npx vitest run src/app/campaigns/wizard/overlayLayout.test.ts supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts`
Expected: PASS — 23 + 20 testes.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/make-server-a4d5bbe0/overlaySvg.ts \
        supabase/functions/make-server-a4d5bbe0/overlaySvg.test.ts \
        src/app/campaigns/wizard/overlayLayout.test.ts
git commit -m "feat(criativo): construtor puro do SVG do overlay, com canvas por formato"
```

---

### Task 3: Ligar o construtor no edge function e resolver o logo do anunciante

**Files:**
- Modify: `supabase/functions/make-server-a4d5bbe0/index.ts:2751` (comentário desatualizado), `:3007-3112` (`renderOverlayPng` e as constantes), `:3113-3160` (handler `/ai/compose-logo-overlay`), `:2751-2790` (região do `fetchAsBase64`)

**Interfaces:**
- Consumes: `buildOverlaySvg`, `AD_FORMAT_SIZE`, `type SvgTextLayer`, `type SvgLogoLayer`, `type AdFormat`, `type LogoWrap`, `type TextBackdrop` de `./overlaySvg.ts`.
- Produces: o endpoint `POST /make-server-a4d5bbe0/ai/compose-logo-overlay` passa a aceitar, além do que já aceita, `format: 'square' | 'banner'`, `layout: { destaque, complementar, advertiserLogo, targetLogo }`, `advertiser_logo_url: string | null`, `destaque_width_px?: number`, `complementar_width_px?: number`. Resposta ganha `advertiser_logo_applied: boolean` ao lado do `logo_applied` existente.

- [ ] **Step 1: Substituir as constantes de posição e reescrever `renderOverlayPng`**

Em `supabase/functions/make-server-a4d5bbe0/index.ts`, acrescentar ao bloco de imports do topo (junto do import de `./tokenLifecycle.ts`):

```ts
import {
  buildOverlaySvg,
  AD_FORMAT_SIZE,
  type AdFormat,
  type SvgTextLayer,
  type SvgLogoLayer,
} from "./overlaySvg.ts";
```

Apagar o bloco de constantes `CANVAS_W`, `CANVAS_H`, `HEADLINE_FONT_PX`, `SECONDARY_FONT_PX`, `BOX_PAD_X`, `BOX_PAD_Y`, `BOX_RADIUS`, `BOX_FILL`, `TEXT_COLOR`, `TEXT_X`, `TEXT_TOP`, `STACK_GAP`, `LOGO_CARD_W`, `LOGO_CARD_PAD`, `LOGO_CARD_RADIUS`, `LOGO_CARD_RIGHT`, `LOGO_CARD_TOP` e a função local `escapeXml` — tudo isso agora vive em `overlaySvg.ts`.

Substituir `renderOverlayPng` inteira por:

```ts
// Rasteriza o overlay. A GEOMETRIA toda vive em `overlaySvg.ts`, que é puro e
// testado; aqui fica só o que precisa de rede e wasm: baixar as fontes e rodar
// o resvg.
async function renderOverlayPng(opts: {
  baseImageBase64: string;
  baseImageMime: string;
  format: AdFormat;
  fontFamily: string;
  texts: SvgTextLayer[];
  logos: SvgLogoLayer[];
}): Promise<Uint8Array> {
  await ensureResvg();

  // Só baixa os pesos que o SVG vai realmente usar.
  const weights = [...new Set(opts.texts.filter((t) => t.text).map((t) => t.weight))];
  const fontBuffers = await Promise.all(
    (weights.length ? weights : [700]).map((w) => loadGoogleFont(opts.fontFamily, w)),
  );

  const svg = buildOverlaySvg({
    format: opts.format,
    baseHref: `data:${opts.baseImageMime};base64,${opts.baseImageBase64}`,
    fontFamily: opts.fontFamily,
    texts: opts.texts,
    logos: opts.logos,
  });

  const resvg = new Resvg(svg, {
    font: { fontBuffers, defaultFontFamily: opts.fontFamily, loadSystemFonts: false },
    background: "rgba(255,255,255,0)",
    fitTo: { mode: "width", value: AD_FORMAT_SIZE[opts.format].w },
  });
  return resvg.render().asPng();
}
```

- [ ] **Step 2: Reescrever o handler para ler o layout e os dois logos**

Substituir o corpo de `app.post("/make-server-a4d5bbe0/ai/compose-logo-overlay", ...)` por:

```ts
app.post("/make-server-a4d5bbe0/ai/compose-logo-overlay", async (c) => {
  try {
    const body = await c.req.json();
    const {
      base_image_url,
      target_company_name,
      target_company_domain,
      advertiser_logo_url = null,
      texto_destaque = "",
      texto_complementar = "",
      font_family = "Inter",
      destaque_width_px,
      complementar_width_px,
      layout,
    } = body;
    // `banner` continua sendo o default para não quebrar chamadas antigas.
    const format: AdFormat = body.format === "square" ? "square" : "banner";
    if (!base_image_url) return c.json({ error: "base_image_url é obrigatório" }, 400);
    if (!target_company_name) return c.json({ error: "target_company_name é obrigatório" }, 400);
    if (!layout) return c.json({ error: "layout é obrigatório" }, 400);

    const baseImg = await fetchAsBase64(base_image_url);
    if (!baseImg) return c.json({ error: "Não foi possível baixar a imagem base" }, 500);

    const texts: SvgTextLayer[] = [
      { ...layout.destaque, text: (texto_destaque || "").trim(), weight: 700, widthPx: destaque_width_px },
      { ...layout.complementar, text: (texto_complementar || "").trim(), weight: 400, widthPx: complementar_width_px },
    ];

    const logos: SvgLogoLayer[] = [];

    // Logo da conta-alvo: continua passando pelo resolvedor multi-fonte, que
    // devolve bitmap justamente porque logo.dev às vezes responde SVG.
    let targetLogoApplied = false;
    if (layout.targetLogo?.enabled) {
      const img = await resolveTargetLogo(target_company_name, target_company_domain || null);
      if (img) {
        logos.push({
          href: `data:${img.mime};base64,${img.base64}`,
          x: layout.targetLogo.x, y: layout.targetLogo.y,
          sizePx: layout.targetLogo.sizePx, wrap: layout.targetLogo.wrap,
        });
        targetLogoApplied = true;
      }
    }

    // Logo do anunciante: vem do Brand Kit como URL ou data: URI. `fetchAsBase64`
    // atende os dois — o fetch do Deno resolve `data:` nativamente.
    let advertiserLogoApplied = false;
    if (layout.advertiserLogo?.enabled && advertiser_logo_url) {
      const img = await fetchAsBase64(advertiser_logo_url);
      if (img) {
        logos.push({
          href: `data:${img.mime};base64,${img.base64}`,
          x: layout.advertiserLogo.x, y: layout.advertiserLogo.y,
          sizePx: layout.advertiserLogo.sizePx, wrap: layout.advertiserLogo.wrap,
        });
        advertiserLogoApplied = true;
      }
    }

    const png = await renderOverlayPng({
      baseImageBase64: baseImg.base64,
      baseImageMime: baseImg.mime,
      format,
      fontFamily: font_family,
      texts,
      logos,
    });

    const safeTarget = target_company_name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
    const stored = await saveImageToStorage(png, "image/png", "overlay", `overlay-${safeTarget}`);

    return c.json({
      success: true,
      url: stored.url,
      path: stored.path,
      filename: stored.filename,
      logo_applied: targetLogoApplied,
      advertiser_logo_applied: advertiserLogoApplied,
    });
  } catch (err: any) {
    console.log("[Compose Overlay] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});
```

- [ ] **Step 3: Corrigir o comentário desatualizado e o prompt da imagem-base**

Em `index.ts:2751`, o comentário afirma que o endpoint de composição pede ao modelo para pintar textos e logo. Isso deixou de ser verdade quando o composer virou SVG+resvg. Substituir por:

```ts
// `/ai/generate-base-image` usa Nano Banana 2 (gemini-3.1-flash-image-preview)
// para produzir uma tela reutilizável, sem overlays. `/ai/compose-logo-overlay`
// NÃO usa IA: monta um SVG a partir do layout que o usuário posicionou
// (`overlaySvg.ts`) e rasteriza com resvg.
```

No handler `/ai/generate-base-image` (linha ~2923), o `format` **não é sequer lido do body** hoje. Acrescentá-lo à desestruturação:

```ts
    const { mode, client_brand_context, prompt_brief, format } = await c.req.json();
```

E trocar a linha fixa do prompt (linha ~2932):

```
Aspect ratio: 1.91:1, suitable for 1200x628 pixels. Landscape composition.
```

por:

```ts
${format === "square"
  ? "Aspect ratio: 1:1, suitable for 1200x1200 pixels. Square composition."
  : "Aspect ratio: 1.91:1, suitable for 1200x628 pixels. Landscape composition."}
```

Sem isso, escolher Quadrado geraria uma base panorâmica que o canvas quadrado recortaria pelas laterais.

- [ ] **Step 4: Verificar que o resvg aceita o logo do anunciante — RISCO DO SPEC §5**

`brandKit.logo` é hoje sempre `null` ou o `MOCK_LOGO`, um `data:image/svg+xml`
([brandKit.ts:44](../../../src/app/campaigns/wizard/brandKit.ts)). O `<image href>` do resvg
tem suporte irregular a SVG aninhado — é por isso que `resolveTargetLogo` insiste em bitmap.

Fazer um POST real contra a função implantada, com o layout mínimo e o logo mock:

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/make-server-a4d5bbe0/ai/compose-logo-overlay" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
  -d '{
    "base_image_url": "https://picsum.photos/1200/1200",
    "target_company_name": "Nubank",
    "format": "square",
    "texto_destaque": "WORKSHOP ABM",
    "advertiser_logo_url": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2240%22%3E%3Crect%20x%3D%226%22%20y%3D%2212%22%20width%3D%2216%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FF5F39%22%2F%3E%3C%2Fsvg%3E",
    "layout": {
      "destaque":       {"x":0.5,"y":0.15,"sizePx":56,"color":"#FFFFFF","backdrop":"box"},
      "complementar":   {"x":0.5,"y":0.27,"sizePx":28,"color":"#FFFFFF","backdrop":"box"},
      "advertiserLogo": {"enabled":true,"x":0.25,"y":0.85,"sizePx":200,"wrap":"rect"},
      "targetLogo":     {"enabled":true,"x":0.75,"y":0.85,"sizePx":200,"wrap":"circle"}
    }
  }'
```

Abrir a `url` devolvida e conferir se o quadrado laranja do logo mock aparece.

**Se aparecer:** seguir para o Step 5, nada a fazer.

**Se NÃO aparecer** (retângulo branco vazio no lugar): aplicar o fallback — inserir o SVG como
elemento aninhado em vez de `<image href>`. Em `overlaySvg.ts`, `SvgLogoLayer` ganha
`svgMarkup?: string` e, quando presente, o `<image>` é trocado por:

```ts
`<svg x="${r(boxX + pad)}" y="${r(boxY + pad)}" width="${r(boxW - pad * 2)}" height="${r(boxH - pad * 2)}" viewBox="0 0 120 40" preserveAspectRatio="xMidYMid meet">${l.svgMarkup}</svg>`
```

…e o handler passa a detectar `data:image/svg+xml` no `advertiser_logo_url`, decodificar o
markup e mandá-lo por `svgMarkup`. Acrescentar um teste em `overlaySvg.test.ts` cobrindo o
caminho novo antes de implementá-lo.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS. Nenhum teste existente toca `renderOverlayPng` (ela precisa de wasm), então a
suíte deve continuar verde; o que vale aqui é não ter quebrado importação.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/make-server-a4d5bbe0/index.ts
git commit -m "feat(criativo): composer lê layout, formato e logo do anunciante"
```

---

### Task 4: `layout` no modelo de dados do wizard

**Files:**
- Modify: `src/app/campaigns/wizard/types.ts:107-113` (`AdFormat`), `:116-138` (`CompanyCreativeOverride`), `:141-146` (`IMAGE_OVERRIDE_FIELDS`), `:149-159` (`ResolvedImageConfig`), `:162-178` (`resolveImageConfig`), `:188-200` (`TemplateLogoConfig`), `:219-247` (`createDefaultCreativeData`)
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx:95-116` (`DEFAULT_TEMPLATE_LOGO` e `withImageDefaults`)
- Test: `src/app/campaigns/wizard/types.overlay.test.ts`

**Interfaces:**
- Consumes: `OverlayLayout`, `createDefaultOverlayLayout`, `withLayoutDefaults`, `AdFormat` de `./overlayLayout`.
- Produces: `TemplateLogoConfig.layout: OverlayLayout`; `CompanyCreativeOverride.layout?: OverlayLayout`; `ResolvedImageConfig.layout: OverlayLayout`; `IMAGE_OVERRIDE_FIELDS` inclui `'layout'`; `types.ts` re-exporta `AdFormat`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/campaigns/wizard/types.overlay.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createDefaultCreativeData,
  resolveImageConfig,
  overriddenImageFields,
  IMAGE_OVERRIDE_FIELDS,
  type CreativeData,
} from './types';
import { createDefaultOverlayLayout } from './overlayLayout';

const comEmpresa = (over: Record<string, unknown>): CreativeData => ({
  ...createDefaultCreativeData(),
  overrides: { c1: { status: 'template', ...over } as never },
});

describe('resolveImageConfig — layout', () => {
  it('o template nasce com um layout resolvível', () => {
    const cfg = resolveImageConfig(createDefaultCreativeData());
    expect(cfg.layout.destaque.sizePx).toBeGreaterThan(0);
  });

  it('uma empresa sem override herda o layout do template', () => {
    const data = createDefaultCreativeData();
    data.templateLogo.layout.destaque.sizePx = 72;
    expect(resolveImageConfig(data, 'c1').layout.destaque.sizePx).toBe(72);
  });

  it('uma empresa com override usa o layout dela', () => {
    const meu = createDefaultOverlayLayout();
    meu.destaque.sizePx = 31;
    expect(resolveImageConfig(comEmpresa({ layout: meu }), 'c1').layout.destaque.sizePx).toBe(31);
  });
});

describe('overriddenImageFields', () => {
  it('inclui layout na lista de campos sobrescrevíveis', () => {
    expect(IMAGE_OVERRIDE_FIELDS).toContain('layout');
  });

  // É isso que acende o chip "personalizado" e o "Voltar ao template".
  it('reporta layout quando a empresa tem o dela', () => {
    const data = comEmpresa({ layout: createDefaultOverlayLayout() });
    expect(overriddenImageFields(data, 'c1')).toContain('layout');
  });

  it('não reporta layout quando a empresa herda', () => {
    expect(overriddenImageFields(comEmpresa({ headline: 'oi' }), 'c1')).not.toContain('layout');
  });
});

describe('showTargetLogo legado', () => {
  // Campanhas salvas antes do editor não têm `layout`. Perder o
  // "não leva logo" delas seria mudar o anúncio pelas costas do usuário.
  it('uma campanha antiga sem layout preserva showTargetLogo=false', () => {
    const data = createDefaultCreativeData();
    data.templateLogo.showTargetLogo = false;
    delete (data.templateLogo as Partial<typeof data.templateLogo>).layout;
    expect(resolveImageConfig(data).layout.targetLogo.enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/campaigns/wizard/types.overlay.test.ts`
Expected: FAIL — `Property 'layout' does not exist` / `expected undefined to contain 'layout'`.

- [ ] **Step 3: Alterar `types.ts`**

Trocar a declaração de `AdFormat` (que hoje mora em `types.ts` com um comentário dizendo que o formato não funciona) por um re-export, e importar o modelo:

```ts
import type { OverlayLayout, AdFormat } from './overlayLayout';
import { createDefaultOverlayLayout, withLayoutDefaults } from './overlayLayout';

// `AdFormat` mora em `overlayLayout.ts`, junto das dimensões que ele nomeia.
// Re-exportado aqui porque é daqui que o resto do wizard sempre importou.
export type { AdFormat };
```

Em `CompanyCreativeOverride`, acrescentar depois de `format?: AdFormat;`:

```ts
  // Layout do overlay, sobrescrito por empresa. Objeto INTEIRO, não campo a
  // campo: um layout meio-herdado não tem leitura possível na UI.
  layout?: OverlayLayout;
```

Em `IMAGE_OVERRIDE_FIELDS`, acrescentar `'layout'`:

```ts
export const IMAGE_OVERRIDE_FIELDS = [
  'imageMode', 'baseImageUrl', 'basePrompt', 'textoDestaque',
  'textoComplementar', 'showTargetLogo', 'fontFamily', 'format', 'layout',
] as const;
```

Em `ResolvedImageConfig`, acrescentar `layout: OverlayLayout;`.

Em `resolveImageConfig`, acrescentar ao objeto devolvido:

```ts
    // `withLayoutDefaults` é o degrau da migração: campanhas salvas antes do
    // editor não têm `layout`, e `showTargetLogo` era a única expressão de
    // "leva logo da conta?".
    layout: ovr?.layout ?? withLayoutDefaults(tpl.layout, tpl.showTargetLogo),
```

Em `TemplateLogoConfig`, trocar o comentário de `showTargetLogo` e acrescentar `layout`:

```ts
  showTargetLogo: boolean;       // LEGADO: semeia layout.targetLogo.enabled na migração
  format: AdFormat;              // formato do canvas — honrado no servidor desde 2026-08-18
  layout: OverlayLayout;         // posições, tamanhos e wraps do overlay
```

Em `createDefaultCreativeData`, dentro de `templateLogo`, acrescentar:

```ts
      layout: createDefaultOverlayLayout(true),
```

- [ ] **Step 4: Alterar `DEFAULT_TEMPLATE_LOGO` em `CreativeStep.tsx`**

Acrescentar `layout: createDefaultOverlayLayout(true),` ao objeto `DEFAULT_TEMPLATE_LOGO` (linha ~95) e importar **as duas** funções: `import { createDefaultOverlayLayout, withLayoutDefaults } from './overlayLayout';`. Em `withImageDefaults`, garantir que um `templateLogo` vindo pela metade também ganhe o layout:

```ts
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
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/app/campaigns/wizard/`
Expected: PASS — o novo arquivo e os três de CreativeStep/BriefPane que já existiam.

- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/wizard/types.ts src/app/campaigns/wizard/types.overlay.test.ts src/app/campaigns/wizard/CreativeStep.tsx
git commit -m "feat(criativo): layout do overlay no modelo, com migração de showTargetLogo"
```

---

### Task 5: `OverlayCanvas` — o editor arrastável

**Files:**
- Create: `src/app/campaigns/wizard/OverlayCanvas.tsx`
- Test: `src/app/campaigns/wizard/OverlayCanvas.test.tsx`

**Interfaces:**
- Consumes: `AD_FORMAT_SIZE`, `OVERLAY_STYLE`, `LOGO_WRAP_ASPECT`, `clampCenter`, `effectiveLayout`, `logoInnerPadPx`, `type OverlayLayout`, `type AdFormat` de `./overlayLayout`.
- Produces: `export type OverlayLayerId = 'destaque' | 'complementar' | 'advertiserLogo' | 'targetLogo'`; `export function OverlayCanvas(props: OverlayCanvasProps)`; `export function measureTextWidthPx(text: string, sizePx: number, fontFamily: string): number`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/campaigns/wizard/OverlayCanvas.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { OverlayCanvas } from './OverlayCanvas';
import { createDefaultOverlayLayout, type OverlayLayout } from './overlayLayout';

afterEach(cleanup);

// jsdom devolve zero em todo getBoundingClientRect; sem um retângulo real o
// arrasto não teria escala para converter px em fração.
function stubRect(el: Element, w: number, h: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h,
    toJSON: () => ({}),
  } as DOMRect);
}

const baseProps = {
  format: 'banner' as const,
  baseImageUrl: 'https://exemplo/base.png',
  fontFamily: 'Inter',
  destaque: 'WORKSHOP ABM',
  complementar: 'Convite VIP',
  advertiserLogoUrl: 'https://exemplo/meu.png',
  targetLogoUrl: 'https://exemplo/conta.png',
  selected: null,
  onSelect: () => {},
  onLayoutChange: () => {},
};

const renderCanvas = (over: Partial<React.ComponentProps<typeof OverlayCanvas>> = {}) => {
  const layout: OverlayLayout = { ...createDefaultOverlayLayout(true) };
  return render(<OverlayCanvas {...baseProps} layout={layout} {...over} />);
};

describe('OverlayCanvas — render', () => {
  it('mostra os dois textos sobre a imagem-base', () => {
    renderCanvas();
    expect(screen.getByText('WORKSHOP ABM')).toBeInTheDocument();
    expect(screen.getByText('Convite VIP')).toBeInTheDocument();
  });

  it('desenha só os logos habilitados', () => {
    // O default liga o da conta e deixa o do anunciante desligado.
    renderCanvas();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
    expect(screen.queryByAltText('Meu logo')).not.toBeInTheDocument();
  });

  it('o aspecto acompanha o formato', () => {
    const { container, rerender } = renderCanvas();
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/628]');
    rerender(<OverlayCanvas {...baseProps} layout={createDefaultOverlayLayout(true)} format="square" />);
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/1200]');
  });

  it('sem imagem-base mostra o placeholder e nenhuma camada', () => {
    renderCanvas({ baseImageUrl: null });
    expect(screen.getByText(/Imagem aparecerá aqui/)).toBeInTheDocument();
    expect(screen.queryByText('WORKSHOP ABM')).not.toBeInTheDocument();
  });
});

describe('OverlayCanvas — seleção', () => {
  it('clicar numa camada a seleciona', () => {
    const onSelect = vi.fn();
    renderCanvas({ onSelect });
    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 10, clientY: 10, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith('destaque');
  });

  it('clicar no fundo limpa a seleção', () => {
    const onSelect = vi.fn();
    const { container } = renderCanvas({ onSelect, selected: 'destaque' });
    fireEvent.pointerDown(container.querySelector('[data-testid="overlay-canvas"]')!, { pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('OverlayCanvas — arrasto', () => {
  it('arrastar move a camada na proporção do canvas', () => {
    const onLayoutChange = vi.fn();
    const { container } = renderCanvas({ onLayoutChange });
    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314); // metade do canvas de referência

    const alvo = screen.getByText('WORKSHOP ABM');
    fireEvent.pointerDown(alvo, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 100, pointerId: 1 });

    // 60px de 600 = 0.1 do canvas, somado ao x default de 0.30.
    const next = onLayoutChange.mock.calls.at(-1)![0] as OverlayLayout;
    expect(next.destaque.x).toBeCloseTo(0.40, 5);
    expect(next.destaque.y).toBeCloseTo(0.14, 5);
  });

  it('não deixa a camada sair pela borda', () => {
    const onLayoutChange = vi.fn();
    const { container } = renderCanvas({ onLayoutChange });
    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314);

    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: -5000, clientY: -5000, pointerId: 1 });

    const next = onLayoutChange.mock.calls.at(-1)![0] as OverlayLayout;
    expect(next.destaque.x).toBeGreaterThanOrEqual(0);
    expect(next.destaque.y).toBeGreaterThanOrEqual(0);
  });

  it('depois do pointerUp o movimento não mexe mais em nada', () => {
    const onLayoutChange = vi.fn();
    const { container } = renderCanvas({ onLayoutChange });
    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314);

    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    onLayoutChange.mockClear();
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 100, pointerId: 1 });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});

describe('OverlayCanvas — modo par', () => {
  // No par o logo da conta é derivado: uma alça só, dois logos na tela.
  it('mostra os dois logos com uma alça só', () => {
    const layout = { ...createDefaultOverlayLayout(true), paired: true };
    render(<OverlayCanvas {...baseProps} layout={layout} />);
    expect(screen.getByAltText('Meu logo')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta').closest('[data-draggable="true"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/campaigns/wizard/OverlayCanvas.test.tsx`
Expected: FAIL — `Failed to resolve import "./OverlayCanvas"`.

- [ ] **Step 3: Implementar o componente**

Criar `src/app/campaigns/wizard/OverlayCanvas.tsx`:

```tsx
// Editor visual do overlay: desenha as camadas sobre a imagem-base e deixa
// arrastá-las. Não conhece template nem empresa — recebe um layout, devolve
// outro. Quem decide onde o resultado é gravado é o CreativeStep.
//
// Vive fora do CreativeStep de propósito: aquele arquivo já passa de 1900
// linhas, e a lógica de arrasto tem estado próprio que não interessa a ninguém
// mais.
import { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  AD_FORMAT_SIZE,
  OVERLAY_STYLE,
  LOGO_WRAP_ASPECT,
  clampCenter,
  effectiveLayout,
  logoInnerPadPx,
  type AdFormat,
  type LogoLayer,
  type OverlayLayout,
} from './overlayLayout';

export type OverlayLayerId = 'destaque' | 'complementar' | 'advertiserLogo' | 'targetLogo';

export interface OverlayCanvasProps {
  format: AdFormat;
  baseImageUrl: string | null;
  layout: OverlayLayout;
  fontFamily: string;
  destaque: string;
  complementar: string;
  advertiserLogoUrl: string | null;
  targetLogoUrl: string | null;
  selected?: OverlayLayerId | null;
  onSelect?: (id: OverlayLayerId | null) => void;
  onLayoutChange?: (next: OverlayLayout) => void;
}

// Mede a largura real do texto na fonte carregada. O servidor usa este número
// para dimensionar a caixa de fundo — sem ele cairia num estimador por
// contagem de caracteres, e a caixa do preview não bateria com a do PNG.
export function measureTextWidthPx(text: string, sizePx: number, fontFamily: string): number {
  if (typeof document === 'undefined' || !text) return 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${sizePx}px "${fontFamily}", sans-serif`;
  return Math.ceil(ctx.measureText(text).width);
}

interface DragState {
  id: OverlayLayerId;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  boxW: number;   // px do canvas de referência
  boxH: number;
}

export function OverlayCanvas({
  format, baseImageUrl, layout, fontFamily, destaque, complementar,
  advertiserLogoUrl, targetLogoUrl, selected = null, onSelect, onLayoutChange,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Só serve para forçar re-render quando a fonte termina de carregar: até lá
  // as camadas de texto estão medidas no fallback e nascem com a largura errada.
  const [, setFontTick] = useState(0);

  const { w: CW, h: CH } = AD_FORMAT_SIZE[format];
  const eff = effectiveLayout(layout, format);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let vivo = true;
    document.fonts.load(`700 56px "${fontFamily}"`)
      .then(() => document.fonts.ready)
      .then(() => { if (vivo) setFontTick((t) => t + 1); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [fontFamily]);

  const scaleOf = () => (canvasRef.current?.getBoundingClientRect().width || CW) / CW;

  const beginDrag = (
    e: React.PointerEvent, id: OverlayLayerId, x: number, y: number, boxW: number, boxH: number,
  ) => {
    e.stopPropagation();
    onSelect?.(id);
    // jsdom não implementa setPointerCapture; o `?.` mantém os testes vivos.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      id, pointerId: e.pointerId,
      startClientX: e.clientX, startClientY: e.clientY,
      startX: x, startY: y, boxW, boxH,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const nx = drag.startX + (e.clientX - drag.startClientX) / rect.width;
    const ny = drag.startY + (e.clientY - drag.startClientY) / rect.height;
    const { x, y } = clampCenter(nx, ny, drag.boxW, drag.boxH, format);
    const camada = layout[drag.id];
    onLayoutChange?.({ ...layout, [drag.id]: { ...camada, x, y } });
  };

  const endDrag = () => setDrag(null);

  if (!baseImageUrl) {
    return (
      <div
        data-testid="overlay-canvas"
        className={`relative bg-slate-100 overflow-hidden ${format === 'square' ? 'aspect-[1200/1200]' : 'aspect-[1200/628]'}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon className="w-10 h-10 mb-1.5" />
          <span className="text-xs font-medium">Imagem aparecerá aqui</span>
        </div>
      </div>
    );
  }

  const scale = scaleOf();
  const ring = (id: OverlayLayerId) =>
    selected === id ? 'ring-2 ring-[#FF5F39] ring-offset-1 ring-offset-black/20' : '';

  const textLayer = (id: 'destaque' | 'complementar', texto: string, peso: number) => {
    if (!texto) return null;
    const l = eff[id];
    const larguraPx = measureTextWidthPx(texto, l.sizePx, fontFamily);
    const boxW = larguraPx + OVERLAY_STYLE.boxPadX * 2;
    const boxH = l.sizePx + OVERLAY_STYLE.boxPadY * 2;
    return (
      <div
        key={id}
        data-draggable="true"
        onPointerDown={(e) => beginDrag(e, id, l.x, l.y, boxW, boxH)}
        className={`absolute cursor-move select-none whitespace-nowrap rounded-[14px] ${ring(id)}`}
        style={{
          left: `${l.x * 100}%`,
          top: `${l.y * 100}%`,
          transform: 'translate(-50%, -50%)',
          padding: `${OVERLAY_STYLE.boxPadY * scale}px ${OVERLAY_STYLE.boxPadX * scale}px`,
          fontFamily: `"${fontFamily}", sans-serif`,
          fontSize: `${l.sizePx * scale}px`,
          fontWeight: peso,
          lineHeight: 1,
          color: l.color,
          background: l.backdrop === 'box' ? OVERLAY_STYLE.boxFill : 'transparent',
          textShadow: l.backdrop === 'shadow' ? '0 2px 8px rgba(0,0,0,0.75)' : undefined,
        }}
      >
        {texto}
      </div>
    );
  };

  const logoLayer = (id: 'advertiserLogo' | 'targetLogo', url: string | null, alt: string) => {
    const l: LogoLayer = eff[id];
    if (!l.enabled || !url) return null;
    const boxW = l.sizePx;
    const boxH = l.sizePx / LOGO_WRAP_ASPECT[l.wrap];
    const pad = logoInnerPadPx(l.wrap, boxW);
    // No modo par só o logo do anunciante recebe alça: o da conta é derivado
    // dele, e dar duas alças a uma posição só seria mentira.
    const arrastavel = !(layout.paired && id === 'targetLogo');
    return (
      <div
        key={id}
        data-draggable={arrastavel ? 'true' : undefined}
        onPointerDown={arrastavel ? (e) => beginDrag(e, id, l.x, l.y, boxW, boxH) : undefined}
        className={`absolute flex items-center justify-center ${arrastavel ? 'cursor-move' : ''} ${ring(id)}`}
        style={{
          left: `${l.x * 100}%`,
          top: `${l.y * 100}%`,
          width: `${boxW * scale}px`,
          height: `${boxH * scale}px`,
          transform: 'translate(-50%, -50%)',
          padding: `${pad * scale}px`,
          background: l.wrap === 'none' ? 'transparent' : OVERLAY_STYLE.logoCardFill,
          borderRadius: l.wrap === 'circle' ? '9999px' : l.wrap === 'none' ? 0 : `${OVERLAY_STYLE.logoCardRadius * scale}px`,
          boxShadow: l.wrap === 'none' ? undefined : '0 2px 3px rgba(0,0,0,0.18)',
        }}
      >
        <img src={url} alt={alt} draggable={false} className="w-full h-full object-contain pointer-events-none" />
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      data-testid="overlay-canvas"
      onPointerDown={() => onSelect?.(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`relative bg-slate-100 overflow-hidden touch-none ${format === 'square' ? 'aspect-[1200/1200]' : 'aspect-[1200/628]'}`}
    >
      <img src={baseImageUrl} alt="Imagem-base" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      {textLayer('destaque', destaque, 700)}
      {textLayer('complementar', complementar, 400)}
      {logoLayer('advertiserLogo', advertiserLogoUrl, 'Meu logo')}
      {logoLayer('targetLogo', targetLogoUrl, 'Logo da conta')}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/app/campaigns/wizard/OverlayCanvas.test.tsx`
Expected: PASS — 10 testes.

Se `aspect-[1200/628]` não aparecer via `toHaveClass`, é porque a classe foi concatenada com
espaço duplo; normalizar o template string. Se `measureTextWidthPx` devolver 0 no jsdom
(`getContext('2d')` não implementado), o teste de arrasto ainda passa — o clamp com boxW
pequeno não altera o resultado esperado.

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/wizard/OverlayCanvas.tsx src/app/campaigns/wizard/OverlayCanvas.test.tsx
git commit -m "feat(criativo): editor arrastável do overlay sobre a imagem-base"
```

---

### Task 6: Trocar o slot de imagem do preview pelo editor

**Files:**
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx:1483-1491` (slot da imagem), `:1429-1447` (header do preview), `:33` (imports)
- Test: `src/app/campaigns/wizard/CreativeStep.overlay.test.tsx`

**Interfaces:**
- Consumes: `OverlayCanvas`, `type OverlayLayerId` de `./OverlayCanvas`; `logoDevUrl` de `@/lib/linkedin/logo`.
- Produces: estado `selectedLayer: OverlayLayerId | null` e `previewMode: 'editor' | 'composed'` dentro de `CreativeStep`; helper `setLayout(next: OverlayLayout): void` que roteia para template ou override.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/campaigns/wizard/CreativeStep.overlay.test.tsx`, reaproveitando o arranjo de `CreativeStep.geracao.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn().mockResolvedValue({
    voice: '', brand_context: '', website_url: '',
    product_service: '', audience_market: '', persona: '',
  }),
  saveClientVoice: vi.fn().mockResolvedValue(undefined),
}));

const targeting = {
  // `logoUrl` está aqui porque é o que a segmentação real entrega. Sem ele
  // `targetLogoUrl` cairia no logo.dev, que depende de VITE_LOGO_DEV_KEY e é
  // undefined em teste — e o logo da conta sumiria do preview.
  companies: {
    included: [{ id: 'c1', label: 'Nubank', domain: 'nubank.com.br', logoUrl: 'https://exemplo/nubank.png' }],
    excluded: [],
  },
  defaultTargeting: {
    locations: { included: [], excluded: [] }, seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] }, jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function Host({ initial }: { initial?: Partial<CreativeData> }) {
  const [data, setData] = useState<CreativeData>({ ...createDefaultCreativeData(), ...initial });
  return (
    <CreativeStep
      selectedAccounts={[]} targetingData={targeting as never}
      creativeData={data} onCreativeChange={setData} campaignId="camp-1"
    />
  );
}

const comBase = () => {
  const d = createDefaultCreativeData();
  d.templateLogo.baseImageUrl = 'https://exemplo/base.png';
  d.templateLogo.baseImageSource = 'upload';
  return d;
};

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('CreativeStep — formato reflete no preview', () => {
  it('banner mantém o preview em 1.91:1', () => {
    const { container } = renderStep(comBase());
    goTo(/Template global/);
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/628]');
  });

  // A regressão trancada aqui: o preview tinha aspect-[1200/628] hardcoded e
  // escolher Quadrado não mudava nada na tela.
  it('escolher Quadrado deixa o preview 1:1', () => {
    const { container } = renderStep(comBase());
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /Quadrado/ }));
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/1200]');
  });
});

describe('CreativeStep — editor no lugar da imagem', () => {
  it('com imagem-base, o preview mostra os textos do overlay como camadas', () => {
    renderStep(comBase());
    goTo(/Template global/);
    expect(screen.getByText('WORKSHOP ABM')).toBeInTheDocument();
  });

  it('sem imagem-base, mostra o placeholder', () => {
    renderStep();
    goTo(/Template global/);
    expect(screen.getByText(/Imagem aparecerá aqui/)).toBeInTheDocument();
  });

  // Sem PNG composto não há o que comparar, então o toggle não aparece.
  it('o toggle Composto só existe quando há imagem composta', () => {
    renderStep(comBase());
    goTo(/Template global/);
    expect(screen.queryByRole('button', { name: /Composto/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/app/campaigns/wizard/CreativeStep.overlay.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="overlay-canvas"]`.

- [ ] **Step 3: Implementar a troca no CreativeStep**

Acrescentar aos imports do topo:

```tsx
import { OverlayCanvas, type OverlayLayerId } from './OverlayCanvas';
import { logoDevUrl } from '@/lib/linkedin/logo';
import { type OverlayLayout } from './overlayLayout';
```

Junto dos outros `useState` do componente:

```tsx
  // Camada selecionada no editor — é ela que os controles do card 2 editam.
  const [selectedLayer, setSelectedLayer] = useState<OverlayLayerId | null>(null);
  // O editor ao vivo é o default; "Composto" existe só para conferir que o
  // resvg bateu com o que estava na tela.
  const [previewMode, setPreviewMode] = useState<'editor' | 'composed'>('editor');
```

Perto de `setImageField`, acrescentar o roteador de layout:

```tsx
  // O layout é sobrescrito como objeto inteiro; `setImageField` já sabe mandar
  // para o override certo, então isto é só um atalho tipado.
  const setLayout = (next: OverlayLayout) => setImageField({ layout: next });
```

Logo depois de `imageCfg`, resolver as duas URLs de logo:

```tsx
  // Logo do anunciante vem do Brand Kit. Logo da conta usa o que a segmentação
  // já trouxe e cai no logo.dev quando ela não trouxe nada. No Template global
  // não há empresa-alvo, então o preview usa `previewCompany` (companies[0])
  // como stand-in — mesma escolha que o resto do preview já faz.
  const advertiserLogoUrl = imageCfgSource.brandKit.logo;
  const targetLogoUrl = previewCompany
    ? (previewCompany.logoUrl || logoDevUrl(previewCompany.domain) || null)
    : null;
  const composedImageUrl = editingCompany ? (editingOverride?.imageUrl ?? null) : null;
```

Substituir o bloco do slot de imagem (`<div className="relative aspect-[1200/628] …">…</div>`) por:

```tsx
                {previewMode === 'composed' && composedImageUrl ? (
                  <div className={imageCfg.format === 'square' ? 'aspect-[1200/1200]' : 'aspect-[1200/628]'}>
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
```

No header do preview, ao lado dos botões de device, acrescentar o toggle condicional:

```tsx
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/app/campaigns/wizard/`
Expected: PASS — inclusive `CreativeStep.geracao.test.tsx` e `CreativeStep.brief.test.tsx`, que não devem ter regredido.

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/wizard/CreativeStep.tsx src/app/campaigns/wizard/CreativeStep.overlay.test.tsx
git commit -m "feat(criativo): preview vira editor e respeita o formato escolhido"
```

---

### Task 7: Reordenar o card e adicionar os controles

**Files:**
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx:1142-1350` (corpo do SectionCard 2), `:1738-1775` (`AD_FORMATS` / `FormatButton`)
- Modify: `src/app/campaigns/wizard/CreativeStep.overlay.test.tsx` (acrescentar describes)

**Interfaces:**
- Consumes: `imageCfg.layout`, `setLayout`, `selectedLayer`, `setSelectedLayer` da Task 6; `LOGO_WRAP_ASPECT`, `type LogoWrap`, `type TextBackdrop`, `type TextLayer`, `type LogoLayer` de `./overlayLayout`.
- Produces: subcomponentes locais `TextLayerControls`, `LogoLayerControls`, `WrapPicker`, `BackdropPicker`, `ColorPicker` no final de `CreativeStep.tsx`, junto de `FormatButton` e `TextField`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `src/app/campaigns/wizard/CreativeStep.overlay.test.tsx`:

```tsx
describe('CreativeStep — ordem do card Imagem', () => {
  // O pedido: upload antes dos textos. E formato antes do upload, porque é ele
  // que define as dimensões que a dropzone pede.
  it('formato vem antes da origem, que vem antes dos textos', () => {
    const { container } = renderStep();
    goTo(/Template global/);
    // Busca pelo conteúdo e não por índice: a posição do <section> muda toda
    // vez que alguém acrescenta um card, e o teste passaria a medir outra coisa.
    const card = Array.from(container.querySelectorAll('section'))
      .find((sec) => (sec.textContent || '').includes('ORIGEM DA IMAGEM-BASE'))!;
    const texto = card.textContent || '';
    expect(texto.indexOf('FORMATO')).toBeLessThan(texto.indexOf('ORIGEM DA IMAGEM-BASE'));
    expect(texto.indexOf('ORIGEM DA IMAGEM-BASE')).toBeLessThan(texto.indexOf('TEXTO DESTAQUE'));
  });

  it('a dropzone anuncia a dimensão do formato escolhido', () => {
    renderStep();
    goTo(/Template global/);
    // `getAllByText`: o rótulo aparece DUAS vezes — no FormatButton e na
    // dropzone —, e `getByText` estouraria com "found multiple elements".
    expect(screen.getAllByText(/1200 × 628 px/).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: /Quadrado/ }));
    expect(screen.getAllByText(/1200 × 1200 px/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/1200 × 628 px/)).not.toBeInTheDocument();
  });
});

describe('CreativeStep — controles de camada', () => {
  it('mudar o tamanho do destaque grava no layout', () => {
    renderStep(comBase());
    goTo(/Template global/);
    const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
    expect(slider.value).toBe('56');
    fireEvent.change(slider, { target: { value: '90' } });
    // Só volta 90 se tiver dado a volta inteira: setLayout → updateCreative →
    // prop → imageCfg.layout. É esse circuito que o teste tranca.
    expect(slider.value).toBe('90');
  });

  // jsdom não implementa canvas.measureText, então `measureTextWidthPx` devolve 0
  // e o teto cai no máximo duro. O que este teste garante é o contrato do
  // atributo; a aritmética do teto está coberta em `overlayLayout.test.ts`.
  it('o slider do destaque expõe piso e teto', () => {
    renderStep(comBase());
    goTo(/Template global/);
    const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
    expect(Number(slider.min)).toBe(16);
    expect(Number(slider.max)).toBeGreaterThan(0);
  });

  it('trocar o fundo para Nenhum tira a caixa do preview', () => {
    renderStep(comBase());
    goTo(/Template global/);
    fireEvent.click(screen.getAllByRole('button', { name: /^Nenhum$/ })[0]);
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ backgroundColor: 'transparent' });
  });
});

describe('CreativeStep — logos', () => {
  it('"Meu logo" fica desabilitado sem logo no Brand Kit', () => {
    renderStep(comBase());
    goTo(/Template global/);
    expect(screen.getByLabelText(/Meu logo/)).toBeDisabled();
  });

  it('"Logo da conta" começa marcado e desmarcar tira o logo do preview', () => {
    renderStep(comBase());
    goTo(/Template global/);
    const check = screen.getByLabelText(/Logo da conta/);
    expect(check).toBeChecked();
    fireEvent.click(check);
    expect(screen.queryByAltText('Logo da conta')).not.toBeInTheDocument();
  });

  it('"Agrupar como par" liga os dois logos de uma vez', () => {
    const d = comBase();
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA' };
    renderStep(d);
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /Agrupar como par/ }));
    expect(screen.getByAltText('Meu logo')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx vitest run src/app/campaigns/wizard/CreativeStep.overlay.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: /Tamanho do texto destaque/`.

- [ ] **Step 3: Acrescentar `w`/`h` reais ao `AD_FORMATS` e usar na dropzone**

Trocar o campo `size` de `AD_FORMATS` por uma derivação de `AD_FORMAT_SIZE`, para que rótulo e canvas nunca divirjam:

```tsx
const AD_FORMATS: Record<AdFormat, { label: string; ratio: string; icon: React.ReactNode }> = {
  square: { label: 'Quadrado', ratio: '1:1', icon: <Square className="w-4 h-4" strokeWidth={2.25} /> },
  banner: { label: 'Banner', ratio: '1.91:1', icon: <RectangleHorizontal className="w-4 h-4" strokeWidth={2.25} /> },
};

// O rótulo sai das dimensões reais do canvas — se um dia mudarem, o texto muda junto.
const formatSizeLabel = (f: AdFormat) => `${AD_FORMAT_SIZE[f].w} × ${AD_FORMAT_SIZE[f].h} px`;
```

Atualizar `FormatButton` para usar `formatSizeLabel(format)` no lugar de `meta.size`, e a dropzone para `JPG ou PNG • {formatSizeLabel(imageCfg.format)} • Máx 5MB`.

- [ ] **Step 4: Reordenar o corpo do card e trocar os controles**

Dentro do `<SectionCard index={2} title="Imagem" …>`, reorganizar para esta ordem, mantendo o `<input type="file">` escondido onde está:

1. **Formato** — o bloco `<div>` com os dois `FormatButton`, agora primeiro.
2. **Origem da imagem-base** — o segmented existente com os dois `ModeButton`, junto do botão `Voltar ao template` que já existe.
3. **Imagem-base** — a linha compacta quando `imageCfg.baseImageUrl` existe, a dropzone quando não existe e a origem é upload, e o texto de "será criada quando você usar Gerar imagem-base" quando a origem é IA. É o bloco que hoje está no fim do card, movido para cá inteiro. O campo `Prompt para imagem` (origem IA) vem logo acima dele.
4. **Divisor** `<div className="h-px bg-slate-200 my-3" />`.
5. **Textos** — os dois `TextField` existentes, cada um seguido do seu `TextLayerControls`.
6. **Fonte** — o `FontPicker` existente.
7. **Divisor**, e **Logos**.

O `<p>` explicativo laranja perde a menção a IA, porque o overlay nunca foi IA:

```tsx
                <p className="text-[10px] text-[#E54A26] leading-relaxed">
                  {editingCompany
                    ? `Os textos e os logos são aplicados sobre a imagem-base. Arraste no preview para posicionar. Alterar qualquer campo aqui vale só para ${editingCompany.label}.`
                    : 'Os textos e os logos são aplicados sobre a imagem-base. Arraste no preview para posicionar. Compartilhados entre todas as empresas da campanha.'}
                </p>
```

Substituir o checkbox `Aplicar logo da empresa-alvo na imagem` pelo bloco de logos:

```tsx
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Logos</label>
                <button
                  type="button"
                  onClick={() => setLayout({
                    ...imageCfg.layout,
                    paired: !imageCfg.layout.paired,
                    advertiserLogo: { ...imageCfg.layout.advertiserLogo, enabled: true },
                    targetLogo: { ...imageCfg.layout.targetLogo, enabled: true },
                  })}
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
                selected={selectedLayer === 'targetLogo'}
                onSelect={() => setSelectedLayer('targetLogo')}
                onChange={(next) => setLayout({ ...imageCfg.layout, targetLogo: next })}
              />
```

Importar `Copy` de `lucide-react` junto dos outros ícones.

- [ ] **Step 5: Implementar os subcomponentes de controle**

Acrescentar ao final de `CreativeStep.tsx`, junto de `FormatButton` e `TextField`:

```tsx
// Controles de uma camada de texto. Ficam no card e não flutuando sobre a
// imagem: o preview é para arrastar e olhar, o card é onde se ajusta número.
function TextLayerControls({ id, label, layer, texto, fontFamily, format, palette, selected, onSelect, onChange }: {
  id: string;
  label: string;
  layer: TextLayer;
  texto: string;
  fontFamily: string;
  format: AdFormat;
  palette: string[];
  selected: boolean;
  onSelect: () => void;
  onChange: (next: TextLayer) => void;
}) {
  // Teto vivo: um destaque longo não pode chegar aos 160px, senão vaza do
  // canvas e o PNG sai cortado. Mede uma vez no tamanho atual e escala.
  const maxSize = maxTextSizePx(
    measureTextWidthPx(texto, layer.sizePx, fontFamily), layer.sizePx, format,
  );
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
          step={2}
          value={Math.min(layer.sizePx, maxSize)}
          onChange={(e) => onChange({ ...layer, sizePx: Number(e.target.value) })}
          className="flex-1 accent-[#FF5F39]"
        />
        <span className="text-[10px] font-bold text-slate-600 tabular-nums w-10 text-right">{layer.sizePx}px</span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cor</span>
        {palette.filter(Boolean).map((c) => (
          <button
            key={c}
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

function LogoLayerControls({ id, label, layer, disabled, disabledHint, selected, onSelect, onChange }: {
  id: string;
  label: string;
  layer: LogoLayer;
  disabled?: boolean;
  disabledHint?: string;
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
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Wrap</span>
            {(['circle', 'square', 'rect', 'none'] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={layer.wrap === w}
                aria-label={`${WRAP_LABEL[w]} para ${label}`}
                onClick={() => { onSelect(); onChange({ ...layer, wrap: w }); }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                  layer.wrap === w
                    ? 'bg-[#FF5F39] border-[#FF5F39] text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {WRAP_LABEL[w]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <label htmlFor={`${id}-size`} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
              Tamanho do {label}
            </label>
            <input
              id={`${id}-size`}
              type="range"
              min={60}
              max={420}
              step={10}
              value={layer.sizePx}
              onChange={(e) => { onSelect(); onChange({ ...layer, sizePx: Number(e.target.value) }); }}
              className="flex-1 accent-[#FF5F39]"
            />
            <span className="text-[10px] font-bold text-slate-600 tabular-nums w-10 text-right">{layer.sizePx}px</span>
          </div>
        </>
      )}
    </div>
  );
}
```

Chamar `TextLayerControls` logo abaixo de cada `TextField`:

```tsx
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
                  texto={imageCfg.textoDestaque}
                  fontFamily={imageCfg.fontFamily}
                  format={imageCfg.format}
                  palette={[imageCfgSource.brandKit.colors.primary, imageCfgSource.brandKit.colors.secondary, imageCfgSource.brandKit.colors.accent, '#FFFFFF']}
                  selected={selectedLayer === 'destaque'}
                  onSelect={() => setSelectedLayer('destaque')}
                  onChange={(next) => setLayout({ ...imageCfg.layout, destaque: next })}
                />
```

…e o equivalente para o segundo campo, com `id="complementar"`, `label="complementar"`,
`layer={imageCfg.layout.complementar}`, `texto={imageCfg.textoComplementar}` e o mesmo
`fontFamily` / `format` / `palette`.

Importar o que os controles usam:

```tsx
import type { AdFormat, LogoLayer, LogoWrap, TextLayer } from './overlayLayout';
import { AD_FORMAT_SIZE, maxTextSizePx, MIN_TEXT_SIZE_PX } from './overlayLayout';
import { measureTextWidthPx } from './OverlayCanvas';
```

`AD_FORMAT_SIZE` vem de `./overlayLayout`, **nunca** do módulo do servidor — o cliente não
importa de `supabase/functions/` fora de teste.

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx vitest run src/app/campaigns/wizard/`
Expected: PASS.

Atenção: `CreativeStep.geracao.test.tsx` assere a presença do botão `Enviar arquivo` no header do
card 2 e o texto do bloco explicativo. Se o texto explicativo mudou, ajustar a asserção lá —
**mudar o teste é correto aqui**, porque o texto antigo dizia "aplicados pela IA" e isso deixou
de ser verdade.

- [ ] **Step 7: Commit**

```bash
git add src/app/campaigns/wizard/CreativeStep.tsx src/app/campaigns/wizard/CreativeStep.overlay.test.tsx src/app/campaigns/wizard/CreativeStep.geracao.test.tsx
git commit -m "feat(criativo): card na nova ordem, com controles de camada e dois logos"
```

---

### Task 8: Enviar o layout medido na composição

**Files:**
- Modify: `src/lib/ai.ts:74-125` (`generateBaseImage` e `composeLogoOverlay`)
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx:498-530` (`composeOverlayFor`)

**Interfaces:**
- Consumes: `measureTextWidthPx` de `./OverlayCanvas`; `effectiveLayout` de `./overlayLayout`.
- Produces: `composeLogoOverlay` aceita `layout: OverlayLayout`, `advertiser_logo_url: string | null`, `destaque_width_px?: number`, `complementar_width_px?: number` e devolve `advertiser_logo_applied: boolean`.

- [ ] **Step 1: Atualizar o contrato em `src/lib/ai.ts`**

Em `generateBaseImage`, apagar o caveat de que `format` não é honrado e substituir por:

```ts
// `format` define a proporção pedida no prompt (1:1 ou 1.91:1) desde 2026-08-18.
```

Substituir a assinatura e o comentário de `composeLogoOverlay`:

```ts
// Compõe o anúncio final: os dois textos e os logos habilitados sobre a
// imagem-base, nas posições que o usuário arrastou. NÃO usa IA — o servidor
// monta um SVG a partir do layout e rasteriza com resvg.
export async function composeLogoOverlay(input: {
  base_image_url: string;
  target_company_name: string;
  target_company_domain?: string | null;
  advertiser_logo_url?: string | null;
  texto_destaque?: string;
  texto_complementar?: string;
  font_family?: string;
  format?: 'square' | 'banner';
  layout: OverlayLayout;
  // Larguras medidas no cliente com a fonte real. Sem elas o servidor cai num
  // estimador por contagem de caracteres e a caixa de fundo não bate com o
  // preview.
  destaque_width_px?: number;
  complementar_width_px?: number;
}): Promise<{
  success: boolean; url: string; filename: string;
  logo_applied: boolean; advertiser_logo_applied: boolean;
}> {
```

Acrescentar ao topo de `ai.ts`: `import type { OverlayLayout } from '@/app/campaigns/wizard/overlayLayout';`

- [ ] **Step 2: Atualizar `composeOverlayFor` no CreativeStep**

```tsx
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
      // `effectiveLayout` resolve o modo par ANTES de enviar: o servidor recebe
      // dois logos com posições concretas e não precisa saber que existe par.
      const layout = effectiveLayout(cfg.layout, cfg.format);
      const result = await composeLogoOverlay({
        base_image_url: cfg.baseImageUrl,
        target_company_name: company.label,
        target_company_domain: company.domain || null,
        advertiser_logo_url: data.brandKit.logo,
        texto_destaque: cfg.textoDestaque,
        texto_complementar: cfg.textoComplementar,
        font_family: cfg.fontFamily,
        format: cfg.format,
        layout,
        destaque_width_px: measureTextWidthPx(cfg.textoDestaque, layout.destaque.sizePx, cfg.fontFamily),
        complementar_width_px: measureTextWidthPx(cfg.textoComplementar, layout.complementar.sizePx, cfg.fontFamily),
      });
      updateOverride(company.id, { imageUrl: result.url, imageFileName: result.filename });
      return true;
    } catch (err: any) {
      setAiError(`Composição para ${company.label}: ${err.message}`);
      return false;
    } finally {
      setAiImageLoading((s) => { const next = { ...s }; delete next[company.id]; return next; });
    }
  };
```

Importar `effectiveLayout` de `./overlayLayout` e `measureTextWidthPx` de `./OverlayCanvas`.

- [ ] **Step 3: Escrever o teste do payload**

Acrescentar a `src/app/campaigns/wizard/CreativeStep.overlay.test.tsx`:

```tsx
describe('CreativeStep — payload da composição', () => {
  it('manda layout, formato, logo do anunciante e as larguras medidas', async () => {
    const ai = await import('@/lib/ai');
    const spy = vi.spyOn(ai, 'composeLogoOverlay').mockResolvedValue({
      success: true, url: 'https://exemplo/ad.png', filename: 'ad.png',
      logo_applied: true, advertiser_logo_applied: false,
    });

    const d = comBase();
    d.templateLogo.format = 'square';
    renderStep(d);
    goTo(/Nubank/);
    fireEvent.click(screen.getByRole('button', { name: /Gerar imagem/ }));

    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    const payload = spy.mock.calls[0][0];
    expect(payload.format).toBe('square');
    expect(payload.layout.destaque.sizePx).toBe(56);
    expect(payload).toHaveProperty('advertiser_logo_url');
    expect(payload).toHaveProperty('destaque_width_px');
    spy.mockRestore();
  });
});
```

O `vi.mock('@/lib/ai', …)` no topo do arquivo já usa `importOriginal`, então o `spyOn` funciona
sobre o módulo real.

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai.ts src/app/campaigns/wizard/CreativeStep.tsx src/app/campaigns/wizard/CreativeStep.overlay.test.tsx
git commit -m "feat(criativo): composição envia layout, formato e larguras medidas"
```

---

## Verificação final

- [ ] `npm test` — suíte inteira verde.
- [ ] `npx tsc --noEmit` — sem erro de tipo.
- [ ] `npm run build` — build limpo.
- [ ] Manual, contra a função implantada: subir uma imagem 1200×1200, escolher Quadrado, arrastar destaque para o rodapé, marcar os dois logos com wraps diferentes, gerar para uma conta e comparar `Editor` × `Composto`. As posições devem coincidir.
