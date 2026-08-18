import { env } from './config'
import { JiraApiError, JiraNetworkError } from './errors'
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
  return url.pathname.replace(/^\/rest\/(?:api\/3|agile\/1\.0|dev-status\/latest)/, '') || '/'
}

interface SystemErrorLike {
  code?: unknown
  message?: unknown
  errors?: unknown
  cause?: unknown
}

function isSystemErrorLike(value: unknown): value is SystemErrorLike {
  return typeof value === 'object' && value !== null
}

// Plain-English hints keyed by the Node/undici system error code. The code is
// still appended so a user can search/report it exactly.
const NETWORK_ERROR_HINTS: Record<string, string> = {
  ENOTFOUND: 'the address could not be resolved — check the Jira URL',
  EAI_AGAIN: 'a temporary DNS failure — check your network connection',
  ECONNREFUSED: 'the connection was refused',
  ECONNRESET: 'the connection was reset',
  ETIMEDOUT: 'the connection timed out',
  UND_ERR_CONNECT_TIMEOUT: 'the connection timed out',
  UND_ERR_HEADERS_TIMEOUT: 'the server took too long to respond',
  UND_ERR_SOCKET: 'the connection was closed unexpectedly',
  CERT_HAS_EXPIRED: 'the server TLS certificate has expired',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'the server uses a self-signed TLS certificate',
  SELF_SIGNED_CERT_IN_CHAIN: 'a self-signed certificate is in the TLS chain',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'the server TLS certificate could not be verified',
}

/**
 * Turn a failed `fetch()` into a JiraNetworkError whose message names the host
 * and the real underlying reason. undici throws a generic `TypeError: fetch
 * failed` and nests the real system error under `.cause` (an AggregateError
 * when several DNS results all fail), so a bare rethrow loses everything the
 * user needs. Callers wrap only the `fetch()` call, so anything caught there is
 * a connection-level failure.
 */
export function toJiraNetworkError(error: unknown, url: URL): JiraNetworkError {
  let cause: unknown = isSystemErrorLike(error) ? error.cause : undefined
  if (isSystemErrorLike(cause) && Array.isArray(cause.errors) && cause.errors.length > 0) {
    cause = cause.errors[0]
  }

  const code = isSystemErrorLike(cause) && typeof cause.code === 'string'
    ? cause.code
    : (isSystemErrorLike(error) && typeof error.code === 'string' ? error.code : undefined)
  const rawMessage = isSystemErrorLike(cause) && typeof cause.message === 'string'
    ? cause.message
    : (error instanceof Error ? error.message : 'unknown network error')

  const hint = code ? NETWORK_ERROR_HINTS[code] : undefined
  const detail = hint
    ? `${hint}${code ? ` (${code})` : ''}`
    : (code ? `${rawMessage} (${code})` : rawMessage)

  return new JiraNetworkError(`Could not reach Jira at ${url.host} — ${detail}.`, code, { cause: error })
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
    const networkError = toJiraNetworkError(error, url)
    console.error(formatJiraLogLines('xx', method, `${requestTarget} (${durationMs}ms)`, [
      `error: ${networkError.message}`,
      ...(networkError.code ? [`code: ${networkError.code}`] : []),
      ...requestDetails,
    ]))
    throw networkError
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
