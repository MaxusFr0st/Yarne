import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Loads src/early.ts as its own small, hashed file right after config.js (see that file for why),
 * in place of the <!-- early-requests --> marker in index.html.
 * A second <script type="module"> written into index.html would be merged into the main bundle,
 * and this has to run long before the main bundle has downloaded. A classic script, not a module:
 * a phone runs modules only once it has finished with the main bundle (measured: 170 ms later on
 * a throttled phone), while a classic script runs the moment it arrives.
 */
function earlyRequests(): Plugin {
  let build = false
  return {
    name: 'yarne-early-requests',
    configResolved(config) {
      build = config.command === 'build'
    },
    buildStart() {
      if (build) this.emitFile({ type: 'chunk', id: path.resolve(__dirname, 'src/early.ts'), name: 'early' })
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const chunk = Object.values(ctx.bundle ?? {}).find((file) => file.type === 'chunk' && file.name === 'early')
        // The dev server only serves TypeScript as modules.
        const tag = chunk
          ? `<script src="/${chunk.fileName}"></script>`
          : '<script type="module" src="/src/early.ts"></script>'
        return html.replace('<!-- early-requests -->', tag)
      },
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    earlyRequests(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
