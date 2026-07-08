import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { arch, platform } from 'node:process'
import { app } from 'electron'
import { PostHog } from 'posthog-node'

// Injected at build time by tsdown's `define` (see tsdown.config.ts). Empty in
// local/dev builds, forks, or any build without POSTHOG_KEY set — in which case
// analytics silently no-ops.
declare const __POSTHOG_KEY__: string
declare const __POSTHOG_HOST__: string

type Logger = (msg: string) => void

export type ErrorKind
  = | 'uncaughtException'
    | 'unhandledRejection'
    | 'updater_error'
    | 'backend_crash'

interface AnalyticsState {
  distinctId: string
  lastVersion: string
}

// A short-lived main process, so we send events over HTTP eagerly rather than
// batching (which would drop unsent events when the app quits).
let client: PostHog | null = null
let distinctId = ''
let log: Logger = () => {}
let ready = false
let didShutdown = false

function statePath(): string {
  return join(app.getPath('userData'), 'analytics.json')
}

function readState(): AnalyticsState | null {
  try {
    const raw = readFileSync(statePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<AnalyticsState>
    if (typeof parsed.distinctId === 'string' && parsed.distinctId.length > 0) {
      return {
        distinctId: parsed.distinctId,
        lastVersion: typeof parsed.lastVersion === 'string' ? parsed.lastVersion : '',
      }
    }
    return null
  }
  catch {
    // Missing file (first run) or unreadable/corrupt — treat as no prior state.
    return null
  }
}

function writeState(state: AnalyticsState): void {
  try {
    writeFileSync(statePath(), JSON.stringify(state), 'utf8')
  }
  catch {
    // Best-effort; a failed write just means we may re-fire install/update next launch.
  }
}

function baseProps(): Record<string, string> {
  return {
    version: app.getVersion(),
    platform,
    arch,
  }
}

function send(event: string, properties: Record<string, unknown>): void {
  if (!client || !ready) {
    return
  }
  // captureImmediate resolves once the HTTP request completes; fire-and-forget
  // but keep the process alive long enough (Node won't exit while it's pending).
  client
    .captureImmediate({ distinctId, event, properties })
    .catch((err: unknown) => log(`[analytics] send failed (${event}): ${String(err)}`))
}

/**
 * Initialise analytics and record install/update. Safe to call once at startup.
 * No-ops entirely when no PostHog key was baked into the build.
 */
export function initAnalytics(logLine: Logger): void {
  log = logLine

  const key = __POSTHOG_KEY__
  if (!key) {
    log('[analytics] disabled (no key)')
    return
  }

  client = new PostHog(key, {
    host: __POSTHOG_HOST__ || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  ready = true

  const prior = readState()
  const currentVersion = app.getVersion()

  if (!prior) {
    distinctId = randomUUID()
    log('[analytics] app_installed')
    send('app_installed', baseProps())
  }
  else {
    distinctId = prior.distinctId
    if (prior.lastVersion && prior.lastVersion !== currentVersion) {
      log(`[analytics] app_updated ${prior.lastVersion} -> ${currentVersion}`)
      send('app_updated', { ...baseProps(), from: prior.lastVersion, to: currentVersion })
    }
  }

  writeState({ distinctId, lastVersion: currentVersion })
}

/** Capture a main-process error/crash. */
export function captureError(kind: ErrorKind, error: unknown, extra?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : null
  const message = err ? err.message : String(error)
  log(`[analytics] app_error (${kind})`)
  send('app_error', {
    ...baseProps(),
    kind,
    message,
    stack: err?.stack?.slice(0, 4096),
    ...extra,
  })
}

/** Capture an arbitrary event (e.g. update_downloaded). */
export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  log(`[analytics] ${event}`)
  send(event, { ...baseProps(), ...properties })
}

/** Flush pending events before quit. Idempotent. */
export async function shutdownAnalytics(): Promise<void> {
  if (!client || didShutdown) {
    return
  }
  didShutdown = true
  try {
    await client.shutdown(2000)
  }
  catch {
    // ignore
  }
}
