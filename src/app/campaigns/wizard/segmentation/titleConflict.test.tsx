import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { facetBlockedReason, hasTitleConflict, TITLE_CONFLICT_REASON, createEmptyPersonTargeting, createEmptyTargeting } from './targeting';
import { canProceedFromStep, WIZARD_STEPS } from '../wizardGates';
import { buildLaunchPlan, buildReviewChecklist, canPublishChecklist } from '../launchPlan';
import { createDefaultCampaignConfig, createDefaultCreativeData } from '../types';
import type { TargetingData } from './types';

vi.mock('./useLinkedInTypeahead', () => ({
  useLinkedInTypeahead: () => ({ query: '', setQuery: () => {}, results: [], isOpen: false, setIsOpen: () => {}, isLoading: false, status: 'idle' }),
}));

import { FacetCard } from '../SegmentationStep';

afterEach(cleanup);

const diretor = { id: '6', label: 'Diretor' };
const cmo = { id: 't1', label: 'CMO' };
const brasil = { id: 'br', label: 'Brasil' };

describe('Cargo não combina com Função/Senioridade (F045)', () => {
  it('com Senioridade ou Função, Cargo fica desabilitado; e vice-versa', () => {
    const withSeniority = { ...createEmptyPersonTargeting(), seniorities: { included: [diretor], excluded: [] } };
    expect(facetBlockedReason(withSeniority, 'jobTitles')).toBe(TITLE_CONFLICT_REASON);
    expect(facetBlockedReason(withSeniority, 'jobFunctions')).toBeNull();

    const withTitle = { ...createEmptyPersonTargeting(), jobTitles: { included: [cmo], excluded: [] } };
    expect(facetBlockedReason(withTitle, 'seniorities')).toBe(TITLE_CONFLICT_REASON);
    expect(facetBlockedReason(withTitle, 'jobFunctions')).toBe(TITLE_CONFLICT_REASON);
    expect(facetBlockedReason(withTitle, 'locations')).toBeNull();
  });

  it('segmentação que já combina (rascunho antigo) trava o avanço e a publicação, na empresa personalizada', () => {
    const t = createEmptyTargeting();
    const conflicting = { ...t.defaultTargeting, locations: { included: [brasil], excluded: [] }, jobTitles: { included: [cmo], excluded: [] }, seniorities: { included: [diretor], excluded: [] } };
    const targeting: TargetingData = {
      ...t,
      companies: { included: [{ id: 'c1', label: 'Nubank' }, { id: 'c2', label: 'Inter' }], excluded: [] },
      defaultTargeting: { ...t.defaultTargeting, locations: { included: [brasil], excluded: [] } },
      overrides: { c2: conflicting },
    };
    expect(hasTitleConflict(conflicting)).toBe(true);
    const state = { campaignConfig: createDefaultCampaignConfig(), targetingData: targeting, creativeData: createDefaultCreativeData() };
    expect(canProceedFromStep(WIZARD_STEPS.segmentation, state)).toBe(false);

    const plan = buildLaunchPlan({ ...createDefaultCampaignConfig(), campaignName: 'Q4', budgetAmount: '10' }, targeting, createDefaultCreativeData());
    const items = buildReviewChecklist({
      config: { ...createDefaultCampaignConfig(), campaignName: 'Q4', budgetAmount: '10' },
      plan, creativeIssues: {}, audience: { pending: false, small: [] }, linkedInReady: true, hasBilling: true,
    });
    expect(items.find((i) => i.id === 'targeting-c2')).toMatchObject({
      status: 'blocked', label: `Inter: ${TITLE_CONFLICT_REASON}`, fix: { step: 2, companyId: 'c2' },
    });
    expect(items.find((i) => i.id === 'targeting-c1')).toBeUndefined();
    expect(canPublishChecklist(items)).toBe(false);
  });

  it('o cartão mostra o motivo, não aceita item novo e deixa tirar o que já está', () => {
    const onChange = vi.fn();
    render(
      <FacetCard
        id="seniorities" icon={null} label="Senioridade" description="Nível" type="fixed"
        options={[diretor, { id: '7', label: 'VP' }]}
        selection={{ included: [diretor], excluded: [] }}
        onSelectionChange={onChange}
        defaultOpen
        blockedReason={TITLE_CONFLICT_REASON}
      />,
    );
    expect(screen.getByText(TITLE_CONFLICT_REASON)).toBeTruthy();
    const vp = screen.getByRole('button', { name: 'VP' }) as HTMLButtonElement;
    expect(vp.disabled).toBe(true);
    fireEvent.click(vp);
    expect(onChange).not.toHaveBeenCalled();
    // Diretor já estava: continua clicável para sair.
    const opts = screen.getAllByRole('button', { name: 'Diretor' });
    fireEvent.click(opts[0]);
    expect(onChange).toHaveBeenCalledWith({ included: [], excluded: [] });
  });

  it('Cargo desabilitado tem a busca desligada', () => {
    render(
      <FacetCard
        id="jobTitles" icon={null} label="Cargo" description="Título" type="typeahead"
        selection={{ included: [], excluded: [] }} onSelectionChange={vi.fn()} defaultOpen
        blockedReason={TITLE_CONFLICT_REASON}
      />,
    );
    expect((screen.getByLabelText('Buscar cargo') as HTMLInputElement).disabled).toBe(true);
  });
});
