import { describe, it, expect } from 'vitest';
import {
  withDefaultLocation,
  hasLocation,
  audienceProblem,
  BRAZIL_GEO_URN,
  LOCATIONS_FACET,
  MIN_AUDIENCE,
} from './publishRules';

const employer = { or: { 'urn:li:adTargetingFacet:employers': ['urn:li:organization:1'] } };

describe('localização padrão Brasil no servidor (F052)', () => {
  it('critério sem localização ganha Brasil', () => {
    const { criteria, defaulted } = withDefaultLocation({ include: { and: [employer] } });
    expect(defaulted).toBe(true);
    expect(criteria.include.and).toContainEqual({ or: { [LOCATIONS_FACET]: [BRAZIL_GEO_URN] } });
    expect(criteria.include.and).toContainEqual(employer);
  });

  it('critério vazio ou ausente também', () => {
    expect(hasLocation(withDefaultLocation(undefined).criteria)).toBe(true);
    expect(hasLocation(withDefaultLocation({}).criteria)).toBe(true);
  });

  it('critério com localização não muda', () => {
    const c = { include: { and: [employer, { or: { [LOCATIONS_FACET]: ['urn:li:geo:103644278'] } }] }, exclude: { or: {} } };
    const r = withDefaultLocation(c);
    expect(r.defaulted).toBe(false);
    expect(r.criteria).toBe(c);
  });
});

describe('público mínimo de 300 no servidor (F055)', () => {
  it('recusa abaixo de 300 com o nome da empresa, em português', () => {
    const msg = audienceProblem('Nubank', 0)!;
    expect(msg).toContain('Nubank');
    expect(msg).toContain(`menos de ${MIN_AUDIENCE}`);
    expect(audienceProblem('Itaú', 299)).toContain('Itaú');
  });

  it('aceita 300 ou mais', () => {
    expect(audienceProblem('Nubank', 300)).toBeNull();
    expect(audienceProblem('Nubank', 12000)).toBeNull();
  });

  it('sem a estimativa do LinkedIn, não publica no escuro', () => {
    expect(audienceProblem('Nubank', null)).toMatch(/Não foi possível conferir o público de Nubank/);
  });
});
