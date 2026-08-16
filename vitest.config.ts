import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'infinite-core': fileURLToPath(new URL('./packages/infinite-core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.spec.ts'],
    environment: 'node',
  },
})
