import type { AppUpdateInfo } from '~/shared/appUpdate'

function getUpdateState() {
  return useState<AppUpdateInfo | null>('app-update', () => null)
}

function getDismissedState() {
  return useState<boolean>('app-update-dismissed', () => false)
}

/**
 * Registers the desktop update listener. Call once from app.vue's onMounted;
 * a no-op in a plain browser where the preload bridge is absent.
 */
export function initAppUpdateListener(): void {
  window.desktop?.onUpdate((update) => {
    getUpdateState().value = update
    getDismissedState().value = false
  })
}

export function useAppUpdate() {
  const update = getUpdateState()
  const dismissed = getDismissedState()
  const visibleUpdate = computed(() => (dismissed.value ? null : update.value))

  function applyUpdate(): void {
    if (update.value) {
      window.desktop?.installUpdate()
    }
  }

  function dismiss(): void {
    dismissed.value = true
  }

  return { update: visibleUpdate, applyUpdate, dismiss }
}
