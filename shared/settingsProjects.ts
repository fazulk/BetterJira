import type { ProjectAppearance, ProjectAppearances } from './settingsTypes'
import { isRecord } from './typeGuards'

/** Lucide icon name (without the `lucide:` prefix) used before a project gets a custom icon. */
export const DEFAULT_PROJECT_ICON = 'rocket'
/** Tint applied to the default project icon, matching the legacy hard-coded rocket color. */
export const DEFAULT_PROJECT_COLOR = '#9aa8c7'

/** Project appearances are keyed by issue key, which Jira always renders uppercase. */
export function normalizeProjectAppearanceKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function normalizeProjectIcon(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_PROJECT_ICON
  }

  const trimmed = value.trim().toLowerCase()
  return /^[a-z0-9-]+$/.test(trimmed) ? trimmed : DEFAULT_PROJECT_ICON
}

function normalizeProjectColor(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_PROJECT_COLOR
  }

  const trimmed = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : DEFAULT_PROJECT_COLOR
}

export function normalizeProjectAppearance(value: unknown): ProjectAppearance {
  const recordValue = isRecord(value) ? value : {}

  return {
    icon: normalizeProjectIcon(recordValue.icon),
    color: normalizeProjectColor(recordValue.color),
  }
}

export function normalizeProjectAppearances(value: unknown): ProjectAppearances {
  if (!isRecord(value)) {
    return {}
  }

  const normalizedAppearances: ProjectAppearances = {}

  for (const [projectKey, appearance] of Object.entries(value)) {
    const normalizedKey = normalizeProjectAppearanceKey(projectKey)
    if (!normalizedKey || !isRecord(appearance)) {
      continue
    }

    normalizedAppearances[normalizedKey] = normalizeProjectAppearance(appearance)
  }

  return normalizedAppearances
}
