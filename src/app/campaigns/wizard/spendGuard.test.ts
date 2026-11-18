import { describe, it, expect } from 'vitest';
import { monthlySpendEstimate, needsSpendConfirmation, isSpendConfirmed, HIGH_SPEND_MONTHLY_THRESHOLD } from './spendGuard';
import { createDefaultCampaignConfig } from './types';
import { canProceedFromStep, WIZARD_STEPS } from './wizardGates';
import { createEmptyTargeting } from './SegmentationStep';
import { createDefaultCreativeData } from './types';
import { buildReviewChecklist, canPublishChecklist } from './launchPlan';
import type { AdSetPlan } from './launchPlan';

const cfg = (patch = {}) => ({ ...createDefaultCampaignConfig(), campaignName: 'Q4', startDate: '2026-12-01', ...patch });

describe('gasto mensal estimado', () => {
  it('diário: por conjunto × empresas × 30', () => {
    expect(monthlySpendEstimate(cfg({ budgetAmount: '20' }), 3)).toBe(1800);
  });

  it('sem empresas ainda, conta um conjunto', () => {
    expect(monthlySpendEstimate(cfg({ budgetAmount: '20' }), 0)).toBe(600);
  });

  it('total: espalhado pelos dias; até um mês, o total inteiro', () => {
    expect(monthlySpendEstimate(cfg({ budgetType: 'total', budgetAmount: '3000', endDate: '2027-01-29' }), 1)).toBeCloseTo(1500);
    expect(monthlySpendEstimate(cfg({ budgetType: 'total', budgetAmount: '1200', endDate: '2026-12-10' }), 1)).toBe(1200);
    expect(monthlySpendEstimate(cfg({ budgetType: 'total', budgetAmount: '1200', endDate: '' }), 1)).toBe(1200);
  });
});

describe(`confirmação acima de ${HIGH_SPEND_MONTHLY_THRESHOLD} por mês`, () => {
  it('teto é "acima de": exatamente 1.000 não pede', () => {
    expect(needsSpendConfirmation(cfg({ budgetType: 'total', budgetAmount: '1000', endDate: '' }), 1)).toBe(false);
    expect(needsSpendConfirmation(cfg({ budgetAmount: '34' }), 1)).toBe(true);
  });

  it('confirmação vale para o valor confirmado; mais empresas pedem de novo', () => {
    const c = cfg({ budgetAmount: '50', spendConfirmedMonthly: 1500 });
    expect(isSpendConfirmed(c, 1)).toBe(true);
    expect(isSpendConfirmed(c, 2)).toBe(false);
  });

  it('o passo Configuração não avança sem a confirmação', () => {
    const base = { targetingData: createEmptyTargeting(), creativeData: createDefaultCreativeData() };
    expect(canProceedFromStep(WIZARD_STEPS.config, { ...base, campaignConfig: cfg({ budgetAmount: '50' }) })).toBe(false);
    expect(canProceedFromStep(WIZARD_STEPS.config, { ...base, campaignConfig: cfg({ budgetAmount: '50', spendConfirmedMonthly: 1500 }) })).toBe(true);
    expect(canProceedFromStep(WIZARD_STEPS.config, { ...base, campaignConfig: cfg({ budgetAmount: '20' }) })).toBe(true);
  });

  it('a Revisão trava sem confirmação, com o link para a Configuração', () => {
    const adSet = (id: string): AdSetPlan => ({ id, companyId: id, companyName: id, customTargeting: false, name: id, criteria: {}, creative: { headline: 'h', bodyText: 'b', imageUrl: 'x', landingPageUrl: 'https://a.com', cta: 'LEARN_MORE' } });
    const input = { plan: [adSet('a'), adSet('b')], creativeIssues: {}, audience: { pending: false, small: [] }, linkedInReady: true, hasBilling: true };
    // Confirmado com uma empresa (1.500), mas a campanha tem duas (3.000).
    const items = buildReviewChecklist({ ...input, config: cfg({ budgetAmount: '50', spendConfirmedMonthly: 1500 }) });
    expect(items.find((i) => i.id === 'spend')).toMatchObject({ status: 'blocked', label: 'Confirme o gasto estimado', fix: { step: 1 } });
    expect(canPublishChecklist(items)).toBe(false);
    const ok = buildReviewChecklist({ ...input, config: cfg({ budgetAmount: '50', spendConfirmedMonthly: 3000 }) });
    expect(ok.find((i) => i.id === 'spend')).toBeUndefined();
  });
});
