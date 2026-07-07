/** Raised when the Jira REST API responds with a non-2xx status. */
export class JiraApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'JiraApiError'
    this.status = status
  }
}

/** Raised for domain validation failures; mapped to HTTP 400 by the API route handler. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
