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
