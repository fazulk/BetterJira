import type { JiraAdfDocument } from '../shared/jiraAdf'
import { isJiraAdfDocument } from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'

export const API_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}

const TICKET_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/

export function isJiraRemoteTicketKey(key: string): boolean {
  return TICKET_KEY_PATTERN.test(key) && !key.toUpperCase().startsWith('LOCAL-')
}

export function isCreateIssueType(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseRefreshUpdatedSince(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function parseCreateFields(value: unknown): Record<string, string | string[] | JiraAdfDocument | null> {
  if (!isRecord(value)) {
    return {}
  }

  const fields: Record<string, string | string[] | JiraAdfDocument | null> = {}

  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue === 'string' || fieldValue === null) {
      fields[key] = fieldValue
      continue
    }

    if (Array.isArray(fieldValue)) {
      fields[key] = fieldValue.filter((entry): entry is string => typeof entry === 'string')
      continue
    }

    if (key === 'description' && isJiraAdfDocument(fieldValue)) {
      fields[key] = fieldValue
    }
  }

  return fields
}

export function getStringQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === 'string' && entry.length > 0)
  }

  return undefined
}

export function notFoundResponse(): Response {
  return Response.json({ error: 'Not found' }, { status: 404, headers: API_HEADERS })
}

export function badRequestResponse(message: string): Response {
  return Response.json({ error: message }, { status: 400, headers: API_HEADERS })
}

export function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  }
  catch {
    return null
  }
}

export function jiraContentResponse(jiraResponse: Response): Response {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, max-age=300',
  })
  const contentType = jiraResponse.headers.get('Content-Type')
  const contentLength = jiraResponse.headers.get('Content-Length')
  const contentDisposition = jiraResponse.headers.get('Content-Disposition')

  if (contentType)
    headers.set('Content-Type', contentType)
  if (contentLength)
    headers.set('Content-Length', contentLength)
  if (contentDisposition)
    headers.set('Content-Disposition', contentDisposition)

  return new Response(jiraResponse.body, {
    status: jiraResponse.status,
    headers,
  })
}

/** Reads a required string body field; returns '' when absent or not a string. */
export function parseStringBodyField(body: unknown, key: string): string {
  if (!isRecord(body)) {
    return ''
  }

  const value = body[key]
  return typeof value === 'string' ? value : ''
}

/** Reads an optional string body field; returns null when absent or not a string. */
export function parseNullableStringBodyField(body: unknown, key: string): string | null {
  if (!isRecord(body)) {
    return null
  }

  const value = body[key]
  return typeof value === 'string' ? value : null
}

export function parseDescriptionBody(body: unknown): JiraAdfDocument | null {
  return isRecord(body) && isJiraAdfDocument(body.descriptionAdf)
    ? body.descriptionAdf
    : null
}

/** Returns the labels array, or null when the body is not `{ labels: string[] }`. */
export function parseLabelsBody(body: unknown): string[] | null {
  if (!isRecord(body) || !Array.isArray(body.labels)) {
    return null
  }

  const labels: string[] = []
  for (const label of body.labels) {
    if (typeof label !== 'string') {
      return null
    }
    labels.push(label)
  }

  return labels
}
