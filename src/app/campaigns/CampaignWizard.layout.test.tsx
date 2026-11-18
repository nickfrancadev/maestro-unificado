import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { saveDraft } from './drafts';
import { createDefaultCampaignConfig, createDefaultCreativeData } from './wizard/types';
import { createEmptyTargeting } from './wizard/SegmentationStep';
import { createEmptyBriefDraft } from './wizard/BriefStep';
import { stepFrame } from './wizard/stepLayout';

vi.mock('@/lib/linkedin', async (orig) => ({
  ...(await orig<typeof import('@/lib/linkedin')>()),
  getLinkedInStatus: vi.fn(async () => null),
  getAudienceCount: vi.fn(async () => ({ count: 5000 })),
}));
vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn(async () => ({ voice: '', brand_context: '', website_url: '', product_service: '', audience_market: '', persona: '' })),
}));
vi.mock('./wizard/segmentation/useLinkedInTypeahead', () => ({
  useLinkedInTypeahead: () => ({ query: '', setQuery: () => {}, results: [], isOpen: false, setIsOpen: () => {}, isLoading: false, status: 'idle' }),
}));

import { CampaignWizard } from './CampaignWizard';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function openAtStep(step: number) {
  saveDraft(`draft-layout-${step}`, {
    campaignConfig: { ...createDefaultCampaignConfig(), campaignName: 'Q4' },
    targetingData: createEmptyTargeting(),
    creativeData: createDefaultCreativeData(),
    briefDraft: createEmptyBriefDraft(),
    selectedAccounts: [],
    step,
  });
  return render(
    <MemoryRouter initialEntries={[`/campaigns/draft-layout-${step}/edit`]}>
      <Routes><Route path="/campaigns/:id/edit" element={<CampaignWizard />} /></Routes>
    </MemoryRouter>,
  );
}

describe('molduras do assistente', () => {
  it.each([1, 2, 3, 5])('no passo %i, topo e rodapé ficam fixos em 1280 px e o conteúdo usa a largura do passo', (step) => {
    const { container } = openAtStep(step);
    const frames = ['header', 'content', 'footer'].map((f) => container.querySelector(`[data-frame="${f}"]`) as HTMLElement);
    const { frameClass, chromeClass } = stepFrame(step);
    expect(chromeClass).toBe('w-full mx-auto max-w-7xl');
    expect(frames[0].className).toContain(chromeClass);
    expect(frames[2].className).toContain(chromeClass);
    expect(frames[1].className).toContain(frameClass);
    // Nenhum passo define largura própria por dentro da moldura.
    const inner = frames[1].querySelectorAll('[class*="max-w-3xl"],[class*="max-w-6xl"],[class*="max-w-7xl"]');
    expect(inner.length).toBe(0);
    expect(screen.getByRole('navigation', { name: 'Passos da campanha' })).toBeTruthy();
  });
});
