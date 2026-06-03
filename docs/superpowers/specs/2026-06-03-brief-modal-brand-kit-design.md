# Brief Modal — Brand Kit & dois cenários de extração

**Data:** 2026-06-03
**Branch:** feat/port-mastro2026-gtm-plays
**Escopo desta entrega:** front-only / mock (sem backend, sem persistência real, extração simulada)

## Contexto

O modal de "Brief" (em Campanhas → wizard → step de criativos) hoje mistura, num
único formulário, assets de marca (tom de voz, contexto, paleta) com seleções
específicas da campanha (produto/público/persona) e oferece **um** formato de
extração: via website ("Extrair com IA"). O modal está embutido em
[CreativeStep.tsx](../../../src/app/campaigns/wizard/CreativeStep.tsx) (~180 linhas
só do modal, num arquivo de 1500+ linhas). A fonte (Google Fonts) vive solta no
step de ads (`templateLogo.fontFamily`).

Queremos: (1) introduzir um segundo formato de extração — **upload de Brand Book
em PDF** — ao lado do website; (2) tratar a marca como uma **unidade coesa
reutilizável** (Brand Kit) que inclui assets visuais (logos, ícones, grafismos)
além do texto; (3) separar visualmente "Marca" de "Aplicação nesta campanha"
(produto/público/persona) dentro do mesmo modal; (4) suportar dois cenários de
exibição conforme a marca já esteja definida ou não.

A tela dedicada de **Configurações** (onde a marca será definida globalmente) será
construída depois — esta entrega apenas prepara o modelo de dados para reuso e faz
o modal de campanha reagir aos dois cenários.

## Decisões (validadas no brainstorming)

- **Cenário dirigido por flag explícito** `BrandKit.status: 'defined' | 'empty'`.
- **Toggle de dev** no cabeçalho do modal para alternar Cenário 1 ↔ 2 (validação
  com o time). Sobrescreve o `status` apenas localmente, sem persistir.
- **Front-only / mock**: nenhum endpoint novo, nenhuma persistência real, nenhum
  parsing real de PDF. Uploads viram `object URL` locais; extração (PDF ou site)
  preenche os campos a partir de uma **fixture**. O backend atual não é removido.
- **Logo é do anunciante** (dono do brief). O logo da empresa-**alvo** continua
  automático por empresa, como hoje (`templateLogo.showTargetLogo`) — fora de escopo.
- **Variações de logo:** claro/escuro × completo/símbolo = 4 slots opcionais.
- **Fonte** (Google Fonts) sai do step de ads e passa a viver no Brand Kit.
- **Estilo de imagem** foi considerado e **descartado** (a IA só descreveria, não
  é asset reutilizável).
- **Sem runner de testes** no projeto (só `build`/`dev`/`preview`) →
  verificação **manual** no navegador. Não instalar framework de teste nesta entrega.

## Arquitetura

### Abordagem escolhida

Extrair o modal para um componente próprio (`BriefModal`) e modelar a marca como
um tipo `BrandKit` coeso. `CreativeStep` para de crescer; a marca vira uma unidade
reutilizável (alinhada com a futura tela de Configurações e com o "salvar modelo").

### Modelo de dados

Novo tipo `BrandKit` (em `src/app/campaigns/wizard/brandKit.ts`):

```ts
type LogoVariant = 'lightFull' | 'lightMark' | 'darkFull' | 'darkMark';

interface BrandKit {
  status: 'defined' | 'empty';                       // dirige Cenário 1 vs 2
  voice: string;                                     // tom de voz
  context: string;                                   // contexto da empresa
  websiteUrl: string;                                // usado na extração via site
  colors: { primary: string; secondary: string; accent: string };  // hex
  fontFamily: string;                                // Google Font (movida do step de ads)
  logos: Record<LogoVariant, string | null>;         // cada slot = object URL | null
  icons: string[];                                   // galeria de object URLs
  graphics: string[];                                // grafismos/padrões — galeria de object URLs
  source?: 'brandbook' | 'website';                  // como foi extraído (informativo)
}

function createDefaultBrandKit(): BrandKit;          // status: 'empty', campos vazios
```

`CreativeData` ([types.ts](../../../src/app/campaigns/wizard/types.ts)) é
reorganizado:

- Os campos `clientVoice`, `clientBrandContext`, `clientWebsiteUrl`,
  `clientBrandColors` saem de `CreativeData` e passam a viver em
  `CreativeData.brandKit: BrandKit`.
- `templateLogo.fontFamily` é removido; a fonte passa a ser `brandKit.fontFamily`.
- Os campos de campanha permanecem em `CreativeData` (`clientProductService`,
  `clientAudienceMarket`, `clientPersona`) — agrupados conceitualmente como
  "aplicação na campanha".

### Arquivos

- **`src/app/campaigns/wizard/brandKit.ts`** (novo) — tipo `BrandKit`,
  `LogoVariant`, `createDefaultBrandKit()`, e mocks: `MOCK_PRODUCTS`,
  `MOCK_AUDIENCES`, `MOCK_PERSONAS` (movidos de `CreativeStep`) + fixture de marca
  `MOCK_BRAND_FIXTURE` usada para simular extração.
- **`src/app/campaigns/wizard/BriefModal.tsx`** (novo) — todo o JSX do brief sai de
  `CreativeStep`. Recebe `brandKit`, callbacks de update, e o resto via props.
- **`src/app/campaigns/wizard/CreativeStep.tsx`** (editado) — remove o modal inline
  e o `FontSelect` do step de ads; passa a renderizar `<BriefModal/>`; ajusta os
  call-sites que liam `clientVoice`/`clientBrandContext`/`clientBrandColors`/
  `fontFamily` para lerem de `brandKit.*`.
- **`src/app/campaigns/wizard/types.ts`** (editado) — `CreativeData` reorganizado,
  `createDefaultCreativeData()` atualizado, `TemplateLogoConfig.fontFamily` removido.
- O componente `FontSelect` (hoje no fim de `CreativeStep.tsx`) é **reaproveitado
  sem alteração de lógica** — movido para `BriefModal` (ou exportado e importado).

## UI / Comportamento

### Três estados (REVISADO após validação visual)

A seção "Marca" tem **três estados**, não dois. O `status` do BrandKit (+ toggle de
dev) decide entre "marca pré-salva" e "marca vazia"; dentro do estado vazio, um
flag local de extração (`source` preenchido) decide entre "ainda não extraiu" e
"já extraiu".

**Cabeçalho:** título "Brief" + subtítulo + **toggle de dev** que alterna o rótulo
"Cenário 1 / Cenário 2", sobrescrevendo o `status` localmente. Cenário 1 = `defined`
(estado C). Cenário 2 = `empty` (estados A→B).

**Estado A — vazio, nenhum método usado** (`status: 'empty'`, sem `source`):
- Mostra APENAS as duas opções de extração: dropzone de PDF + divisor "ou" +
  website/"Extrair com IA".
- **Nenhum campo de marca** é exibido (sem tom de voz, contexto, paleta, fonte, ou
  galerias). Uma legenda discreta indica que os campos surgem após a extração.

**Estado B — extraiu agora** (`status: 'empty'`, `source` = `'brandbook' | 'website'`):
- As duas opções somem; no lugar, um **chip de "método usado"** (estilo confirmação,
  verde) mostrando o método + referência (URL digitada ou nome do arquivo PDF), com
  um botão discreto **"Trocar"** que volta ao estado A (limpa `source`).
- Abaixo, os campos de marca **preenchidos e editáveis**: tom de voz, contexto,
  paleta, fonte, e as **galerias COM exemplos** vindos da extração mock (logos 2×2,
  ícones, grafismos pré-populados). O usuário ainda pode adicionar ("+") e remover
  ("×") assets.

**Estado C — marca pré-salva da Config** (`status: 'defined'`):
- Modo resumo **read-only**: tom de voz e contexto como texto, paleta como swatches,
  fonte como preview, logos/ícones/grafismos como miniaturas (sem "+"/"×").
- Link discreto "Editar na Config →" (placeholder; Config vem depois).

**Galerias (logos / ícones / grafismos):**

- Logos = grade 2×2 rotulada (claro/escuro × completo/símbolo).
- Ícones e grafismos = galeria livre de N miniaturas.
- No estado B vêm **pré-populadas** com exemplos da fixture mock; cada bloco tem um
  tile "+" para adicionar e "×" para remover.
- No estado C (read-only) não há "+"/"×". No estado A não aparecem.

**Fixture mock:** além de voz/contexto/paleta/fonte, fornece exemplos visuais
inline (data URLs SVG, sem rede) para logos/ícones/grafismos, de modo que o estado B
mostre como o resultado ficaria.

**Divisor** entre "Marca" e "Aplicação nesta campanha".

**Seção "Aplicação nesta campanha":** Produto / Público / Persona (selects, como
hoje, com os mocks). Subtítulo deixando claro que é específico da campanha.
Presente em **ambos** os cenários, sempre editável.

**Rodapé:** "Cancelar" + "Salvar". No Cenário 2 o botão é "Salvar modelo" e marca
`status = 'defined'`.

### Integração com o step de ads

- O seletor de fonte some do step de ads; o consumo de fonte (`tpl.fontFamily` na
  composição) passa a ler `brandKit.fontFamily`.
- Call-sites que hoje consomem `clientVoice` / `clientBrandContext` /
  `clientBrandColors` (gates de geração, `generate-copy`, `composeLogoOverlay`)
  passam a ler de `brandKit.*` — **sem mudar comportamento**, só a origem do dado.
  Call-sites conhecidos em `CreativeStep.tsx`: linhas ~110-116, 172, 184-190,
  311-312, 340, 374, 415, 442-465, 579, 696-716, 896-897.
- Os novos assets visuais (logos do anunciante, ícones, grafismos) ficam
  **modelados e disponíveis** em `brandKit`, mas **não** são cablados na
  composição real do criativo nesta entrega (depende de backend de PDF/composição
  inexistente). Ficam prontos para consumo futuro.

## Estados de erro / borda (todos front)

- Arquivo de tipo inválido (não-PDF na dropzone; não-imagem nas galerias) →
  mensagem inline (mesmo padrão do upload de imagem atual).
- Arquivo acima do tamanho → mensagem inline.
- "Extrair" sem URL → botão desabilitado (como hoje).
- Toggle de dev alterna o cenário **sem perder** o que já foi preenchido no draft.

## Compatibilidade / persistência

Como é front-only, `persistVoice` / `saveClientVoice` existentes podem continuar
gravando o que já gravam (campos legados) ou virar no-op visual; os campos novos
do Brand Kit **não** dependem do backend nesta fase. O backend não é removido.

## Fora de escopo (próximos passos)

- Tela de **Configurações** para definir o Brand Kit globalmente.
- **Persistência real** do Brand Kit (backend / KV store por workspace).
- **Parser de PDF** que recorta logos/ícones/grafismos do brand book (backend novo).
- **Cabular** os assets visuais na composição real do criativo.
- Wire dos selects (produto/público/persona) a fontes reais.

## Verificação (manual)

Sem runner de testes configurado. Verificar no navegador:

1. Modal abre no Cenário 2 quando `status: 'empty'`; mostra upload de PDF + website.
2. Toggle de dev alterna para Cenário 1 (read-only) e de volta, preservando o draft.
3. "Extrair com IA" (site) e upload de PDF preenchem os campos a partir da fixture.
4. Tiles "+" adicionam miniaturas nas galerias; "×" remove.
5. "Salvar modelo" marca `status: 'defined'` e o modal passa a abrir no Cenário 1.
6. No step de ads, a fonte usada reflete `brandKit.fontFamily`; geração de copy/
   overlay continua funcionando lendo de `brandKit.*`.
