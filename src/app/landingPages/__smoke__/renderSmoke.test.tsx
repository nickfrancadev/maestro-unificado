// @vitest-environment jsdom
// Render-smoke tests: mount the render-heavy landing-page screens once each to
// catch render-time crashes (e.g. an undefined prop reference) that the pure
// `.ts` unit tests can't see. This class of bug — a component throwing on
// first render, which (with no error boundary) blanks the whole app — is
// exactly what slipped through before: vitest's include was `.ts`-only, so no
// component was ever mounted. These tests mount the real screens with a
// seeded localStorage.
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { composePage } from '../create/composer';
import { getTemplate } from '../templates/catalog';
import { newLandingPage, type LandingPage } from '../store/model';
import { savePage } from '../store/repo';
import { createDefaultBrandKit, MOCK_BRAND_FIXTURE, type BrandKit } from '../../campaigns/wizard/brandKit';
import { newBlock } from '../schema/registry';
import { LandingPageEditor } from '../editor/LandingPageEditor';
import { PublicPage } from '../public/PublicPage';
import { LandingPagesOverview } from '../overview/LandingPagesOverview';
import { LpThumbnail } from '../components/LpThumbnail';
import { BlockRenderer } from '../engine/BlockRenderer';
import type { Block } from '../schema/blockTypes';

function mem(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  } as Storage;
}

function brandKit(): BrandKit {
  return { ...createDefaultBrandKit(), ...MOCK_BRAND_FIXTURE, status: 'defined', websiteUrl: '' };
}

function seedAiPage(): LandingPage {
  const blocks = composePage({ objective: 'demo', accountName: 'Acme', industry: 'Fintech', message: 'oi', angle: 'ângulo' });
  const page = newLandingPage({ name: 'Demo Acme', templateOrigin: 'ai', blocks, brandKit: brandKit() });
  savePage(page);
  return page;
}

function seedTemplatePage(): LandingPage {
  const t = getTemplate('microsite-1a1')!;
  const page = newLandingPage({ name: t.name, templateOrigin: t.id, blocks: t.buildBlocks(), brandKit: brandKit() });
  savePage(page);
  return page;
}

function seedBlankPage(): LandingPage {
  const page = newLandingPage({ name: 'Em branco', templateOrigin: 'blank', blocks: [newBlock('navbar'), newBlock('footer')], brandKit: brandKit() });
  savePage(page);
  return page;
}

function pageWith(block: Block): LandingPage {
  return newLandingPage({ name: 'x', templateOrigin: 'blank', blocks: [block], brandKit: brandKit() });
}

beforeEach(() => { (globalThis as any).localStorage = mem(); });

function renderEditor(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/landing-pages/${id}/edit`]}>
      <Routes>
        <Route path="/landing-pages/:id/edit" element={<LandingPageEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('editor renders without throwing', () => {
  it('AI-composed page', () => { expect(() => renderEditor(seedAiPage().id)).not.toThrow(); });
  it('template page', () => { expect(() => renderEditor(seedTemplatePage().id)).not.toThrow(); });
  it('blank page', () => { expect(() => renderEditor(seedBlankPage().id)).not.toThrow(); });
});

describe('public page renders without throwing', () => {
  it('published page at /p/:slug', () => {
    const page = seedTemplatePage();
    page.status = 'published';
    savePage(page);
    expect(() => render(
      <MemoryRouter initialEntries={[`/p/${page.slug}`]}>
        <Routes>
          <Route path="/p/:slug" element={<PublicPage />} />
        </Routes>
      </MemoryRouter>,
    )).not.toThrow();
  });
});

describe('LpThumbnail renders without throwing', () => {
  it('with a page that has blocks', () => {
    const page = seedTemplatePage();
    expect(() => render(<LpThumbnail page={page} />)).not.toThrow();
  });

  it('with an empty page (placeholder path)', () => {
    const page = newLandingPage({ name: 'Vazia', templateOrigin: 'blank', blocks: [], brandKit: brandKit() });
    expect(() => render(<LpThumbnail page={page} />)).not.toThrow();
  });
});

describe('overview renders without throwing', () => {
  it('with a seeded page', () => {
    seedTemplatePage();
    expect(() => render(
      <MemoryRouter initialEntries={['/landing-pages']}>
        <DndProvider backend={HTML5Backend}>
          <Routes>
            <Route path="/landing-pages" element={<LandingPagesOverview />} />
          </Routes>
        </DndProvider>
      </MemoryRouter>,
    )).not.toThrow();
  });
});

describe('each block renders (public) without throwing', () => {
  for (const type of ['hero', 'cta', 'footer', 'navbar', 'richtext', 'media', 'testimonial', 'stats'] as const) {
    it(type, () => {
      const page = pageWith(newBlock(type));
      expect(() => render(<BlockRenderer page={page} accountId={null} ctx={null} />)).not.toThrow();
    });
  }
});
