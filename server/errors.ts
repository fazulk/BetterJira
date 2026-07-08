/** Raised when the Jira REST API responds with a non-2xx status. */
export class JiraApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'JiraApiError'
    this.status = status
  }
}

/**
 * Raised when the request to Jira fails at the network level — before any HTTP
 * response (DNS, TLS, connection refused/timeout). Carries the underlying system
 * error code so the client toast can show the real reason instead of a bare
 * "fetch failed". Mapped to HTTP 502 by the API route handler.
 */
export class JiraNetworkError extends Error {
  /** Underlying system error code, e.g. ENOTFOUND, ECONNREFUSED, ETIMEDOUT. */
  readonly code?: string

  constructor(message: string, code?: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'JiraNetworkError'
    this.code = code
  }
}

/** Raised for domain validation failures; mapped to HTTP 400 by the API route handler. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
