import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), vueJsx()],
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
