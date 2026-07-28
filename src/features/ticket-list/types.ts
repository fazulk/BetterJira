import type { JiraTicket } from '@/types/jira'

export type SearchResultTab = 'all' | 'issues' | 'projects' | 'initiatives' | 'documents'
export type IssueGroupingFieldId
  = | 'none'
    | 'status'
    | 'assignee'
    | 'agent'
    | 'project'
    | 'priority'
    | 'label'
export type IssueOrderingFieldId
  = | 'manual'
    | 'title'
    | 'status'
    | 'priority'
    | 'assignee'
    | 'agent'
    | 'estimate'
    | 'updated'
    | 'created'
    | 'due'
    | 'linkCount'
    | 'timeInStatus'
export type ProjectGroupingFieldId = 'none' | 'health' | 'status' | 'priority' | 'lead'
export type ProjectOrderingFieldId
  = | 'manual'
    | 'name'
    | 'health'
    | 'priority'
    | 'lead'
    | 'targetDate'
    | 'updated'
    | 'progress'
export type ProjectClosedRange = 'all' | 'day' | 'week' | 'hidden'
export type IssueVisibilityRange = 'all' | 'day' | 'week' | 'month' | 'hidden'
export type IssueGroupConfigMap = Partial<Record<IssueGroupingFieldId, string[]>>
export type IssueRowFieldId
  = | 'id'
    | 'status'
    | 'assignee'
    | 'priority'
    | 'storyPoints'
    | 'project'
    | 'due'
    | 'milestone'
    | 'release'
    | 'labels'
    | 'links'
    | 'timeInStatus'
    | 'created'
    | 'updated'
export type ProjectRowFieldId = 'health' | 'priority' | 'lead' | 'targetDate' | 'issues' | 'status'
export type InitiativeRowFieldId = 'health' | 'lead' | 'projects' | 'issues' | 'updated'
export type SavedViewRowFieldId = 'type' | 'items' | 'owner' | 'updated'
export type MyIssuesViewId = 'my-issues' | 'my-created'
export type DateFilterOperator = 'hasDate' | 'noDate' | 'past' | 'today' | 'next7' | 'next30'
export type DateFilterFieldId = 'dueDate' | 'createdDate' | 'updatedDate' | 'completedDate'
export type ProjectPropertyFilterFieldId = 'projectStatus' | 'projectPriority' | 'projectLead'
export type FilterContextKind = 'issues' | 'projects' | 'initiatives' | 'views'
export type ViewsDirectoryTabId = 'views' | 'project-views'
export type CustomViewKind = 'issues' | 'projects'
export type FilterFieldId
  = | 'status'
    | 'assignee'
    | 'reporter'
    | 'priority'
    | 'labels'
    | 'suggestedLabel'
    | DateFilterFieldId
    | 'project'
    | 'team'
    | 'sprint'
    | ProjectPropertyFilterFieldId
    | 'initiative'
    | 'subscribers'
    | 'shared'
    | 'sharedWith'
    | 'externalSource'
export type FilterEntryId
  = | 'status'
    | 'assignee'
    | 'reporter'
    | 'priority'
    | 'labels'
    | 'suggestedLabel'
    | 'dates'
    | 'project'
    | 'team'
    | 'sprint'
    | 'projectProperties'
    | 'initiative'
    | 'subscribers'
    | 'shared'
    | 'sharedWith'
    | 'externalSource'

export interface IssueSection {
  id: string
  label: string
  tickets: JiraTicket[]
}

export interface IssueGroupOrderingRow {
  id: string
  label: string
  count: number
  visible: boolean
}

export interface ViewTab {
  id: string
  label: string
  custom?: boolean
  draft?: boolean
  icon?: string
  color?: string
}

export interface FavoriteViewNavItem {
  id: string
  label: string
  icon?: string
  color?: string
  count?: number
  showIssueCount: boolean
}

export interface SearchTab {
  id: SearchResultTab
  label: string
  count: number
}

export interface InsightSlice {
  id: string
  label: string
  count: number
  percent: number
}

export interface CommandMenuItem {
  id: string
  label: string
  description: string
  section: string
  icon?: string
  execute: () => void
}

export interface ProjectRow {
  key: string
  name: string
  spaceKey: string
  spaceName: string
  health: 'On track' | 'At risk' | 'Completed'
  priority: string
  lead: string
  targetDate: string
  targetDateValue?: string
  issueCount: number
  completedCount: number
  progress: number
  status: string
  updatedAt?: string
  initiativeKey?: string
  initiativeName?: string
}

export interface ProjectSection {
  id: string
  label: string
  projects: ProjectRow[]
}

export interface SavedViewRow {
  id: string
  name: string
  description: string
  category: string
  owner: string
  count: number
  updatedAt?: string
  icon: string
  color: string
  viewId: string
}

export interface InitiativeRow {
  id: string
  name: string
  description: string
  health: ProjectRow['health']
  projectCount: number
  issueCount: number
  completedCount: number
  progress: number
  lead: string
  updatedAt?: string
}

export interface IssueRowFieldOption {
  id: IssueRowFieldId
  label: string
}

export interface ProjectRowFieldOption {
  id: ProjectRowFieldId
  label: string
}

export interface InitiativeRowFieldOption {
  id: InitiativeRowFieldId
  label: string
}

export interface SavedViewRowFieldOption {
  id: SavedViewRowFieldId
  label: string
}

export interface IssueRowDisplayProps {
  showId: boolean
  showStatus: boolean
  showLabels: boolean
  showPriority: boolean
  showStoryPoints: boolean
  showAssignee: boolean
  showCreated: boolean
  showUpdated: boolean
  showDue: boolean
  showParent: boolean
}

export interface ProjectAccumulator {
  key: string
  name: string
  spaceKey: string
  spaceName: string
  priority: string
  lead: string
  targetDate?: string
  status: string
  updatedAt?: string
  initiativeKey?: string
  initiativeName?: string
  issues: JiraTicket[]
}

export interface FilterMenuEntry {
  id: FilterEntryId
  label: string
  icon: string
  hasSubmenu: boolean
}

export interface FilterOption {
  value: string
  label: string
  count: number
  storyPoints?: number
  icon: string
}

export interface DateFilterOption {
  value: DateFilterOperator
  label: string
  count: number
}

export interface ViewFilterClause {
  id: string
  fieldId: FilterFieldId
  fieldLabel: string
  value: string
  valueLabel: string
}

export type InclusionFilterId = 'completed' | 'subIssues' | 'backlog' | 'completedProjects'
export type ActiveFilterChip
  = | {
    kind: 'clause'
    id: string
    filterId: string
    fieldLabel: string
    valueLabel: string
  }
  | {
    kind: 'inclusion'
    id: string
    inclusionId: InclusionFilterId
    fieldLabel: string
    valueLabel: string
  }
