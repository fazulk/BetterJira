import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { createStylexPlugin } from './stylex.config'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-27',
  modules: ['@nuxt/icon'],
  app: {
    head: {
      title: 'BetterJira!',
      meta: [
        { name: 'description', content: 'BetterJira ticket workspace' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
  ssr: false,
  css: ['~/src/style.css'],
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  components: [
    {
      path: '~/src/components',
      pathPrefix: false,
    },
  ],
  imports: {
    dirs: ['src/composables'],
  },
  vite: {
    plugins: [createStylexPlugin(), tailwindcss()],
  },
})
