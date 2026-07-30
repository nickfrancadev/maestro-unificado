import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn().mockResolvedValue({
    voice: '', brand_context: '', website_url: '',
    product_service: '', audience_market: '', persona: '',
  }),
  saveClientVoice: vi.fn().mockResolvedValue(undefined),
}));

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

function renderStep() {
  return render(
    <MemoryRouter>
      <CreativeStep
        selectedAccounts={[]}
        targetingData={targeting as never}
        creativeData={{ overrides: {} } as never}
        onCreativeChange={vi.fn()}
        campaignId="camp-1"
      />
    </MemoryRouter>,
  );
}

describe('CreativeStep — Brief inline', () => {
  it('abre com o Brief selecionado, não com o Template global', () => {
    renderStep();
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
  });

  it('permite trocar para o Template global', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /template global/i }));
    expect(screen.queryByLabelText(/tom de voz/i)).toBeNull();
  });

  it('permite voltar para o Brief', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /template global/i }));
    fireEvent.click(screen.getByRole('button', { name: /^brief/i }));
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
  });

  it('permite trocar para uma empresa', () => {
    renderStep();
    // "Nubank" só aparece na linha da empresa — evita a ambiguidade de nome
    // acessível que o botão "Template global" tem com o badge de status.
    fireEvent.click(screen.getByRole('button', { name: /nubank/i }));
    expect(screen.queryByLabelText(/tom de voz/i)).toBeNull();
    expect(screen.getByRole('heading', { name: /editando: nubank/i })).toBeTruthy();
  });
});
