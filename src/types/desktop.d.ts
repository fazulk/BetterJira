import type { DesktopBridge } from '~/shared/appUpdate'

declare global {
  interface Window {
    // Exposed by electron/preload.ts; absent when running in a plain browser.
    desktop?: DesktopBridge
  }
}

export {}
