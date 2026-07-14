/**
 * `useCountUp` deve animar DO valor atual PARA o novo — nunca de zero.
 *
 * O bug que estes testes guardam: o hook fazia `Math.round(eased * end)` com
 * `eased` partindo de 0, ou seja, animava sempre a partir de ZERO. Trocar o
 * filtro de período (30d → 7d) fazia cada KPI dos dois dashboards despencar
 * para "0" e subir de volta ao longo de 1200ms. Num dashboard de churn,
 * "0 plays criadas" piscando na tela é o falso sinal mais alarmante possível.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './useCountUp';

afterEach(cleanup);

function Probe({ value }: { value: number }) {
  return <span data-testid="n">{useCountUp(value, 1200)}</span>;
}

const shown = () => Number(screen.getByTestId('n').textContent);

/** rAF controlado por tempo falso — sem isso o teste vira flake de timing. */
let now = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  now = 0;
  frames = [];
  // O setup global devolve `matches: true` para prefers-reduced-motion, o que
  // faz o hook pular a animação. Aqui a animação É o objeto do teste.
  vi.stubGlobal(
    'matchMedia',
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia,
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Avança `ms` e drena os frames pendentes, registrando cada valor exibido. */
function advance(ms: number, steps = 12): number[] {
  const seen: number[] = [];
  for (let i = 0; i < steps; i++) {
    now += ms / steps;
    const pending = frames;
    frames = [];
    act(() => {
      for (const cb of pending) cb(now);
    });
    seen.push(shown());
  }
  return seen;
}

describe('useCountUp', () => {
  it('na montagem anima de 0 até o alvo (comportamento do InternoTab, inalterado)', () => {
    render(<Probe value={100} />);
    expect(shown()).toBe(0);

    const seen = advance(1200);
    // monotonicamente crescente, começando do zero e terminando no alvo
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
    expect(seen.at(-1)).toBe(100);
  });

  it('ao trocar o valor, interpola DO valor anterior — nunca volta a zero', () => {
    const { rerender } = render(<Probe value={100} />);
    advance(1200);
    expect(shown()).toBe(100);

    // troca de período: 100 → 90
    act(() => {
      rerender(<Probe value={90} />);
    });

    // logo após o re-render, ANTES de qualquer frame: ainda 100, não 0.
    // (o bug antigo exibia 0 exatamente aqui)
    expect(shown()).toBe(100);

    const seen = advance(1200);
    // desce de 100 até 90, sem NUNCA passar abaixo do alvo nem voltar a zero
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(90);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(seen.at(-1)).toBe(90);
  });

  it('interpola para cima a partir do valor anterior (90 → 200 não recomeça do 0)', () => {
    const { rerender } = render(<Probe value={90} />);
    advance(1200);
    expect(shown()).toBe(90);

    act(() => {
      rerender(<Probe value={200} />);
    });

    const seen = advance(1200);
    for (const v of seen) expect(v).toBeGreaterThanOrEqual(90);
    expect(seen.at(-1)).toBe(200);
  });

  it('prefers-reduced-motion pula direto para o valor final', () => {
    vi.stubGlobal(
      'matchMedia',
      ((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia,
    );
    const { rerender } = render(<Probe value={100} />);
    expect(shown()).toBe(100);
    act(() => {
      rerender(<Probe value={90} />);
    });
    expect(shown()).toBe(90);
  });
});
