import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';
import { saveClientVoice } from '@/lib/ai';
import type { CreativeData } from './types';

afterEach(cleanup);
beforeEach(() => { vi.mocked(saveClientVoice).mockClear(); });

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

/**
 * Harness com estado real. `renderStep` passa `onCreativeChange={vi.fn()}`, o
 * que faz `creativeData` nunca voltar da "casca" — e qualquer bug que dependa
 * do prop controlado dar a volta (o pai re-alimentando o filho) fica invisível.
 * Aqui o `useState` faz o papel do `CampaignWizard` (`onCreativeChange={setCreativeData}`).
 */
function StatefulHost() {
  const [data, setData] = useState<CreativeData>({ overrides: {} } as never);
  return (
    <CreativeStep
      selectedAccounts={[]}
      targetingData={targeting as never}
      creativeData={data}
      onCreativeChange={setData}
      campaignId="camp-1"
    />
  );
}

function renderStatefulStep() {
  return render(<MemoryRouter><StatefulHost /></MemoryRouter>);
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

describe('CreativeStep — Brief inline com estado controlado de verdade', () => {
  // Regressão: escrever num campo de campanha reescrevia o draft inteiro a
  // partir do brandKit salvo, apagando o que ainda não tinha sido salvo.
  it('preserva edições da marca quando um campo desta campanha muda', () => {
    renderStatefulStep();
    const voz = screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement;
    fireEvent.change(voz, { target: { value: 'Direto e confiante' } });
    expect(voz.value).toBe('Direto e confiante');

    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), { target: { value: 'Produto A' } });

    expect((screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement).value).toBe('Direto e confiante');
    expect((screen.getByLabelText(/produto\/serviço/i) as HTMLSelectElement).value).toBe('Produto A');
  });

  it('só grava a marca no servidor quando "Salvar marca" é clicado', async () => {
    renderStatefulStep();
    fireEvent.change(screen.getByLabelText(/tom de voz/i), { target: { value: 'Direto' } });
    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), { target: { value: 'Produto A' } });
    expect(vi.mocked(saveClientVoice)).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
    });
    expect(vi.mocked(saveClientVoice)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveClientVoice).mock.calls[0][0]).toMatchObject({
      voice: 'Direto',
      product_service: 'Produto A',
    });
  });
});
