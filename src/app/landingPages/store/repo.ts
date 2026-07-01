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
