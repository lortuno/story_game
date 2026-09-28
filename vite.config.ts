import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { inkPlugin } from './tooling/ink/vite-plugin-ink.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [inkPlugin(), react()],
  build: {
    target: 'es2022',
    // Story images are already WebP-optimised by `npm run images`; keep them as files
    // (cacheable, lazy-loaded) instead of inlining into JS.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/stories/*/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
