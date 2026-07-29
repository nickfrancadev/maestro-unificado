import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `supabase/functions` entra aqui porque a lógica pura do ciclo de vida do
    // token do LinkedIn mora lá, ao lado do edge function que a consome. O
    // módulo testado não importa nada de Deno/npm justamente para rodar no
    // Node sob o Vitest.
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'supabase/functions/**/*.test.ts',
    ],

    // Testes de componente (`.test.tsx`) rodam em jsdom para montar telas e
    // pegar crash de render.
    //
    // Os testes puros (`.test.ts`) ficam em `node` DE PROPÓSITO: o guard de
    // pureza em `src/app/pages/usage/lib/format.test.ts` lê o próprio fonte via
    // `import.meta.url` para garantir que `lib/` nunca importe de `data/mock` —
    // e sob jsdom `import.meta.url` deixa de ser um `file://`, quebrando o
    // teste. Nenhum `.test.ts` do projeto toca o DOM, então `node` serve a
    // todos (incluindo os de `landingPages/`).
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],

    // Shims de matchMedia/ResizeObserver que o jsdom não implementa.
    // Antes estavam duplicados dentro de cada arquivo de teste.
    setupFiles: ['./vitest.setup.ts'],
  },
});
