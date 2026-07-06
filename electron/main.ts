import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
// hello
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { app, BrowserWindow, shell } from 'electron'

import { findFreePort } from './freePort'
import { waitForHttpReady } from './waitForHttpReady'

// File-based logging so we can diagnose packaged-app issues where stdout is
// swallowed. Without this, an uncaught exception in the main process exits
// silently and all we see is "app launched and immediately quit".
const LOG_DIR = join(tmpdir(), 'BetterJira-logs')
const LOG_FILE = join(LOG_DIR, 'main.log')
try {
  mkdirSync(LOG_DIR, { recursive: true })
}
catch {
  // ignore
}
function logLine(msg: string): void {
  const line = `${new Date().toISOString()} ${msg}\n`
  try {
    appendFileSync(LOG_FILE, line)
  }
  catch {
    // ignore
  }
  process.stdout.write(line)
}
logLine(`=== main.cjs loaded, pid=${process.pid}, cwd=${process.cwd()} ===`)
logLine(`process.type=${String(Reflect.get(process, 'type'))} versions.electron=${process.versions.electron ?? '?'}`)
logLine(`argv=${process.argv.slice(0, 4).join(' | ')}`)

const require = createRequire(import.meta.url)

// Diagnose `require("electron")` resolution.
try {
  const electronProbe = require('electron')
  logLine(`electron type=${typeof electronProbe}`)
  if (typeof electronProbe === 'object' && electronProbe !== null) {
    logLine(`electron keys=${Object.keys(electronProbe).join(',')}`)
  }
  else {
    logLine(`electron value=${String(electronProbe)}`)
  }
}
catch (err) {
  logLine(`electron probe err: ${String(err)}`)
}
process.on('uncaughtException', (err) => {
  logLine(`uncaughtException: ${err.message}\n${err.stack ?? ''}`)
})
process.on('unhandledRejection', (reason) => {
  logLine(`unhandledRejection: ${String(reason)}`)
})

const BACKEND_READY_TIMEOUT_MS = 30_000
const BACKEND_HOST = '127.0.0.1'
// Nuxt/Nitro's graceful shutdown can take a few seconds — we SIGTERM the whole
// process group (so bun → nuxt → nitro all see it), then hard-kill after this.
const SHUTDOWN_GRACE_MS = 5_000

let backendProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false

function resolveAppRoot(): string {
  return resolve(__dirname, '..')
}

function resolveBackendEntry(): string {
  return join(resolveAppRoot(), '.output', 'server', 'index.mjs')
}

function resolveBackendDataDir(): string {
  return join(app.getPath('userData'), 'data')
}

function resolveBackendEnvFile(): string {
  return join(app.getPath('userData'), '.env.local')
}

function focusMainWindow(): void {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.focus()
}

async function startBackend(): Promise<string> {
  const port = await findFreePort()
  const backendEntry = resolveBackendEntry()
  const backendCwd = resolveAppRoot()
  const url = `http://${BACKEND_HOST}:${port}`

  logLine(`[nitro] starting ${process.execPath} ${backendEntry} (cwd=${backendCwd})`)

  const child = spawn(process.execPath, [backendEntry], {
    cwd: backendCwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      BETTER_JIRA_APP_DATA_DIR: resolveBackendDataDir(),
      BETTER_JIRA_ENV_FILE: resolveBackendEnvFile(),
      NODE_ENV: 'production',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    // detached=true gives the child its own process group so we can signal
    // the backend atomically via `process.kill(-pid, …)` on Unix hosts.
    detached: process.platform !== 'win32',
  })

  backendProcess = child

  // Route child stdout/stderr to the log file — when launched from Finder there's
  // no terminal, so process.stdout.write vanishes. Split on newlines so each log
  // line carries its own timestamp and is grep-able.
  const logChunk = (prefix: string) => (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.length > 0)
        logLine(`${prefix} ${line}`)
    }
  }
  child.stdout?.on('data', logChunk('[nitro:stdout]'))
  child.stderr?.on('data', logChunk('[nitro:stderr]'))

  child.once('exit', (code, signal) => {
    logLine(`[nitro] exited code=${code} signal=${signal}`)
    backendProcess = null
    if (!isQuitting) {
      // Backend died unexpectedly — bail out so the user notices.
      app.quit()
    }
  })

  child.once('error', (err) => {
    logLine(`[nitro] spawn error: ${err.message}`)
    backendProcess = null
    if (!isQuitting) {
      app.quit()
    }
  })

  logLine(`[nitro] waiting for ${url} (timeout ${BACKEND_READY_TIMEOUT_MS}ms)`)
  await waitForHttpReady(url, { timeoutMs: BACKEND_READY_TIMEOUT_MS })
  logLine(`[nitro] ready at ${url}`)

  return url
}

function navigateWindowHistory(window: BrowserWindow, direction: 'back' | 'forward'): void {
  // Drive the renderer's History API rather than webContents.goBack(): the app's
  // own back button and Vue Router both navigate via window.history, and mixing
  // webContents-level navigation with the SPA's pushState entries desyncs the two
  // history stacks (Electron #24899) — which is why mouse-back failed after an
  // in-app click. history.back()/forward() is a no-op at the ends of the stack,
  // so no guard is needed.
  const script = direction === 'back' ? 'window.history.back()' : 'window.history.forward()'
  window.webContents.executeJavaScript(script, true).catch((err: unknown) => {
    logLine(`[mouse-navigation] navigate failed direction=${direction} err=${String(err)}`)
  })
}

function installHardwareNavigation(window: BrowserWindow): void {
  // Windows/Linux: side mouse buttons surface as `app-command` events.
  window.on('app-command', (event, command) => {
    if (command !== 'browser-backward' && command !== 'browser-forward') {
      return
    }

    event.preventDefault()
    navigateWindowHistory(window, command === 'browser-backward' ? 'back' : 'forward')
  })

  // macOS receives mouse/trackpad browser navigation as swipe events in this app.
  // Its direction is the visual page movement, so left means history back.
  window.on('swipe', (event, direction) => {
    if (direction !== 'right' && direction !== 'left') {
      return
    }

    event.preventDefault()
    navigateWindowHistory(window, direction === 'left' ? 'back' : 'forward')
  })
}

function createWindow(url: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'BetterJira!',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  installHardwareNavigation(window)

  // Open external links (http/https that aren't our own origin) in the default browser.
  window.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith(url)) {
      return { action: 'allow' }
    }
    void shell.openExternal(targetUrl)
    return { action: 'deny' }
  })

  void window.loadURL(url)

  window.on('focus', () => {
    logLine('[window] focus')
  })

  window.on('blur', () => {
    logLine('[window] blur')
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  return window
}

async function bootstrap(): Promise<void> {
  const devUrl = process.env.NUXT_DEV_URL?.trim()
  const url = devUrl || await startBackend()
  mainWindow = createWindow(url)
}

function descendantPids(pid: number): number[] {
  if (process.platform === 'win32') {
    return []
  }

  try {
    const out = execFileSync('pgrep', ['-P', String(pid)], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    })
    const direct = out
      .trim()
      .split(/\s+/)
      .map(n => Number.parseInt(n, 10))
      .filter(n => Number.isInteger(n))

    const all: number[] = [...direct]
    for (const childPid of direct) {
      all.push(...descendantPids(childPid))
    }
    return all
  }
  catch {
    // pgrep returns non-zero (exit code 1) when no matches — expected at the leaves.
    return []
  }
}

function killChildTree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (typeof child.pid !== 'number')
    return

  // Walk the tree and kill descendants leaf-first, then signal the process group,
  // then the child itself. `bun run dev` spawns workers that may live in their
  // own process group, so relying on PG-wide signaling alone is unreliable.
  const descendants = descendantPids(child.pid)

  for (let i = descendants.length - 1; i >= 0; i--) {
    const pid = descendants[i]
    if (pid === undefined)
      continue
    try {
      process.kill(pid, signal)
    }
    catch {
      // ignore
    }
  }

  try {
    if (process.platform !== 'win32') {
      process.kill(-child.pid, signal)
    }
  }
  catch {
    // ignore
  }

  try {
    child.kill(signal)
  }
  catch {
    // ignore
  }
}

function shutdownBackend(): void {
  const child = backendProcess
  if (!child || child.exitCode !== null) {
    return
  }

  const forceKill = setTimeout(() => {
    killChildTree(child, 'SIGKILL')
  }, SHUTDOWN_GRACE_MS)

  child.once('exit', () => {
    clearTimeout(forceKill)
  })

  killChildTree(child, 'SIGTERM')
}

// Attempt a single-instance lock, but don't quit if we can't get one —
// ad-hoc signed macOS apps can spuriously fail this call, and the downside of
// skipping is just that a second launch creates a second window (rare for a
// personal tool launched from Finder, which LaunchServices dedups anyway).
try {
  const gotLock = app.requestSingleInstanceLock()
  if (gotLock) {
    app.on('second-instance', () => {
      focusMainWindow()
    })
  }
}
catch {
  // ignore
}

app.whenReady().then(() => {
  logLine('app.whenReady fired')
  bootstrap().catch((err) => {
    logLine(`Failed to start BetterJira: ${String(err)}`)
    app.quit()
  })
})

app.on('activate', () => {
  focusMainWindow()
})

app.on('window-all-closed', () => {
  logLine('window-all-closed → app.quit()')
  app.quit()
})

app.on('before-quit', (event) => {
  if (isQuitting)
    return
  if (!backendProcess || backendProcess.exitCode !== null) {
    isQuitting = true
    return
  }

  isQuitting = true
  event.preventDefault()

  const child = backendProcess
  const forceKill = setTimeout(() => {
    killChildTree(child, 'SIGKILL')
    app.quit()
  }, SHUTDOWN_GRACE_MS)

  child.once('exit', () => {
    clearTimeout(forceKill)
    app.quit()
  })

  killChildTree(child, 'SIGTERM')
})

// Last-ditch fallback if anything skips before-quit.
process.on('exit', () => {
  shutdownBackend()
})
