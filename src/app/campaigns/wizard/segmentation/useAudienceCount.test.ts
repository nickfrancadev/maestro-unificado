import { describe, it, expect } from 'vitest';
import { smallAdSets, audienceCheckFor, audienceScale, MIN_AUDIENCE } from './useAudienceCount';

describe('smallAdSets', () => {
  const adSet = (id: string, count: number, isPrivacyFloor = false) => ({ id, label: id, count, isFromApi: true, isPrivacyFloor });

  it('o mínimo vale para cada conjunto, não para a soma', () => {
    // 4.000 somados, mas um conjunto tem só 200: o LinkedIn recusa esse.
    const result = smallAdSets([adSet('a', 3800), adSet('b', 200)]);
    expect(result.map((a) => a.id)).toEqual(['b']);
  });

  it('privacy floor (API devolveu 0) conta como abaixo do mínimo', () => {
    expect(smallAdSets([adSet('a', MIN_AUDIENCE, true)]).map((a) => a.id)).toEqual(['a']);
  });

  it('exatamente 300 passa', () => {
    expect(smallAdSets([adSet('a', MIN_AUDIENCE)])).toEqual([]);
  });
});

describe('audienceCheckFor', () => {
  const adSet = (id: string, count: number) => ({ id, label: id, count, isFromApi: true, isPrivacyFloor: false });
  it('aponta toda empresa abaixo de 300, personalizada ou não', () => {
    const check = audienceCheckFor({ perAdSet: [adSet('nubank', 5000), adSet('inter', 120)], isLoading: false }, ['nubank', 'inter']);
    expect(check).toEqual({ small: ['inter'], pending: false });
  });

  it('empresa ainda sem número conta como pendente (trava a publicação)', () => {
    expect(audienceCheckFor({ perAdSet: [adSet('nubank', 5000)], isLoading: false }, ['nubank', 'inter']).pending).toBe(true);
  });

  it('régua de restrito a amplo vai de 0 a 1', () => {
    expect(audienceScale(100)).toBe(0);
    expect(audienceScale(2_000_000)).toBe(1);
    expect(audienceScale(20_000)).toBeGreaterThan(0.3);
  });
});
