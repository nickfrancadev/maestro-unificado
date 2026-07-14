/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  test: {
    // Testes de componente (`.test.tsx`) rodam em jsdom — antes cada arquivo
    // trazia o próprio pragma `// @vitest-environment jsdom`.
    //
    // Os testes puros de `lib/` (`.test.ts`) ficam em `node` de propósito: um
    // deles lê o próprio fonte via `new URL('.', import.meta.url).pathname`, e
    // sob jsdom `import.meta.url` deixa de ser um `file://` — o teste quebra.
    // `lib/` é a fundação congelada; a config se adapta a ela, não o contrário.
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    // shims de matchMedia/ResizeObserver, antes duplicados em cada test file
    setupFiles: ['./vitest.setup.ts'],
  },
})
