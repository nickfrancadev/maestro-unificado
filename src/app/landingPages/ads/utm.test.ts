import { describe, it, expect } from 'vitest';
import { buildAdLink } from './utm';

describe('buildAdLink', () => {
  it('adds account id and utms', () => {
    const url = buildAdLink('https://maestro.abm/p/demo', 'a1', { utm_source: 'linkedin' });
    expect(url).toContain('a=a1');
    expect(url).toContain('utm_source=linkedin');
  });
});
