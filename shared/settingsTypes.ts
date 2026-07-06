import type { AiProvider } from './ai'
import type { AssistantProvider, AssistantReasoning, AssistantSettings } from './assistant'

export interface AppSpaceTeamFilter {
  /** Jira project key the team-filtered space is scoped to. */
  projectKey: string
  /** Native Jira Team field value id (kept in its original casing). */
  teamId: string
}

export interface AppSpaceSetting {
  key: string
  name: string
  enabled: boolean
  /** Lucide icon name (without the `lucide:` prefix). When absent the key initial is shown. */
  icon?: string
  /** Hex color (e.g. `#d65d5d`) used for the team avatar. */
  color?: string
  /** When present, this space is a slice of a Jira project scoped to one team. */
  teamFilter?: AppSpaceTeamFilter
}

export interface JiraConnectionSettings {
  baseUrl: string
  email: string
  hasApiToken: boolean
}

export interface AiConnectionSettings {
  hasCerebrasApiKey: boolean
  provider: AiProvider
  model: string
}

export interface UpdateAssistantSettingsInput {
  provider?: AssistantProvider
  model?: string
  reasoning?: AssistantReasoning
  systemPrompt?: string
}

export interface AssistantSkillSetting {
  id: string
  name: string
  /** Markdown prompt injected into the chat turn when the skill is attached. */
  body: string
  /** Epoch milliseconds of the last save, shown as "Updated Xd ago". */
  updatedAt: number
}

export interface FavoriteViewFilter {
  id: string
  fieldId: string
  fieldLabel: string
  value: string
  valueLabel: string
}

export interface FavoriteView {
  id: string
  filters: FavoriteViewFilter[]
  showIssueCount: boolean
}

export interface CustomViewFilter {
  id: string
  fieldId: string
  fieldLabel: string
  value: string
  valueLabel: string
}

export interface CustomViewDisplay {
  grouping: string
  subGrouping: string
  ordering: string
  groupingDirection: 'asc' | 'desc'
  orderingDirection: 'asc' | 'desc'
  completedRange: string
  showSubIssuesRange: string
  showTriageIssuesRange: string
  showEmptyGroups: boolean
  issueGroupOrders: Record<string, string[]>
  hiddenIssueGroupIds: Record<string, string[]>
  collapsedIssueSectionIds: string[]
  visibleIssueRowFields: string[]
  visibleProjectRowFields: string[]
  projectGrouping: string
  projectOrdering: string
  projectClosedRange: string
  collapsedProjectSectionIds: string[]
  visibleInitiativeRowFields: string[]
  visibleSavedViewRowFields: string[]
}

export interface ViewOverride {
  filters: CustomViewFilter[]
  display: CustomViewDisplay
}

export interface CustomView {
  id: string
  name: string
  description: string
  contextKey: string
  icon: string
  color: string
  filters: CustomViewFilter[]
  display: CustomViewDisplay
}

export type LabelColors = Record<string, string>
export type StatusColors = Record<string, string>

export interface StatusPreferences {
  colors: StatusColors
  order: string[]
}

export type SidebarSortBy = 'key' | 'summary' | 'status' | 'priority' | 'assignee' | 'type' | 'createdAt' | 'updatedAt' | 'dueDate' | 'completedAt'
export type SidebarGroupBy = Exclude<SidebarSortBy, 'key'> | 'hierarchy' | 'none'
export type SidebarTicketScope = 'currentSprint' | 'all'

export interface SidebarSettings {
  pinnedTicketKeys: string[]
  favoriteViews: FavoriteView[]
  customViews: CustomView[]
  viewOverrides: Record<string, ViewOverride>
  filterTypeKeys: string[]
  filterStatuses: string[]
  filterAssignees: string[]
  showCompletedTickets: boolean
  ticketScope: SidebarTicketScope
  sortBy: SidebarSortBy
  groupBy: SidebarGroupBy
  sortReversed: boolean
}

export interface UpdateJiraConnectionInput {
  baseUrl?: string
  email?: string
  apiToken?: string
}

export interface UpdateAiConnectionInput {
  cerebrasApiKey?: string
  provider?: AiProvider
  model?: string
}

export interface UpdateSidebarSettingsInput {
  pinnedTicketKeys?: string[]
  favoriteViews?: FavoriteView[]
  customViews?: CustomView[]
  viewOverrides?: Record<string, ViewOverride>
  filterTypeKeys?: string[]
  filterStatuses?: string[]
  filterAssignees?: string[]
  showCompletedTickets?: boolean
  ticketScope?: SidebarTicketScope
  sortBy?: SidebarSortBy
  groupBy?: SidebarGroupBy
  sortReversed?: boolean
}

export interface UpdateStatusPreferencesInput {
  colors?: StatusColors
  order?: string[]
}

export interface AppSettings {
  spaces: AppSpaceSetting[]
  filterSpaceKeys: string[]
  sidebar: SidebarSettings
  jira: JiraConnectionSettings
  ai: AiConnectionSettings
  assistant: AssistantSettings
  assistantSkills: AssistantSkillSetting[]
  labelColors: LabelColors
  statusPreferences: StatusPreferences
}

export interface UpdateAppSettingsInput {
  spaces?: AppSpaceSetting[]
  filterSpaceKeys?: string[]
  sidebar?: UpdateSidebarSettingsInput
  jira?: UpdateJiraConnectionInput
  ai?: UpdateAiConnectionInput
  assistant?: UpdateAssistantSettingsInput
  assistantSkills?: AssistantSkillSetting[]
  labelColors?: LabelColors
  statusPreferences?: UpdateStatusPreferencesInput
}

export interface JiraSpaceDirectoryEntry {
  key: string
  name: string
}
