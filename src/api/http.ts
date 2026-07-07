import { isRecord } from '~/shared/typeGuards'

const BASE = '/api'

async function readErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  const body = await res.text().catch(() => '')
  if (!body) {
    return fallbackMessage
  }

  try {
    const parsed: unknown = JSON.parse(body)
    if (isRecord(parsed) && typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      return `${fallbackMessage} - ${parsed.error}`
    }
  }
  catch {
    // Fall back to the raw response body when JSON parsing fails.
  }

  return `${fallbackMessage} - ${body}`
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** JSON request body; sets the Content-Type header. */
  json?: unknown
  /** Multipart request body; mutually exclusive with json. */
  formData?: FormData
  /** Query parameters; null/undefined/empty values are omitted. */
  query?: Record<string, string | null | undefined>
}

/**
 * Fetch an API route and parse the JSON response. Path segments are
 * URL-encoded when given as an array. Failures throw an Error prefixed with
 * failureLabel, enriched with the server's `{ error }` body when present.
 */
export async function apiFetch<T>(
  path: string | readonly string[],
  failureLabel: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const pathname = typeof path === 'string'
    ? path
    : `/${path.map(encodeURIComponent).join('/')}`

  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value) {
      params.set(name, value)
    }
  }
  const query = params.size > 0 ? `?${params.toString()}` : ''

  const res = await fetch(`${BASE}${pathname}${query}`, {
    method: options.method,
    ...(options.json !== undefined
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options.json),
        }
      : {}),
    ...(options.formData ? { body: options.formData } : {}),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `${failureLabel}: ${res.status} ${res.statusText}`))
  }

  return res.json()
}
