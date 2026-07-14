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

// Em GitHub Pages o app mora num subdiretório (nickfrancadev.github.io/maestro-unificado/),
// então os assets precisam ser referenciados a partir dele. O workflow do Pages seta
// GITHUB_PAGES=true; localmente e na Vercel (que serve na raiz) o base fica '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/maestro-unificado/' : '/'

export default defineConfig({
  base,
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

  // Config do Vitest vive em `vitest.config.ts` — quando os dois arquivos
  // existem, o Vitest usa o `vitest.config.ts` e IGNORA este bloco.
})
