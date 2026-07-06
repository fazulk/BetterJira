import type { JiraAdfDocument, JiraTicket } from '@/types/jira'
import type { LocalStatusId } from '~/shared/localTickets'

const BASE = '/api'

export interface CreateLocalTicketInput {
  summary: string
  descriptionAdf?: JiraAdfDocument | null
  priority?: string
  assigneeName?: string | null
  statusId?: LocalStatusId
  parentKey?: string | null
  dueDate?: string | null
}

export async function fetchLocalTickets(): Promise<JiraTicket[]> {
  const res = await fetch(`${BASE}/local/tickets`)
  if (!res.ok)
    throw new Error(`Failed to fetch local tickets: ${res.statusText}`)
  return res.json()
}

export async function fetchLocalTicket(key: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}`)
  if (!res.ok)
    throw new Error(`Failed to fetch local ticket: ${res.statusText}`)
  return res.json()
}

export async function createLocalTicket(input: CreateLocalTicketInput): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to create local ticket: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateLocalTicketTitle(key: string, title: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}/title`, {
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

export async function updateLocalTicketDescription(
  key: string,
  descriptionAdf: JiraAdfDocument | null,
): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}/description`, {
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

export async function updateLocalTicketStatus(key: string, transitionId: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}/status`, {
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

export async function updateLocalTicketPriority(key: string, priorityName: string): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}/priority`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priorityName }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update priority: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateLocalTicketAssignee(
  key: string,
  assigneeName: string | null,
): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}/assignee`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assigneeName }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to update assignee: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }

  return res.json()
}

export async function updateLocalTicketLabels(key: string, labels: string[]): Promise<JiraTicket> {
  const res = await fetch(`${BASE}/local/tickets/${encodeURIComponent(key)}/labels`, {
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
