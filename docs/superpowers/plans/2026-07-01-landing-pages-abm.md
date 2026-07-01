# Maestro Pages (Landing Pages ABM) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a front-only, interactive prototype of the Maestro Pages ABM landing-page feature — block-document model, DnD editor, AI-simulated generation, per-account personalization, path publishing with a public render, mock analytics/forms/alerts, and Ads-wizard integration — all persisted in `localStorage`.

**Architecture:** A landing page is an ordered list of typed blocks. A single `<BlockRenderer>` renders that document in the editor canvas, mobile preview, and the public `/p/:slug` page. A block registry maps each block type to its render + props-panel + defaults + tokens. AI, templates, and the DnD editor all produce/manipulate the same document. Everything persists in `localStorage`.

**Tech Stack:** React 18 + Vite 6 + React Router v6 · Tailwind 4 + shadcn/ui · react-dnd v16 (HTML5 backend, already used in `PlaysCanvas.tsx`) · recharts · Vitest (added in Task 0) for pure-logic tests.

## Global Constraints

- **Front-only. No backend.** All persistence is `localStorage` under key prefix `maestro.landingPages.v1`.
- **AI is simulated** — deterministic composition from templates + account data, never a real API call.
- **Custom-domain DNS/SSL is simulated UI** — never real provisioning.
- **Reuse, don't reimplement:** `src/app/campaigns/wizard/brandKit.ts` (`BrandKit`, `MOCK_BRAND_FIXTURE`, `createDefaultBrandKit`), `src/app/campaigns/accountAnalytics.ts` (`buildComparisonData`, `accountColor`), `TargetAccount`/`FacetItem` for accounts, shadcn components in `src/app/components/ui/`.
- **All feature code lives under** `src/app/landingPages/`. Routes are added in `src/app/App.tsx`.
- **Tokens never render raw:** `resolveTokens` always applies a fallback (AC-5.5.4).
- **TDD scope:** pure logic (`engine/`, `store/`, AI composer, alert rules) gets Vitest tests. UI tasks verify via `npm run build` passing cleanly.
- **Test command:** `npx vitest run <path>` for a single file; `npm run build` for the UI/type check.

---

## Phase 0 — Test tooling

### Task 0: Add Vitest

**Files:**
- Modify: `package.json` (add devDeps + `test` script)
- Create: `vitest.config.ts`
- Create: `src/app/landingPages/__smoke__/setup.test.ts`

**Interfaces:**
- Produces: `npx vitest run` works; `npm run test` alias exists.

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest@^2`
Expected: added to devDependencies without peer errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add `test` script to package.json**

In `"scripts"`, add: `"test": "vitest run"`.

- [ ] **Step 4: Write a smoke test**

```ts
// src/app/landingPages/__smoke__/setup.test.ts
import { describe, it, expect } from 'vitest';
describe('vitest', () => { it('runs', () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 5: Run it**

Run: `npx vitest run src/app/landingPages/__smoke__/setup.test.ts`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/app/landingPages/__smoke__/setup.test.ts
git commit -m "chore(landing-pages): add vitest for pure-logic tests"
```

---

## Phase 1 — Schema & engine (pure logic, TDD)

### Task 1: Block types & token catalog

**Files:**
- Create: `src/app/landingPages/schema/blockTypes.ts`
- Test: `src/app/landingPages/schema/blockTypes.test.ts`

**Interfaces:**
- Produces:
  - `type BlockType = 'navbar'|'hero'|'logos'|'features'|'richtext'|'media'|'testimonial'|'stats'|'cta'|'form'|'faq'|'footer'|'spacer'|'embed'`
  - `interface Block { id: string; type: BlockType; props: Record<string, unknown>; showIf?: ShowIf }`
  - `interface ShowIf { field: string; op: '=='|'!='; value: string }`
  - `const TOKEN_FALLBACKS: Record<string, string>` mapping token → fallback (e.g. `'account.name' → 'sua empresa'`, `'account.industry' → 'seu setor'`, `'account.logo' → ''`, `'account.domain' → 'seusite.com'`, `'contact.firstName' → 'você'`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { TOKEN_FALLBACKS } from './blockTypes';

describe('TOKEN_FALLBACKS', () => {
  it('has a non-token fallback for account.name', () => {
    expect(TOKEN_FALLBACKS['account.name']).toBe('sua empresa');
  });
  it('covers all account.* tokens used by blocks', () => {
    for (const k of ['account.name', 'account.industry', 'account.domain', 'contact.firstName']) {
      expect(typeof TOKEN_FALLBACKS[k]).toBe('string');
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/schema/blockTypes.test.ts`
Expected: FAIL — cannot find module './blockTypes'.

- [ ] **Step 3: Implement**

```ts
// src/app/landingPages/schema/blockTypes.ts
export type BlockType =
  | 'navbar' | 'hero' | 'logos' | 'features' | 'richtext' | 'media'
  | 'testimonial' | 'stats' | 'cta' | 'form' | 'faq' | 'footer'
  | 'spacer' | 'embed';

export interface ShowIf { field: string; op: '==' | '!='; value: string; }

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  showIf?: ShowIf;
}

export const TOKEN_FALLBACKS: Record<string, string> = {
  'account.name': 'sua empresa',
  'account.industry': 'seu setor',
  'account.domain': 'seusite.com',
  'account.logo': '',
  'contact.firstName': 'você',
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/schema/blockTypes.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/schema/blockTypes.ts src/app/landingPages/schema/blockTypes.test.ts
git commit -m "feat(landing-pages): block types + token fallback catalog"
```

### Task 2: Token resolver

**Files:**
- Create: `src/app/landingPages/engine/resolveTokens.ts`
- Test: `src/app/landingPages/engine/resolveTokens.test.ts`

**Interfaces:**
- Consumes: `TOKEN_FALLBACKS` from Task 1.
- Produces:
  - `interface AccountContext { name?: string; industry?: string; domain?: string; logo?: string; contactFirstName?: string }`
  - `function resolveTokens(text: string, ctx: AccountContext | null): string` — replaces `{{account.name}}` etc.; when `ctx` is null OR a field is missing, uses `TOKEN_FALLBACKS`; strips `<`/`>` from injected values to avoid HTML injection; leaves non-token text untouched; unknown tokens resolve to empty string.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveTokens } from './resolveTokens';

describe('resolveTokens', () => {
  it('substitutes real account values', () => {
    expect(resolveTokens('Olá {{account.name}}', { name: 'Acme' })).toBe('Olá Acme');
  });
  it('falls back when ctx is null', () => {
    expect(resolveTokens('Olá {{account.name}}', null)).toBe('Olá sua empresa');
  });
  it('falls back when field missing', () => {
    expect(resolveTokens('{{account.industry}}', { name: 'Acme' })).toBe('seu setor');
  });
  it('never emits raw token', () => {
    expect(resolveTokens('{{account.name}}', null)).not.toContain('{{');
  });
  it('strips angle brackets from injected values (no HTML injection)', () => {
    expect(resolveTokens('{{account.name}}', { name: '<script>x' })).toBe('scriptx');
  });
  it('unknown token → empty string', () => {
    expect(resolveTokens('a{{account.zzz}}b', { name: 'Acme' })).toBe('ab');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/engine/resolveTokens.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
// src/app/landingPages/engine/resolveTokens.ts
import { TOKEN_FALLBACKS } from '../schema/blockTypes';

export interface AccountContext {
  name?: string; industry?: string; domain?: string; logo?: string; contactFirstName?: string;
}

const FIELD_MAP: Record<string, keyof AccountContext> = {
  'account.name': 'name',
  'account.industry': 'industry',
  'account.domain': 'domain',
  'account.logo': 'logo',
  'contact.firstName': 'contactFirstName',
};

const sanitize = (v: string) => v.replace(/[<>]/g, '');

export function resolveTokens(text: string, ctx: AccountContext | null): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token: string) => {
    const field = FIELD_MAP[token];
    if (field) {
      const val = ctx?.[field];
      if (val != null && val !== '') return sanitize(String(val));
      return TOKEN_FALLBACKS[token] ?? '';
    }
    return TOKEN_FALLBACKS[token] ?? '';
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/engine/resolveTokens.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/engine/resolveTokens.ts src/app/landingPages/engine/resolveTokens.test.ts
git commit -m "feat(landing-pages): token resolver with mandatory fallbacks + sanitization"
```

### Task 3: Block resolution (overrides merge + showIf)

**Files:**
- Create: `src/app/landingPages/engine/resolveBlock.ts`
- Test: `src/app/landingPages/engine/resolveBlock.test.ts`

**Interfaces:**
- Consumes: `Block`, `ShowIf` (Task 1); `AccountContext` (Task 2).
- Produces:
  - `function mergeOverride(base: Block, override?: Partial<Block>): Block` — shallow-merges `props` (override wins per key), keeps base id/type.
  - `function isVisible(showIf: ShowIf | undefined, ctx: AccountContext | null): boolean` — no `showIf` → true; with `showIf` and no ctx → true (default render shows everything); evaluates `field` against ctx (field name after `account.` prefix).
  - `function resolveBlocks(blocks: Block[], overridesForAccount: Record<string, Partial<Block>> | undefined, ctx: AccountContext | null): Block[]` — maps blocks through mergeOverride then filters by isVisible.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { mergeOverride, isVisible, resolveBlocks } from './resolveBlock';

const base = { id: 'b1', type: 'hero' as const, props: { title: 'A', sub: 'S' } };

describe('mergeOverride', () => {
  it('override wins per prop key, others kept', () => {
    expect(mergeOverride(base, { props: { title: 'B' } }).props).toEqual({ title: 'B', sub: 'S' });
  });
  it('no override returns base unchanged', () => {
    expect(mergeOverride(base)).toEqual(base);
  });
});

describe('isVisible', () => {
  it('no showIf → visible', () => { expect(isVisible(undefined, null)).toBe(true); });
  it('showIf with no ctx → visible (default render)', () => {
    expect(isVisible({ field: 'account.industry', op: '==', value: 'fintech' }, null)).toBe(true);
  });
  it('== matches', () => {
    expect(isVisible({ field: 'account.industry', op: '==', value: 'fintech' }, { industry: 'fintech' })).toBe(true);
  });
  it('== not match → hidden', () => {
    expect(isVisible({ field: 'account.industry', op: '==', value: 'fintech' }, { industry: 'saude' })).toBe(false);
  });
});

describe('resolveBlocks', () => {
  it('applies override then filters hidden', () => {
    const blocks = [base, { id: 'b2', type: 'cta' as const, props: {}, showIf: { field: 'account.industry', op: '==' as const, value: 'fintech' } }];
    const out = resolveBlocks(blocks, { b1: { props: { title: 'Z' } } }, { industry: 'saude' });
    expect(out).toHaveLength(1);
    expect(out[0].props.title).toBe('Z');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/engine/resolveBlock.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
// src/app/landingPages/engine/resolveBlock.ts
import type { Block, ShowIf } from '../schema/blockTypes';
import type { AccountContext } from './resolveTokens';

export function mergeOverride(base: Block, override?: Partial<Block>): Block {
  if (!override) return base;
  return {
    ...base,
    ...override,
    props: { ...base.props, ...(override.props ?? {}) },
  };
}

export function isVisible(showIf: ShowIf | undefined, ctx: AccountContext | null): boolean {
  if (!showIf) return true;
  if (!ctx) return true;
  const key = showIf.field.replace(/^account\./, '') as keyof AccountContext;
  const actual = ctx[key];
  const eq = String(actual ?? '') === showIf.value;
  return showIf.op === '==' ? eq : !eq;
}

export function resolveBlocks(
  blocks: Block[],
  overridesForAccount: Record<string, Partial<Block>> | undefined,
  ctx: AccountContext | null,
): Block[] {
  return blocks
    .map((b) => mergeOverride(b, overridesForAccount?.[b.id]))
    .filter((b) => isVisible(b.showIf, ctx));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/engine/resolveBlock.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/engine/resolveBlock.ts src/app/landingPages/engine/resolveBlock.test.ts
git commit -m "feat(landing-pages): override merge + segment visibility resolution"
```

---

## Phase 2 — Store (localStorage, TDD)

### Task 4: LandingPage model + slug utils

**Files:**
- Create: `src/app/landingPages/store/model.ts`
- Test: `src/app/landingPages/store/model.test.ts`

**Interfaces:**
- Consumes: `Block` (Task 1); `BrandKit` from `../../campaigns/wizard/brandKit`.
- Produces:
  - `interface LandingPage { id, name, slug, status: 'draft'|'published'|'archived', templateOrigin: string|null, brandKit: BrandKit, seo: { title: string; description: string; ogImage: string|null; noIndex: boolean }, blocks: Block[], accountOverrides: Record<string, Record<string, Partial<Block>>>, formConfig: FormConfig, links: { campaignIds: string[]; accountIds: string[] }, createdAt: string, updatedAt: string }`
  - `interface FormConfig { fields: { name: string; mapTo: string }[]; postSubmit: { type: 'message'|'redirect'; value: string } }`
  - `function slugify(name: string): string` — lowercase, kebab-case, strip diacritics/non-alnum.
  - `function newLandingPage(partial: { name: string; templateOrigin?: string|null; blocks?: Block[]; brandKit: BrandKit }): LandingPage` — fills defaults, `status: 'draft'`, slug from name, timestamps via `Date.now()` ISO.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { slugify, newLandingPage } from './model';
import { createDefaultBrandKit } from '../../campaigns/wizard/brandKit';

describe('slugify', () => {
  it('kebab-cases and strips diacritics', () => {
    expect(slugify('Página de POC — Ação!')).toBe('pagina-de-poc-acao');
  });
});

describe('newLandingPage', () => {
  it('creates a draft with slug + timestamps', () => {
    const lp = newLandingPage({ name: 'Demo Acme', brandKit: createDefaultBrandKit() });
    expect(lp.status).toBe('draft');
    expect(lp.slug).toBe('demo-acme');
    expect(lp.blocks).toEqual([]);
    expect(lp.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(lp.id).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/store/model.test.ts`
Expected: FAIL — cannot find module './model'.

- [ ] **Step 3: Implement**

```ts
// src/app/landingPages/store/model.ts
import type { Block } from '../schema/blockTypes';
import type { BrandKit } from '../../campaigns/wizard/brandKit';

export interface FormConfig {
  fields: { name: string; mapTo: string }[];
  postSubmit: { type: 'message' | 'redirect'; value: string };
}

export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  templateOrigin: string | null;
  brandKit: BrandKit;
  seo: { title: string; description: string; ogImage: string | null; noIndex: boolean };
  blocks: Block[];
  accountOverrides: Record<string, Record<string, Partial<Block>>>;
  formConfig: FormConfig;
  links: { campaignIds: string[]; accountIds: string[] };
  createdAt: string;
  updatedAt: string;
}

export function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let counter = 0;
function id(): string { counter += 1; return `lp_${Date.now().toString(36)}_${counter}`; }

export function newLandingPage(partial: {
  name: string; templateOrigin?: string | null; blocks?: Block[]; brandKit: BrandKit;
}): LandingPage {
  const now = new Date().toISOString();
  return {
    id: id(),
    name: partial.name,
    slug: slugify(partial.name),
    status: 'draft',
    templateOrigin: partial.templateOrigin ?? 'blank',
    brandKit: partial.brandKit,
    seo: { title: partial.name, description: '', ogImage: null, noIndex: false },
    blocks: partial.blocks ?? [],
    accountOverrides: {},
    formConfig: { fields: [], postSubmit: { type: 'message', value: 'Obrigado!' } },
    links: { campaignIds: [], accountIds: [] },
    createdAt: now,
    updatedAt: now,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/store/model.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/store/model.ts src/app/landingPages/store/model.test.ts
git commit -m "feat(landing-pages): LandingPage model + slugify + factory"
```

### Task 5: localStorage repository

**Files:**
- Create: `src/app/landingPages/store/repo.ts`
- Test: `src/app/landingPages/store/repo.test.ts`

**Interfaces:**
- Consumes: `LandingPage`, `slugify` (Task 4).
- Produces (all synchronous, backed by a `Storage`-like object; the module reads `globalThis.localStorage`):
  - `function listPages(): LandingPage[]`
  - `function getPage(id: string): LandingPage | undefined`
  - `function getPageBySlug(slug: string): LandingPage | undefined`
  - `function savePage(page: LandingPage): void` — upsert by id, bumps `updatedAt`.
  - `function deletePage(id: string): void`
  - `function isSlugAvailable(slug: string, exceptId?: string): boolean`
  - `function duplicatePage(id: string): LandingPage` — new id, `status: 'draft'`, unique slug (`-copy`, `-copy-2`…), name `"… (cópia)"`.
- Test setup uses a tiny in-memory `localStorage` polyfill assigned to `globalThis.localStorage` in `beforeEach`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { listPages, savePage, getPage, getPageBySlug, deletePage, isSlugAvailable, duplicatePage } from './repo';
import { newLandingPage } from './model';
import { createDefaultBrandKit } from '../../campaigns/wizard/brandKit';

function mem(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  } as Storage;
}

beforeEach(() => { (globalThis as any).localStorage = mem(); });
const make = (name: string) => newLandingPage({ name, brandKit: createDefaultBrandKit() });

describe('repo', () => {
  it('saves and lists', () => {
    savePage(make('Demo A'));
    expect(listPages()).toHaveLength(1);
  });
  it('gets by id and slug', () => {
    const p = make('Demo B'); savePage(p);
    expect(getPage(p.id)?.name).toBe('Demo B');
    expect(getPageBySlug('demo-b')?.id).toBe(p.id);
  });
  it('slug availability respects exceptId', () => {
    const p = make('Demo C'); savePage(p);
    expect(isSlugAvailable('demo-c')).toBe(false);
    expect(isSlugAvailable('demo-c', p.id)).toBe(true);
  });
  it('duplicate creates a draft with unique slug', () => {
    const p = make('Demo D'); savePage(p);
    const d = duplicatePage(p.id);
    expect(d.status).toBe('draft');
    expect(d.slug).toBe('demo-d-copy');
    expect(d.id).not.toBe(p.id);
  });
  it('deletes', () => {
    const p = make('Demo E'); savePage(p); deletePage(p.id);
    expect(listPages()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/store/repo.test.ts`
Expected: FAIL — cannot find module './repo'.

- [ ] **Step 3: Implement**

```ts
// src/app/landingPages/store/repo.ts
import type { LandingPage } from './model';
import { slugify } from './model';

const KEY = 'maestro.landingPages.v1';

function readAll(): LandingPage[] {
  try { return JSON.parse(globalThis.localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}
function writeAll(pages: LandingPage[]): void {
  globalThis.localStorage.setItem(KEY, JSON.stringify(pages));
}

export function listPages(): LandingPage[] { return readAll(); }
export function getPage(id: string): LandingPage | undefined { return readAll().find((p) => p.id === id); }
export function getPageBySlug(slug: string): LandingPage | undefined { return readAll().find((p) => p.slug === slug); }

export function savePage(page: LandingPage): void {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === page.id);
  const next = { ...page, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = next; else all.push(next);
  writeAll(all);
}

export function deletePage(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function isSlugAvailable(slug: string, exceptId?: string): boolean {
  return !readAll().some((p) => p.slug === slug && p.id !== exceptId);
}

export function duplicatePage(id: string): LandingPage {
  const src = getPage(id);
  if (!src) throw new Error('page not found');
  let slug = `${slugify(src.name)}-copy`;
  let n = 2;
  while (!isSlugAvailable(slug)) { slug = `${slugify(src.name)}-copy-${n}`; n += 1; }
  const now = new Date().toISOString();
  const copy: LandingPage = {
    ...src,
    id: `${src.id}_copy_${Date.now().toString(36)}`,
    name: `${src.name} (cópia)`,
    slug,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  savePage(copy);
  return copy;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/store/repo.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/store/repo.ts src/app/landingPages/store/repo.test.ts
git commit -m "feat(landing-pages): localStorage repository (CRUD, slug, duplicate)"
```

### Task 6: Events, submissions, alerts store + intent rules

**Files:**
- Create: `src/app/landingPages/store/tracking.ts`
- Create: `src/app/landingPages/alerts/rules.ts`
- Test: `src/app/landingPages/alerts/rules.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks except storage pattern.
- Produces in `tracking.ts`:
  - `interface PageEvent { id: string; landingPageId: string; accountId: string|null; type: 'page_view'|'scroll_depth'|'cta_click'|'form_start'|'form_submit'; value?: number; ts: string }`
  - `interface FormSubmission { id: string; landingPageId: string; accountId: string|null; fields: Record<string,string>; ts: string }`
  - `interface IntentAlert { id: string; landingPageId: string; accountId: string; reason: string; ts: string }`
  - `logEvent(e: Omit<PageEvent,'id'|'ts'>): void`, `listEvents(landingPageId?: string): PageEvent[]`
  - `saveSubmission(s: Omit<FormSubmission,'id'|'ts'>): void`, `listSubmissions(): FormSubmission[]`
  - `saveAlert(a: Omit<IntentAlert,'id'|'ts'>): void`, `listAlerts(): IntentAlert[]`
- Produces in `rules.ts`:
  - `function evaluateIntent(events: PageEvent[], accountId: string): { fired: boolean; reason: string }` — fires when `scroll_depth≥80 AND cta_click` for that account, OR `≥2 page_view within 7 days`.

- [ ] **Step 1: Write the failing test (rules only — tracking verified by build)**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateIntent } from './rules';
import type { PageEvent } from '../store/tracking';

const ev = (type: PageEvent['type'], value?: number, ts = '2026-07-01T10:00:00.000Z'): PageEvent =>
  ({ id: 'x', landingPageId: 'lp1', accountId: 'a1', type, value, ts });

describe('evaluateIntent', () => {
  it('fires on scroll>=80 + cta_click', () => {
    const r = evaluateIntent([ev('scroll_depth', 80), ev('cta_click')], 'a1');
    expect(r.fired).toBe(true);
  });
  it('fires on 2+ page_views in 7 days', () => {
    const r = evaluateIntent([ev('page_view', undefined, '2026-06-28T10:00:00.000Z'), ev('page_view', undefined, '2026-07-01T10:00:00.000Z')], 'a1');
    expect(r.fired).toBe(true);
  });
  it('does not fire on a single page_view', () => {
    expect(evaluateIntent([ev('page_view')], 'a1').fired).toBe(false);
  });
  it('ignores events from other accounts', () => {
    const other = { ...ev('cta_click'), accountId: 'a2' };
    expect(evaluateIntent([ev('scroll_depth', 90), other], 'a1').fired).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/alerts/rules.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Implement `tracking.ts`**

```ts
// src/app/landingPages/store/tracking.ts
export interface PageEvent {
  id: string; landingPageId: string; accountId: string | null;
  type: 'page_view' | 'scroll_depth' | 'cta_click' | 'form_start' | 'form_submit';
  value?: number; ts: string;
}
export interface FormSubmission {
  id: string; landingPageId: string; accountId: string | null;
  fields: Record<string, string>; ts: string;
}
export interface IntentAlert {
  id: string; landingPageId: string; accountId: string; reason: string; ts: string;
}

function read<T>(key: string): T[] {
  try { return JSON.parse(globalThis.localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
function write<T>(key: string, rows: T[]): void { globalThis.localStorage.setItem(key, JSON.stringify(rows)); }
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(performance.now())}`;

const EK = 'maestro.landingPages.events.v1';
const SK = 'maestro.landingPages.submissions.v1';
const AK = 'maestro.landingPages.alerts.v1';

export function logEvent(e: Omit<PageEvent, 'id' | 'ts'>): void {
  const rows = read<PageEvent>(EK);
  rows.push({ ...e, id: uid('ev'), ts: new Date().toISOString() });
  write(EK, rows);
}
export function listEvents(landingPageId?: string): PageEvent[] {
  const rows = read<PageEvent>(EK);
  return landingPageId ? rows.filter((r) => r.landingPageId === landingPageId) : rows;
}
export function saveSubmission(s: Omit<FormSubmission, 'id' | 'ts'>): void {
  const rows = read<FormSubmission>(SK);
  rows.push({ ...s, id: uid('sub'), ts: new Date().toISOString() });
  write(SK, rows);
}
export function listSubmissions(): FormSubmission[] { return read<FormSubmission>(SK); }
export function saveAlert(a: Omit<IntentAlert, 'id' | 'ts'>): void {
  const rows = read<IntentAlert>(AK);
  rows.push({ ...a, id: uid('al'), ts: new Date().toISOString() });
  write(AK, rows);
}
export function listAlerts(): IntentAlert[] { return read<IntentAlert>(AK); }
```

- [ ] **Step 4: Implement `rules.ts`**

```ts
// src/app/landingPages/alerts/rules.ts
import type { PageEvent } from '../store/tracking';

const DAY = 86_400_000;

export function evaluateIntent(events: PageEvent[], accountId: string): { fired: boolean; reason: string } {
  const mine = events.filter((e) => e.accountId === accountId);
  const deepScroll = mine.some((e) => e.type === 'scroll_depth' && (e.value ?? 0) >= 80);
  const clickedCta = mine.some((e) => e.type === 'cta_click');
  if (deepScroll && clickedCta) return { fired: true, reason: 'Scroll ≥80% + clique no CTA' };

  const views = mine.filter((e) => e.type === 'page_view').map((e) => Date.parse(e.ts)).sort();
  for (let i = 1; i < views.length; i += 1) {
    if (views[i] - views[0] <= 7 * DAY) return { fired: true, reason: '2+ visitas em 7 dias' };
  }
  return { fired: false, reason: '' };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/alerts/rules.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/app/landingPages/store/tracking.ts src/app/landingPages/alerts/rules.ts src/app/landingPages/alerts/rules.test.ts
git commit -m "feat(landing-pages): events/submissions/alerts store + intent rules"
```

---

## Phase 3 — Block registry & renderer (UI; verify via build)

### Task 7: Block registry with defaults + render + panel

**Files:**
- Create: `src/app/landingPages/schema/registry.tsx`
- Create: `src/app/landingPages/schema/blocks/` (one file per block render+panel; keep each small)
- Modify: none.

**Interfaces:**
- Consumes: `Block`, `BlockType` (Task 1); `resolveTokens`, `AccountContext` (Task 2).
- Produces:
  - `interface RenderContext { ctx: AccountContext | null; brandKit: BrandKit }`
  - `interface BlockDef { type: BlockType; label: string; group: 'estrutura'|'conteudo'|'conversao'|'prova'; defaults: () => Record<string, unknown>; tokens: string[]; Render: React.FC<{ block: Block; ctx: RenderContext }>; Panel: React.FC<{ block: Block; onChange: (patch: Partial<Block>) => void }> }`
  - `const REGISTRY: Record<BlockType, BlockDef>`
  - `function newBlock(type: BlockType): Block` — id + defaults from registry.
- All 14 block types must have an entry. Render must run every user string through `resolveTokens(str, ctx.ctx)`. Blocks with lists (features/logos/faq/stats) render `props.items: {…}[]`.

- [ ] **Step 1: Implement registry + block files**

Create `src/app/landingPages/schema/registry.tsx` exporting `REGISTRY`, `newBlock`, `RenderContext`, `BlockDef`. Implement all 14 blocks (hero, navbar, logos, features, richtext, media, testimonial, stats, cta, form, faq, footer, spacer, embed). Each `Render` uses Tailwind + brandKit colors and calls `resolveTokens` on text props. Each `Panel` renders shadcn `Input`/`Textarea`/`Label` bound to `props` via `onChange({ props: { ...block.props, [k]: v } })`. Keep list-editing (add/remove item) inside the Panel. Guard `embed`/`richtext` against raw HTML injection (render as escaped text or sandboxed iframe for known providers only).

- [ ] **Step 2: Type-check via build**

Run: `npm run build`
Expected: builds with no TypeScript errors touching `landingPages/schema`.

- [ ] **Step 3: Commit**

```bash
git add src/app/landingPages/schema/registry.tsx src/app/landingPages/schema/blocks/
git commit -m "feat(landing-pages): block registry with 14 blocks (render + panel + defaults)"
```

### Task 8: BlockRenderer (document → DOM)

**Files:**
- Create: `src/app/landingPages/engine/BlockRenderer.tsx`

**Interfaces:**
- Consumes: `REGISTRY` (Task 7); `resolveBlocks` (Task 3); `LandingPage` (Task 4).
- Produces:
  - `interface BlockRendererProps { page: LandingPage; accountId?: string | null; ctx: AccountContext | null; onEvent?: (type: PageEvent['type'], value?: number) => void }`
  - `const BlockRenderer: React.FC<BlockRendererProps>` — resolves blocks via `resolveBlocks(page.blocks, page.accountOverrides[accountId], ctx)` then renders each with its `REGISTRY[type].Render`. Applies `page.brandKit` font/colors on a wrapper. This same component is used by editor canvas, mobile preview, and public page.

- [ ] **Step 1: Implement**

Render wrapper div with `style` from brandKit (fontFamily, `--primary` etc.), map resolved blocks to `REGISTRY[b.type].Render`. If `onEvent` provided, the public page (Task 14) wires scroll/cta; here just pass `ctx` down.

- [ ] **Step 2: Type-check via build**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/landingPages/engine/BlockRenderer.tsx
git commit -m "feat(landing-pages): unified BlockRenderer (editor/preview/public)"
```

---

## Phase 4 — Templates & AI composer

### Task 9: Template catalog (seed ≥4)

**Files:**
- Create: `src/app/landingPages/templates/catalog.ts`
- Test: `src/app/landingPages/templates/catalog.test.ts`

**Interfaces:**
- Consumes: `Block`, `newBlock` (Task 7).
- Produces:
  - `interface TemplateDef { id: string; name: string; useCase: string; play: string | null; tags: string[]; buildBlocks: () => Block[] }`
  - `const TEMPLATES: TemplateDef[]` — at least: `microsite-1a1`, `vertical`, `poc`, `demo-invite`. Each `buildBlocks()` returns a full block list using `{{account.*}}` tokens in hero/cta.
  - `function getTemplate(id: string): TemplateDef | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate } from './catalog';

describe('templates', () => {
  it('ships at least 4', () => { expect(TEMPLATES.length).toBeGreaterThanOrEqual(4); });
  it('each builds a non-empty block list', () => {
    for (const t of TEMPLATES) expect(t.buildBlocks().length).toBeGreaterThan(0);
  });
  it('microsite uses account token in some text prop', () => {
    const blocks = getTemplate('microsite-1a1')!.buildBlocks();
    const json = JSON.stringify(blocks);
    expect(json).toContain('{{account.name}}');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/templates/catalog.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement** the 4 templates using `newBlock(type)` then customizing `props` with tokens.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/templates/catalog.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/templates/catalog.ts src/app/landingPages/templates/catalog.test.ts
git commit -m "feat(landing-pages): ABM template catalog seed (4 templates)"
```

### Task 10: AI composer (simulated, deterministic)

**Files:**
- Create: `src/app/landingPages/create/composer.ts`
- Test: `src/app/landingPages/create/composer.test.ts`

**Interfaces:**
- Consumes: `Block`, `newBlock` (Task 7); `TEMPLATES`/`getTemplate` (Task 9).
- Produces:
  - `interface AiBrief { objective: 'demo'|'material'|'poc'; accountName?: string; industry?: string; message?: string; angle?: string }`
  - `function composePage(brief: AiBrief): Block[]` — deterministic: picks base template by `objective`, injects `message`/`angle` into hero/cta props, returns a valid block list (all types ∈ registry).
  - `function regenerateBlock(block: Block, brief: AiBrief): Block` — returns a new block of the SAME id and type with varied props (deterministic variation by a rotating index derived from current props, NOT random). Other blocks untouched (AC-5.3.3).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { composePage, regenerateBlock } from './composer';

describe('composePage', () => {
  it('is deterministic for the same brief', () => {
    const brief = { objective: 'demo' as const, accountName: 'Acme' };
    expect(JSON.stringify(composePage(brief))).toEqual(JSON.stringify(composePage(brief)));
  });
  it('produces a non-empty block list', () => {
    expect(composePage({ objective: 'poc' as const }).length).toBeGreaterThan(0);
  });
});

describe('regenerateBlock', () => {
  it('keeps id and type, changes props', () => {
    const [hero] = composePage({ objective: 'demo' as const, message: 'x' });
    const next = regenerateBlock(hero, { objective: 'demo' as const, message: 'y' });
    expect(next.id).toBe(hero.id);
    expect(next.type).toBe(hero.type);
    expect(JSON.stringify(next.props)).not.toEqual(JSON.stringify(hero.props));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/landingPages/create/composer.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement** deterministic composition (objective→template map; string injection; `regenerateBlock` varies props using a counter stored in `props._gen` incremented, not random).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/landingPages/create/composer.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/create/composer.ts src/app/landingPages/create/composer.test.ts
git commit -m "feat(landing-pages): deterministic AI-simulated page composer"
```

---

## Phase 5 — Screens (UI; verify via build + app)

> These tasks add React screens and routes. Each verifies with `npm run build` (clean) and a manual check in `npm run dev`. Reuse shadcn components and existing account mock data.

### Task 11: Account provider + seed data

**Files:**
- Create: `src/app/landingPages/store/accounts.ts`
- Create: `src/app/landingPages/store/seed.ts`

**Interfaces:**
- Produces:
  - `interface LpAccount { id: string; name: string; industry: string; domain: string; logo: string }`
  - `function listAccounts(): LpAccount[]` — adapts existing mock accounts (`FacetItem`/`TargetAccount` mock, e.g. from `src/lib/mockCampaignData.ts`) into `LpAccount[]`; if none, ships 5 inline mock accounts.
  - `function toAccountContext(a: LpAccount | null): AccountContext | null`.
  - `seed.ts`: `function ensureSeeded(): void` — if `listPages()` is empty, instantiate 2 published + 1 draft page from templates and seed some `PageEvent`s. Called once at feature mount.

- [ ] **Step 1: Implement** `accounts.ts` and `seed.ts`.
- [ ] **Step 2: Build**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/landingPages/store/accounts.ts src/app/landingPages/store/seed.ts
git commit -m "feat(landing-pages): account adapter + localStorage seed"
```

### Task 12: Overview screen + routes

**Files:**
- Create: `src/app/landingPages/overview/LandingPagesOverview.tsx`
- Modify: `src/app/App.tsx` (add routes)
- Modify: `src/app/components/Sidebar.tsx` (add "Landing Pages" nav item)

**Interfaces:**
- Consumes: `listPages`, `duplicatePage`, `deletePage`, `savePage` (Task 5); `listEvents` (Task 6); `ensureSeeded` (Task 11); `buildComparisonData`/`accountColor` for summary metrics.
- Produces: route `/landing-pages` rendering the grid with status badges, summary metrics, filters (status/account/campaign/template), search, sort, and per-row actions (Edit → `/landing-pages/:id/edit`, Duplicate, Publish/Unpublish, Analytics, Archive, Copy URL). Primary CTA "Nova Landing Page" → `/landing-pages/new`.

**Sidebar nav entry (required):** `src/app/components/Sidebar.tsx` renders a `navItems` array of `{ icon, key }` (lucide icons; each button does `navigate("/" + key)` and highlights active with `#FF5F39`). Add an entry `{ icon: LayoutTemplate, key: "landing-pages" }` (import `LayoutTemplate` from `lucide-react`), placed alongside the existing items (e.g. after Plays). The existing `pageKey`/`isActive` logic already handles `/landing-pages` since the key maps 1:1 to the route — no special-case needed in the key→route mapping. Verify the icon highlights when on `/landing-pages`.

- [ ] **Step 1: Implement** the overview, wire routes in `App.tsx` (`/landing-pages`, `/landing-pages/new`, `/landing-pages/:id/edit`, `/landing-pages/:id/analytics`, `/p/:slug`; call `ensureSeeded()` on mount), and add the sidebar nav item in `Sidebar.tsx` per the note above.
- [ ] **Step 2: Build**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 3: Manual check**

Run: `npm run dev`; verify the new "Landing Pages" icon appears in the sidebar and navigates to `/landing-pages` (highlighting when active); open `/landing-pages`; verify seeded pages render with status + a traffic metric (AC-5.1.1); duplicate produces a new draft (AC-5.1.3); filter by account narrows the list (AC-5.1.2).

- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/overview/LandingPagesOverview.tsx src/app/App.tsx src/app/components/Sidebar.tsx
git commit -m "feat(landing-pages): overview screen + routes + sidebar nav item"
```

### Task 13: Creation selector (AI / template / blank)

**Files:**
- Create: `src/app/landingPages/create/CreateSelector.tsx`
- Create: `src/app/landingPages/create/AiBriefForm.tsx`

**Interfaces:**
- Consumes: `TEMPLATES`/`getTemplate` (Task 9); `composePage` (Task 10); `newLandingPage`/`savePage` (Tasks 4/5); `MOCK_BRAND_FIXTURE` (brandKit); `listAccounts` (Task 11).
- Produces: route `/landing-pages/new` — 3 paths that all end by creating a `draft` LandingPage in the repo and navigating to `/landing-pages/:id/edit` (AC-5.2.1). AI path shows the guided `AiBriefForm` (prefilled from selected account/campaign + brand kit) with a "gerando…" animation, then `composePage`. Template path shows the gallery; blank path creates navbar+footer only.

- [ ] **Step 1: Implement** selector + brief form.
- [ ] **Step 2: Build** — `npm run build`, expect no TS errors.
- [ ] **Step 3: Manual check** — all 3 paths land in the editor with a valid block document (AC-5.2.1); AI page applies brand kit + real account name (AC-5.3.2).
- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/create/CreateSelector.tsx src/app/landingPages/create/AiBriefForm.tsx
git commit -m "feat(landing-pages): creation selector (AI/template/blank)"
```

### Task 14: Public page `/p/:slug`

**Files:**
- Create: `src/app/landingPages/public/PublicPage.tsx`

**Interfaces:**
- Consumes: `getPageBySlug` (Task 5); `BlockRenderer` (Task 8); `listAccounts`/`toAccountContext` (Task 11); `logEvent` (Task 6); `evaluateIntent`/`saveAlert` (Task 6).
- Produces: route `/p/:slug` (rendered outside the app chrome). Reads `?a=<accountId>` for account context; logs `page_view` on mount, `scroll_depth` on scroll, `cta_click`/`form_submit` via `onEvent`; after each event runs `evaluateIntent` and saves an alert if fired. Unpublished/missing slug → friendly 404. Respects `seo.noIndex`.

- [ ] **Step 1: Implement** the public page + event wiring.
- [ ] **Step 2: Build** — `npm run build`, expect no TS errors.
- [ ] **Step 3: Manual check** — publish a page (Task 15 may be needed first; if testing before that, temporarily set status via repo). `/p/:slug?a=<id>` shows real account logo+name (AC-5.6.1); `/p/:slug` with no `?a=` shows default with no raw tokens (AC-5.6.2); unpublished → 404 (AC-5.7.3).
- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/public/PublicPage.tsx
git commit -m "feat(landing-pages): public /p/:slug render with account context + tracking"
```

### Task 15: DnD Editor (3 panels)

**Files:**
- Create: `src/app/landingPages/editor/LandingPageEditor.tsx`
- Create: `src/app/landingPages/editor/BlockLibrary.tsx`
- Create: `src/app/landingPages/editor/EditorCanvas.tsx`
- Create: `src/app/landingPages/editor/PropsPanel.tsx`
- Create: `src/app/landingPages/editor/useEditorHistory.ts`

**Interfaces:**
- Consumes: `REGISTRY`/`newBlock` (Task 7); `BlockRenderer` (Task 8); `getPage`/`savePage` (Tasks 4/5); `listAccounts`/`toAccountContext` (Task 11); `regenerateBlock` (Task 10); `DndProvider`/`HTML5Backend`/`useDrag`/`useDrop` (react-dnd, pattern from `PlaysCanvas.tsx`).
- Produces: route body for `/landing-pages/:id/edit`. Left = block library (draggable). Center = canvas rendering the document via `BlockRenderer` with per-block reorder dropzones + hover controls (move/duplicate/remove/up/down) + inline `contentEditable` text editing that writes back to `props`. Right = `PropsPanel` (selected block's `REGISTRY[type].Panel`, or page settings: SEO + form config). Top bar: name, undo/redo (`useEditorHistory` snapshot stack), autosave (debounced `savePage`), Desktop/Mobile toggle (narrow container), preview-account switcher, "edit base vs personalize for {account}" toggle (writes `accountOverrides`), Publish button (Task 16). "＋ token" menu inserts tokens into focused text field.

- [ ] **Step 1: Implement** `useEditorHistory` (undo/redo snapshot stack over the document).
- [ ] **Step 2: Implement** editor panels + DnD reorder + inline editing + autosave.
- [ ] **Step 3: Build** — `npm run build`, expect no TS errors.
- [ ] **Step 4: Manual check** — drag a block from library to canvas; reorder; edit text inline; change a brandKit color and see themed blocks update (AC-5.5.2); toggle Mobile and confirm fidelity (AC-5.5.3); switch preview account and see logo/name change (AC-5.6.1); "personalize for account" writes an override that survives a base edit (AC-5.6.3); insert a token and confirm no raw token renders (AC-5.5.4).
- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/editor/
git commit -m "feat(landing-pages): 3-panel DnD editor with personalization + history"
```

### Task 16: Publish flow + domains UI

**Files:**
- Create: `src/app/landingPages/publish/PublishDialog.tsx`

**Interfaces:**
- Consumes: `getPage`/`savePage` (Tasks 4/5); `isSlugAvailable` (Task 5).
- Produces: a dialog (opened from editor + overview) to choose slug (real-time availability via `isSlugAvailable`), publish/unpublish (sets `status`), and a **simulated** custom-domain flow (Pending→Verifying→Active with copyable CNAME). Publishing sets `status='published'`; the public route becomes reachable immediately (AC-5.7.1). Unpublish sets `status='draft'` keeping blocks (AC-5.7.3).

- [ ] **Step 1: Implement** the dialog.
- [ ] **Step 2: Build** — `npm run build`, expect no TS errors.
- [ ] **Step 3: Manual check** — publish → `/p/:slug` loads immediately (AC-5.7.1); duplicate slug is rejected; unpublish → `/p/:slug` 404 but draft still editable (AC-5.7.3); domain flow shows CNAME + status transitions (AC-5.7.2, simulated).
- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/publish/PublishDialog.tsx
git commit -m "feat(landing-pages): publish flow (slug + path) + simulated domains UI"
```

### Task 17: Analytics screen + account roll-up

**Files:**
- Create: `src/app/landingPages/analytics/LandingPageAnalytics.tsx`
- Create: `src/app/landingPages/analytics/mockSeries.ts`

**Interfaces:**
- Consumes: `listEvents` (Task 6); `getPage` (Task 4); `listAccounts` (Task 11); `buildComparisonData`/`accountColor` and `AccountComparisonChart`/`AccountPerformanceTable` from campaigns analytics.
- Produces: route `/landing-pages/:id/analytics` — funnel view→CTA→form + per-account breakdown; `mockSeries.ts` generates a realistic time series (same pattern as `mockCampaignData.ts`) merged with live `PageEvent`s. Also surfaces where LP events roll into the account timeline (AC-5.9.1/5.9.2).

- [ ] **Step 1: Implement** mock series + analytics screen.
- [ ] **Step 2: Build** — `npm run build`, expect no TS errors.
- [ ] **Step 3: Manual check** — funnel + per-account breakdown render (AC-5.9.2); events generated on the public page appear here.
- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/analytics/
git commit -m "feat(landing-pages): LP analytics (funnel + per-account) with live events"
```

### Task 18: Form submissions → Contacts/Accounts

**Files:**
- Create: `src/app/landingPages/forms/submit.ts`
- Test: `src/app/landingPages/forms/submit.test.ts`

**Interfaces:**
- Consumes: `saveSubmission` (Task 6); `LpAccount`/`listAccounts` (Task 11).
- Produces:
  - `interface Contact { email: string; firstName?: string; accountId: string | null }`
  - `function handleSubmit(landingPageId: string, accountId: string|null, fields: Record<string,string>, existing: Contact[]): { contact: Contact; deduped: boolean }` — creates/updates a Contact linked to the account, dedupes by email (case-insensitive) or domain (AC-5.10.1); persists a `FormSubmission`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { handleSubmit } from './submit';

function mem(){ const m=new Map<string,string>(); return { get length(){return m.size;}, clear:()=>m.clear(), getItem:(k:string)=>m.get(k)??null, key:(i:number)=>[...m.keys()][i]??null, removeItem:(k:string)=>void m.delete(k), setItem:(k:string,v:string)=>void m.set(k,v) } as Storage; }
beforeEach(() => { (globalThis as any).localStorage = mem(); });

describe('handleSubmit', () => {
  it('creates a new contact linked to the account', () => {
    const r = handleSubmit('lp1', 'a1', { email: 'x@acme.com', firstName: 'Ana' }, []);
    expect(r.deduped).toBe(false);
    expect(r.contact.accountId).toBe('a1');
  });
  it('dedupes by email case-insensitively', () => {
    const existing = [{ email: 'x@acme.com', accountId: 'a1' }];
    const r = handleSubmit('lp1', 'a1', { email: 'X@ACME.COM', firstName: 'Ana' }, existing);
    expect(r.deduped).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/app/landingPages/forms/submit.test.ts` → FAIL.
- [ ] **Step 3: Implement** `submit.ts`.
- [ ] **Step 4: Run to verify it passes** — expect 2 passed.
- [ ] **Step 5: Commit**

```bash
git add src/app/landingPages/forms/submit.ts src/app/landingPages/forms/submit.test.ts
git commit -m "feat(landing-pages): form submit → contact create/update with dedupe"
```

### Task 19: Ads wizard integration (picker + create-from-campaign)

**Files:**
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx`
- Create: `src/app/landingPages/ads/LandingPagePicker.tsx`
- Create: `src/app/landingPages/ads/utm.ts`
- Test: `src/app/landingPages/ads/utm.test.ts`

**Interfaces:**
- Consumes: `listPages`/`getPage` (Task 5); `savePage` for linking; existing `CreativeData.landingPageUrl` field.
- Produces:
  - `utm.ts`: `function buildAdLink(baseSlugUrl: string, accountId: string, utms: Record<string,string>): string` — appends `?a=<accountId>` + UTM params, URL-encoded (AC-5.8.2).
  - `LandingPagePicker.tsx`: searchable LP selector by name/account.
  - `CreativeStep.tsx`: replace the plain `landingPageUrl` input with picker + manual-URL fallback; add "Criar LP a partir desta campanha" button that opens creation prefilled and returns with the LP selected (AC-5.8.1/5.8.3); persist the campaign↔LP link bidirectionally (`page.links.campaignIds`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildAdLink } from './utm';

describe('buildAdLink', () => {
  it('adds account id and utms', () => {
    const url = buildAdLink('https://maestro.abm/p/demo', 'a1', { utm_source: 'linkedin' });
    expect(url).toContain('a=a1');
    expect(url).toContain('utm_source=linkedin');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement** `utm.ts`, then picker, then wire `CreativeStep.tsx`.
- [ ] **Step 4: Run test + build** — `npx vitest run src/app/landingPages/ads/utm.test.ts` (1 passed) and `npm run build` (no TS errors).
- [ ] **Step 5: Manual check** — in the campaign wizard, pick an LP without typing a URL (AC-5.8.1); "Criar LP da campanha" returns with LP selected (AC-5.8.3).
- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/wizard/CreativeStep.tsx src/app/landingPages/ads/
git commit -m "feat(landing-pages): Ads wizard LP picker + UTM/account-id injection"
```

### Task 20: Alerts surface + final wiring

**Files:**
- Create: `src/app/landingPages/alerts/AlertsPanel.tsx`
- Modify: `src/app/landingPages/overview/LandingPagesOverview.tsx` (surface alert count)

**Interfaces:**
- Consumes: `listAlerts` (Task 6).
- Produces: a panel listing intent alerts (account, reason, timestamp) with a "acionar Play" hook (navigates to the plays area or shows a stub). Overview shows an alert badge.

- [ ] **Step 1: Implement** alerts panel + overview badge.
- [ ] **Step 2: Build** — `npm run build`, expect no TS errors.
- [ ] **Step 3: Manual check** — trigger an alert by scrolling ≥80% + clicking CTA on `/p/:slug?a=<id>`; it appears in the panel attributed to the account owner (AC-5.11.1).
- [ ] **Step 4: Commit**

```bash
git add src/app/landingPages/alerts/AlertsPanel.tsx src/app/landingPages/overview/LandingPagesOverview.tsx
git commit -m "feat(landing-pages): intent alerts panel + overview badge"
```

---

## Self-review coverage map (spec §5 → task)

- 5.1 Overview → Task 12 · 5.2 Selector → Task 13 · 5.3 AI → Tasks 10, 13 · 5.4 Templates → Tasks 9, 13 · 5.5 Editor → Task 15 · 5.6 Personalization → Tasks 2, 3, 8, 15 · 5.7 Publish/domains → Tasks 14, 16 · 5.8 Ads → Task 19 · 5.9 Analytics → Task 17 · 5.10 Forms → Tasks 6, 18 · 5.11 Alerts → Tasks 6, 20 · §6 templates → Task 9 · §8 non-functional (XSS/fallback/idempotent publish) → Tasks 2, 7, 16.
