import type { ComputedRef, Ref } from 'vue'
import type { IssueSection } from './types'
import type { JiraTicket } from '@/types/jira'
import { computed, ref, watch } from 'vue'

interface IssueSelectionDeps {
  selectedKey: Ref<string | null>
  issueSections: ComputedRef<IssueSection[]>
  collapsedIssueSectionIds: Ref<string[]>
  tickets: ComputedRef<JiraTicket[]>
  getFlatVisibleTickets: () => JiraTicket[]
  getDisplayedIssueRowKey: (ticket: JiraTicket) => string
}

/**
 * Keyboard-focus + multi-select (checked) state for the issue list. Owns the
 * focused/checked/anchor refs, the derived checked-set computeds, and the
 * reconciliation watch that drops focus/anchor when the displayed flat ticket
 * list no longer contains them. Navigation actions that merely reset focus
 * (open/close ticket, view changes) stay in the controller.
 */
export function useIssueSelection(deps: IssueSelectionDeps) {
  const {
    selectedKey,
    issueSections,
    collapsedIssueSectionIds,
    tickets,
    getFlatVisibleTickets,
    getDisplayedIssueRowKey,
  } = deps
  const focusedIssueKey = ref<string | null>(null)
  const checkedIssueKeys = ref<string[]>([])
  const selectionAnchorKey = ref<string | null>(null)
  const checkedIssueKeySet = computed(() => new Set(checkedIssueKeys.value))
  const checkedIssues = computed(() =>
    checkedIssueKeys.value
      .map(key => tickets.value.find(ticket => ticket.key === key))
      .filter((ticket): ticket is JiraTicket => Boolean(ticket)),
  )
  const checkedIssueCount = computed(() => checkedIssueKeys.value.length)
  // Focus follows the ticket opened in the detail pane.
  watch(selectedKey, (key) => {
    if (key) {
      focusedIssueKey.value = key
    }
  })
  watch(
    [issueSections, collapsedIssueSectionIds],
    () => {
      const flatTickets = getFlatVisibleTickets()
      if (!flatTickets.length) {
        focusedIssueKey.value = null
        selectionAnchorKey.value = null
        return
      }
      if (
        !focusedIssueKey.value
        || !flatTickets.some(ticket => getDisplayedIssueRowKey(ticket) === focusedIssueKey.value)
      ) {
        focusedIssueKey.value = flatTickets[0] ? getDisplayedIssueRowKey(flatTickets[0]) : null
      }
      if (
        selectionAnchorKey.value
        && !flatTickets.some(ticket => getDisplayedIssueRowKey(ticket) === selectionAnchorKey.value)
      ) {
        selectionAnchorKey.value = null
      }
    },
    { immediate: true },
  )
  function toggleCheckedIssue(ticketKey: string) {
    checkedIssueKeys.value = checkedIssueKeySet.value.has(ticketKey)
      ? checkedIssueKeys.value.filter(key => key !== ticketKey)
      : [...checkedIssueKeys.value, ticketKey]
    selectionAnchorKey.value = ticketKey
  }
  function clearCheckedIssues() {
    checkedIssueKeys.value = []
    selectionAnchorKey.value = null
  }
  function getVisibleTicketRangeKeys(anchorKey: string, targetKey: string): string[] {
    const flatTickets = getFlatVisibleTickets()
    const anchorIndex = flatTickets.findIndex(
      ticket => getDisplayedIssueRowKey(ticket) === anchorKey,
    )
    const targetIndex = flatTickets.findIndex(
      ticket => getDisplayedIssueRowKey(ticket) === targetKey,
    )
    if (anchorIndex === -1 || targetIndex === -1)
      return targetKey ? [targetKey] : []
    const start = Math.min(anchorIndex, targetIndex)
    const end = Math.max(anchorIndex, targetIndex)
    return flatTickets.slice(start, end + 1).map(getDisplayedIssueRowKey)
  }
  function addCheckedIssueRange(anchorKey: string, targetKey: string) {
    const nextKeys = getVisibleTicketRangeKeys(anchorKey, targetKey)
    const merged = new Set(checkedIssueKeys.value)
    for (const key of nextKeys) {
      merged.add(key)
    }
    checkedIssueKeys.value = [...merged]
  }
  async function copyCheckedIssueKeys() {
    const text = checkedIssueKeys.value.join(', ')
    if (!text || !navigator.clipboard)
      return
    await navigator.clipboard.writeText(text)
  }
  return {
    focusedIssueKey,
    checkedIssueKeys,
    selectionAnchorKey,
    checkedIssueKeySet,
    checkedIssues,
    checkedIssueCount,
    toggleCheckedIssue,
    clearCheckedIssues,
    addCheckedIssueRange,
    copyCheckedIssueKeys,
  }
}
