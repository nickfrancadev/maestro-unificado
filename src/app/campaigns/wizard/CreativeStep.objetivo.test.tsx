import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';
import { generateCopy } from '@/lib/ai';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchBrandBrief: vi.fn().mockResolvedValue({
    industry: '', value_proposition: '', visual_style_keywords: [], primary_colors: [],
    key_messaging_themes: [], target_persona_hint: '', generated_at: '2026-10-01T00:00:00Z',
  }),
  generateCopy: vi.fn().mockResolvedValue({ headline: 'Headline da IA', bodyText: 'Corpo da IA' }),
}));

vi.mock('@/app/landingPages/store/repo', () => ({ listPages: () => [], savePage: vi.fn() }));

const targeting = {
  companies: { included: [{ id: 'c1', label: 'Nubank' }], excluded: [] },
  defaultTargeting: {
    locations: { included: [], excluded: [] },
    seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] },
    jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function Host({ objective }: { objective?: string }) {
  const [data, setData] = useState<CreativeData>(() => {
    const base = createDefaultCreativeData();
    return { ...base, brandKit: { ...base.brandKit, voice: 'Direto e técnico' } };
  });
  return (
    <CreativeStep
      selectedAccounts={[]}
      targetingData={targeting as never}
      creativeData={data}
      onCreativeChange={setData}
      objective={objective}
    />
  );
}

describe('CreativeStep — o texto da IA segue o objetivo da campanha', () => {
  beforeEach(() => vi.mocked(generateCopy).mockClear());

  it('manda o objetivo escolhido na Configuração (antes: sempre brand_awareness)', async () => {
    render(<MemoryRouter><Host objective="website_visits" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Template global/ }));
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto$/ }));
    await vi.waitFor(() => expect(generateCopy).toHaveBeenCalled());
    expect(vi.mocked(generateCopy).mock.calls[0][0]).toMatchObject({ objective: 'website_visits' });
  });
});
