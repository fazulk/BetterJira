import type { AppSpaceTeamFilter, LabelColors, StatusColors } from './settingsTypes'
import { isRecord } from './typeGuards'

export function normalizeSpaceKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim().toUpperCase()
  return normalizedValue.length > 0 ? normalizedValue : null
}

export function normalizeSpaceName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeSpaceTeamFilter(value: unknown): AppSpaceTeamFilter | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const recordValue = value
  const projectKey = normalizeSpaceKey(recordValue.projectKey)
  const teamId = typeof recordValue.teamId === 'string' ? recordValue.teamId.trim() : ''

  if (!projectKey || !teamId) {
    return undefined
  }

  return { projectKey, teamId }
}

export function normalizeSpaceIcon(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim().toLowerCase()
  return /^[a-z0-9-]+$/.test(trimmed) ? trimmed : undefined
}

export function normalizeBoardId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const boardId = Number(value.trim())
    return boardId > 0 ? boardId : undefined
  }

  return undefined
}

export function normalizeSpaceColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : undefined
}

export function normalizeJiraValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeAiValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLabelColorKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeHexColorValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : null
}

function normalizeStatusPreferenceKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function normalizeLabelColors(value: unknown): LabelColors {
  if (!isRecord(value)) {
    return {}
  }

  const recordValue = value
  const normalizedColors: LabelColors = {}

  for (const [label, color] of Object.entries(recordValue)) {
    const normalizedLabel = normalizeLabelColorKey(label)
    const normalizedColor = normalizeHexColorValue(color)

    if (normalizedLabel && normalizedColor) {
      normalizedColors[normalizedLabel] = normalizedColor
    }
  }

  return normalizedColors
}

export function normalizeStatusColors(value: unknown): StatusColors {
  if (!isRecord(value)) {
    return {}
  }

  const recordValue = value
  const normalizedColors: StatusColors = {}

  for (const [statusKey, color] of Object.entries(recordValue)) {
    const normalizedStatusKey = normalizeStatusPreferenceKey(statusKey)
    const normalizedColor = normalizeHexColorValue(color)

    if (normalizedStatusKey && normalizedColor) {
      normalizedColors[normalizedStatusKey] = normalizedColor
    }
  }

  return normalizedColors
}

export function normalizeStatusOrder(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalizedValues = new Set<string>()

  for (const entry of value) {
    const normalizedEntry = normalizeStatusPreferenceKey(entry)
    if (normalizedEntry) {
      normalizedValues.add(normalizedEntry)
    }
  }

  return [...normalizedValues]
}

export function normalizeSpaceKeyList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalizedValues = new Set<string>()

  for (const entry of value) {
    const normalizedEntry = normalizeSpaceKey(entry)
    if (normalizedEntry) {
      normalizedValues.add(normalizedEntry)
    }
  }

  return [...normalizedValues]
}

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value !== 'string') {
      return []
    }

    const normalizedValue = value.trim()
    return normalizedValue.length > 0 ? [normalizedValue] : []
  }

  const normalizedValues = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }

    const normalizedEntry = entry.trim()
    if (normalizedEntry.length > 0) {
      normalizedValues.add(normalizedEntry)
    }
  }

  return [...normalizedValues]
}

export function normalizeStringListRecord(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    return {}
  }

  const recordValue = value
  const normalizedRecord: Record<string, string[]> = {}

  for (const [key, entry] of Object.entries(recordValue)) {
    const normalizedKey = key.trim()
    if (!normalizedKey) {
      continue
    }

    const normalizedList = normalizeStringList(entry)
    if (normalizedList.length > 0) {
      normalizedRecord[normalizedKey] = normalizedList
    }
  }

  return normalizedRecord
}

export function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
