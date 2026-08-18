import type { JiraAdfDocument, JiraAdfMark, JiraAdfNode } from '~/shared/jiraAdf'

export type { JiraAdfDocument, JiraAdfMark, JiraAdfNode }

export interface JiraAttachment {
  id: string
  filename: string
  mimeType?: string
  content?: string
  thumbnail?: string
}

export interface JiraTeamRef {
  id: string
  name: string
}

export interface JiraSprintRef {
  id: string
  name: string
  state?: 'future' | 'active' | 'closed'
}

export interface JiraTicket {
  key: string
  summary: string
  status: string
  statusCategory: string
  inCurrentSprint: boolean
  sprints?: JiraSprintRef[]
  storyPoints?: number
  createdAt?: string
  updatedAt?: string
  dueDate?: string
  completedAt?: string
  priority: string
  issueType: string
  labels: string[]
  spaceKey: string
  spaceName: string
  team?: JiraTeamRef
  assignee: string
  assigneeAccountId?: string
  reporter?: string
  reporterAccountId?: string
  testedBy?: string
  approvers?: string[]
  approvedToProductionBy?: string
  isWatching?: boolean
  watchCount?: number
  description?: string
  descriptionAdf?: JiraAdfDocument
  attachments?: JiraAttachment[]
  self: string
  parent?: {
    key: string
    summary: string
    issueType: string
  }
}

export interface JiraAssignableUser {
  accountId: string
  displayName: string
}

export interface JiraMessage {
  id: string
  author: string
  createdAt: string
  body: string
  parentMessageId?: string | null
}

export interface JiraActivityComment extends JiraMessage {
  kind: 'comment'
}

export interface JiraActivityHistory {
  kind: 'history'
  id: string
  author: string
  createdAt: string
  body: string
  field: string
  from?: string
  to?: string
}

export type JiraActivityItem = JiraActivityComment | JiraActivityHistory

export interface JiraTransition {
  id: string
  name: string
  statusCategory: string
}

export interface JiraPriority {
  id: string
  name: string
}

export type JiraCreateIssueType = string

export interface JiraCreateIssueTypeOption {
  id: string
  name: string
  subtask: boolean
  hierarchyLevel: number
  parentRequired: boolean
  parentSupported: boolean
}

export type JiraCreateFieldValue = string | string[] | JiraAdfDocument | null

export interface CreateJiraTicketInput {
  issueType: JiraCreateIssueType
  spaceKey?: string | null
  parentKey?: string | null
  fields: Record<string, JiraCreateFieldValue>
}

export type StatusGroup = 'new' | 'indeterminate' | 'done'
export type LinearIssueSubtype = 'Bug' | 'Feature' | 'Story' | 'Task'

export function getStatusGroup(statusCategory: string): StatusGroup {
  if (statusCategory === 'done')
    return 'done'
  if (statusCategory === 'new')
    return 'new'
  return 'indeterminate'
}

export function getLinearIssueSubtype(issueType: string): LinearIssueSubtype {
  const normalized = issueType.trim().toLowerCase()
  if (normalized.includes('bug'))
    return 'Bug'
  if (normalized.includes('feature'))
    return 'Feature'
  if (normalized.includes('story'))
    return 'Story'
  return 'Task'
}
