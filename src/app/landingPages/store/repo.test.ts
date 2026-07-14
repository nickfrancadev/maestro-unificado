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
