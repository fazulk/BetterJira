import type { CacheEntry } from './jiraClient'
import type { JiraAssignableUser } from './jiraTypes'
import { createHash } from 'node:crypto'
import { isRecord } from '../shared/typeGuards'
import { getJiraConfig, jiraFetch } from './jiraClient'
import { isJiraApiUser } from './jiraIssueMapping'
import { getCandidateProjects } from './jiraProjects'

const DIRECTORY_TTL = 5 * 60_000
const ELIGIBILITY_TTL = 2 * 60_000
const CONCURRENT_CHECKS = 4

function createAssigneeCache(connection: string) {
  return {
    connection,
    directory: new Map<string, CacheEntry<Promise<JiraAssignableUser[]>>>(),
    eligibility: new Map<string, CacheEntry<Promise<boolean>>>(),
  }
}

let assigneeCache = createAssigneeCache('')

function getAssigneeCache() {
  const { baseUrl, email, apiToken } = getJiraConfig()
  const connection = createHash('sha256').update(JSON.stringify([baseUrl, email, apiToken])).digest('hex')
  if (assigneeCache.connection !== connection) {
    assigneeCache = createAssigneeCache(connection)
  }
  for (const [key, entry] of assigneeCache.eligibility) {
    if (entry.expiresAt <= Date.now())
      assigneeCache.eligibility.delete(key)
  }
  return assigneeCache
}

function cachedRequest<T>(cache: Map<string, CacheEntry<Promise<T>>>, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now())
    return cached.value

  const entry: CacheEntry<Promise<T>> = { expiresAt: Infinity, value: Promise.resolve().then(load) }
  entry.value = entry.value.then((value) => {
    entry.expiresAt = Date.now() + ttl
    return value
  }, (error: unknown) => {
    if (cache.get(key) === entry)
      cache.delete(key)
    throw error
  })
  cache.set(key, entry)
  return entry.value
}

function readUserArray(data: unknown): unknown[] {
  if (!Array.isArray(data))
    throw new Error('Jira returned an invalid user list')
  return data
}

function isActivePerson(user: unknown): user is JiraAssignableUser {
  return isRecord(user) && user.active === true && user.accountType === 'atlassian' && isJiraApiUser(user)
}

function sortUsers(users: JiraAssignableUser[]): JiraAssignableUser[] {
  return [...new Map(users.map(user => [user.accountId, { accountId: user.accountId, displayName: user.displayName }])).values()]
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
}

async function fetchDirectory(): Promise<JiraAssignableUser[]> {
  const users: JiraAssignableUser[] = []
  for (let startAt = 0; ;) {
    const page = readUserArray(await jiraFetch('/users/search', {
      params: { startAt: String(startAt), maxResults: '1000' },
    }))
    if (!page.length)
      return sortUsers(users)
    users.push(...page.filter(isActivePerson))
    // Advance over raw records, including inactive accounts and apps.
    startAt += page.length
  }
}

let activeChecks = 0
const waitingChecks: Array<() => void> = []

async function checkEligibility(issueKey: string, accountId: string): Promise<boolean> {
  if (activeChecks < CONCURRENT_CHECKS)
    activeChecks++
  else await new Promise<void>(resolve => waitingChecks.push(resolve))

  try {
    const users = readUserArray(await jiraFetch('/user/assignable/search', {
      params: { issueKey, accountId, maxResults: '1' },
    }))
    return users.some(user => isJiraApiUser(user) && user.accountId === accountId)
  }
  finally {
    const next = waitingChecks.shift()
    if (next)
      next()
    else activeChecks--
  }
}

/** Search the complete directory, but offer only people assignable to this exact issue. */
export async function getTicketAssignableUsers(issueKey: string, query = ''): Promise<JiraAssignableUser[]> {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    const suggestions = readUserArray(await jiraFetch('/user/assignable/search', {
      params: { issueKey, query: '', recommend: 'true', maxResults: '50', accountType: 'atlassian' },
    }))
    return sortUsers(suggestions.filter(isActivePerson))
  }

  const cache = getAssigneeCache()
  const directory = await cachedRequest(cache.directory, 'users', DIRECTORY_TTL, fetchDirectory)
  const candidates = directory.filter(user => user.displayName.toLowerCase().includes(normalizedQuery))
  const eligible: JiraAssignableUser[] = []
  let index = 0
  let failed = false
  await Promise.all(Array.from({ length: Math.min(CONCURRENT_CHECKS, candidates.length) }, async () => {
    while (!failed) {
      const user = candidates[index++]
      if (!user)
        return
      try {
        if (await cachedRequest(cache.eligibility, JSON.stringify([issueKey, user.accountId]), ELIGIBILITY_TTL, () => checkEligibility(issueKey, user.accountId))) {
          eligible.push(user)
        }
      }
      catch (error) {
        failed = true
        throw error
      }
    }
  }))
  return sortUsers(eligible)
}

async function fetchAssignableUsersPageWindow(projectKeys: string): Promise<JiraAssignableUser[]> {
  const pageSize = 100
  const maxSearchableUsers = 1000
  const usersByAccountId = new Map<string, JiraAssignableUser>()

  // Jira slices the global user list before checking assignability, so a single
  // page can miss valid assignees even when more exist later in the first 1000 users.
  for (let startAt = 0; startAt < maxSearchableUsers; startAt += pageSize) {
    const data = await jiraFetch('/user/assignable/multiProjectSearch', {
      params: {
        projectKeys,
        startAt: String(startAt),
        maxResults: String(pageSize),
      },
    })

    if (!Array.isArray(data)) {
      continue
    }

    for (const user of data) {
      if (!isJiraApiUser(user)) {
        continue
      }

      usersByAccountId.set(user.accountId, {
        accountId: user.accountId,
        displayName: user.displayName,
      })
    }
  }

  return [...usersByAccountId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName))
}

export async function getAllAssignableUsers(): Promise<JiraAssignableUser[]> {
  const projects = await getCandidateProjects()
  const projectKeys = [...new Set(projects
    .map(project => typeof project.key === 'string' ? project.key.trim() : '')
    .filter(Boolean))]

  return fetchAssignableUsersPageWindow(projectKeys.join(','))
}
