import { describe, it, expect } from 'vitest';
import {
  createEmptyTargeting,
  isSamePersonTargeting,
  setAccountFacet,
} from './targeting';
import type { FacetItem, TargetingData } from './types';

const SP: FacetItem = { id: 'sp', label: 'São Paulo', urn: 'urn:li:geo:1' };
const RJ: FacetItem = { id: 'rj', label: 'Rio de Janeiro', urn: 'urn:li:geo:2' };

function withDefaultLocation(): TargetingData {
  const data = createEmptyTargeting();
  data.defaultTargeting.locations = { included: [SP], excluded: [] };
  return data;
}

describe('setAccountFacet', () => {
  it('cria o override quando a conta diverge do padrão', () => {
    const next = setAccountFacet(withDefaultLocation(), 'acc1', 'locations', {
      included: [SP, RJ],
      excluded: [],
    });
    expect(next.overrides.acc1.locations.included.map((i) => i.id)).toEqual(['sp', 'rj']);
  });

  it('remove o override quando a conta volta a ficar igual ao padrão', () => {
    const base = withDefaultLocation();
    const diverged = setAccountFacet(base, 'acc1', 'locations', {
      included: [SP, RJ],
      excluded: [],
    });
    const back = setAccountFacet(diverged, 'acc1', 'locations', {
      included: [SP],
      excluded: [],
    });
    expect(back.overrides).toEqual({});
  });

  it('não cria override se a edição já resulta no padrão', () => {
    const next = setAccountFacet(withDefaultLocation(), 'acc1', 'locations', {
      included: [SP],
      excluded: [],
    });
    expect(next.overrides).toEqual({});
  });
});

describe('isSamePersonTargeting', () => {
  it('ignora a ordem dos itens', () => {
    const a = createEmptyTargeting().defaultTargeting;
    const b = createEmptyTargeting().defaultTargeting;
    a.locations = { included: [SP, RJ], excluded: [] };
    b.locations = { included: [RJ, SP], excluded: [] };
    expect(isSamePersonTargeting(a, b)).toBe(true);
  });
});
