import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom so component render-smoke tests (*.test.tsx) can mount screens and
    // catch render-time crashes; pure-logic *.test.ts suites run fine under it
    // too. Individual files may still override via a `@vitest-environment`
    // pragma.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
