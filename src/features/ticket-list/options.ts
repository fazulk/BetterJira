import type {
  DateFilterFieldId,
  FilterMenuEntry,
  InitiativeRowFieldOption,
  IssueGroupingFieldId,
  IssueOrderingFieldId,
  IssueRowFieldOption,
  IssueVisibilityRange,
  ProjectClosedRange,
  ProjectGroupingFieldId,
  ProjectOrderingFieldId,
  ProjectPropertyFilterFieldId,
  ProjectRowFieldOption,
  SavedViewRowFieldOption,
} from './types'

export const issueRowFieldOptions: IssueRowFieldOption[] = [
  { id: 'id', label: 'ID' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
  { id: 'storyPoints', label: 'Story points' },
  { id: 'project', label: 'Project' },
  { id: 'due', label: 'Due date' },
  { id: 'milestone', label: 'Milestone' },
  { id: 'release', label: 'Release' },
  { id: 'labels', label: 'Labels' },
  { id: 'links', label: 'Links' },
  { id: 'timeInStatus', label: 'Time in status' },
  { id: 'created', label: 'Created' },
  { id: 'updated', label: 'Updated' },
]

export const issueGroupingOptions: Array<{
  id: IssueGroupingFieldId
  label: string
}> = [
  { id: 'none', label: 'No grouping' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'agent', label: 'Agent' },
  { id: 'project', label: 'Project' },
  { id: 'priority', label: 'Priority' },
  { id: 'label', label: 'Label' },
]

export const issueOrderingOptions: Array<{
  id: IssueOrderingFieldId
  label: string
}> = [
  { id: 'manual', label: 'Manual' },
  { id: 'title', label: 'Title' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'agent', label: 'Agent' },
  { id: 'estimate', label: 'Estimate' },
  { id: 'updated', label: 'Updated' },
  { id: 'created', label: 'Created' },
  { id: 'due', label: 'Due date' },
  { id: 'linkCount', label: 'Link count' },
  { id: 'timeInStatus', label: 'Time in status' },
]

export const projectGroupingOptions: Array<{
  id: ProjectGroupingFieldId
  label: string
}> = [
  { id: 'none', label: 'No grouping' },
  { id: 'health', label: 'Health' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'lead', label: 'Lead' },
]

export const projectOrderingOptions: Array<{
  id: ProjectOrderingFieldId
  label: string
}> = [
  { id: 'manual', label: 'Manual' },
  { id: 'name', label: 'Name' },
  { id: 'health', label: 'Health' },
  { id: 'priority', label: 'Priority' },
  { id: 'lead', label: 'Lead' },
  { id: 'targetDate', label: 'Target date' },
  { id: 'updated', label: 'Updated' },
  { id: 'progress', label: 'Progress' },
]

export const projectClosedRangeOptions: Array<{
  id: ProjectClosedRange
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'day', label: 'Past day' },
  { id: 'week', label: 'Past week' },
  { id: 'hidden', label: 'None' },
]

export const issueVisibilityRangeOptions: Array<{
  id: IssueVisibilityRange
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'day', label: 'Past day' },
  { id: 'week', label: 'Past week' },
  { id: 'month', label: 'Past month' },
  { id: 'hidden', label: 'None' },
]

export const projectRowFieldOptions: ProjectRowFieldOption[] = [
  { id: 'health', label: 'Health' },
  { id: 'priority', label: 'Priority' },
  { id: 'lead', label: 'Lead' },
  { id: 'targetDate', label: 'Target date' },
  { id: 'issues', label: 'Issues' },
  { id: 'status', label: 'Status' },
]

export const initiativeRowFieldOptions: InitiativeRowFieldOption[] = [
  { id: 'health', label: 'Health' },
  { id: 'lead', label: 'Lead' },
  { id: 'projects', label: 'Projects' },
  { id: 'issues', label: 'Issues' },
  { id: 'updated', label: 'Updated' },
]

export const savedViewRowFieldOptions: SavedViewRowFieldOption[] = [
  { id: 'type', label: 'Type' },
  { id: 'items', label: 'Items' },
  { id: 'owner', label: 'Owner' },
  { id: 'updated', label: 'Updated' },
]

export const filterMenuEntries: FilterMenuEntry[] = [
  { id: 'status', label: 'Status', icon: '◌', hasSubmenu: true },
  { id: 'assignee', label: 'Assignee', icon: '♙', hasSubmenu: true },
  { id: 'reporter', label: 'Creator', icon: '♙', hasSubmenu: true },
  { id: 'priority', label: 'Priority', icon: '▥', hasSubmenu: true },
  { id: 'labels', label: 'Labels', icon: '▭', hasSubmenu: true },
  {
    id: 'suggestedLabel',
    label: 'Suggested label',
    icon: '▰',
    hasSubmenu: true,
  },
  { id: 'dates', label: 'Dates', icon: '□', hasSubmenu: true },
  { id: 'project', label: 'Project', icon: '◇', hasSubmenu: true },
  { id: 'team', label: 'Team', icon: '◴', hasSubmenu: true },
  { id: 'sprint', label: 'Sprint', icon: '◷', hasSubmenu: true },
  {
    id: 'projectProperties',
    label: 'Project properties',
    icon: '◈',
    hasSubmenu: true,
  },
  { id: 'initiative', label: 'Initiative', icon: '◒', hasSubmenu: true },
  { id: 'subscribers', label: 'Subscribers', icon: '♧', hasSubmenu: true },
  { id: 'shared', label: 'Shared', icon: '♢', hasSubmenu: false },
  { id: 'sharedWith', label: 'Shared with', icon: '♧', hasSubmenu: true },
  {
    id: 'externalSource',
    label: 'External source',
    icon: '◇',
    hasSubmenu: true,
  },
]

export const dateFilterFields: Array<{
  id: DateFilterFieldId
  label: string
  icon: string
}> = [
  { id: 'dueDate', label: 'Due date', icon: '□' },
  { id: 'createdDate', label: 'Created date', icon: '◱' },
  { id: 'updatedDate', label: 'Updated date', icon: '◲' },
  { id: 'completedDate', label: 'Completed date', icon: '◳' },
]

export const projectPropertyFilterFields: Array<{
  id: ProjectPropertyFilterFieldId
  label: string
  icon: string
}> = [
  { id: 'projectStatus', label: 'Project status', icon: '◌' },
  { id: 'projectPriority', label: 'Project priority', icon: '▥' },
  { id: 'projectLead', label: 'Project lead', icon: '♙' },
]
