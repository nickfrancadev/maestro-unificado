/**
 * Setup global do vitest (ver `test.setupFiles` em `vite.config.ts`).
 *
 * jsdom não implementa `matchMedia` nem `ResizeObserver`, e vários componentes
 * dependem deles (`useCountUp` e `motion` do primeiro; `ResponsiveContainer` do
 * Recharts e o `Popover.Arrow` do Radix do segundo). Antes cada arquivo de
 * teste stubava o seu — três cópias divergentes do mesmo shim.
 *
 * `matchMedia` devolve `matches: true` para `prefers-reduced-motion`: as
 * animações pulam direto ao valor final e os testes podem assertar o número
 * renderizado sem esperar rAF.
 */

// Roda também nos testes puros (`environment: 'node'`), onde não há `window`.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
