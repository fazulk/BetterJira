import type { AppSpaceSetting, AppSpaceTeamFilter } from './settingsTypes'
import { LOCAL_SPACE_KEY, LOCAL_SPACE_NAME } from './localTickets'
import {
  normalizeSpaceColor,
  normalizeSpaceIcon,
  normalizeSpaceKey,
  normalizeSpaceKeyList,
  normalizeSpaceName,
  normalizeSpaceTeamFilter,
} from './settingsNormalizers'

/** Builds the unique settings key for a team-filtered space. Avoids `:` because view ids are `team:<spaceKey>:<section>`. */
export function buildTeamSpaceKey(projectKey: string, teamId: string): string {
  return `${projectKey}~${teamId}`.toUpperCase()
}

/** The Jira project a space maps to: the team filter's project for team spaces, otherwise the space key itself. */
export function getSpaceProjectKey(space: Pick<AppSpaceSetting, 'key' | 'teamFilter'>): string {
  return space.teamFilter?.projectKey ?? space.key
}

function withAppearance(
  base: AppSpaceSetting,
  icon: string | undefined,
  color: string | undefined,
  teamFilter?: AppSpaceTeamFilter,
): AppSpaceSetting {
  return {
    ...base,
    ...(icon ? { icon } : {}),
    ...(color ? { color } : {}),
    ...(teamFilter ? { teamFilter } : {}),
  }
}

function normalizeSpaceSetting(value: unknown): AppSpaceSetting | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const recordValue: Record<string, unknown> = value
  const key = normalizeSpaceKey(recordValue.key)

  if (!key) {
    return null
  }

  return withAppearance(
    {
      key,
      name: normalizeSpaceName(recordValue.name),
      enabled: recordValue.enabled !== false,
    },
    normalizeSpaceIcon(recordValue.icon),
    normalizeSpaceColor(recordValue.color),
    normalizeSpaceTeamFilter(recordValue.teamFilter),
  )
}

function normalizeSpaceSettings(value: unknown): AppSpaceSetting[] {
  if (!Array.isArray(value)) {
    return []
  }

  const spaces: AppSpaceSetting[] = []

  for (const entry of value) {
    const normalizedEntry = normalizeSpaceSetting(entry)
    if (normalizedEntry) {
      spaces.push(normalizedEntry)
    }
  }

  return spaces
}

function createLegacySpaceSettings(keys: string[], enabled: boolean): AppSpaceSetting[] {
  return keys.map(key => ({
    key,
    name: key,
    enabled,
  }))
}

function sortSpaceSettings(left: AppSpaceSetting, right: AppSpaceSetting): number {
  const leftDisplayName = left.name || left.key
  const rightDisplayName = right.name || right.key
  const nameCompare = leftDisplayName.localeCompare(rightDisplayName, undefined, { sensitivity: 'base' })

  if (nameCompare !== 0) {
    return nameCompare
  }

  return left.key.localeCompare(right.key, undefined, { sensitivity: 'base' })
}

export function reconcileSpaceSettings(spaces: AppSpaceSetting[]): AppSpaceSetting[] {
  const dedupedSpaces = new Map<string, AppSpaceSetting>()

  for (const space of spaces) {
    const existingSpace = dedupedSpaces.get(space.key)

    if (!existingSpace) {
      dedupedSpaces.set(space.key, withAppearance(
        {
          key: space.key,
          name: space.name,
          enabled: space.enabled,
        },
        space.icon,
        space.color,
        space.teamFilter,
      ))
      continue
    }

    dedupedSpaces.set(space.key, withAppearance(
      {
        key: existingSpace.key,
        name: existingSpace.name || space.name,
        enabled: existingSpace.enabled || space.enabled,
      },
      existingSpace.icon ?? space.icon,
      existingSpace.color ?? space.color,
      existingSpace.teamFilter ?? space.teamFilter,
    ))
  }

  const sorted = [...dedupedSpaces.values()].sort(sortSpaceSettings)

  if (!sorted.some(space => space.key === LOCAL_SPACE_KEY)) {
    sorted.push({
      key: LOCAL_SPACE_KEY,
      name: LOCAL_SPACE_NAME,
      enabled: true,
    })
    sorted.sort(sortSpaceSettings)
  }

  return sorted
}

export function normalizeSpacesFromRecord(recordValue: Record<string, unknown>): AppSpaceSetting[] {
  const spaces = normalizeSpaceSettings(recordValue.spaces)
  const visibleSpaceKeys = normalizeSpaceKeyList(recordValue.visibleSpaceKeys)
  const hiddenSpaceKeys = normalizeSpaceKeyList(recordValue.hiddenSpaceKeys)

  return [
    ...spaces,
    ...createLegacySpaceSettings(visibleSpaceKeys, true),
    ...createLegacySpaceSettings(hiddenSpaceKeys, false),
  ]
}
