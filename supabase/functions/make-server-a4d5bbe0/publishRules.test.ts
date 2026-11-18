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

import { budgetDateProblem } from './publishRules';

describe('datas com orçamento total (F037) — mesma regra na tela e no servidor', () => {
  it('orçamento total sem data de fim é recusado', () => {
    expect(budgetDateProblem({ budgetType: 'total', startDate: '2026-12-01', endDate: '' })).toBe('Com orçamento total, defina a data de encerramento.');
  });
  it('orçamento total com fim passa; diário sem fim passa', () => {
    expect(budgetDateProblem({ budgetType: 'total', startDate: '2026-12-01', endDate: '2026-12-31' })).toBeNull();
    expect(budgetDateProblem({ budgetType: 'daily', startDate: '2026-12-01', endDate: '' })).toBeNull();
  });
  it('fim antes (ou no mesmo dia) do início é recusado', () => {
    expect(budgetDateProblem({ budgetType: 'daily', startDate: '2026-12-10', endDate: '2026-12-01' })).toMatch(/depois da data de início/);
    expect(budgetDateProblem({ budgetType: 'total', startDate: '2026-12-10', endDate: '2026-12-10' })).toMatch(/depois da data de início/);
  });
});

import { creativeProblems, creativeMessage } from './publishRules';

describe('criativo validado no servidor ao publicar (F138)', () => {
  const ok = { headline: 'ABM para o time do Nubank', description: 'Menos planilha, mais conta certa.', hasImage: true, landingPageUrl: 'https://maestro.abm/p/nubank' };

  it('aceita um anúncio completo', () => {
    expect(creativeProblems(ok)).toEqual([]);
  });

  it('recusa título vazio, imagem ausente e texto vazio', () => {
    const p = creativeProblems({ headline: ' ', description: '', hasImage: false });
    expect(p).toContain('o título está vazio');
    expect(p).toContain('o anúncio está sem imagem');
    expect(p).toContain('o texto do anúncio está vazio');
  });

  it('recusa o texto de erro da IA', () => {
    expect(creativeProblems({ ...ok, headline: 'Não encontrado - input manual' })).toContain('o título é uma mensagem da IA, não um texto de anúncio');
    expect(creativeProblems({ ...ok, description: 'Claro! Aqui está o texto:' }).join()).toMatch(/mensagem da IA/);
  });

  it('recusa macro e variável que a publicação não preenche', () => {
    expect(creativeProblems({ ...ok, headline: 'Olá %FIRSTNAME%' }).join()).toContain('%FIRSTNAME%');
    expect(creativeProblems({ ...ok, description: 'Para {{company.name}}' }).join()).toContain('{{company.name}}');
    expect(creativeProblems({ ...ok, landingPageUrl: 'https://x.com/{{account.slug}}' }).join()).toMatch(/URL de destino/);
  });

  it('confere o limite do LinkedIn depois da troca do nome da empresa', () => {
    expect(creativeProblems({ ...ok, headline: 'a'.repeat(201) }).join()).toMatch(/201 caracteres/);
    expect(creativeProblems({ ...ok, description: 'a'.repeat(601) }).join()).toMatch(/601 caracteres/);
  });

  it('a mensagem leva o nome da empresa', () => {
    expect(creativeMessage('Nubank', ['o título está vazio', 'o anúncio está sem imagem'])).toBe('Nubank: o título está vazio e o anúncio está sem imagem.');
  });
});
