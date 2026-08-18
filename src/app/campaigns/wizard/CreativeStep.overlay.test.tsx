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
    // `/Quadrado.*1:1/`, não só `/Quadrado/`: a Task 7 acrescentou o wrap
    // "Quadrado" do logo da conta (habilitado por padrão), que também é um
    // <button> com esse texto — sem o pedaço da proporção o seletor bate em
    // dois elementos e `getByRole` estoura.
    fireEvent.click(screen.getByRole('button', { name: /Quadrado.*1:1/ }));
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

describe('CreativeStep — ordem do card Imagem', () => {
  // O pedido: upload antes dos textos. E formato antes do upload, porque é ele
  // que define as dimensões que a dropzone pede.
  it('formato vem antes da origem, que vem antes dos textos', () => {
    const { container } = renderStep();
    goTo(/Template global/);
    // Busca pelo conteúdo e não por índice: a posição do <section> muda toda
    // vez que alguém acrescenta um card, e o teste passaria a medir outra coisa.
    const card = Array.from(container.querySelectorAll('section'))
      .find((sec) => (sec.textContent || '').includes('Origem da imagem-base'))!;
    // Normaliza para maiúsculas: os rótulos são Title Case na fonte (só viram
    // caixa alta visualmente via CSS `uppercase`), e `.textContent` não é
    // afetado por CSS — comparar em maiúsculas é o que torna a checagem
    // insensível a essa diferença puramente visual.
    const texto = (card.textContent || '').toUpperCase();
    expect(texto.indexOf('FORMATO')).toBeLessThan(texto.indexOf('ORIGEM DA IMAGEM-BASE'));
    expect(texto.indexOf('ORIGEM DA IMAGEM-BASE')).toBeLessThan(texto.indexOf('TEXTO DESTAQUE'));
  });

  it('a dropzone anuncia a dimensão do formato escolhido', () => {
    renderStep();
    goTo(/Template global/);
    // `getAllByText`: o rótulo aparece DUAS vezes — no FormatButton e na
    // dropzone —, e `getByText` estouraria com "found multiple elements".
    expect(screen.getAllByText(/1200 × 628 px/).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: /Quadrado.*1:1/ }));
    expect(screen.getAllByText(/1200 × 1200 px/).length).toBeGreaterThan(1);
    // O FormatButton do Banner continua na tela mostrando a SUA própria
    // dimensão (ele é o seletor do outro formato, não um resumo do escolhido)
    // — por isso a checagem final é escopada ao hint da dropzone, não à
    // página inteira.
    const dropzoneHint = screen.getByText(/JPG ou PNG/);
    expect(dropzoneHint.textContent).toContain('1200 × 1200 px');
    expect(dropzoneHint.textContent).not.toContain('1200 × 628 px');
  });
});

describe('CreativeStep — controles de camada', () => {
  it('mudar o tamanho do destaque grava no layout', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
    expect(slider.value).toBe('56');
    fireEvent.change(slider, { target: { value: '90' } });
    // Só volta 90 se tiver dado a volta inteira: setLayout → updateCreative →
    // prop → imageCfg.layout. É esse circuito que o teste tranca.
    expect(slider.value).toBe('90');
  });

  // jsdom não implementa canvas.measureText, então `measureTextWidthPx` devolve 0
  // e o teto cai no máximo duro. O que este teste garante é o contrato do
  // atributo; a aritmética do teto está coberta em `overlayLayout.test.ts`.
  it('o slider do destaque expõe piso e teto', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
    expect(Number(slider.min)).toBe(16);
    expect(Number(slider.max)).toBeGreaterThan(0);
  });

  it('trocar o fundo para Nenhum tira a caixa do preview', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    fireEvent.click(screen.getAllByRole('button', { name: /^Nenhum$/ })[0]);
    // jsdom resolve o keyword CSS `transparent` para `rgba(0, 0, 0, 0)` no
    // computed style (é assim que o próprio jsdom normaliza a cor, igual a um
    // navegador) — `toHaveStyle` compara contra o computed style, então o
    // valor esperado precisa ser o já resolvido, não o keyword literal.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' });
  });
});

describe('CreativeStep — logos', () => {
  it('"Meu logo" fica desabilitado sem logo no Brand Kit', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    expect(screen.getByLabelText(/Meu logo/)).toBeDisabled();
  });

  it('"Logo da conta" começa marcado e desmarcar tira o logo do preview', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    // String exata, não regex: o logo da conta vem habilitado por padrão, e
    // com ele habilitado o Wrap picker expõe botões com aria-label "Quadrado
    // para Logo da conta" etc. — um /Logo da conta/ solto bateria neles
    // também e `getByLabelText` estouraria com múltiplos elementos.
    const check = screen.getByLabelText('Logo da conta');
    expect(check).toBeChecked();
    fireEvent.click(check);
    expect(screen.queryByAltText('Logo da conta')).not.toBeInTheDocument();
  });

  it('"Agrupar como par" liga os dois logos de uma vez', () => {
    const d = withBaseImage();
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA' };
    renderStep(d);
    goTo(/Template global/);
    fireEvent.click(screen.getByRole('button', { name: /Agrupar como par/ }));
    expect(screen.getByAltText('Meu logo')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
  });
});
