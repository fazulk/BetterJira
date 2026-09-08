import type { ComputedRef } from 'vue'
import type { CreateAvatarTone } from './constants'
import type { JiraAssignableUser } from '@/types/jira'
import { computed, nextTick, ref } from 'vue'
import { readLocalStorageStringArray } from '@/utils/browserStorage'
import { avatarTones } from './constants'

interface AssigneeOption {
  accountId: string
  displayName: string
}

interface AssigneePickerInput {
  createAssignableOptions: ComputedRef<JiraAssignableUser[]>
  isCreatePending: ComputedRef<boolean>
  isLocalSpace: ComputedRef<boolean>
  updateFieldValue: (key: 'assignee', value: string) => void
}

const RECENT_ASSIGNEES_KEY = 'recent-assignees'
const MAX_RECENT = 5

export function useAssigneePicker(input: AssigneePickerInput) {
  const isEditingAssignee = ref(false)
  const assigneeSearch = ref('')
  const assigneeHighlightIndex = ref(0)
  const assigneeInputRef = ref<HTMLInputElement | null>(null)
  const assigneeComboRef = ref<HTMLDivElement | null>(null)
  const recentAssigneeIds = ref<string[]>(readLocalStorageStringArray(RECENT_ASSIGNEES_KEY))

  const assignableOptions = computed<AssigneeOption[]>(() => [
    { accountId: '__unassigned__', displayName: 'Unassigned' },
    ...input.createAssignableOptions.value,
  ])

  const recentComboOptions = computed(() => {
    const ids = recentAssigneeIds.value
    if (!ids.length)
      return []

    const query = assigneeSearch.value.toLowerCase().trim()
    const recent = ids
      .map(id => assignableOptions.value.find(option => option.accountId === id))
      .filter((option): option is NonNullable<typeof option> => option !== undefined)

    if (!query)
      return recent
    return recent.filter(option => option.displayName.toLowerCase().includes(query))
  })

  const nonRecentComboOptions = computed(() => {
    const recentIds = new Set(recentAssigneeIds.value)
    const query = assigneeSearch.value.toLowerCase().trim()
    const filtered = query
      ? assignableOptions.value.filter(option => option.displayName.toLowerCase().includes(query))
      : assignableOptions.value

    return filtered.filter(option => !recentIds.has(option.accountId))
  })

  const flatComboOptions = computed(() => [...recentComboOptions.value, ...nonRecentComboOptions.value])

  function addRecentAssignee(accountId: string) {
    if (accountId === '__unassigned__')
      return
    const updated = [accountId, ...recentAssigneeIds.value.filter(id => id !== accountId)].slice(0, MAX_RECENT)
    recentAssigneeIds.value = updated
    localStorage.setItem(RECENT_ASSIGNEES_KEY, JSON.stringify(updated))
  }

  function getAssigneeInitials(name: string): string {
    if (!name || name === 'Unassigned')
      return '?'

    const parts = name.split(/\s+/).filter(part => part.length > 0)
    const firstPart = parts[0]
    const secondPart = parts[1]
    if (firstPart && secondPart) {
      return `${firstPart[0] ?? ''}${secondPart[0] ?? ''}`.toUpperCase()
    }

    return name.slice(0, 2).toUpperCase()
  }

  function getAssigneeAvatarTone(name: string): CreateAvatarTone {
    if (!name || name === 'Unassigned') {
      return 'fallback'
    }

    const hash = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return avatarTones[hash % avatarTones.length] ?? 'fallback'
  }

  function handleAssigneeClickOutside(event: MouseEvent) {
    const target = event.target
    if (assigneeComboRef.value && target instanceof Node && !assigneeComboRef.value.contains(target)) {
      stopEditingAssignee()
    }
  }

  function stopEditingAssignee() {
    isEditingAssignee.value = false
    assigneeSearch.value = ''
    assigneeHighlightIndex.value = 0
    document.removeEventListener('mousedown', handleAssigneeClickOutside)
  }

  function startEditingAssignee() {
    if (input.isCreatePending.value || input.isLocalSpace.value)
      return

    isEditingAssignee.value = true
    assigneeSearch.value = ''
    assigneeHighlightIndex.value = 0
    document.addEventListener('mousedown', handleAssigneeClickOutside)

    nextTick(() => {
      assigneeInputRef.value?.focus()
    })
  }

  function selectAssigneeOption(accountId: string) {
    const nextValue = accountId === '__unassigned__' ? '' : accountId
    input.updateFieldValue('assignee', nextValue)
    assigneeSearch.value = ''
    addRecentAssignee(accountId)
    stopEditingAssignee()
  }

  function scrollAssigneeHighlightIntoView() {
    nextTick(() => {
      const item = assigneeComboRef.value?.querySelector(`[data-idx="${assigneeHighlightIndex.value}"]`)
      if (item instanceof HTMLElement) {
        item.scrollIntoView({ block: 'nearest' })
      }
    })
  }

  function handleAssigneeKeydown(event: KeyboardEvent) {
    const options = flatComboOptions.value
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      assigneeHighlightIndex.value = Math.min(assigneeHighlightIndex.value + 1, options.length - 1)
      scrollAssigneeHighlightIntoView()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      assigneeHighlightIndex.value = Math.max(assigneeHighlightIndex.value - 1, 0)
      scrollAssigneeHighlightIntoView()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[assigneeHighlightIndex.value]
      if (option)
        selectAssigneeOption(option.accountId)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      stopEditingAssignee()
    }
  }

  return {
    assigneeComboRef,
    assigneeHighlightIndex,
    assigneeInputRef,
    assigneeSearch,
    flatComboOptions,
    getAssigneeAvatarTone,
    getAssigneeInitials,
    handleAssigneeKeydown,
    isEditingAssignee,
    nonRecentComboOptions,
    recentComboOptions,
    startEditingAssignee,
    stopEditingAssignee,
    selectAssigneeOption,
  }
}
