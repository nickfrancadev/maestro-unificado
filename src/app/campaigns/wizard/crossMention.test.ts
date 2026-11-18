import { describe, it, expect } from 'vitest';
import { mentionsName, crossCompanyMentions } from './crossMention';
import { buildLaunchPlan, validateLaunchPlan, buildReviewChecklist, canPublishChecklist } from './launchPlan';
import { createDefaultCampaignConfig, createDefaultCreativeData } from './types';
import { canProceedFromStep, WIZARD_STEPS } from './wizardGates';
import { createEmptyTargeting } from './SegmentationStep';
import type { TargetingData } from './SegmentationStep';

const nubank = { id: 'c1', label: 'Nubank' };
const itau = { id: 'c2', label: 'Itaú' };

describe('mentionsName', () => {
  it('palavra inteira, sem acento e sem caixa', () => {
    expect(mentionsName('Times do itau já usam', 'Itaú')).toBe(true);
    expect(mentionsName('Interessante para você', 'Inter')).toBe(false);
    expect(mentionsName('Clientes do Inter.', 'Inter')).toBe(true);
  });

  it('o nome da própria empresa não conta como citar outra contida nele', () => {
    const r = crossCompanyMentions([
      { companyId: 'a', companyName: 'Itaú BBA', texts: ['Para o Itaú BBA'] },
      { companyId: 'b', companyName: 'Itaú', texts: ['Para o Itaú'] },
    ]);
    expect(r).toEqual({});
  });
});

function setup(patch: (d: ReturnType<typeof createDefaultCreativeData>) => void) {
  const t = createEmptyTargeting();
  const targeting = {
    ...t,
    companies: { included: [nubank, itau], excluded: [] },
    defaultTargeting: { ...t.defaultTargeting, locations: { included: [{ id: 'br', label: 'Brasil' }], excluded: [] } },
  } as TargetingData;
  const base = createDefaultCreativeData();
  const data = {
    ...base,
    headline: 'ABM para {{company.name}}',
    bodyText: 'Texto',
    landingPageUrl: 'https://maestroabm.com/p/{{account.slug}}',
    imageUrl: 'https://cdn/x.png',
  };
  patch(data);
  return { targeting, data };
}

describe('F076 — criativo que cita outra empresa da campanha', () => {
  const config = { ...createDefaultCampaignConfig(), campaignName: 'Q4', budgetAmount: '10' };

  it('o título com {{company.name}} não cita ninguém', () => {
    const { targeting, data } = setup(() => {});
    const issues = validateLaunchPlan(buildLaunchPlan(config, targeting, data));
    expect(Object.values(issues).flat().some((t) => t.includes('cita'))).toBe(false);
  });

  it('texto do Nubank que fala do Itaú trava, dizendo qual cita qual', () => {
    const { targeting, data } = setup((d) => {
      d.overrides = { c1: { status: 'fully_personalized', bodyText: 'Depois do Itaú, agora é a vez do Nubank.' } };
    });
    const plan = buildLaunchPlan(config, targeting, data);
    const issues = validateLaunchPlan(plan);
    expect(issues.c1).toContain('O anúncio cita Itaú, outra empresa desta campanha. Cada anúncio só pode falar da própria empresa');
    const items = buildReviewChecklist({ config, plan, creativeIssues: issues, audience: { pending: false, small: [] }, linkedInReady: true, hasBilling: true });
    expect(items.find((i) => i.id === 'creative-c1')?.label).toMatch(/^Nubank: O anúncio cita Itaú/);
    expect(canPublishChecklist(items)).toBe(false);
    // E o passo Criativos não avança.
    expect(canProceedFromStep(WIZARD_STEPS.creatives, { campaignConfig: config, targetingData: targeting, creativeData: data })).toBe(false);
  });

  it('texto sobre a imagem também conta', () => {
    const { targeting, data } = setup((d) => {
      d.overrides = { c2: { status: 'fully_personalized', textoDestaque: 'Convite Nubank' } };
    });
    const issues = validateLaunchPlan(buildLaunchPlan(config, targeting, data));
    expect(issues.c2?.[0]).toMatch(/^O anúncio cita Nubank/);
  });
});
