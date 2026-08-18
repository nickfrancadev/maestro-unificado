import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';

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
  // `logoUrl` está aqui porque é o que a segmentação real entrega. Sem ele
  // `targetLogoUrl` cairia no logo.dev, que depende de VITE_LOGO_DEV_KEY e é
  // undefined em teste — e o logo da conta sumiria do preview.
  companies: {
    included: [{ id: 'c1', label: 'Nubank', domain: 'nubank.com.br', logoUrl: 'https://exemplo/nubank.png' }],
    excluded: [],
  },
  defaultTargeting: {
    locations: { included: [], excluded: [] }, seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] }, jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function Host({ initial }: { initial?: Partial<CreativeData> }) {
  const [data, setData] = useState<CreativeData>({ ...createDefaultCreativeData(), ...initial });
  return (
    <CreativeStep
      selectedAccounts={[]} targetingData={targeting as never}
      creativeData={data} onCreativeChange={setData} campaignId="camp-1"
    />
  );
}

const comBase = () => {
  const d = createDefaultCreativeData();
  d.templateLogo.baseImageUrl = 'https://exemplo/base.png';
  d.templateLogo.baseImageSource = 'upload';
  return d;
};

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('CreativeStep — formato reflete no preview', () => {
  it('banner mantém o preview em 1.91:1', () => {
    const { container } = renderStep(comBase());
    goTo(/Template global/);
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/628]');
  });

  // A regressão trancada aqui: o preview tinha aspect-[1200/628] hardcoded e
  // escolher Quadrado não mudava nada na tela.
  it('escolher Quadrado deixa o preview 1:1', () => {
    const { container } = renderStep(comBase());
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /Quadrado/ }));
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/1200]');
  });
});

describe('CreativeStep — editor no lugar da imagem', () => {
  it('com imagem-base, o preview mostra os textos do overlay como camadas', () => {
    renderStep(comBase());
    goTo(/Template global/);
    expect(screen.getByText('WORKSHOP ABM')).toBeInTheDocument();
  });

  it('sem imagem-base, mostra o placeholder', () => {
    renderStep();
    goTo(/Template global/);
    expect(screen.getByText(/Imagem aparecerá aqui/)).toBeInTheDocument();
  });

  // Sem PNG composto não há o que comparar, então o toggle não aparece.
  it('o toggle Composto só existe quando há imagem composta', () => {
    renderStep(comBase());
    goTo(/Template global/);
    expect(screen.queryByRole('button', { name: /Composto/ })).not.toBeInTheDocument();
  });
});
