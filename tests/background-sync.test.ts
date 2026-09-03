import type { BackgroundSyncGuardInput } from '@/composables/useJiraBackgroundSync'
import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_SYNC_FOCUS_DEBOUNCE_MS,
  BACKGROUND_SYNC_STARTUP_STALE_MS,
  shouldRunBackgroundSync,
} from '@/composables/useJiraBackgroundSync'

function baseInput(overrides: Partial<BackgroundSyncGuardInput> = {}): BackgroundSyncGuardInput {
  return {
    now: 1_000_000,
    lastSyncAt: 0,
    dataUpdatedAt: undefined,
    isSyncing: false,
    settingsLoading: false,
    hasCredentials: true,
    visibilityState: 'visible',
    online: true,
    reason: 'interval',
    ...overrides,
  }
}

describe('shouldRunBackgroundSync', () => {
  it('runs interval syncs when visible, online, and credentialed', () => {
    expect(shouldRunBackgroundSync(baseInput())).toBe(true)
  })

  it('blocks while settings load, credentials are missing, or a sync is in flight', () => {
    expect(shouldRunBackgroundSync(baseInput({ settingsLoading: true }))).toBe(false)
    expect(shouldRunBackgroundSync(baseInput({ hasCredentials: false }))).toBe(false)
    expect(shouldRunBackgroundSync(baseInput({ isSyncing: true }))).toBe(false)
  })

  it('blocks when hidden or offline', () => {
    expect(shouldRunBackgroundSync(baseInput({ visibilityState: 'hidden' }))).toBe(false)
    expect(shouldRunBackgroundSync(baseInput({ online: false }))).toBe(false)
  })

  it('debounces focus/online bursts but never debounces interval syncs', () => {
    const justSynced = baseInput({ lastSyncAt: 1_000_000 - BACKGROUND_SYNC_FOCUS_DEBOUNCE_MS + 500 })
    expect(shouldRunBackgroundSync({ ...justSynced, reason: 'focus' })).toBe(false)
    expect(shouldRunBackgroundSync({ ...justSynced, reason: 'online' })).toBe(false)
    expect(shouldRunBackgroundSync({ ...justSynced, reason: 'interval' })).toBe(true)
  })

  it('skips startup sync when the restored cache is still fresh', () => {
    expect(shouldRunBackgroundSync(baseInput({
      reason: 'startup',
      dataUpdatedAt: 1_000_000 - BACKGROUND_SYNC_STARTUP_STALE_MS + 500,
    }))).toBe(false)
    expect(shouldRunBackgroundSync(baseInput({
      reason: 'startup',
      dataUpdatedAt: 1_000_000 - BACKGROUND_SYNC_STARTUP_STALE_MS - 1,
    }))).toBe(true)
    // No cached data at all: always sync on startup.
    expect(shouldRunBackgroundSync(baseInput({ reason: 'startup' }))).toBe(true)
  })
})
