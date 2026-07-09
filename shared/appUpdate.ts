export interface AppUpdateInfo {
  /** Version of the update electron-updater has downloaded, e.g. "0.2.0". */
  version: string
}

export type AppUpdateCheckResult
  = | { status: 'update-available', version: string }
    | { status: 'up-to-date' }
    | { status: 'error', message: string }

export interface DesktopBridge {
  platform: NodeJS.Platform
  getVersion: () => Promise<string>
  onUpdate: (callback: (update: AppUpdateInfo) => void) => void
  installUpdate: () => void
  checkForUpdates: () => Promise<AppUpdateCheckResult>
}
