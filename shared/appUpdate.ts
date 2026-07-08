export interface AppUpdateInfo {
  /** Version string of the available update, e.g. "0.2.0". */
  version: string
  /**
   * `ready` — downloaded by electron-updater, install via quitAndInstall (win/linux).
   * `manual` — unsigned mac build can't self-update; open the release page instead.
   */
  kind: 'ready' | 'manual'
  /** GitHub release page URL, present when kind is `manual`. */
  url?: string
}

export interface DesktopBridge {
  platform: NodeJS.Platform
  getVersion: () => Promise<string>
  onUpdate: (callback: (update: AppUpdateInfo) => void) => void
  installUpdate: () => void
  openReleasePage: (url: string) => void
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (value: string): number[] =>
    value.split('.').map(segment => Number.parseInt(segment, 10))

  const a = parse(candidate)
  const b = parse(current)
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) {
    return false
  }

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left !== right) {
      return left > right
    }
  }

  return false
}
