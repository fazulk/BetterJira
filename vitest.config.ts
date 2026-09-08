import { fileURLToPath } from 'node:url'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vitest/config'
import { createStylexPlugin } from './stylex.config'

export default defineConfig({
  plugins: [createStylexPlugin({ test: true }), vueJsx()],
  resolve: {
    alias: {
      '#components': fileURLToPath(new URL('./tests/stubs/components.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
