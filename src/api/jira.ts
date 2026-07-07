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
import { apiFetch } from '@/api/http'
import { isLocalTicketKey } from '~/shared/localTickets'

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

export interface JiraMeResponse {
  accountId: string
  displayName: string
}

export function fetchTickets(input: FetchTicketsInput = {}): Promise<JiraTicket[]> {
  return apiFetch('/tickets', 'Failed to fetch tickets', {
    query: { jql: input.jql, updatedSince: input.updatedSince },
  })
}

export function fetchTicket(key: string): Promise<JiraTicket> {
  return apiFetch(['tickets', key], 'Failed to fetch ticket')
}

export function createTicket(input: CreateJiraTicketInput): Promise<JiraTicket> {
  return apiFetch('/tickets', 'Failed to create ticket', { method: 'POST', json: input })
}

export function fetchCreateIssueTypes(parentKey?: string | null): Promise<JiraCreateIssueTypeOption[]> {
  return apiFetch('/create-issue-types', 'Failed to fetch create issue types', {
    query: { parentKey },
  })
}

export function fetchCreateAssignableUsers(
  issueType: JiraCreateIssueType,
  parentKey?: string | null,
  spaceKey?: string | null,
): Promise<JiraAssignableUser[]> {
  return apiFetch('/create-assignees', 'Failed to fetch create assignees', {
    query: { issueType, parentKey, spaceKey },
  })
}

export function fetchAllPriorities(): Promise<JiraPriority[]> {
  return apiFetch('/priorities', 'Failed to fetch priorities')
}

export function fetchJiraCurrentUser(): Promise<JiraMeResponse> {
  return apiFetch('/jira-me', 'Failed to fetch Jira profile')
}

export function fetchTicketMessages(key: string): Promise<JiraMessage[]> {
  return apiFetch(['tickets', key, 'messages'], 'Failed to fetch messages')
}

export function fetchTicketActivity(key: string): Promise<JiraActivityItem[]> {
  return apiFetch(['tickets', key, 'activity'], 'Failed to fetch activity')
}

export function addTicketMessage(key: string, body: string): Promise<JiraMessage> {
  return apiFetch(['tickets', key, 'messages'], 'Failed to add message', {
    method: 'POST',
    json: { body },
  })
}

export function updateTicketTitle(key: string, title: string): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'title'], 'Failed to update title', {
    method: 'PUT',
    json: { title },
  })
}

export function uploadTicketAttachment(key: string, file: File): Promise<JiraAttachment> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  return apiFetch(['tickets', key, 'attachments'], 'Failed to upload attachment', {
    method: 'POST',
    formData,
  })
}

export function updateTicketDescription(key: string, descriptionAdf: JiraAdfDocument | null): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'description'], 'Failed to update description', {
    method: 'PUT',
    json: { descriptionAdf },
  })
}

export function generateAiDescription(
  key: string,
  input: GenerateAiDescriptionRequest,
): Promise<GenerateAiDescriptionResponse> {
  const path = isLocalTicketKey(key)
    ? (['local', 'tickets', key, 'ai-description'] as const)
    : (['tickets', key, 'ai-description'] as const)

  return apiFetch(path, 'Failed to generate AI description', { method: 'POST', json: input })
}

export function fetchAssignableUsers(key: string): Promise<JiraAssignableUser[]> {
  return apiFetch(['tickets', key, 'assignees'], 'Failed to fetch assignees')
}

export function updateTicketAssignee(key: string, accountId: string | null): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'assignee'], 'Failed to update assignee', {
    method: 'PUT',
    json: { accountId },
  })
}

export function updateTicketPriority(key: string, priorityId: string): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'priority'], 'Failed to update priority', {
    method: 'PUT',
    json: { priorityId },
  })
}

export function updateTicketTeam(key: string, teamId: string | null): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'team'], 'Failed to update team', {
    method: 'PUT',
    json: { teamId },
  })
}

export function updateTicketLabels(key: string, labels: string[]): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'labels'], 'Failed to update labels', {
    method: 'PUT',
    json: { labels },
  })
}

export function fetchTransitions(key: string): Promise<JiraTransition[]> {
  return apiFetch(['tickets', key, 'transitions'], 'Failed to fetch transitions')
}

export function updateTicketStatus(key: string, transitionId: string): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'status'], 'Failed to update status', {
    method: 'PUT',
    json: { transitionId },
  })
}

export function updateTicketWatching(key: string, watching: boolean): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'watching'], 'Failed to update watch state', {
    method: 'PUT',
    json: { watching },
  })
}

export function fetchTicketDevStatus(key: string): Promise<TicketDevStatus> {
  return apiFetch(['tickets', key, 'dev-status'], 'Failed to fetch development status')
}

export function refreshCache(input: RefreshTicketsInput = {}): Promise<TicketsPayload> {
  return apiFetch('/refresh', 'Failed to refresh cache', { method: 'POST', json: input })
}
