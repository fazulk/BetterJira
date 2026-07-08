import type { BrowserWindow } from 'electron'
import type { AppUpdateInfo } from '../shared/appUpdate'
import process from 'node:process'
import { app, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { isNewerVersion } from '../shared/appUpdate'

const GITHUB_REPO_URL = 'https://github.com/fazulk/better-jira/'
const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/fazulk/better-jira/releases/latest'
// Stable alias uploaded by the release workflow — always the newest dmg.
const MAC_DMG_DOWNLOAD_URL = `${GITHUB_REPO_URL}releases/latest/download/BetterJira-mac-arm64.dmg`
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

// Kept so a renderer that mounts (or reloads) after the update event can still
// learn about it via desktop:update-subscribe.
let latestUpdate: AppUpdateInfo | null = null

type Logger = (msg: string) => void

export function initUpdates(getWindow: () => BrowserWindow | null, logLine: Logger): void {
  const publish = (update: AppUpdateInfo): void => {
    latestUpdate = update
    logLine(`[updater] update available: ${update.version} (${update.kind})`)
    getWindow()?.webContents.send('desktop:update', update)
  }

  ipcMain.handle('desktop:get-version', () => app.getVersion())

  ipcMain.on('desktop:update-subscribe', (event) => {
    if (latestUpdate) {
      event.sender.send('desktop:update', latestUpdate)
    }
  })

  ipcMain.on('desktop:install-update', () => {
    logLine('[updater] quitAndInstall requested')
    autoUpdater.quitAndInstall()
  })

  ipcMain.on('desktop:open-release', (_event, url: unknown) => {
    if (typeof url === 'string' && url.startsWith(GITHUB_REPO_URL)) {
      void shell.openExternal(url)
    }
  })

  if (!app.isPackaged) {
    return
  }

  const check = process.platform === 'darwin'
    ? () => checkViaGithubApi(publish, logLine)
    : () => checkViaAutoUpdater(logLine)

  if (process.platform !== 'darwin') {
    setupAutoUpdater(publish, logLine)
  }

  void check()
  setInterval(() => {
    void check()
  }, CHECK_INTERVAL_MS)
}

function setupAutoUpdater(publish: (update: AppUpdateInfo) => void, logLine: Logger): void {
  autoUpdater.logger = null
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Belt-and-braces: resolves the feed even if resources/app-update.yml is absent.
  autoUpdater.setFeedURL({ provider: 'github', owner: 'fazulk', repo: 'better-jira' })

  autoUpdater.on('update-downloaded', (info) => {
    publish({ kind: 'ready', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    logLine(`[updater] error: ${err.message}`)
  })
}

async function checkViaAutoUpdater(logLine: Logger): Promise<void> {
  try {
    await autoUpdater.checkForUpdates()
  }
  catch (err) {
    logLine(`[updater] checkForUpdates failed: ${String(err)}`)
  }
}

// Unsigned mac builds can't be updated by electron-updater (Squirrel.Mac
// requires code signing), so we only detect the new release and point the
// user at the download page.
async function checkViaGithubApi(publish: (update: AppUpdateInfo) => void, logLine: Logger): Promise<void> {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API, {
      headers: { accept: 'application/vnd.github+json' },
    })
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`)
    }

    const release = await response.json() as { tag_name?: string }
    const version = (release.tag_name ?? '').replace(/^v/, '')
    if (version && isNewerVersion(version, app.getVersion())) {
      publish({
        kind: 'manual',
        version,
        url: MAC_DMG_DOWNLOAD_URL,
      })
    }
  }
  catch (err) {
    logLine(`[updater] release check failed: ${String(err)}`)
  }
}
