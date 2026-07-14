# Tech Spec — Editor estilo Framer (seleção por elemento + inline edit + estilo por slot)

> **Tipo:** Spec técnica (reforma do editor de Landing Pages).
> **Deriva de:** feedback do usuário sobre o editor de [Maestro Pages](2026-07-01-landing-pages-abm-tech-spec.md).
> **Data:** 2026-07-01 · **Autor:** Nicholas + Claude · **Status:** Aprovado para plano.
> **Restrição central:** front-only, localStorage. Um só `BlockRenderer` serve editor E página pública (WYSIWYG).

---

## 1. Objetivo

Transformar o editor de blocos (hoje: seleção por bloco + painel de conteúdo à direita) numa experiência estilo Framer:
- **Ícones** em cada bloco da biblioteca (✅ já feito, fora desta spec).
- **Seleção por elemento** (slot) dentro do bloco.
- **Edição inline de texto** no canvas (contentEditable).
- **Painel direito = só estilo do elemento selecionado**, dinâmico por tipo (texto/botão/imagem/bloco). Conteúdo de texto não se edita mais no painel — é inline.

## 2. Princípios de arquitetura (decididos no brainstorming)

1. **Slots nomeados por bloco** — cada bloco declara seus elementos estilizáveis; NÃO viramos uma árvore genérica de nós (isso seria reescrever tudo).
2. **Estilo separado do conteúdo** — conteúdo continua nos campos de props existentes (`headline`, `ctaLabel`…); estilo vai para `props.styles[slotId]`. Preserva tokens, personalização por conta (overrides mesclam `props`), e `showIf`.
3. **Helpers de slot** — `<SlotText/Button/Image>` substituem texto/botão/img crus dentro de cada bloco. Aplicam estilo (default ⊕ override), marcam `data-slot`, e hospedam contentEditable no modo editor.
4. **Modo via RenderContext** — os Slots leem `RenderContext.editing?`. Sem ele (página pública) → render estático idêntico ao de hoje. Um render, um `BlockRenderer`, WYSIWYG por construção.

## 3. Modelo de dados

### 3.1 Slots por bloco (no registry)

`BlockDef` (em `src/app/landingPages/schema/registryTypes.ts`) ganha:

```ts
type SlotKind = 'text' | 'button' | 'image';
interface SlotDef { id: string; kind: SlotKind; label: string; }
// BlockDef gains: slots: SlotDef[]
```

Além dos slots de elemento, todo bloco tem implicitamente o slot container `'__block__'` (kind especial `'block'`), não listado em `slots` mas selecionável.

### 3.2 Estilos por slot (nas props do bloco)

```ts
Block.props.styles?: Record<string /*slotId*/, SlotStyle>

type SlotStyle = Partial<{
  // text
  color: string; fontSize: number; fontWeight: 'normal'|'medium'|'semibold'|'bold'; textAlign: 'left'|'center'|'right';
  // button
  bgColor: string; textColor: string; radius: number; href: string;
  // image
  url: string; objectFit: 'cover'|'contain'; // radius reused
  // block/container
  paddingY: number; align: 'left'|'center'|'right'; // bgColor reused
}>;
```

`SlotStyle` guarda só o **override do usuário**. O default de cada slot (o que hoje está hardcoded no render) vive como constante no bloco. Render = `resolveSlotStyle(default, override)`.

### 3.3 Função pura de merge (testável)

`src/app/landingPages/editor/slotStyle.ts`:
- `resolveSlotStyle(def: SlotStyle, override?: SlotStyle): SlotStyle` — shallow merge, override vence por chave.
- `slotStyleToCss(kind, style): React.CSSProperties` — traduz o SlotStyle resolvido para CSS (fontWeight→peso numérico, radius→borderRadius px, etc.), por kind.

## 4. Helpers de slot

`src/app/landingPages/schema/blocks/slots.tsx`:

- `<SlotText slot value ctx as="h1|h2|p|span" defaultStyle />` —
  - Público (`!ctx.editing`): `<Tag style={css}>{resolveTokens(value, ctx.ctx)}</Tag>`.
  - Editor (`ctx.editing`): + `data-slot`, contorno de hover/seleção, `onClick` → `ctx.editing.onSelectSlot(slot)`. Quando `ctx.editing.selectedSlot === slot && ctx.editing.editingText`, vira `contentEditable` (suppressContentEditableWarning), grava em `onBlur`/Esc via `ctx.editing.onEditText(slot, text)`. **Enquanto edita, o texto NÃO passa por resolveTokens** (mostra o texto cru editável); ao sair, volta a resolver.
- `<SlotButton slot label href ctx defaultStyle />` — público: `<a href style>`. Editor: `onClick` seleciona (preventDefault, não navega).
- `<SlotImage slot url ctx defaultStyle />` — público: `<img>` ou placeholder. Editor: clique seleciona.

`RenderContext.editing` (opcional):
```ts
editing?: {
  selectedSlot: string | null;      // slot selecionado NESTE bloco (o BlockRenderer passa o do bloco certo)
  editingText: boolean;             // true quando o slot selecionado está em modo contentEditable
  onSelectSlot: (slotId: string) => void;
  onEditText: (slotId: string, value: string) => void;
};
```

O `BlockRenderer`/`EditorCanvas` injeta `editing` apenas para o bloco cujo `blockId === selection.blockId`, com `selectedSlot = selection.slotId`. Blocos não selecionados recebem `editing` com `selectedSlot: null` (clicável para selecionar, mas sem contorno ativo).

## 5. Migração dos 14 blocos

Para cada bloco em `src/app/landingPages/schema/blocks/*.tsx`:
1. Declarar `slots` no seu `BlockDef` (registry).
2. Extrair os estilos hardcoded dos elementos-folha para constantes `*_DEFAULT_STYLE`.
3. Trocar `<h1 className=... style=...>{resolveTokens(...)}</h1>` por `<SlotText slot="headline" value={p.headline} ctx={ctx} as="h1" defaultStyle={HERO_HEADLINE_STYLE} />` etc.
4. **Layout preservado** — só os elementos-folha (texto/botão/imagem) passam pelos helpers; grid/section/espaçamentos ficam.

**Blocos com listas** (features/faq/stats/logos): na V1, os itens da lista NÃO viram slots individuais estilizáveis (fast-follow). O título do bloco vira slot; os itens permanecem com estilo default. Documentar essa fronteira.

**Container:** o `BlockRenderer` aplica `styles.__block__` (bgColor/paddingY/align) num wrapper por bloco e registra clique-no-fundo → selecionar `'__block__'`.

## 6. Editor: seleção + inline + painel

### 6.1 Seleção
`LandingPageEditor` troca `selectedId: string|null` por `selection: { blockId: string; slotId: string } | null`. `slotId === '__block__'` = container. Clique num Slot → `selection = {blockId, slotId}`. Clique no fundo do bloco → `{blockId, '__block__'}`. Clique fora → `null`.

### 6.2 Inline edit
Clique num slot de texto = seleciona. Segundo clique (ou duplo-clique) no slot de texto já selecionado = `editingText: true` → contentEditable. `Esc`/blur grava via `onEditText` (que escreve no campo de conteúdo do prop, ex. `headline`) e sai. **Um slot editável por vez.** `key` estável no elemento para não perder caret.

### 6.3 Painel direito = estilo dinâmico
Some o `PropsPanel` de conteúdo por bloco. Novo `StylePanel`:
- Nada selecionado → configurações da página (SEO), como hoje.
- Slot `text` → controles: cor, tamanho, peso, alinhamento.
- Slot `button` → cor de fundo, cor do texto, raio, link (href).
- Slot `image` → URL, ajuste (cover/contain), raio.
- Slot `__block__` → cor de fundo, padding vertical, alinhamento.

Cada controle grava `props.styles[slotId].<prop>` via o `handleChangeBlock` existente (respeita modo "personalizar para conta" → grava no override; "editar base" → grava no bloco base).

Os antigos `Panel` de conteúdo por bloco são **removidos** (o inline + o StylePanel os substituem). `BlockDef.Panel` sai da interface.

## 7. Escopo

**V1 desta reforma:** slots text/button/image + container; os 4 grupos de controle aprovados; inline text edit.
**Fora (fast-follow):** itens de lista como slots individuais; arrastar elementos livremente dentro do bloco; tipografia avançada (line-height, letter-spacing); estilo responsivo por breakpoint; slots de imagem com upload (mantém URL).

## 8. Não-funcionais / riscos

- **Regressão na página pública** (maior risco): a migração dos 14 blocos deve manter o render público idêntico. Mitigação: render-smoke tests por bloco em modo público + revisão bloco a bloco; um slot sem override deve produzir exatamente o CSS de hoje.
- **contentEditable/caret:** um slot por vez, sem re-render do texto durante edição, gravar no blur.
- **WYSIWYG:** um render só; editor e público não podem divergir.
- **Personalização por conta:** intacta — `styles` fica em `props`, e overrides já mesclam `props`.

## 9. Testes

- Pura: `resolveSlotStyle`, `slotStyleToCss` (Vitest, `.ts`).
- Slots/blocos: render-smoke em jsdom (infra já existe em `__smoke__/`), incluindo um render por bloco em modo público (sem `editing`) para pegar regressão, e um render do editor com um slot selecionado.
- Build limpo + verificação visual no app a cada fase.
