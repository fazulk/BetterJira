import { env } from './config'
import { JiraApiError } from './errors'
import { getJiraCredentials } from './jiraCredentials'

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export interface JiraFetchOptions {
  method?: string
  params?: Record<string, string>
  body?: unknown
  /** Jira REST base path. Defaults to the v3 platform API. */
  basePath?: string
}

export interface CacheEntry<T> {
  expiresAt: number
  value: T
}

export function getJiraConfig() {
  const { baseUrl, email, apiToken } = getJiraCredentials()

  return {
    baseUrl,
    email,
    apiToken,
    projectKey: env.JIRA_PROJECT_KEY,
    authHeader: `Basic ${btoa(`${email}:${apiToken}`)}`,
  }
}

export function isJiraAuthenticationFailure(res: Response): boolean {
  return res.headers.get('x-seraph-loginreason') === 'AUTHENTICATED_FAILED'
}

export function createJiraAuthenticationError(): Error {
  return new Error('Jira authentication failed. Update your Jira email or API token in Settings.')
}

export function serializeJiraLogPayload(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }

  try {
    return JSON.stringify(value)
  }
  catch {
    return '[unserializable]'
  }
}

export function formatJiraRequestTarget(url: URL): string {
  return url.pathname.replace(/^\/rest\/(?:api\/3|dev-status\/latest)/, '') || '/'
}

export function formatJiraLogLines(
  prefix: string,
  method: string,
  target: string,
  details: string[],
): string {
  return [`[jira] ${prefix} ${method} ${target}`, ...details.map(detail => `  ${detail}`)].join('\n')
}

export function collectJiraRequestDetails(
  params?: Record<string, string>,
  body?: unknown,
): string[] {
  const details: string[] = []

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      details.push(`param ${key}: ${value}`)
    }
  }

  const serializedBody = serializeJiraLogPayload(body)
  if (serializedBody) {
    details.push(`body: ${serializedBody}`)
  }

  return details
}

export async function jiraFetch(path: string, options?: JiraFetchOptions): Promise<unknown> {
  const jiraConfig = getJiraConfig()
  const basePath = options?.basePath ?? '/rest/api/3'
  const url = new URL(`${jiraConfig.baseUrl}${basePath}${path}`)
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v)
    }
  }

  const method = options?.method ?? 'GET'
  const requestUrl = url.toString()
  const requestTarget = formatJiraRequestTarget(url)
  const startedAt = Date.now()
  const requestDetails = collectJiraRequestDetails(options?.params, options?.body)

  console.warn(formatJiraLogLines('->', method, requestTarget, requestDetails))

  let res: Response
  try {
    res = await fetch(requestUrl, {
      method,
      headers: {
        'Authorization': jiraConfig.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })
  }
  catch (error: unknown) {
    const durationMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : 'Unknown Jira fetch error'
    console.error(formatJiraLogLines('xx', method, `${requestTarget} (${durationMs}ms)`, [
      `error: ${message}`,
      ...requestDetails,
    ]))
    throw error
  }

  const durationMs = Date.now() - startedAt
  console.warn(`[jira] <- ${res.status} ${method} ${requestTarget} (${durationMs}ms)`)

  if (isJiraAuthenticationFailure(res)) {
    throw createJiraAuthenticationError()
  }

  if (!res.ok) {
    const body = await res.text()
    throw new JiraApiError(res.status, `JIRA API ${res.status}: ${body.slice(0, 200)}`)
  }

  if (res.status === 204)
    return null

  return res.json()
}

export function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const cached = cache.get(key)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  return cached.value
}

export function setCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): T {
  cache.set(key, {
    expiresAt: Date.now() + THIRTY_DAYS_MS,
    value,
  })

  return value
}
