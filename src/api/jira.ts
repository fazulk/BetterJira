import type {
  CreateJiraTicketInput,
  JiraActivityItem,
  JiraAdfDocument,
  JiraAssignableUser,
  JiraAttachment,
  JiraCreateIssueType,
  JiraCreateIssueTypeOption,
  JiraMessage,
  JiraPriority,
  JiraTicket,
  JiraTransition,
} from '@/types/jira'
import type {
  GenerateAiDescriptionRequest,
  GenerateAiDescriptionResponse,
} from '~/shared/ai'
import type { TicketDevStatus } from '~/shared/devStatus'
import { isLocalTicketKey } from '~/shared/localTickets'
import { isRecord } from '~/shared/typeGuards'

const BASE = '/api'

export interface TicketsPayload {
  tickets: JiraTicket[]
  updatedAt?: number | string
  mode?: 'full' | 'incremental'
}

export interface RefreshTicketsInput {
  updatedSince?: string
}

export interface FetchTicketsInput {
  jql?: string
  updatedSince?: string
}

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

export async function fetchTickets(input: FetchTicketsInput = {}): Promise<JiraTicket[]> {
  const params = new URLSearchParams()
  if (input.jql) {
    params.set('jql', input.jql)
  }
  if (input.updatedSince) {
    params.set('updatedSince', input.updatedSince)
  }

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const res = await fetch(`${BASE}/tickets${query}`)
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `Failed to fetch tickets: ${res.status} ${res.statusText}`))
  }
  return res.json()
}

export async function fetchTicket(key: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}`)
  if (!res.ok)
    throw new Error(`Failed to fetch ticket: ${res.statusText}`)
  return res.json()
}

export async function createTicket(input: CreateJiraTicketInput): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to create ticket: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchCreateIssueTypes(parentKey?: string | null): Promise<JiraCreateIssueTypeOption[]> {
  const params = new URLSearchParams()
  if (parentKey) {
    params.set('parentKey', parentKey)
  }

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const res = await fetch(`${BASE}/create-issue-types${query}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch create issue types: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchCreateAssignableUsers(
  issueType: JiraCreateIssueType,
  parentKey?: string | null,
  spaceKey?: string | null,
): Promise<JiraAssignableUser[]> {
  const params = new URLSearchParams({ issueType })
  if (parentKey) {
    params.set('parentKey', parentKey)
  }
  if (spaceKey) {
    params.set('spaceKey', spaceKey)
  }

  const res = await fetch(`${BASE}/create-assignees?${params.toString()}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch create assignees: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchAllPriorities(): Promise<JiraPriority[]> {
  const res = await fetch(`${BASE}/priorities`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch priorities: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export interface JiraMeResponse {
  accountId: string
  displayName: string
}

export async function fetchJiraCurrentUser(): Promise<JiraMeResponse> {
  const res = await fetch(`${BASE}/jira-me`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch Jira profile: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchTicketMessages(key: string): Promise<JiraMessage[]> {
  const res = await fetch(`${BASE}/tickets/${key}/messages`)
  if (!res.ok)
    throw new Error(`Failed to fetch messages: ${res.statusText}`)
  return res.json()
}

export async function fetchTicketActivity(key: string): Promise<JiraActivityItem[]> {
  const res = await fetch(`${BASE}/tickets/${key}/activity`)
  if (!res.ok)
    throw new Error(`Failed to fetch activity: ${res.statusText}`)
  return res.json()
}

export async function addTicketMessage(key: string, body: string): Promise<JiraMessage> {
  const res = await fetch(`${BASE}/tickets/${key}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })

  if (!res.ok) {
    const responseBody = await res.text().catch(() => '')
    throw new Error(`Failed to add message: ${res.status} ${res.statusText}${responseBody ? ` - ${responseBody}` : ''}`)
  }

  return res.json()
}

export async function updateTicketTitle(key: string, title: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}/title`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update title: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function uploadTicketAttachment(key: string, file: File): Promise<JiraAttachment> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  const res = await fetch(`${BASE}/tickets/${encodeURIComponent(key)}/attachments`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to upload attachment: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateTicketDescription(key: string, descriptionAdf: JiraAdfDocument | null): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}/description`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ descriptionAdf }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update description: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function generateAiDescription(
  key: string,
  input: GenerateAiDescriptionRequest,
): Promise<GenerateAiDescriptionResponse> {
  const encodedKey = encodeURIComponent(key)
  const path = isLocalTicketKey(key)
    ? `${BASE}/local/tickets/${encodedKey}/ai-description`
    : `${BASE}/tickets/${encodedKey}/ai-description`

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to generate AI description: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchAssignableUsers(key: string): Promise<JiraAssignableUser[]> {
  const res = await fetch(`${BASE}/tickets/${key}/assignees`)
  if (!res.ok)
    throw new Error(`Failed to fetch assignees: ${res.statusText}`)
  return res.json()
}

export async function updateTicketAssignee(key: string, accountId: string | null): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}/assignee`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountId }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update assignee: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateTicketPriority(key: string, priorityId: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}/priority`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priorityId }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update priority: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateTicketTeam(key: string, teamId: string | null): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${encodeURIComponent(key)}/team`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ teamId }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update team: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateTicketLabels(key: string, labels: string[]): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${encodeURIComponent(key)}/labels`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ labels }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update labels: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchTransitions(key: string): Promise<JiraTransition[]> {
  const res = await fetch(`${BASE}/tickets/${key}/transitions`)
  if (!res.ok)
    throw new Error(`Failed to fetch transitions: ${res.statusText}`)
  return res.json()
}

export async function updateTicketStatus(key: string, transitionId: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transitionId }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update status: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateTicketWatching(key: string, watching: boolean): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/tickets/${key}/watching`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ watching }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update watch state: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function fetchTicketDevStatus(key: string): Promise<TicketDevStatus> {
  const res = await fetch(`${BASE}/tickets/${key}/dev-status`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch development status: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function refreshCache(input: RefreshTicketsInput = {}): Promise<TicketsPayload> {
  const res = await fetch(`${BASE}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `Failed to refresh cache: ${res.status} ${res.statusText}`))
  }
  return res.json()
}
