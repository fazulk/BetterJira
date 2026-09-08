import process from 'node:process'
import { fileURLToPath } from 'node:url'
import stylex from '@stylexjs/unplugin'

export function createStylexPlugin({ test = false }: { test?: boolean } = {}) {
  const plugin = stylex.vite({
    dev: process.env.NODE_ENV === 'development',
    devMode: 'css-only',
    runtimeInjection: false,
    useCSSLayers: { before: ['reset', 'base'], prefix: 'stylex' },
    aliases: {
      '@/*': [fileURLToPath(new URL('./src/*', import.meta.url))],
      '~/*': [fileURLToPath(new URL('./*', import.meta.url))],
    },
    unstable_moduleResolution: {
      type: 'commonJS',
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
    },
  })
  if (test) {
    // Vitest only needs compilation; the dev CSS polling timer has no HTTP server to close.
    plugin.configureServer = undefined
  }
  return plugin
}
