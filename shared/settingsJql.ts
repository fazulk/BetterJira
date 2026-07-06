import type { AppSpaceSetting } from './settingsTypes'
import { LOCAL_SPACE_KEY } from './localTickets'
import { normalizeSpaceKey } from './settingsNormalizers'

export type SpaceSearchQueryInput = Pick<AppSpaceSetting, 'key' | 'teamFilter'>

function escapeJqlStringValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function quoteJqlValue(value: string): string {
  return `"${escapeJqlStringValue(value)}"`
}

export function buildEnabledSpaceSearchQuery(spaces: readonly SpaceSearchQueryInput[]): string | null {
  const fullProjectKeys = new Set<string>()
  const teamIdsByProjectKey = new Map<string, Set<string>>()

  for (const space of spaces) {
    if (space.teamFilter) {
      const projectKey = normalizeSpaceKey(space.teamFilter.projectKey)
      if (!projectKey || projectKey === LOCAL_SPACE_KEY) {
        continue
      }

      const teamIds = teamIdsByProjectKey.get(projectKey) ?? new Set<string>()
      teamIds.add(space.teamFilter.teamId)
      teamIdsByProjectKey.set(projectKey, teamIds)
      continue
    }

    const projectKey = normalizeSpaceKey(space.key)
    if (!projectKey || projectKey === LOCAL_SPACE_KEY) {
      continue
    }

    fullProjectKeys.add(projectKey)
  }

  // A fully-included project already covers its team slices.
  for (const projectKey of fullProjectKeys) {
    teamIdsByProjectKey.delete(projectKey)
  }

  const clauses: string[] = []

  if (fullProjectKeys.size > 0) {
    const projectKeys = [...fullProjectKeys].map(quoteJqlValue).join(', ')
    clauses.push(`project in (${projectKeys})`)
  }

  for (const [projectKey, teamIds] of teamIdsByProjectKey) {
    const teamValues = [...teamIds].map(quoteJqlValue).join(', ')
    clauses.push(`(project = ${quoteJqlValue(projectKey)} AND "Team[Team]" in (${teamValues}))`)
  }

  if (clauses.length === 0) {
    return null
  }

  const whereClause = clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`
  return `${whereClause} ORDER BY updated DESC`
}

export function buildUpdatedSinceSearchQuery(baseQuery: string, updatedSince: Date): string {
  const queryWithoutOrder = baseQuery.replace(/\s+ORDER\s+BY\s+updated\s+DESC\s*$/i, '').trim()
  const elapsedMs = Math.max(0, Date.now() - updatedSince.getTime())
  const elapsedMinutes = Math.ceil(elapsedMs / 60_000)
  const overlapWindowMinutes = Math.max(1, elapsedMinutes + 1)
  const updatedSinceClause = `updated >= "-${overlapWindowMinutes}m"`
  return `${queryWithoutOrder} AND ${updatedSinceClause} ORDER BY updated DESC`
}
