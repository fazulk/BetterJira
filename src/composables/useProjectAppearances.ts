import type { JiraTicket } from '@/types/jira'
import type { ProjectAppearance, ProjectAppearances } from '~/shared/settings'
import { computed } from 'vue'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { isEpicIssueType } from '@/features/ticket-list/helpers'
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  normalizeProjectAppearance,
  normalizeProjectAppearanceKey,
} from '~/shared/settings'

export interface ProjectAppearanceInput {
  icon?: string
  color?: string
}

const DEFAULT_PROJECT_APPEARANCE: ProjectAppearance = {
  icon: DEFAULT_PROJECT_ICON,
  color: DEFAULT_PROJECT_COLOR,
}

/**
 * Custom icon + color for a project (an epic), persisted by issue key. Every
 * project resolves to an appearance — unset projects fall back to the shared
 * default rocket, so call sites never branch on "has a custom icon".
 */
export function useProjectAppearances() {
  const { settings, setProjectAppearances } = useSpaceSettings()
  const projectAppearances = computed<ProjectAppearances>(() => settings.value.projectAppearances)

  function getProjectAppearance(projectKey: string): ProjectAppearance {
    const normalizedKey = normalizeProjectAppearanceKey(projectKey)
    return projectAppearances.value[normalizedKey] ?? DEFAULT_PROJECT_APPEARANCE
  }

  /** The appearance of the issue's project, or null when it does not sit under an epic. */
  function getTicketProjectAppearance(ticket: JiraTicket): ProjectAppearance | null {
    const parent = ticket.parent
    if (!parent || !isEpicIssueType(parent.issueType)) {
      return null
    }

    return getProjectAppearance(parent.key)
  }

  function persistProjectAppearances(nextAppearances: ProjectAppearances): void {
    void setProjectAppearances(nextAppearances).catch((error: unknown) => {
      console.error('Failed to save project appearance:', error)
    })
  }

  function setProjectAppearance(projectKey: string, appearance: ProjectAppearanceInput): void {
    const normalizedKey = normalizeProjectAppearanceKey(projectKey)
    if (!normalizedKey) {
      return
    }

    const currentAppearance = getProjectAppearance(normalizedKey)
    persistProjectAppearances({
      ...projectAppearances.value,
      [normalizedKey]: normalizeProjectAppearance({
        icon: appearance.icon ?? currentAppearance.icon,
        color: appearance.color ?? currentAppearance.color,
      }),
    })
  }

  function resetProjectAppearance(projectKey: string): void {
    const normalizedKey = normalizeProjectAppearanceKey(projectKey)
    if (!normalizedKey || !(normalizedKey in projectAppearances.value)) {
      return
    }

    const nextAppearances: ProjectAppearances = { ...projectAppearances.value }
    delete nextAppearances[normalizedKey]
    persistProjectAppearances(nextAppearances)
  }

  return {
    projectAppearances,
    getProjectAppearance,
    getTicketProjectAppearance,
    setProjectAppearance,
    resetProjectAppearance,
  }
}
