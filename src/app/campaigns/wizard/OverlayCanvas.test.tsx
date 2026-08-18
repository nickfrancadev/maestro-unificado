import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { OverlayCanvas } from './OverlayCanvas';
import { createDefaultOverlayLayout, type OverlayLayout } from './overlayLayout';

afterEach(cleanup);

// jsdom devolve zero em todo getBoundingClientRect; sem um retângulo real o
// arrasto não teria escala para converter px em fração.
function stubRect(el: Element, w: number, h: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h,
    toJSON: () => ({}),
  } as DOMRect);
}

const baseProps = {
  format: 'banner' as const,
  baseImageUrl: 'https://exemplo/base.png',
  fontFamily: 'Inter',
  destaque: 'WORKSHOP ABM',
  complementar: 'Convite VIP',
  advertiserLogoUrl: 'https://exemplo/meu.png',
  targetLogoUrl: 'https://exemplo/conta.png',
  selected: null,
  onSelect: () => {},
  onLayoutChange: () => {},
};

const renderCanvas = (over: Partial<React.ComponentProps<typeof OverlayCanvas>> = {}) => {
  const layout: OverlayLayout = { ...createDefaultOverlayLayout(true) };
  return render(<OverlayCanvas {...baseProps} layout={layout} {...over} />);
};

describe('OverlayCanvas — render', () => {
  it('mostra os dois textos sobre a imagem-base', () => {
    renderCanvas();
    expect(screen.getByText('WORKSHOP ABM')).toBeInTheDocument();
    expect(screen.getByText('Convite VIP')).toBeInTheDocument();
  });

  it('desenha só os logos habilitados', () => {
    // O default liga o da conta e deixa o do anunciante desligado.
    renderCanvas();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
    expect(screen.queryByAltText('Meu logo')).not.toBeInTheDocument();
  });

  it('o aspecto acompanha o formato', () => {
    const { container, rerender } = renderCanvas();
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/628]');
    rerender(<OverlayCanvas {...baseProps} layout={createDefaultOverlayLayout(true)} format="square" />);
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/1200]');
  });

  it('sem imagem-base mostra o placeholder e nenhuma camada', () => {
    renderCanvas({ baseImageUrl: null });
    expect(screen.getByText(/Imagem aparecerá aqui/)).toBeInTheDocument();
    expect(screen.queryByText('WORKSHOP ABM')).not.toBeInTheDocument();
  });
});

describe('OverlayCanvas — escala', () => {
  // `ResizeObserver` do vitest.setup.ts é um shim inerte (observe/disconnect
  // sem corpo) — ele nunca chama o callback de resize, então este teste não
  // consegue exercitar esse caminho. O que ele prova é o outro: a medição
  // síncrona feita em `useLayoutEffect` assim que o container existe no DOM,
  // logo após o commit do primeiro render e antes do primeiro paint. Sem
  // aquele efeito, `scale` ficaria travada no fallback (contêiner tratado
  // como se tivesse exatos 1200px) até algum re-render incidental acontecer.
  it('mede o container real e escala o texto por largura/1200, não pelo fallback', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        // Só o canvas propriamente dito tem um retângulo "real" no teste;
        // qualquer outro elemento cai em zero, como o resto do jsdom.
        const w = this.dataset.testid === 'overlay-canvas' ? 600 : 0;
        return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: w, width: w, height: w, toJSON: () => ({}) } as DOMRect;
      },
    );
    try {
      renderCanvas();
      // 600px de tela para os 1200px do canvas de referência = escala 0.5;
      // o destaque nasce com sizePx 56 (default), logo 56 * 0.5 = 28px.
      // Se a escala tivesse ficado presa no fallback (1), o valor seria 56px.
      expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ fontSize: '28px' });
    } finally {
      spy.mockRestore();
    }
  });
});

describe('OverlayCanvas — seleção', () => {
  it('clicar numa camada a seleciona, e só a seleciona (não borbulha pro fundo)', () => {
    const onSelect = vi.fn();
    renderCanvas({ onSelect });
    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 10, clientY: 10, pointerId: 1 });
    // A camada chama `e.stopPropagation()` antes de selecionar: sem isso o
    // pointerDown borbulharia até o fundo do canvas e este dispararia
    // `onSelect(null)` logo em seguida, cancelando a seleção que acabou de
    // acontecer. `toHaveBeenCalledWith` sozinho não pega essa regressão
    // porque não importa quantas vezes a função foi chamada.
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('destaque');
  });

  it('clicar no fundo limpa a seleção', () => {
    const onSelect = vi.fn();
    const { container } = renderCanvas({ onSelect, selected: 'destaque' });
    fireEvent.pointerDown(container.querySelector('[data-testid="overlay-canvas"]')!, { pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('OverlayCanvas — arrasto', () => {
  it('arrastar move a camada na proporção do canvas', () => {
    const onLayoutChange = vi.fn();
    const { container } = renderCanvas({ onLayoutChange });
    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314); // metade do canvas de referência

    const target = screen.getByText('WORKSHOP ABM');
    fireEvent.pointerDown(target, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 100, pointerId: 1 });

    // 60px de 600 = 0.1 do canvas, somado ao x default de 0.30.
    const next = onLayoutChange.mock.calls.at(-1)![0] as OverlayLayout;
    expect(next.destaque.x).toBeCloseTo(0.40, 5);
    expect(next.destaque.y).toBeCloseTo(0.14, 5);
  });

  it('não deixa a camada sair pela borda', () => {
    const onLayoutChange = vi.fn();
    const { container } = renderCanvas({ onLayoutChange });
    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314);

    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: -5000, clientY: -5000, pointerId: 1 });

    const next = onLayoutChange.mock.calls.at(-1)![0] as OverlayLayout;
    expect(next.destaque.x).toBeGreaterThanOrEqual(0);
    expect(next.destaque.y).toBeGreaterThanOrEqual(0);
  });

  it('depois do pointerUp o movimento não mexe mais em nada', () => {
    const onLayoutChange = vi.fn();
    const { container } = renderCanvas({ onLayoutChange });
    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314);

    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    onLayoutChange.mockClear();
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 100, pointerId: 1 });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});

describe('OverlayCanvas — modo par', () => {
  // No par o logo da conta é derivado: uma alça só, dois logos na tela.
  it('mostra os dois logos com uma alça só', () => {
    const layout = { ...createDefaultOverlayLayout(true), paired: true };
    render(<OverlayCanvas {...baseProps} layout={layout} />);
    expect(screen.getByAltText('Meu logo')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta').closest('[data-draggable="true"]')).toBeNull();
  });
});
