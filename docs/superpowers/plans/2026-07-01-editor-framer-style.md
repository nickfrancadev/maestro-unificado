# Framer-style Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reform the landing-page editor into a Framer-style experience: selectable elements (slots) inside blocks, inline text editing on the canvas, and a right panel that shows only per-element style controls (typed by element kind).

**Architecture:** Each block declares named **slots** (`text`/`button`/`image`); a `'__block__'` container slot is implicit. Style overrides live in `Block.props.styles[slotId]`, separate from content. Slot **helper components** (`<SlotText/Button/Image>`) replace raw leaf elements in each block's render, applying `default ⊕ override` style and — only when `RenderContext.editing` is present (editor) — hosting selection + contentEditable. The public page passes no `editing`, so the SAME `BlockRenderer` renders identically to today (WYSIWYG).

**Tech Stack:** React 18 + Vite + Tailwind + lucide-react. Vitest (`.ts` for pure logic, `.tsx` jsdom render-smoke — infra already wired in `src/app/landingPages/__smoke__/`).

## Global Constraints

- **Front-only, no backend.** Style state persists in `Block.props.styles` (localStorage via existing repo). All feature code under `src/app/landingPages/`.
- **One renderer.** Public page render must be byte-identical to today when a slot has no override (`SlotStyle = {}`). The public page passes `RenderContext` WITHOUT `editing`.
- **Content stays in existing props** (`headline`, `ctaLabel`, …); **style goes to `props.styles[slotId]`**. Never move content into `styles`.
- **Personalization intact:** `styles` lives in `props`, so per-account overrides already merge it via `resolveBlock.mergeOverride`. Do not add new override logic.
- **List-item slots are OUT of V1** (features/faq/stats/logos items keep default style; only the block title becomes a slot).
- **Remove the old content Panels.** `BlockDef.Panel` is deleted; text is edited inline, style via the new StylePanel.
- **Test command:** `npx vitest run <path>` (single file), `npm run build` (type check + build).

---

## Phase 1 — Style model (pure logic, TDD)

### Task 1: Slot + SlotStyle types and style merge/CSS

**Files:**
- Create: `src/app/landingPages/editor/slotStyle.ts`
- Test: `src/app/landingPages/editor/slotStyle.test.ts`

**Interfaces:**
- Produces:
  - `type SlotKind = 'text' | 'button' | 'image'`
  - `interface SlotDef { id: string; kind: SlotKind; label: string }`
  - `interface SlotStyle { color?: string; fontSize?: number; fontWeight?: 'normal'|'medium'|'semibold'|'bold'; textAlign?: 'left'|'center'|'right'; bgColor?: string; textColor?: string; radius?: number; href?: string; url?: string; objectFit?: 'cover'|'contain'; paddingY?: number; align?: 'left'|'center'|'right' }`
  - `function resolveSlotStyle(def: SlotStyle, override?: SlotStyle): SlotStyle` — shallow merge, override wins per key; skips `undefined` override values so they don't erase defaults.
  - `type SlotOrBlockKind = SlotKind | 'block'`
  - `function slotStyleToCss(kind: SlotOrBlockKind, style: SlotStyle): React.CSSProperties` — maps resolved style → CSS: text→{color,fontSize:`${n}px`,fontWeight(normal=400/medium=500/semibold=600/bold=700),textAlign}; button→{backgroundColor:bgColor,color:textColor,borderRadius:`${radius}px`}; image→{objectFit,borderRadius:`${radius}px`}; block→{backgroundColor:bgColor,paddingTop/paddingBottom:`${paddingY}px`,textAlign:align}. Omit keys whose source value is undefined.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveSlotStyle, slotStyleToCss } from './slotStyle';

describe('resolveSlotStyle', () => {
  it('override wins per key, undefined does not erase default', () => {
    expect(resolveSlotStyle({ color: 'red', fontSize: 16 }, { color: 'blue', fontSize: undefined }))
      .toEqual({ color: 'blue', fontSize: 16 });
  });
  it('no override returns default copy', () => {
    expect(resolveSlotStyle({ color: 'red' })).toEqual({ color: 'red' });
  });
});

describe('slotStyleToCss', () => {
  it('text maps fontWeight token to numeric + px fontSize', () => {
    expect(slotStyleToCss('text', { color: '#111', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }))
      .toEqual({ color: '#111', fontSize: '24px', fontWeight: 700, textAlign: 'center' });
  });
  it('button maps bg/text/radius', () => {
    expect(slotStyleToCss('button', { bgColor: '#f00', textColor: '#fff', radius: 8 }))
      .toEqual({ backgroundColor: '#f00', color: '#fff', borderRadius: '8px' });
  });
  it('block maps paddingY to both paddings', () => {
    expect(slotStyleToCss('block', { bgColor: '#eee', paddingY: 40, align: 'center' }))
      .toEqual({ backgroundColor: '#eee', paddingTop: '40px', paddingBottom: '40px', textAlign: 'center' });
  });
  it('omits undefined-source keys', () => {
    expect(slotStyleToCss('text', { color: '#111' })).toEqual({ color: '#111' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/editor/slotStyle.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
// src/app/landingPages/editor/slotStyle.ts
import type * as React from 'react';

export type SlotKind = 'text' | 'button' | 'image';
export type SlotOrBlockKind = SlotKind | 'block';

export interface SlotDef { id: string; kind: SlotKind; label: string; }

export interface SlotStyle {
  color?: string; fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  bgColor?: string; textColor?: string; radius?: number; href?: string;
  url?: string; objectFit?: 'cover' | 'contain';
  paddingY?: number; align?: 'left' | 'center' | 'right';
}

export function resolveSlotStyle(def: SlotStyle, override?: SlotStyle): SlotStyle {
  const out: SlotStyle = { ...def };
  if (override) {
    for (const [k, v] of Object.entries(override)) {
      if (v !== undefined) (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

const WEIGHT: Record<NonNullable<SlotStyle['fontWeight']>, number> = {
  normal: 400, medium: 500, semibold: 600, bold: 700,
};

export function slotStyleToCss(kind: SlotOrBlockKind, style: SlotStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (kind === 'text') {
    if (style.color !== undefined) css.color = style.color;
    if (style.fontSize !== undefined) css.fontSize = `${style.fontSize}px`;
    if (style.fontWeight !== undefined) css.fontWeight = WEIGHT[style.fontWeight];
    if (style.textAlign !== undefined) css.textAlign = style.textAlign;
  } else if (kind === 'button') {
    if (style.bgColor !== undefined) css.backgroundColor = style.bgColor;
    if (style.textColor !== undefined) css.color = style.textColor;
    if (style.radius !== undefined) css.borderRadius = `${style.radius}px`;
  } else if (kind === 'image') {
    if (style.objectFit !== undefined) css.objectFit = style.objectFit;
    if (style.radius !== undefined) css.borderRadius = `${style.radius}px`;
  } else { // block
    if (style.bgColor !== undefined) css.backgroundColor = style.bgColor;
    if (style.paddingY !== undefined) { css.paddingTop = `${style.paddingY}px`; css.paddingBottom = `${style.paddingY}px`; }
    if (style.align !== undefined) css.textAlign = style.align;
  }
  return css;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/editor/slotStyle.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/editor/slotStyle.ts src/app/landingPages/editor/slotStyle.test.ts
git commit -m "feat(editor): slot style types + resolve/toCss (pure)"
```

### Task 2: Add `slots` to BlockDef + `editing` to RenderContext

**Files:**
- Modify: `src/app/landingPages/schema/registryTypes.ts`

**Interfaces:**
- Consumes: `SlotDef` (Task 1).
- Produces:
  - `RenderContext` gains optional `editing?: EditingContext`.
  - `interface EditingContext { selectedSlot: string | null; editingText: boolean; onSelectSlot: (slotId: string) => void; onEditText: (slotId: string, value: string) => void }`
  - `BlockDef` gains `slots: SlotDef[]` (element slots; `'__block__'` is implicit and not listed).
  - `BlockDef.Panel` is REMOVED (replaced by inline + StylePanel). NOTE: removing `Panel` will break existing imports — Task 8 removes the old PropsPanel usage; until then leave `Panel` in place. **In THIS task, only ADD `slots` and `editing`; do NOT remove `Panel` yet** (keeps the build green between tasks).

- [ ] **Step 1: Add types (no test — type-only change, verified by build)**

Add to `registryTypes.ts`:
```ts
import type { SlotDef } from '../editor/slotStyle';

export interface EditingContext {
  selectedSlot: string | null;
  editingText: boolean;
  onSelectSlot: (slotId: string) => void;
  onEditText: (slotId: string, value: string) => void;
}
```
Add `editing?: EditingContext;` to `RenderContext`. Add `slots: SlotDef[];` to `BlockDef`.

- [ ] **Step 2: Build (expect errors pointing at each BlockDef missing `slots`)**

Run: `npm run build`
Expected: TS errors "Property 'slots' is missing" for each of the 14 registry entries. That's expected — Task 3 fills them. If you want the build green now, temporarily make `slots` optional (`slots?: SlotDef[]`) and tighten to required in Task 3's final step. Prefer optional-now to keep intermediate builds green.

- [ ] **Step 3: Make `slots?` optional to keep build green**

Set `slots?: SlotDef[];` in `BlockDef` for now. Run `npm run build` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/schema/registryTypes.ts
git commit -m "feat(editor): BlockDef.slots + RenderContext.editing types"
```

---

## Phase 2 — Slot helpers (render, jsdom smoke)

### Task 3: Slot helper components

**Files:**
- Create: `src/app/landingPages/schema/blocks/slots.tsx`
- Test: `src/app/landingPages/schema/blocks/slots.test.tsx` (jsdom)

**Interfaces:**
- Consumes: `SlotStyle`, `resolveSlotStyle`, `slotStyleToCss` (Task 1); `RenderContext`, `EditingContext` (Task 2); `resolveTokens` from `../../engine/resolveTokens`.
- Produces (all read style from `ctx`-provided block props — see signature):
  - `interface SlotCommon { slotId: string; ctx: RenderContext; styleOverride?: SlotStyle; defaultStyle: SlotStyle }`
  - `<SlotText as?: 'h1'|'h2'|'h3'|'p'|'span'; value: string; ...SlotCommon />`
  - `<SlotButton label: string; href: string; ...SlotCommon />`
  - `<SlotImage url: string; alt?: string; placeholder?: string; ...SlotCommon />`
- Behavior:
  - Public (`!ctx.editing`): render the plain element with `style={slotStyleToCss(kind, resolveSlotStyle(defaultStyle, styleOverride))}`, text run through `resolveTokens(value, ctx.ctx)`. No data-attrs, no handlers.
  - Editor (`ctx.editing`): add `data-slot={slotId}`, `onClick` (stopPropagation) → `ctx.editing.onSelectSlot(slotId)`; outline when `ctx.editing.selectedSlot === slotId`. For `SlotText`, when `selectedSlot === slotId && editingText`, render `contentEditable` (suppressContentEditableWarning) showing the RAW `value` (not token-resolved), and on blur call `ctx.editing.onEditText(slotId, e.currentTarget.textContent ?? '')`. `SlotButton` in editor does `preventDefault` on click (no navigation). 

- [ ] **Step 1: Write the failing test (jsdom)**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SlotText, SlotButton, SlotImage } from './slots';
import type { RenderContext } from '../registryTypes';

const publicCtx: RenderContext = { ctx: null, brandKit: { colors: { primary: '#000', secondary: '#000', accent: '#000' }, fontFamily: '', status: 'defined', voice: '', context: '', websiteUrl: '', logos: {} as any, icons: [], graphics: [] } };

describe('slot helpers — public mode', () => {
  it('SlotText renders resolved text with default style, no data-slot', () => {
    const { container } = render(<SlotText slotId="headline" as="h1" value="{{account.name}}" ctx={publicCtx} defaultStyle={{ fontSize: 32, fontWeight: 'bold' }} />);
    const h1 = container.querySelector('h1')!;
    expect(h1.textContent).toBe('sua empresa'); // token fallback
    expect(h1.getAttribute('data-slot')).toBeNull();
    expect(h1.style.fontSize).toBe('32px');
  });
  it('SlotButton renders an anchor', () => {
    const { container } = render(<SlotButton slotId="cta" label="Ir" href="#x" ctx={publicCtx} defaultStyle={{ bgColor: '#f00' }} />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#x');
  });
});

describe('slot helpers — editor mode', () => {
  it('SlotText adds data-slot and selecting calls onSelectSlot', () => {
    const onSelectSlot = vi.fn();
    const editing = { selectedSlot: null, editingText: false, onSelectSlot, onEditText: vi.fn() };
    const ctx: RenderContext = { ...publicCtx, editing };
    const { container } = render(<SlotText slotId="headline" as="h1" value="Oi" ctx={ctx} defaultStyle={{}} />);
    const el = container.querySelector('[data-slot="headline"]') as HTMLElement;
    expect(el).toBeTruthy();
    el.click();
    expect(onSelectSlot).toHaveBeenCalledWith('headline');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/schema/blocks/slots.test.tsx`
Expected: FAIL — cannot find module './slots'.

- [ ] **Step 3: Implement `slots.tsx`**

Implement the three components per the Interfaces above. Key details: resolve style once via `resolveSlotStyle(defaultStyle, styleOverride)` then `slotStyleToCss`. Public branch returns the bare element. Editor branch wraps with `data-slot`, click-to-select (stopPropagation), a selected outline (e.g. `outline: 2px solid #FF5F39` when selected), and for `SlotText` the contentEditable path on `editingText`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/schema/blocks/slots.test.tsx`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/schema/blocks/slots.tsx src/app/landingPages/schema/blocks/slots.test.tsx
git commit -m "feat(editor): slot helper components (SlotText/Button/Image)"
```

---

## Phase 3 — Migrate the 14 blocks

> Each block: (a) declare its `slots` in the registry entry, (b) extract hardcoded leaf styles into `*_DEFAULT_STYLE` consts, (c) swap raw leaf elements for `<Slot*>`, reading the per-slot override from `block.props.styles?.[slotId]`. Layout unchanged. The public render must stay identical (default style === today's hardcoded style).

### Task 4: Migrate hero, cta, footer, navbar (text+button+image slots)

**Files:**
- Modify: `src/app/landingPages/schema/blocks/hero.tsx`, `cta.tsx`, `footer.tsx`, `navbar.tsx`
- Modify: `src/app/landingPages/schema/registry.tsx` (add `slots` to these 4 entries)
- Test: extend `src/app/landingPages/__smoke__/renderSmoke.test.tsx`

**Interfaces:**
- Consumes: `SlotText/Button/Image` (Task 3); `SlotDef` (Task 1).
- Produces: these 4 blocks read `const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>` and pass `styleOverride={styles.headline}` etc. Registry entries gain `slots`.

Reference — hero slots: `[{id:'eyebrow',kind:'text',label:'Chamada superior'},{id:'headline',kind:'text',label:'Título'},{id:'subheadline',kind:'text',label:'Subtítulo'},{id:'cta',kind:'button',label:'Botão'},{id:'image',kind:'image',label:'Imagem'}]`.

- [ ] **Step 1: Migrate `hero.tsx`**

Extract current hardcoded styles into consts and swap elements. Example for headline:
```tsx
const HERO_HEADLINE_STYLE: SlotStyle = { fontSize: 32, fontWeight: 'bold', color: '#0F172A' };
// in render:
const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
<SlotText slotId="headline" as="h1" value={p.headline ?? ''} ctx={ctx} defaultStyle={HERO_HEADLINE_STYLE} styleOverride={styles.headline} />
```
Do the same for eyebrow/subheadline (text), cta (button, using `p.ctaLabel`/`p.ctaHref`), image (`p.imageUrl`). Keep the `<section>`/grid wrapper as-is. Preserve brandKit primary as the eyebrow/cta default color.

- [ ] **Step 2: Migrate `cta.tsx`, `footer.tsx`, `navbar.tsx`** the same way (headline/subheadline text slots + button slot for CTA blocks; footer companyText text slot + link buttons; navbar logoText text slot + cta button slot). Declare each block's `slots`.

- [ ] **Step 3: Add `slots` to the 4 registry entries in `registry.tsx`.**

- [ ] **Step 4: Extend render-smoke with a per-block public-render check**

Add to `renderSmoke.test.tsx`:
```tsx
import { REGISTRY, newBlock } from '../schema/registry';
import { BlockRenderer } from '../engine/BlockRenderer';
// helper page around a single block:
function pageWith(block: any): LandingPage {
  return newLandingPage({ name: 'x', templateOrigin: 'blank', blocks: [block], brandKit: brandKit() });
}
describe('each block renders (public) without throwing', () => {
  for (const type of ['hero','cta','footer','navbar'] as const) {
    it(type, () => {
      const page = pageWith(newBlock(type));
      expect(() => render(<BlockRenderer page={page} accountId={null} ctx={null} />)).not.toThrow();
    });
  }
});
```

- [ ] **Step 5: Build + test**

Run: `npm run build` (no TS errors) and `npx vitest run` (all green).

- [ ] **Step 6: Commit**

```bash
git add src/app/landingPages/schema/blocks/hero.tsx src/app/landingPages/schema/blocks/cta.tsx src/app/landingPages/schema/blocks/footer.tsx src/app/landingPages/schema/blocks/navbar.tsx src/app/landingPages/schema/registry.tsx src/app/landingPages/__smoke__/renderSmoke.test.tsx
git commit -m "feat(editor): migrate hero/cta/footer/navbar to slot helpers"
```

### Task 5: Migrate richtext, media, testimonial, stats (title/text/image slots)

**Files:**
- Modify: `src/app/landingPages/schema/blocks/richtext.tsx`, `media.tsx`, `testimonial.tsx`, `stats.tsx`
- Modify: `src/app/landingPages/schema/registry.tsx`
- Test: extend the per-block public-render loop in `renderSmoke.test.tsx` to include these 4.

**Interfaces:**
- Consumes: `SlotText/Image` (Task 3).
- Produces: these 4 blocks use slot helpers for their title/body text slots and any single image (media). stats: the block `title` becomes a text slot; the stat ITEMS keep default style (list-item slots out of V1). testimonial: `quote` + author text slots. richtext: `title` + `body` text slots. media: `caption` text slot + `image` slot.

- [ ] **Step 1: Migrate the 4 blocks** (title/body/quote/caption → `SlotText`; media image → `SlotImage`). Declare `slots` for each (only the non-list text/image elements). Extract hardcoded styles into consts.
- [ ] **Step 2: Add `slots` to their registry entries.**
- [ ] **Step 3: Add these 4 to the per-block public-render test loop.**
- [ ] **Step 4: Build + test** — `npm run build` clean, `npx vitest run` green.
- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/schema/blocks/richtext.tsx src/app/landingPages/schema/blocks/media.tsx src/app/landingPages/schema/blocks/testimonial.tsx src/app/landingPages/schema/blocks/stats.tsx src/app/landingPages/schema/registry.tsx src/app/landingPages/__smoke__/renderSmoke.test.tsx
git commit -m "feat(editor): migrate richtext/media/testimonial/stats to slot helpers"
```

### Task 6: Migrate logos, features, faq, embed, spacer + finalize `slots` required

**Files:**
- Modify: `src/app/landingPages/schema/blocks/logos.tsx`, `features.tsx`, `faq.tsx`, `embed.tsx`, `spacer.tsx`
- Modify: `src/app/landingPages/schema/registry.tsx`
- Modify: `src/app/landingPages/schema/registryTypes.ts` (tighten `slots?` → `slots`)
- Test: extend the per-block loop to ALL 14 types.

**Interfaces:**
- Consumes: `SlotText` (Task 3).
- Produces: logos/features/faq get a `title` text slot only (items keep default). embed gets a `title`/`caption` text slot if present, else `slots: []`. spacer has no editable content → `slots: []`. After all 14 declare `slots`, tighten `BlockDef.slots` back to required (non-optional).

- [ ] **Step 1: Migrate the 5 blocks** (title → `SlotText` where present; spacer/embed may have `slots: []`).
- [ ] **Step 2: Add `slots` to their registry entries** (every one of the 14 now has `slots`).
- [ ] **Step 3: Tighten `registryTypes.ts`** — change `slots?: SlotDef[]` back to `slots: SlotDef[]`.
- [ ] **Step 4: Extend the per-block public-render loop to cover ALL 14 types** (iterate `Object.keys(REGISTRY)`).
- [ ] **Step 5: Build + test** — `npm run build` clean (required `slots` now satisfied by all entries), `npx vitest run` green.
- [ ] **Step 6: Commit**

```bash
git add src/app/landingPages/schema/blocks/logos.tsx src/app/landingPages/schema/blocks/features.tsx src/app/landingPages/schema/blocks/faq.tsx src/app/landingPages/schema/blocks/embed.tsx src/app/landingPages/schema/blocks/spacer.tsx src/app/landingPages/schema/registry.tsx src/app/landingPages/schema/registryTypes.ts src/app/landingPages/__smoke__/renderSmoke.test.tsx
git commit -m "feat(editor): migrate remaining blocks; slots now required on all 14"
```

---

## Phase 4 — Editor selection, inline edit, style panel

### Task 7: Slot selection + container style + inline text in EditorCanvas

**Files:**
- Modify: `src/app/landingPages/editor/EditorCanvas.tsx`
- Modify: `src/app/landingPages/editor/LandingPageEditor.tsx`
- Modify: `src/app/landingPages/engine/BlockRenderer.tsx` (apply `styles.__block__` to the block wrapper; already renders a per-block container)

**Interfaces:**
- Consumes: `EditingContext` (Task 2); `slotStyleToCss`/`resolveSlotStyle` (Task 1).
- Produces:
  - `LandingPageEditor` state changes from `selectedId: string|null` to `selection: { blockId: string; slotId: string } | null` and `editingText: boolean`.
  - Handlers: `handleSelectSlot(blockId, slotId)` sets `selection` (and `editingText=false`); a second select on an already-selected TEXT slot sets `editingText=true`. `handleEditText(blockId, slotId, value)` writes the block's content prop for that slot (map slotId→content prop is per-block; use a convention: the slotId IS the content prop key for text slots — verify during migration that text slot ids match their content prop names, e.g. hero headline slotId 'headline' ↔ prop 'headline'). Writing goes through the existing `handleChangeBlock` (respects base vs personalize).
  - `EditorCanvas` passes an `EditingContext` into each block's `renderCtx.editing`, but only the block with `blockId === selection.blockId` gets `selectedSlot = selection.slotId`; others get `selectedSlot: null`. Clicking a block's background (not a slot) selects `'__block__'`.
  - `BlockRenderer` applies `slotStyleToCss('block', resolveSlotStyle(BLOCK_DEFAULT, styles.__block__))` to the per-block wrapper.

- [ ] **Step 1: Update `LandingPageEditor` selection state + handlers** (selection object, editingText, handleSelectSlot, handleEditText mapping slotId→content prop for text slots). Keep undo/redo/autosave working.
- [ ] **Step 2: Update `EditorCanvas`** to build the per-block `EditingContext` and pass it via `renderCtx.editing`; background-click selects `'__block__'`; keep DnD reorder + the existing hover controls (move/duplicate/remove) working.
- [ ] **Step 3: Update `BlockRenderer`** to apply the `__block__` container style.
- [ ] **Step 4: Build + test** — `npm run build` clean, `npx vitest run` green (add a smoke test: render editor, simulate a slot click selects it — can assert via a spy or that no throw). Manual check in `npm run dev`: click a text element → it selects (outline); click again → contentEditable; type + blur → text persists; click block background → container selected.
- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/editor/EditorCanvas.tsx src/app/landingPages/editor/LandingPageEditor.tsx src/app/landingPages/engine/BlockRenderer.tsx
git commit -m "feat(editor): slot selection + inline text editing + container style"
```

### Task 8: StylePanel (dynamic per slot kind) — replaces content PropsPanel

**Files:**
- Create: `src/app/landingPages/editor/StylePanel.tsx`
- Create: `src/app/landingPages/editor/styleControls.tsx` (small reusable controls: ColorControl, NumberControl, SelectControl, TextControl)
- Modify: `src/app/landingPages/editor/LandingPageEditor.tsx` (render StylePanel instead of PropsPanel)
- Delete usage of: `src/app/landingPages/editor/PropsPanel.tsx` (remove import/use) and remove `BlockDef.Panel` from `registryTypes.ts` + delete each block's exported `*Panel` + `panelFields.tsx` if now unused.

**Interfaces:**
- Consumes: the selected `{ blockId, slotId }`, the block, its `SlotDef` (from `REGISTRY[type].slots`), current `styles[slotId]`, and an `onChangeStyle(slotId, patch: Partial<SlotStyle>)` that writes `props.styles[slotId]` via `handleChangeBlock`.
- Produces: `StylePanel` renders, by the selected slot's `kind`:
  - `text` → ColorControl(color), NumberControl(fontSize), SelectControl(fontWeight: normal/medium/semibold/bold), SelectControl(textAlign: left/center/right).
  - `button` → ColorControl(bgColor), ColorControl(textColor), NumberControl(radius), TextControl(href).
  - `image` → TextControl(url), SelectControl(objectFit: cover/contain), NumberControl(radius).
  - `__block__` (kind 'block') → ColorControl(bgColor), NumberControl(paddingY), SelectControl(align).
  - No selection → the page-settings (SEO) panel that PropsPanel showed for the no-selection case (move that JSX into StylePanel or a small `PageSettings` component).

- [ ] **Step 1: Create `styleControls.tsx`** (ColorControl = a labeled `<input type="color">` + hex text; NumberControl = labeled number input; SelectControl = labeled `<select>`; TextControl = labeled text input). Each: `{ label, value, onChange }`.
- [ ] **Step 2: Create `StylePanel.tsx`** rendering the controls per kind, plus the no-selection PageSettings (SEO) branch. Each control writes via `onChangeStyle(slotId, { <prop>: value })`.
- [ ] **Step 3: Wire into `LandingPageEditor`** — replace `<PropsPanel .../>` with `<StylePanel selection={selection} page={page} onChangeStyle={...} onChangePage={updatePage} />`. `onChangeStyle` builds `handleChangeBlock({ props: { ...block.props, styles: { ...(block.props.styles ?? {}), [slotId]: { ...(styles[slotId] ?? {}), ...patch } } } })`.
- [ ] **Step 4: Remove the old content-panel machinery** — remove `<PropsPanel>` import; remove `Panel` from `BlockDef` in `registryTypes.ts`; delete each block file's exported `*Panel` function and the `Panel:` entries in `registry.tsx`; delete `PropsPanel.tsx` and `panelFields.tsx` if unused (grep to confirm no other importers).
- [ ] **Step 5: Build + test** — `npm run build` clean (all `Panel` refs gone), `npx vitest run` green. Manual check: select a text slot → panel shows color/size/weight/align and changing them restyles the element live; select the button → bg/text/radius/link; select image → url/fit/radius; click background → block bg/padding/align; nothing selected → SEO settings.
- [ ] **Step 6: Commit**

```bash
git add src/app/landingPages/editor/StylePanel.tsx src/app/landingPages/editor/styleControls.tsx src/app/landingPages/editor/LandingPageEditor.tsx src/app/landingPages/schema/registryTypes.ts src/app/landingPages/schema/registry.tsx src/app/landingPages/schema/blocks/ src/app/landingPages/editor/PropsPanel.tsx
git commit -m "feat(editor): per-element StylePanel replaces content panels"
```

---

## Self-review coverage map (spec §→task)

- §3.1 slots in BlockDef → Tasks 2,4,5,6 · §3.2 styles in props → Tasks 4-6 (read) + 8 (write) · §3.3 resolveSlotStyle/slotStyleToCss → Task 1 · §4 slot helpers + RenderContext.editing → Tasks 2,3 · §5 migrate 14 blocks (list items out) → Tasks 4,5,6 · §6.1 selection → Task 7 · §6.2 inline edit → Task 7 · §6.3 StylePanel + remove old Panels → Task 8 · §9 tests → every task (pure + jsdom smoke, incl. per-block public-render regression check).
