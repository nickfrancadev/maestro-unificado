# Card Imagem — editor de overlay posicionável, formato real e dois logos

**Data:** 2026-08-18
**Escopo:** `CreativeStep.tsx`, `OverlayCanvas.tsx` (novo), `overlayLayout.ts` (novo), `types.ts`,
`lib/ai.ts`, `brandKit.ts` e a edge function `make-server-a4d5bbe0/index.ts`.
**Continua:** [2026-08-11-criativo-texto-imagem-design.md](2026-08-11-criativo-texto-imagem-design.md),
que entregou o card e deixou o formato explicitamente quebrado.

## Problema

Quatro coisas, todas no card **2 · Imagem** e na coluna de preview.

1. **A ordem do card mente sobre o fluxo.** O upload da imagem-base é a última coisa no card,
   depois dos textos, da fonte e do formato — mas é o primeiro passo real do usuário. Pior:
   a dropzone anuncia as dimensões exigidas (`1200 × 1200 px`) *abaixo* do seletor que as
   define.
2. **`FORMATO` não faz nada.** `AdFormat` é guardado e enviado, mas `CANVAS_W = 1200` /
   `CANVAS_H = 628` são constantes
   ([index.ts:3007](../../../supabase/functions/make-server-a4d5bbe0/index.ts)) e o preview
   tem `aspect-[1200/628]` fixo
   ([CreativeStep.tsx:1483](../../../src/app/campaigns/wizard/CreativeStep.tsx)). Escolher
   Quadrado devolve banner nos dois lados. A revisão anterior assumiu isso como dívida.
3. **O usuário não decide onde nada fica.** `TEXT_X = 48`, `TEXT_TOP = 48`,
   `HEADLINE_FONT_PX = 56`, `LOGO_CARD_RIGHT = 48` são constantes do servidor. Texto sempre
   no canto superior esquerdo, logo sempre no superior direito, tamanhos fixos. Numa
   imagem-base enviada pelo usuário — que tem a própria composição — isso acerta por acaso.
4. **O logo do anunciante nunca aparece no anúncio.** `brandKit.logo` existe, é editado no
   modal de marca, e não é lido por nenhum caminho de composição. Só o logo da conta-alvo é
   aplicado.

### O que NÃO é o problema

O overlay **já é determinístico**. `renderOverlayPng`
([index.ts:3033](../../../supabase/functions/make-server-a4d5bbe0/index.ts)) monta um SVG e
rasteriza com resvg — não há IA na aplicação do texto. O comentário em
[index.ts:2751](../../../supabase/functions/make-server-a4d5bbe0/index.ts) ainda descreve o
fluxo antigo ("asks the model to paint texts + logo on top") e está desatualizado; corrigir
junto.

A IA continua existindo, e só onde sempre esteve: **gerando a imagem-base**. O toggle
`Enviar imagem` / `Gerar com IA` permanece. O editor manual de overlay se aplica igual às
duas origens.

## Princípio da solução

> **Um modelo de layout, duas renderizações.**
> O preview do LinkedIn e o resvg leem os mesmos números. Nada de coordenadas duplicadas.

Coordenadas normalizadas (0–1) e tamanhos em px sobre um canvas de referência de **1200 de
largura**. O DOM escala por `larguraDoPreview / 1200`; o servidor usa os valores direto.

## 1 · Modelo de layout

```ts
// types.ts
export type LogoWrap = 'circle' | 'square' | 'rect' | 'none';
export type TextBackdrop = 'box' | 'shadow' | 'none';

export interface TextLayer {
  x: number; y: number;      // 0–1, CENTRO do elemento
  sizePx: number;            // px no canvas de referência (largura 1200)
  color: string;             // hex
  backdrop: TextBackdrop;
}

export interface LogoLayer {
  enabled: boolean;
  x: number; y: number;      // 0–1, CENTRO
  sizePx: number;            // largura do wrap, px no canvas de referência
  wrap: LogoWrap;
}

export interface OverlayLayout {
  destaque: TextLayer;
  complementar: TextLayer;
  advertiserLogo: LogoLayer; // "Meu logo"      → brandKit.logo
  targetLogo: LogoLayer;     // "Logo da conta" → logo.dev
  paired: boolean;           // atalho co-branded
}
```

**Todo elemento é centro-ancorado e todo texto é de linha única.** Os dois campos já são
`<input>`, então a caixa de fundo abraça o texto e cresce simétrica quando ele muda. Dois
textos no mesmo `x` empilham alinhados sem controle de alinhamento — que fica fora de v1.

`sizePx` é absoluto, não fração, porque **os dois formatos têm 1200 de largura**
(1200×1200 e 1200×628). O número que a UI mostra é o número que o servidor usa.

### Onde mora

| Campo | Efeito |
|---|---|
| `TemplateLogoConfig.layout: OverlayLayout` | layout da campanha |
| `CompanyCreativeOverride.layout?: OverlayLayout` | objeto inteiro, `undefined` = herda |
| `IMAGE_OVERRIDE_FIELDS` ganha `'layout'` | alimenta o chip "personalizado" e o reset |
| `ResolvedImageConfig.layout` | `ovr?.layout ?? tpl.layout` em `resolveImageConfig` |

Override é do **objeto inteiro**, não campo a campo. Um layout meio-herdado meio-próprio não
tem leitura possível na UI ("essa empresa herdou a posição do texto mas não a do logo"), e o
reset fica trivial.

### Migração de `showTargetLogo`

`layout.targetLogo.enabled` absorve `showTargetLogo`. O campo antigo sai da UI, mas
`withImageDefaults` ([CreativeStep.tsx:108](../../../src/app/campaigns/wizard/CreativeStep.tsx))
continua lendo-o para semear o novo: campanhas já salvas não podem perder a configuração.
`showTargetLogo` permanece em `TemplateLogoConfig` marcado como legado.

### Defaults

Os defaults **aproximam** o visual atual — destaque em cima à esquerda, complementar logo
abaixo, logo da conta em cima à direita, caixa preta — mas não o reproduzem ao pixel: as
constantes de hoje são ancoradas à **esquerda** (`TEXT_X = 48`) e o modelo novo é
centro-ancorado, então o `x` default de um texto depende do comprimento dele. Fixamos
valores que caem no mesmo canto em vez de tentar derivar do texto:

| camada | x | y | sizePx | resto |
|---|---|---|---|---|
| `destaque` | `0.30` | `0.14` | `56` | `#FFFFFF`, backdrop `box` |
| `complementar` | `0.30` | `0.26` | `28` | `#FFFFFF`, backdrop `box` |
| `advertiserLogo` | `0.14` | `0.85` | `140` | `wrap: 'rect'`, `enabled: false` |
| `targetLogo` | `0.86` | `0.15` | `140` | `wrap: 'square'`, `enabled` ← `showTargetLogo` |

`advertiserLogo` nasce desligado porque `brandKit.logo` é `null` por default — ligá-lo
mostraria um buraco.

## 2 · O preview vira o editor

A área da imagem no preview troca o `aspect` fixo por `aspect-[1200/1200]` ou
`aspect-[1200/628]` conforme `imageCfg.format`, e o `<img>` único vira `<OverlayCanvas>`.

```
┌── Preview LinkedIn ──────── [Editor|Composto] ─┐
│  Maestro ABM · Promoted                        │
│  texto do anúncio…                             │
│  ┌────────────────────────────────────────┐    │
│  │  imagem-base (object-cover)            │    │
│  │    ╔══════════════╗        ╭───╮       │    │
│  │    ║ WORKSHOP ABM ║ ←drag  │ N │ ←drag │    │
│  │    ╚══════════════╝        ╰───╯       │    │
│  │      Convite VIP                       │    │
│  └────────────────────────────────────────┘    │
│  maestro.abm.com · Headline · [Learn More]     │
└────────────────────────────────────────────────┘
```

**Arquivo próprio.** `CreativeStep.tsx` já tem 1904 linhas; o editor não entra lá dentro.
`OverlayCanvas.tsx` recebe `layout`, `baseImageUrl`, `format`, as duas URLs de logo, os dois
textos, a fonte, e devolve `onLayoutChange` + `onSelect`. Não conhece template nem empresa.

As funções puras (defaults, resolução, normalizado↔px, clamp) ficam em `overlayLayout.ts`,
testáveis sem DOM.

**Interação:** pointer events convertem delta em px para delta normalizado; a bounding box
fica travada dentro do canvas. Clique seleciona a camada (anel laranja) e os controles do
card à esquerda passam a agir sobre ela. O editor **só arrasta e seleciona** — nenhum
controle flutuante sobre a imagem, para não competir com o card.

**Editor vs Composto.** O slot mostra o editor ao vivo sempre que existe imagem-base. O
toggle `Composto` só aparece quando já existe PNG composto para aquela empresa, e serve para
conferir que o resvg bateu com o preview. Default é `Editor`.

**No Template global** não há empresa-alvo, então o logo da conta usa `companies[0]` como
stand-in — é o que `previewCompany`
([CreativeStep.tsx:285](../../../src/app/campaigns/wizard/CreativeStep.tsx)) já faz para o
resto do preview.

Sem imagem-base, o slot mantém o placeholder atual.

**`resolveCreativeForCompany` não muda.** A cadeia
`override.imageUrl → override.baseImageUrl → data.imageUrl` continua sendo a fonte do toggle
`Composto` e — mais importante — do que o `OrchestrationStep` publica. O editor ao vivo é uma
camada de edição por cima da imagem-base, não um novo caminho de saída: o PNG que roda no
LinkedIn continua sendo o que o resvg produziu.

## 3 · Ordem e controles do card

```
┌ 2  IMAGEM ─────────────────────────────────────┐
│ FORMATO      [▪ Quadrado 1:1][▭ Banner 1.91:1] │
│ ORIGEM       [↑ Enviar imagem][✦ Gerar com IA] │
│                                                │
│ ┌────────────────────────────────────────────┐ │
│ │  ↑  Clique ou arraste a imagem-base        │ │
│ │     JPG ou PNG • 1200 × 1200 px • Máx 5MB  │ │
│ └────────────────────────────────────────────┘ │
│ ─────────────────────────────────────────────  │
│ TEXTO DESTAQUE          ● selecionado          │
│ [ WORKSHOP ABM                              ]  │
│ Tamanho [────●────] 56px   Cor [■][■][■][#FFF] │
│ Fundo   [ Caixa ][ Sombra ][ Nenhum ]          │
│                                                │
│ TEXTO COMPLEMENTAR                             │
│ [ Convite exclusivo VIP                     ]  │
│ Tamanho [──●──────] 28px   Cor [■][■][■][#FFF] │
│ Fundo   [ Caixa ][ Sombra ][ Nenhum ]          │
│                                                │
│ FONTE        [ Inter                       ▾]  │
│ ─────────────────────────────────────────────  │
│ LOGOS                    [ ⧉ Agrupar como par ]│
│ ☑ Meu logo                                     │
│   Wrap [◯][▢][▭][sem]   Tamanho [──●───] 140px │
│ ☑ Logo da conta                                │
│   Wrap [◯][▢][▭][sem]   Tamanho [──●───] 140px │
└────────────────────────────────────────────────┘
```

**`FORMATO` sobe para o topo**, acima até da origem: é ele que define as dimensões que a
dropzone pede, e mandar subir arquivo antes de saber se é 1200×1200 ou 1200×628 é a ordem
errada. O upload vem logo em seguida, antes dos textos, como pedido.

Na origem `Gerar com IA`, o campo `Prompt para imagem` ocupa o lugar da dropzone.

Os atalhos de cor `[■][■][■]` são `brandKit.colors.primary/secondary/accent`, que já existem.
"Meu logo" fica desabilitado, com dica apontando para o Brand Kit, quando `brandKit.logo` é
`null` — que é o estado default hoje.

**Agrupar como par** liga `paired`: alinha o logo da conta ao lado do do anunciante com gap
fixo, iguala `sizePx` e `wrap`, e passa a mostrar uma alça de arrasto só. Desagrupar devolve
o controle individual mantendo as posições resultantes.

## 4 · Servidor

`renderOverlayPng` perde as constantes de posição e recebe o layout. `CANVAS_W/CANVAS_H`
derivam do `format`, que já chega no payload e hoje é descartado.

### Wraps (iguais para os dois logos)

| wrap | render SVG |
|---|---|
| `circle` | `<circle>` branco + `clipPath` circular; logo em `meet` com padding |
| `square` | rect arredondado 1:1 — o comportamento de hoje |
| `rect` | rect arredondado 2.5:1, para wordmarks horizontais; `sizePx` é a **largura**, a altura deriva |
| `none` | só o `<image>`, sem cartão |

### Backdrop do texto

| backdrop | render SVG |
|---|---|
| `box` | rect arredondado atrás do texto — o comportamento de hoje |
| `shadow` | `feDropShadow` aplicado ao `<text>` |
| `none` | nada |

### A largura da caixa vem medida do cliente

`estimateWidth` (`length * sizePx * 0.55`,
[index.ts:3050](../../../supabase/functions/make-server-a4d5bbe0/index.ts)) é um chute que só
sobrevive porque a posição é fixa e ninguém compara. Com o preview ao lado mostrando a caixa
real, qualquer divergência fica visível.

O cliente mede com `measureText` na fonte já carregada e envia `destaque_width_px` /
`complementar_width_px`. O servidor usa se vier e **cai no estimador atual se não vier** —
chamadas antigas continuam funcionando.

### `/ai/generate-base-image`

Também precisa do formato no prompt: hoje pede 1.91:1 fixo, então escolher Quadrado geraria
uma base banner que o canvas quadrado recortaria.

### Contrato de `composeLogoOverlay`

Ganha `layout`, `advertiser_logo_url` e as duas larguras medidas. `format` deixa de ser
ignorado. Os caveats em [ai.ts:82-84 e 112-114](../../../src/lib/ai.ts) saem.

## 5 · Riscos

**Logo do anunciante em SVG — o mais provável de morder.** `brandKit.logo` é hoje sempre
`null` ou o `MOCK_LOGO`, um `data:image/svg+xml`
([brandKit.ts:44](../../../src/app/campaigns/wizard/brandKit.ts)); a extração de marca é
mock. O `<image href>` do resvg não renderiza SVG aninhado de forma confiável — é exatamente
por isso que `resolveTargetLogo` rasteriza o logo da conta antes de passar adiante
([index.ts:2797](../../../supabase/functions/make-server-a4d5bbe0/index.ts)).

Plano: trocar a fixture por PNG data-URI e passar o logo do anunciante pelo mesmo caminho de
rasterização do logo da conta. **Verificar cedo** — se falhar, o checkbox "Meu logo" não
entrega nada e metade do item 4 do pedido cai.

**Fontes no preview.** `measureText` precisa da Google Font carregada, senão mede no fallback
e a caixa nasce errada. `document.fonts.load()` antes de medir, re-medição em
`document.fonts.ready`.

**Texto estourando o canvas.** O slider de tamanho é limitado ao que cabe na largura do
canvas para o texto atual, e o arrasto trava a bounding box dentro das bordas.

**Trocar de formato com base já enviada.** Recorta via `object-cover` no preview e
`xMidYMid slice` no servidor — mesmo comportamento nos dois lados, sem exigir re-upload.

## 6 · Testes

**Puros** (`overlayLayout.test.ts`): defaults reproduzem o visual atual; resolução com e sem
override; migração de `showTargetLogo` para `targetLogo.enabled`; normalizado→px nos dois
formatos; clamp do arrasto nas quatro bordas; `paired` derivando a posição do logo da conta.

**Componente**: trocar formato muda o aspect do preview; upload faz a imagem-base aparecer no
editor; arrastar uma camada grava no layout; editar layout numa empresa marca override e
`Voltar ao template` limpa; "Meu logo" desabilitado sem `brandKit.logo`.

## Fora de escopo

- Alinhamento de texto (esquerda/centro/direita) e texto multi-linha.
- Rotação, opacidade e z-order das camadas.
- Extração real de marca — `brandKit.logo` continua vindo da fixture mock.
- [AdsPipelineDocs.tsx:320](../../../src/app/pages/AdsPipelineDocs.tsx) descreve a resolução
  de logo e não menciona o logo do anunciante; ficará incompleto.
