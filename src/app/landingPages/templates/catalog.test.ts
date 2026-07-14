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
