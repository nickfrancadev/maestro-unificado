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
