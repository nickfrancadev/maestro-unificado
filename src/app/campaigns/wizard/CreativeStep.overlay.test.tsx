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

const withBaseImage = () => {
  const d = createDefaultCreativeData();
  d.templateLogo.baseImageUrl = 'https://exemplo/base.png';
  d.templateLogo.baseImageSource = 'upload';
  return d;
};

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

// jsdom devolve zero em todo getBoundingClientRect; sem um retângulo real o
// arrasto não teria escala para converter px em fração (mesmo padrão de
// OverlayCanvas.test.tsx).
function stubRect(el: Element, w: number, h: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('CreativeStep — formato reflete no preview', () => {
  it('banner mantém o preview em 1.91:1', () => {
    const { container } = renderStep(withBaseImage());
    goTo(/Template global/);
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/628]');
  });

  // A regressão trancada aqui: o preview tinha aspect-[1200/628] hardcoded e
  // escolher Quadrado não mudava nada na tela.
  it('escolher Quadrado deixa o preview 1:1', () => {
    const { container } = renderStep(withBaseImage());
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /Quadrado/ }));
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/1200]');
  });
});

describe('CreativeStep — editor no lugar da imagem', () => {
  it('com imagem-base, o preview mostra os textos do overlay como camadas', () => {
    renderStep(withBaseImage());
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
    renderStep(withBaseImage());
    goTo(/Template global/);
    expect(screen.queryByRole('button', { name: /Composto/ })).not.toBeInTheDocument();
  });
});

describe('CreativeStep — "Voltar ao template" também restaura o layout', () => {
  // Regressão: `setLayout` grava `layout` no override da empresa (primeiro
  // caminho de código que escreve esse campo), mas `resetImageOverrides` não
  // sabia limpá-lo. Como `layout` está em IMAGE_OVERRIDE_FIELDS, o botão
  // "Voltar ao template" nunca sumia e o layout arrastado ficava preso na
  // empresa para sempre, sem caminho de volta.
  it('arrastar uma camada na empresa e depois resetar restaura a posição do template e some com o botão', () => {
    const { container } = renderStep(withBaseImage());
    goTo(/Nubank/);

    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314); // metade do canvas de referência (banner: 1200×628)

    // Posição default do destaque é x=0.30 → left: 30%.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ left: '30%' });
    expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    // 60px de 600 = 0.1 do canvas, somado ao x default de 0.30 → left: 40%.
    // O arrasto virou override, e o botão de reset aparece.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ left: '40%' });
    const resetButton = screen.getByRole('button', { name: /Voltar ao template/ });

    fireEvent.click(resetButton);

    // O layout volta ao do template e o botão some — sem os dois, a empresa
    // fica com um layout descolado do template e sem caminho de volta.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ left: '30%' });
    expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();
  });
});
