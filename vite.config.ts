import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { yarnPlugin } from './tooling/yarn/vite-plugin-yarn.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [yarnPlugin(), react()],
  // Relative asset URLs: the build works at a domain root or in a sub-path
  // (e.g. GitHub Pages project sites at /<repo>/). Safe because there is no client-side routing.
  base: './',
  // Listen on IPv4 too: by default Vite may bind only to ::1 on Windows, and browsers
  // (or links) that resolve localhost to 127.0.0.1 then fail to connect.
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
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
