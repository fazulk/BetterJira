import type { JiraAdfDocument, JiraTicket } from '@/types/jira'
import type { LocalStatusId } from '~/shared/localTickets'
import { apiFetch } from '@/api/http'

export interface CreateLocalTicketInput {
  summary: string
  descriptionAdf?: JiraAdfDocument | null
  priority?: string
  assigneeName?: string | null
  statusId?: LocalStatusId
  parentKey?: string | null
  dueDate?: string | null
}

export function fetchLocalTickets(): Promise<JiraTicket[]> {
  return apiFetch('/local/tickets', 'Failed to fetch local tickets')
}

export function fetchLocalTicket(key: string): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key], 'Failed to fetch local ticket')
}

export function createLocalTicket(input: CreateLocalTicketInput): Promise<JiraTicket> {
  return apiFetch('/local/tickets', 'Failed to create local ticket', { method: 'POST', json: input })
}

export function updateLocalTicketTitle(key: string, title: string): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key, 'title'], 'Failed to update title', {
    method: 'PUT',
    json: { title },
  })
}

export function updateLocalTicketDescription(
  key: string,
  descriptionAdf: JiraAdfDocument | null,
): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key, 'description'], 'Failed to update description', {
    method: 'PUT',
    json: { descriptionAdf },
  })
}

export function updateLocalTicketStatus(key: string, transitionId: string): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key, 'status'], 'Failed to update status', {
    method: 'PUT',
    json: { transitionId },
  })
}

export function updateLocalTicketPriority(key: string, priorityName: string): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key, 'priority'], 'Failed to update priority', {
    method: 'PUT',
    json: { priorityName },
  })
}

export function updateLocalTicketAssignee(
  key: string,
  assigneeName: string | null,
): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key, 'assignee'], 'Failed to update assignee', {
    method: 'PUT',
    json: { assigneeName },
  })
}

export function updateLocalTicketLabels(key: string, labels: string[]): Promise<JiraTicket> {
  return apiFetch(['local', 'tickets', key, 'labels'], 'Failed to update labels', {
    method: 'PUT',
    json: { labels },
  })
}
