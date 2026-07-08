import process from 'node:process'
import { defineConfig } from 'tsdown'

// `electron` must stay external — its APIs (app, BrowserWindow, …) only exist
// when the module is resolved inside the running Electron binary at runtime.
// Bundling it pulls in node_modules/electron/index.js instead, which just
// returns the string path to the binary, and then `import_electron.app` is
// undefined at runtime — the app boots, throws on the first `.on()` call, and
// exits with code 0 before Electron can even log anything.
const shared = {
  format: 'cjs' as const,
  outDir: 'dist-electron',
  outExtensions: () => ({ js: '.cjs' }),
  sourcemap: true,
  platform: 'node' as const,
  target: 'node20',
  // electron stays external (its APIs only exist inside the running binary);
  // posthog-node must be force-bundled — the packaged app only installs the
  // Nitro server's dependencies into node_modules, so a runtime `require`
  // ("Cannot find module 'posthog-node'") crashes main on launch. alwaysBundle
  // overrides the default externalization of `dependencies`.
  deps: { neverBundle: ['electron'], alwaysBundle: ['posthog-node'] },
  // Bake the PostHog credentials in at build time (see electron/analytics.ts).
  // Empty key → analytics no-ops, so local/dev builds need no env at all.
  define: {
    __POSTHOG_KEY__: JSON.stringify(process.env.POSTHOG_KEY ?? ''),
    __POSTHOG_HOST__: JSON.stringify(process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com'),
  },
}

// main and preload are separate builds (not two entries of one build): rolldown
// shares chunks between entries, but Electron's sandboxed preload can only
// require `electron` and a few node builtins — a `require("./main.cjs")` or
// shared-chunk require in preload.cjs fails at runtime. Each build here emits
// one self-contained file.
export default defineConfig([
  {
    ...shared,
    entry: ['electron/main.ts'],
    clean: ['dist-electron/main.cjs', 'dist-electron/main.cjs.map'],
  },
  {
    ...shared,
    entry: ['electron/preload.ts'],
    clean: ['dist-electron/preload.cjs', 'dist-electron/preload.cjs.map'],
  },
])
