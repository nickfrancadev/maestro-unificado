import { describe, it, expect } from 'vitest';
import { parseFollowers, followersLabel } from './brandKit';

describe('seguidores no kit da marca', () => {
  it('aceita número com ou sem ponto de milhar', () => {
    expect(parseFollowers('3.550')).toBe(3550);
    expect(parseFollowers('12000')).toBe(12000);
  });

  it('vazio ou texto vira null', () => {
    expect(parseFollowers('')).toBeNull();
    expect(parseFollowers('muitos')).toBeNull();
    expect(parseFollowers(undefined)).toBeNull();
  });

  it('sem número no kit, o preview não mostra seguidores', () => {
    expect(followersLabel(null)).toBeNull();
    expect(followersLabel(undefined)).toBeNull();
    expect(followersLabel(3550)).toBe('3.550 seguidores');
  });
});
