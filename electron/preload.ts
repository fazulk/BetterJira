import type { AppUpdateCheckResult, AppUpdateInfo, DesktopBridge } from '../shared/appUpdate'
import { contextBridge, ipcRenderer } from 'electron'

// Sandboxed preloads can only require `electron` and a few node builtins —
// `node:process` is not among them, and any relative chunk require fails too,
// so this file must stay self-contained and use the polyfilled global.
// eslint-disable-next-line node/prefer-global/process
const platform = process.platform

const desktop: DesktopBridge = {
  platform,
  getVersion: () => ipcRenderer.invoke('desktop:get-version') as Promise<string>,
  onUpdate: (callback) => {
    ipcRenderer.on('desktop:update', (_event, update: AppUpdateInfo) => {
      callback(update)
    })
    // Ask main to replay an update that fired before this renderer mounted.
    ipcRenderer.send('desktop:update-subscribe')
  },
  installUpdate: () => {
    ipcRenderer.send('desktop:install-update')
  },
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates') as Promise<AppUpdateCheckResult>,
}

contextBridge.exposeInMainWorld('desktop', desktop)
