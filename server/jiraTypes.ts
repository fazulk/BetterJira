import type { JiraAdfDocument, JiraAdfNode } from '../shared/jiraAdf'

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

export interface CreateIssueInput {
  issueType: JiraCreateIssueType
  spaceKey?: string | null
  parentKey?: string | null
  fields: Record<string, JiraCreateFieldValue>
}

export interface RefreshTicketsResult {
  tickets: JiraTicket[]
  updatedAt: number
  mode: 'full' | 'incremental'
}

export interface JiraTransition {
  id: string
  name: string
  statusCategory: string
}

export interface JiraCurrentUser {
  accountId: string
  displayName: string
}

export interface JiraApiUser {
  accountId?: string
  displayName?: string
  name?: string
  value?: string
  id?: string
}

export interface JiraApiComment {
  id?: string
  author?: JiraApiUser
  created?: string
  body?: JiraAdfNode | string | null
  properties?: JiraApiEntityProperty[]
}

export interface JiraApiCommentsResponse {
  comments?: JiraApiComment[]
}

export interface JiraApiChangelogItem {
  field?: string
  fromString?: string | null
  toString?: string | null
}

export interface JiraApiChangelogHistory {
  id?: string
  author?: JiraApiUser
  created?: string
  items?: JiraApiChangelogItem[]
}

export interface JiraApiEntityProperty {
  key?: string
  value?: unknown
}

export interface JiraApiTransition {
  id?: string
  name?: string
  to?: {
    statusCategory?: {
      key?: string
    }
  }
}

export interface JiraApiTransitionsResponse {
  transitions?: JiraApiTransition[]
}

export interface JiraApiPriority {
  id?: string
  name?: string
}

export interface JiraEditMetaResponse {
  fields?: {
    priority?: {
      allowedValues?: JiraApiPriority[]
    }
  }
}

export interface JiraApiIssueType {
  id?: string
  name?: string
  subtask?: boolean
  hierarchyLevel?: number
}

export interface JiraApiProjectIssueTypesResponse {
  issueTypes?: JiraApiIssueType[]
}

export interface JiraApiProject {
  id?: string
  key?: string
  name?: string
}

export interface JiraApiProjectSearchResponse {
  values?: JiraApiProject[]
}

export interface JiraApiAttachment {
  id?: string
  filename?: string
  mimeType?: string
  content?: string
  thumbnail?: string
}

export interface JiraApiIssueFields {
  summary?: string
  project?: {
    key?: string
    name?: string
  }
  status?: {
    name?: string
    statusCategory?: {
      key?: string
    }
  }
  created?: string
  updated?: string
  duedate?: string
  resolutiondate?: string
  priority?: {
    name?: string
  }
  issuetype?: {
    id?: string
    name?: string
  }
  labels?: string[]
  assignee?: JiraApiUser
  reporter?: JiraApiUser
  watches?: {
    isWatching?: boolean
    watchCount?: number
  }
  description?: unknown
  attachment?: JiraApiAttachment[]
  parent?: {
    key?: string
    fields?: {
      summary?: string
      issuetype?: {
        name?: string
      }
    }
  }
}

export interface JiraApiIssue {
  key?: string
  self?: string
  fields?: JiraApiIssueFields
}

export interface JiraApiCreateIssueResponse {
  key?: string
}

export interface JiraApiSprint {
  id?: string | number
  name?: string
  state?: string
}
