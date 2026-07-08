import type { BrowserWindow } from 'electron'
import type { AppUpdateInfo } from '../shared/appUpdate'
import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { captureError, captureEvent } from './analytics'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

// Kept so a renderer that mounts (or reloads) after the update event can still
// learn about it via desktop:update-subscribe.
let latestUpdate: AppUpdateInfo | null = null

type Logger = (msg: string) => void

// macOS auto-update requires a Developer ID signed app (Squirrel.Mac verifies
// the signature before swapping bundles); release builds are signed and
// notarized by electron-builder.
export function initUpdates(getWindow: () => BrowserWindow | null, logLine: Logger): void {
  const publish = (update: AppUpdateInfo): void => {
    latestUpdate = update
    logLine(`[updater] update downloaded: ${update.version}`)
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

  if (!app.isPackaged) {
    return
  }

  autoUpdater.logger = null
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Belt-and-braces: resolves the feed even if resources/app-update.yml is absent.
  autoUpdater.setFeedURL({ provider: 'github', owner: 'fazulk', repo: 'better-jira' })

  autoUpdater.on('update-downloaded', (info) => {
    captureEvent('update_downloaded', { version: info.version })
    publish({ version: info.version })
  })

  autoUpdater.on('error', (err) => {
    logLine(`[updater] error: ${err.message}`)
    captureError('updater_error', err)
  })

  const check = async (): Promise<void> => {
    try {
      await autoUpdater.checkForUpdates()
    }
    catch (err) {
      logLine(`[updater] checkForUpdates failed: ${String(err)}`)
    }
  }

  void check()
  setInterval(() => {
    void check()
  }, CHECK_INTERVAL_MS)
}
