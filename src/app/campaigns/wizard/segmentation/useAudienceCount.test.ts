import { describe, it, expect } from 'vitest';
import { smallAdSets, MIN_AUDIENCE } from './useAudienceCount';

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
