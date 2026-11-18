import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { getAudienceCount } from '@/lib/linkedin';
import { useAudienceCount, audienceCheckFor, smallAdSets, unconfirmedAudienceSentence } from './useAudienceCount';
import type { AudienceState } from './useAudienceCount';
import { createEmptyTargeting, AudienceSummary } from '../SegmentationStep';
import type { TargetingData } from './types';
import { canProceedFromStep, WIZARD_STEPS } from '../wizardGates';
import { buildReviewChecklist, canPublishChecklist } from '../launchPlan';
import { createDefaultCampaignConfig, createDefaultCreativeData } from '../types';

vi.mock('@/lib/linkedin', () => ({ getAudienceCount: vi.fn() }));

afterEach(cleanup);

const inter = { id: 'inter', label: 'Inter' };

function targeting(): TargetingData {
  const t = createEmptyTargeting();
  return {
    ...t,
    companies: { included: [inter], excluded: [] },
    defaultTargeting: { ...t.defaultTargeting, locations: { included: [{ id: 'br', label: 'Brasil' }], excluded: [] } },
  };
}

describe('público não confirmado nunca decide o mínimo de 300', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.mocked(getAudienceCount).mockReset(); });
  afterEach(() => vi.useRealTimers());

  it('consulta que falha deixa o conjunto não confirmado, e "Tentar de novo" confirma', async () => {
    vi.mocked(getAudienceCount).mockRejectedValueOnce(new Error('rede'));
    const data = targeting();
    const { result } = renderHook(() => useAudienceCount(data));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });

    const check = audienceCheckFor(result.current, ['inter']);
    expect(check).toEqual({ small: [], pending: false, unconfirmed: ['inter'] });
    // A estimativa local continua lá, mas não é tratada como número real.
    expect(result.current.perAdSet[0].isFromApi).toBe(false);

    vi.mocked(getAudienceCount).mockResolvedValueOnce({ count: 4200 });
    act(() => result.current.retry());
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(audienceCheckFor(result.current, ['inter'])).toEqual({ small: [], pending: false, unconfirmed: [] });
    expect(result.current.perAdSet[0].count).toBe(4200);
  });

  it('servidor sem número (count null) também é não confirmado', async () => {
    vi.mocked(getAudienceCount).mockResolvedValueOnce({ count: null, error: 'API error' });
    const data = targeting();
    const { result } = renderHook(() => useAudienceCount(data));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(audienceCheckFor(result.current, ['inter']).unconfirmed).toEqual(['inter']);
  });
});

describe('regras com público não confirmado', () => {
  const estimate = { id: 'inter', label: 'Inter', count: 120, isFromApi: false, isPrivacyFloor: false };

  it('estimativa abaixo de 300 não trava como "pequeno": é não confirmada', () => {
    expect(smallAdSets([estimate])).toEqual([]);
    expect(audienceCheckFor({ perAdSet: [estimate], isLoading: false }, ['inter']).unconfirmed).toEqual(['inter']);
  });

  it('enquanto calcula é pendente, não falha', () => {
    expect(audienceCheckFor({ perAdSet: [estimate], isLoading: true }, ['inter']).unconfirmed).toEqual([]);
  });

  it('o avanço da Segmentação exige número confirmado', () => {
    const base = { campaignConfig: createDefaultCampaignConfig(), targetingData: targeting(), creativeData: createDefaultCreativeData() };
    expect(canProceedFromStep(WIZARD_STEPS.segmentation, { ...base, audienceCheck: { pending: false, small: [], unconfirmed: ['inter'] } })).toBe(false);
    expect(canProceedFromStep(WIZARD_STEPS.segmentation, { ...base, audienceCheck: { pending: false, small: [], unconfirmed: [] } })).toBe(true);
  });

  it('a publicação trava dizendo qual empresa', () => {
    const items = buildReviewChecklist({
      config: { ...createDefaultCampaignConfig(), campaignName: 'Q4', budgetAmount: '50' },
      plan: [{ id: 'inter', companyId: 'inter', companyName: 'Inter', customTargeting: false, name: 'Q4 — Inter', criteria: {}, creative: { headline: 'h', bodyText: 'b', imageUrl: 'x', landingPageUrl: 'https://a.com', cta: 'LEARN_MORE' } }],
      creativeIssues: {},
      audience: { pending: false, small: [], unconfirmed: ['inter'] },
      linkedInReady: true,
      hasBilling: true,
    });
    expect(items.find((i) => i.id === 'audience-unconfirmed-inter')).toMatchObject({
      status: 'blocked', label: 'Não conseguimos confirmar o público de Inter', fix: { step: 2, companyId: 'inter' },
    });
    expect(items.find((i) => i.id === 'audience')).toBeUndefined();
    expect(canPublishChecklist(items)).toBe(false);
  });

  it('frase nomeia as empresas', () => {
    expect(unconfirmedAudienceSentence(['Inter', 'Nubank'])).toBe('Não conseguimos confirmar o público de Inter e Nubank');
  });
});

describe('Segmentação mostra a falha com "Tentar de novo"', () => {
  it('não mostra a estimativa como número e chama retry', () => {
    const retry = vi.fn();
    const audience: AudienceState = {
      count: 120, isLoading: false, isFromApi: false, isPrivacyFloor: false, hasAnySelection: true, retry,
      perAdSet: [{ id: 'inter', label: 'Inter', count: 120, isFromApi: false, isPrivacyFloor: false }],
    };
    render(<AudienceSummary data={targeting()} audience={audience} />);
    expect(screen.getByRole('alert').textContent).toContain('Não conseguimos confirmar o público de Inter');
    expect(screen.getByText('não confirmado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
