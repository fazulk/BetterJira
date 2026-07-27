import { computed } from 'vue'
import { useSpaceSettings } from '@/composables/useSpaceSettings'

function normalizeStoredStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return typeof value === 'string' ? [value] : []
  }

  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))]
}

export function usePinnedTickets() {
  const { settings, setSidebarSettings } = useSpaceSettings()
  const pinnedKeys = computed<string[]>({
    get: () => normalizeStoredStringList(settings.value.sidebar.pinnedTicketKeys),
    set: (value) => {
      void setSidebarSettings({
        pinnedTicketKeys: value,
      })
    },
  })

  const pinnedKeySet = computed(() => new Set(pinnedKeys.value))

  function isPinned(key: string): boolean {
    return pinnedKeySet.value.has(key)
  }

  function togglePinnedTicket(key: string) {
    const withoutKey = pinnedKeys.value.filter(current => current !== key)
    pinnedKeys.value = isPinned(key) ? withoutKey : [key, ...withoutKey]
  }

  return {
    pinnedKeys,
    pinnedKeySet,
    isPinned,
    togglePinnedTicket,
  }
}
