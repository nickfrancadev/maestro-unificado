# Step Criativo — separar Texto de Imagem com botões explícitos

**Data:** 2026-08-11
**Escopo:** front-end apenas (`CreativeStep.tsx`, `types.ts`, `lib/ai.ts`). Nenhuma mudança na edge function.

## Problema

No Step 3 (Criativo) não fica claro onde clicar para gerar texto e onde clicar para gerar
imagem — nem no Template global, nem numa empresa específica. Cinco causas concretas:

1. **Três níveis de configuração empilhados na mesma coluna, sem distinção visual.**
   "Modo de geração", "Texto destaque/complementar" e "Aplicar logo" são globais do template,
   mas aparecem *editáveis* dentro da visão de empresa, sinalizados apenas por um
   `configuração global do template` em itálico cinza de 10px.
2. **Cinco pontos de geração em quatro pesos visuais diferentes** — botão verde no header,
   dois links de 10px ("Regenerar texto", "Aplicar overlay"), botão verde largo
   ("Gerar imagem-base com IA") e o dropzone.
3. **O dropzone muda de significado sem mudar de aparência.** No template define a
   imagem-base da campanha; na empresa vira override da imagem final.
4. **Texto e imagem estão intercalados**, não separados.
5. **O Template global não tem geração de texto por IA** — `generateCopyFor` exige uma empresa.

Além disso, os rótulos do seletor de modo mentem: `template_logo`, `photo_ai` e `graphic_ai`
sugerem três estilos de saída, mas os três caminham para o *mesmo* `composeLogoOverlay`
(textos + logo). A única diferença real é **como a imagem-base é obtida**.

## Princípio da solução

> **Header = ação do nível inteiro. Card = ação daquele bloco.**
> Nunca mais de um botão de gerar competindo no mesmo lugar.

A coluna do editor vira cards numerados, um por responsabilidade, cada um com o seu botão
no próprio header.

## Estrutura por alvo

### Template global

| Onde | Ação |
|---|---|
| Header | `✨ Gerar para todas (N)` — fan-out existente (`generateForAllCompanies`) |
| Card **1 · Texto** | `✨ Gerar texto` — **novo** |
| Card **2 · Imagem** | `✨ Gerar imagem-base` — só quando origem = IA |
| Card **3 · Destino** | sem ação de IA (URL + CTA) |

Card 2 contém, nesta ordem:

- `ORIGEM DA IMAGEM-BASE` → segmented de **dois** valores: `⬆ Enviar imagem` · `✨ Gerar com IA`
- se origem = IA: textarea **Prompt da imagem** (novo) + preview da base
- se origem = upload: dropzone + preview
- divisor + `APLICADO POR CIMA, EM TODA EMPRESA`: texto destaque, texto complementar,
  checkbox "Aplicar logo da empresa-alvo"

### Empresa

| Onde | Ação |
|---|---|
| Header | `✨ Gerar texto + imagem` — `generateAllFor` existente |
| Card **1 · Texto** | `✨ Gerar texto` — `generateCopyFor` existente |
| Card **2 · Imagem** | `✨ Gerar imagem` — `generateImageFor` existente |

Card 2 na empresa contém:

- caixa **somente-leitura** resumindo a config global (thumb da base, origem, os dois textos,
  se leva logo) + botão `Editar no template` que faz `setEditingTarget(TEMPLATE_TARGET)`
- preview do anúncio composto para aquela empresa
- link discreto `Enviar imagem própria` (abre o file picker) — caminho de exceção
- link discreto `Voltar ao template` quando existe override de imagem

Destino e CTA continuam existindo apenas no Template global, como hoje.

## Mudanças de modelo

### `ImageMode`: 3 valores → 2

```ts
export type ImageMode = 'upload' | 'ai';
```

`template_logo` → `upload`; `photo_ai` e `graphic_ai` → `ai` (unificados). Sem migração de
dados: `creativeData` só vive em `useState` no `CampaignWizard` — não é persistido.

`TemplateLogoConfig` ganha `basePrompt: string` e `baseImageSource` passa a ser
`'upload' | 'ai'`.

### `generateBaseImage` perde o parâmetro `mode`

O cliente passa a mandar sempre `mode: 'photo_ai'` internamente, e o `prompt_brief` do usuário
governa o estilo:

```ts
export async function generateBaseImage(input: {
  client_brand_context?: string;
  prompt_brief?: string;
}): Promise<{ success: boolean; url: string; filename: string }>
```

**Limitação conhecida, aceita conscientemente:** o servidor ainda injeta
`Style: REALISTIC EDITORIAL CORPORATE PHOTOGRAPHY … Pure photography. No illustration.`
([index.ts:2926](../../../supabase/functions/make-server-a4d5bbe0/index.ts)). Enquanto isso não
mudar, um prompt pedindo ilustração briga com a diretiva do servidor e o resultado é
imprevisível. Vira follow-up de back-end: neutralizar o `styleDirective` quando houver
`prompt_brief`.

### Geração de texto no Template global (novo)

`generateTemplateCopy()` chama o `generateCopy` existente com
`target_company_name: '{{company.name}}'`, para a copy sair já com a variável. Como o modelo
pode ignorar a instrução e escrever o literal, o resultado passa por uma normalização no
cliente que devolve ocorrências do literal para `{{company.name}}`. Escreve em
`updateCreative({ headline, bodyText })`.

## Remoções

- **Banner amarelo de topo** ("Modo Template + logo selecionado: suba uma imagem-base").
  Vira estado vazio dentro do card 2, com o botão de resolver ali mesmo.
- **Botão `Brand Brief` do header.** O acesso ao `BrandBriefDrawer` migra para um link
  discreto no rodapé do card **1 · Texto** — o brief é o insumo da geração de copy, é ali que
  ele pertence. O drawer em si permanece intacto.
- **Dropzone grande na visão de empresa.** Vira o link `Enviar imagem própria`.

## Estados de bloqueio

| Condição | Efeito |
|---|---|
| `!brandKit.voice.trim()` | `Gerar texto`, `Gerar texto + imagem` e `Gerar para todas` desabilitados, com tooltip apontando para o Brief |
| origem = upload e sem `baseImageUrl` | `Gerar imagem` desabilitado na empresa; card 2 mostra estado vazio com `Definir no template` |
| geração em curso | botão do card correspondente vira spinner; o do header desabilita |

## Revisão 2 — bloco de imagem completo e editável nos dois níveis

Após a primeira entrega, duas correções de rumo:

### O card Imagem é o mesmo nos dois níveis

A empresa deixa de ver um resumo somente-leitura e passa a ter **o bloco inteiro**, com as
mesmas duas origens do template. Os campos chegam pré-preenchidos com o valor herdado; a
primeira edição vira override daquela empresa, sinalizado por `Voltar ao template`.

`CompanyCreativeOverride` ganha os campos da composição (`baseImageUrl`, `baseImageSource`,
`basePrompt`, `textoDestaque`, `textoComplementar`, `showTargetLogo`, `fontFamily`, `format`),
todos opcionais — `undefined` significa herdar. A leitura passa por `resolveImageConfig`, e
`overriddenImageFields` diz o que aquela empresa de fato personalizou.

Nada disso exigiu back-end: `composeLogoOverlay` e `generateBaseImage` já recebem textos,
fonte e prompt por chamada.

Consequência: um upload numa empresa passa a ser a **imagem-base dela** (que ainda é composta
com textos + logo), não mais o anúncio final cru. Quem quiser a imagem intacta zera os textos
e desmarca o logo.

Ao gerar a base para uma empresa que não personalizou origem nem prompt, preenchemos a base
**compartilhada** da campanha — as outras empresas aproveitam a mesma chamada. Se ela
personalizou, ganha canvas próprio.

### Campos do bloco (ordem fixa)

`Origem da imagem-base` → `Prompt para imagem` (só na origem IA) → `Texto destaque` →
`Texto complementar` → `Fonte` → `Formato` → `Aplicar logo da empresa-alvo`.

### FORMATO é front-only e HOJE NÃO FUNCIONA

`AdFormat = 'square' | 'banner'` é guardado e enviado em `generateBaseImage` e
`composeLogoOverlay`, mas **o servidor ignora**: `CANVAS_W = 1200 / CANVAS_H = 628` são
constantes ([index.ts:3007](../../../supabase/functions/make-server-a4d5bbe0/index.ts)) e o
prompt da base pede 1.91:1 fixo. Escolher "Quadrado" ainda devolve um banner.

Decisão consciente para destravar a validação visual. Para funcionar de verdade o servidor
precisa parametrizar `CANVAS_W/H` por `format` **e** recalibrar as coordenadas do SVG
(`TEXT_X`, posições das caixas de texto, `LOGO_CARD_W`), hoje ajustadas para 1200×628.

## Fora de escopo

- [AdsPipelineDocs.tsx:287-303](../../../src/app/pages/AdsPipelineDocs.tsx) documenta os três
  modos antigos e ficará desatualizado.
- Neutralizar o `styleDirective` do servidor (follow-up descrito acima).
- Bulk granular ("gerar só texto para todas") — o fan-out continua sendo texto + imagem.
