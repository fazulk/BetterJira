import type {
  DateFilterFieldId,
  DateFilterOperator,
  DateFilterOption,
  FilterContextKind,
  FilterFieldId,
  FilterOption,
  InitiativeRow,
  ProjectRow,
  SavedViewRow,
  ViewFilterClause,
} from './types'
import type { JiraTicket } from '@/types/jira'
import { isLocalTicketKey } from '~/shared/localTickets'
import {
  dateMatchesOperator,
  getDateFilterOperator,
  getProjectDateValue,
  getTicketDateValue,
  getTicketLabels,
  isActiveIssueTicket,
  normalizeFilterValue,
} from './helpers'
import { filterGroupsMatch } from './viewDisplay'

export interface FilterOptionEntry {
  value: string
  label: string
  icon: string
}

export interface TicketFilterContext {
  currentUserName: string
  getProjectKey: (ticket: JiraTicket) => string | null
  getTicketProject: (ticket: JiraTicket) => ProjectRow | null
  getTicketInitiativeIds: (ticket: JiraTicket) => string[]
  getProjectTeamFilterEntries: (project: ProjectRow) => FilterOptionEntry[]
}

export interface ProjectFilterContext {
  getProjectTeamFilterEntries: (project: ProjectRow) => FilterOptionEntry[]
}

export interface IssueFilterOptionContext {
  currentUserName: string
  projectRows: ProjectRow[]
  displayedProjectRows: ProjectRow[]
  initiativeRows: InitiativeRow[]
  getProjectKey: (ticket: JiraTicket) => string | null
}

export interface ProjectFilterOptionContext {
  currentUserName: string
  initiativeRows: InitiativeRow[]
  getProjectTeamFilterEntries: (project: ProjectRow) => FilterOptionEntry[]
}

export interface DateFilterCollections {
  tickets: JiraTicket[]
  projectRows: ProjectRow[]
  initiativeRows: InitiativeRow[]
  savedViewRows: SavedViewRow[]
}

export function buildIssueFilterOptions(
  baseTickets: JiraTicket[],
  fieldId: FilterFieldId,
  ctx: IssueFilterOptionContext,
): FilterOption[] {
  if (fieldId === 'status') {
    return countFilterOptions(
      baseTickets.map(ticket => ({
        value: normalizeFilterValue(ticket.status || 'No status'),
        label: ticket.status || 'No status',
        icon: '◌',
      })),
    )
  }
  if (fieldId === 'assignee' || fieldId === 'sharedWith') {
    const currentUser = ctx.currentUserName || 'Current user'
    const people = baseTickets.map(ticket => ({
      value: normalizeFilterValue(ticket.assignee || 'Unassigned'),
      label: ticket.assignee || 'Unassigned',
      icon: '♙',
    }))
    return countFilterOptions([
      { value: 'current-user', label: 'Current user', icon: '♙' },
      ...people,
    ])
      .map(option =>
        option.value === 'current-user'
          ? {
              ...option,
              count: ctx.currentUserName
                ? baseTickets.filter(
                  ticket =>
                    normalizeFilterValue(ticket.assignee) === normalizeFilterValue(currentUser),
                ).length
                : 0,
            }
          : option,
      )
      .filter(option => option.count > 0)
  }
  if (fieldId === 'reporter') {
    const people = baseTickets.map(ticket => ({
      value: normalizeFilterValue(ticket.reporter || 'Unknown'),
      label: ticket.reporter || 'Unknown',
      icon: '♙',
    }))
    return countFilterOptions([
      { value: 'current-user', label: 'Current user', icon: '♙' },
      ...people,
    ])
      .map(option =>
        option.value === 'current-user'
          ? {
              ...option,
              count: baseTickets.filter(ticket =>
                ticketMatchesCurrentUserReporter(ticket, ctx.currentUserName),
              ).length,
            }
          : option,
      )
      .filter(option => option.count > 0)
  }
  if (fieldId === 'priority') {
    return countFilterOptions(
      baseTickets.map(ticket => ({
        value: normalizeFilterValue(ticket.priority || 'No priority'),
        label: ticket.priority || 'No priority',
        icon: '▥',
      })),
    )
  }
  if (fieldId === 'labels' || fieldId === 'suggestedLabel') {
    return countFilterOptions(
      baseTickets.flatMap((ticket) => {
        const labels = getTicketLabels(ticket)
        if (labels.length === 0) {
          return [
            {
              value: normalizeFilterValue('No labels'),
              label: 'No labels',
              icon: '▭',
            },
          ]
        }
        return labels.map(label => ({
          value: normalizeFilterValue(label),
          label,
          icon: '▭',
        }))
      }),
    )
  }
  if (fieldId === 'project') {
    return countFilterOptions(
      baseTickets.map((ticket) => {
        const projectKey = ctx.getProjectKey(ticket)
        const project = projectKey
          ? ctx.projectRows.find(row => row.key === projectKey)
          : null
        return {
          value: projectKey ?? 'no-project',
          label: project?.name ?? projectKey ?? 'No project',
          icon: '◇',
        }
      }),
    )
  }
  if (fieldId === 'team') {
    return countFilterOptions(
      baseTickets.map(ticket => ({
        value: ticket.team?.id ?? 'no-team',
        label: ticket.team?.name ?? 'No team',
        icon: '◴',
      })),
    )
  }
  if (fieldId === 'projectStatus') {
    return countFilterOptions(
      ctx.displayedProjectRows.map(project => ({
        value: normalizeFilterValue(project.status || 'No status'),
        label: project.status || 'No status',
        icon: '◌',
      })),
    )
  }
  if (fieldId === 'projectPriority') {
    return countFilterOptions(
      ctx.displayedProjectRows.map(project => ({
        value: normalizeFilterValue(project.priority || 'No priority'),
        label: project.priority || 'No priority',
        icon: '▥',
      })),
    )
  }
  if (fieldId === 'projectLead') {
    return countFilterOptions(
      ctx.displayedProjectRows.map(project => ({
        value: normalizeFilterValue(project.lead || 'Unassigned'),
        label: project.lead || 'Unassigned',
        icon: '♙',
      })),
    )
  }
  if (fieldId === 'initiative') {
    return countFilterOptions(
      ctx.initiativeRows.map(initiative => ({
        value: initiative.id,
        label: initiative.name,
        icon: '◒',
      })),
    )
  }
  if (fieldId === 'subscribers') {
    return countFilterOptions(
      baseTickets.map(ticket => ({
        value: ticket.isWatching ? 'watching' : 'not-watching',
        label: ticket.isWatching ? 'Watching' : 'Not watching',
        icon: '♧',
      })),
    )
  }
  if (fieldId === 'shared') {
    return [
      {
        value: 'shared',
        label: 'Shared',
        count: baseTickets.filter(ticket => (ticket.watchCount ?? 0) > 0).length,
        icon: '♢',
      },
    ]
  }
  if (fieldId === 'externalSource') {
    return countFilterOptions(
      baseTickets.map(ticket => ({
        value: isLocalTicketKey(ticket.key) ? 'local' : 'jira',
        label: isLocalTicketKey(ticket.key) ? 'Local' : 'Jira',
        icon: '◇',
      })),
    )
  }
  return []
}

export function buildProjectFilterOptions(
  baseProjects: ProjectRow[],
  fieldId: FilterFieldId,
  ctx: ProjectFilterOptionContext,
): FilterOption[] {
  if (fieldId === 'status' || fieldId === 'projectStatus') {
    return countFilterOptions(
      baseProjects.map(project => ({
        value: normalizeFilterValue(project.status || 'No status'),
        label: project.status || 'No status',
        icon: '◌',
      })),
    )
  }
  if (fieldId === 'assignee' || fieldId === 'projectLead' || fieldId === 'sharedWith') {
    const currentUser = ctx.currentUserName || 'Current user'
    const people = baseProjects.map(project => ({
      value: normalizeFilterValue(project.lead || 'Unassigned'),
      label: project.lead || 'Unassigned',
      icon: '♙',
    }))
    return countFilterOptions([
      { value: 'current-user', label: 'Current user', icon: '♙' },
      ...people,
    ])
      .map(option =>
        option.value === 'current-user'
          ? {
              ...option,
              count: ctx.currentUserName
                ? baseProjects.filter(
                  project =>
                    normalizeFilterValue(project.lead) === normalizeFilterValue(currentUser),
                ).length
                : 0,
            }
          : option,
      )
      .filter(option => option.count > 0)
  }
  if (fieldId === 'priority' || fieldId === 'projectPriority') {
    return countFilterOptions(
      baseProjects.map(project => ({
        value: normalizeFilterValue(project.priority || 'No priority'),
        label: project.priority || 'No priority',
        icon: '▥',
      })),
    )
  }
  if (fieldId === 'labels' || fieldId === 'suggestedLabel') {
    return countFilterOptions(
      baseProjects.map(project => ({
        value: normalizeFilterValue(project.health),
        label: project.health,
        icon: project.health === 'Completed' ? '✓' : project.health === 'At risk' ? '◆' : '○',
      })),
    )
  }
  if (fieldId === 'project') {
    return countFilterOptions(
      baseProjects.map(project => ({
        value: project.key,
        label: project.name,
        icon: '◇',
      })),
    )
  }
  if (fieldId === 'team') {
    return countFilterOptions(baseProjects.flatMap(project => ctx.getProjectTeamFilterEntries(project)))
  }
  if (fieldId === 'initiative') {
    return countFilterOptions(
      ctx.initiativeRows.map(initiative => ({
        value: initiative.id,
        label: initiative.name,
        icon: '◒',
      })),
    )
      .map(option => ({
        ...option,
        count: baseProjects.filter(project => project.initiativeKey === option.value).length,
      }))
      .filter(option => option.count > 0)
  }
  if (fieldId === 'externalSource') {
    return [{ value: 'jira', label: 'Jira', count: baseProjects.length, icon: '◇' }]
  }
  return []
}

export function buildInitiativeFilterOptions(
  baseInitiatives: InitiativeRow[],
  fieldId: FilterFieldId,
): FilterOption[] {
  if (fieldId === 'status' || fieldId === 'labels' || fieldId === 'suggestedLabel') {
    return countFilterOptions(
      baseInitiatives.map(initiative => ({
        value: normalizeFilterValue(initiative.health),
        label: initiative.health,
        icon:
          initiative.health === 'Completed' ? '✓' : initiative.health === 'At risk' ? '◆' : '○',
      })),
    )
  }
  if (fieldId === 'assignee' || fieldId === 'projectLead' || fieldId === 'sharedWith') {
    return countFilterOptions(
      baseInitiatives.map(initiative => ({
        value: normalizeFilterValue(initiative.lead || 'Unassigned'),
        label: initiative.lead || 'Unassigned',
        icon: '♙',
      })),
    )
  }
  if (fieldId === 'initiative') {
    return countFilterOptions(
      baseInitiatives.map(initiative => ({
        value: initiative.id,
        label: initiative.name,
        icon: '◒',
      })),
    )
  }
  if (fieldId === 'externalSource') {
    return [
      {
        value: 'jira',
        label: 'Jira',
        count: baseInitiatives.length,
        icon: '◇',
      },
    ]
  }
  return []
}

export function buildSavedViewFilterOptions(
  baseViews: SavedViewRow[],
  fieldId: FilterFieldId,
): FilterOption[] {
  if (fieldId === 'assignee' || fieldId === 'sharedWith') {
    return countFilterOptions(
      baseViews.map(row => ({
        value: normalizeFilterValue(row.owner),
        label: row.owner,
        icon: '♙',
      })),
    )
  }
  if (fieldId === 'labels' || fieldId === 'suggestedLabel' || fieldId === 'project') {
    return countFilterOptions(
      baseViews.map(row => ({
        value: normalizeFilterValue(row.category),
        label: row.category,
        icon: row.icon,
      })),
    )
  }
  if (fieldId === 'externalSource') {
    return [{ value: 'jira', label: 'Jira', count: baseViews.length, icon: '◇' }]
  }
  return []
}

export function countFilterOptions(entries: FilterOptionEntry[]): FilterOption[] {
  const optionMap = new Map<string, FilterOption>()
  for (const entry of entries) {
    const existing = optionMap.get(entry.value)
    optionMap.set(entry.value, {
      value: entry.value,
      label: existing?.label ?? entry.label,
      icon: existing?.icon ?? entry.icon,
      count: (existing?.count ?? 0) + 1,
    })
  }
  return [...optionMap.values()]
    .filter(option => option.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

export function buildDateFilterOptions(
  context: FilterContextKind,
  fieldId: DateFilterFieldId,
  collections: DateFilterCollections,
): DateFilterOption[] {
  const options: Array<{ value: DateFilterOperator, label: string }> = [
    { value: 'hasDate', label: 'Is set' },
    { value: 'noDate', label: 'Is not set' },
    { value: 'past', label: 'Before today' },
    { value: 'today', label: 'Today' },
    { value: 'next7', label: 'Next 7 days' },
    { value: 'next30', label: 'Next 30 days' },
  ]
  return options.map(option => ({
    ...option,
    count: getDateFilterOptionCount(context, fieldId, option.value, collections),
  }))
}

function getDateFilterOptionCount(
  context: FilterContextKind,
  fieldId: DateFilterFieldId,
  operator: DateFilterOperator,
  collections: DateFilterCollections,
): number {
  if (context === 'projects') {
    return collections.projectRows.filter(project =>
      dateMatchesOperator(getProjectDateValue(project, fieldId), operator),
    ).length
  }
  if (context === 'initiatives') {
    return collections.initiativeRows.filter(initiative =>
      dateMatchesOperator(getInitiativeDateValue(initiative, fieldId), operator),
    ).length
  }
  if (context === 'views') {
    return collections.savedViewRows.filter(row =>
      dateMatchesOperator(getSavedViewDateValue(row, fieldId), operator),
    ).length
  }
  return collections.tickets.filter(ticket =>
    dateMatchesOperator(getTicketDateValue(ticket, fieldId), operator),
  ).length
}

function ticketMatchesCurrentUserReporter(
  ticket: JiraTicket,
  currentUserName: string,
): boolean {
  if (isLocalTicketKey(ticket.key)) {
    return true
  }
  return (
    Boolean(currentUserName)
    && normalizeFilterValue(ticket.reporter) === normalizeFilterValue(currentUserName)
  )
}

function getInitiativeDateValue(
  initiative: InitiativeRow,
  fieldId: DateFilterFieldId,
): string | undefined {
  if (fieldId === 'updatedDate')
    return initiative.updatedAt
  return undefined
}

function getSavedViewDateValue(
  row: SavedViewRow,
  fieldId: DateFilterFieldId,
): string | undefined {
  if (fieldId === 'updatedDate')
    return row.updatedAt
  return undefined
}

export function filterTicketsByClauses(
  tickets: JiraTicket[],
  filters: readonly ViewFilterClause[],
  ctx: TicketFilterContext,
): JiraTicket[] {
  if (!filters.length)
    return tickets
  return tickets.filter(ticket =>
    filterGroupsMatch(ticket, filters, (item, filter) => ticketMatchesFilter(item, filter, ctx)),
  )
}

export function ticketMatchesFilter(
  ticket: JiraTicket,
  filter: ViewFilterClause,
  ctx: TicketFilterContext,
): boolean {
  if (filter.fieldId === 'status') {
    return normalizeFilterValue(ticket.status || 'No status') === filter.value
  }
  if (filter.fieldId === 'assignee' || filter.fieldId === 'sharedWith') {
    if (filter.value === 'current-user') {
      return ctx.currentUserName
        ? normalizeFilterValue(ticket.assignee) === normalizeFilterValue(ctx.currentUserName)
        : isActiveIssueTicket(ticket)
    }
    return normalizeFilterValue(ticket.assignee || 'Unassigned') === filter.value
  }
  if (filter.fieldId === 'reporter') {
    if (filter.value === 'current-user') {
      return ticketMatchesCurrentUserReporter(ticket, ctx.currentUserName)
    }
    return normalizeFilterValue(ticket.reporter || 'Unknown') === filter.value
  }
  if (filter.fieldId === 'priority')
    return normalizeFilterValue(ticket.priority || 'No priority') === filter.value
  if (filter.fieldId === 'labels' || filter.fieldId === 'suggestedLabel') {
    const labels = getTicketLabels(ticket)
    if (labels.length === 0)
      return filter.value === normalizeFilterValue('No labels')
    return labels.some(label => normalizeFilterValue(label) === filter.value)
  }
  if (filter.fieldId === 'project')
    return (ctx.getProjectKey(ticket) ?? 'no-project') === filter.value
  if (filter.fieldId === 'team')
    return (ticket.team?.id ?? 'no-team') === filter.value
  if (
    filter.fieldId === 'projectStatus'
    || filter.fieldId === 'projectPriority'
    || filter.fieldId === 'projectLead'
  ) {
    const project = ctx.getTicketProject(ticket)
    if (!project)
      return false
    return projectMatchesFilter(project, filter, ctx)
  }
  if (filter.fieldId === 'initiative')
    return ctx.getTicketInitiativeIds(ticket).includes(filter.value)
  if (filter.fieldId === 'subscribers')
    return filter.value === 'watching' ? ticket.isWatching === true : ticket.isWatching !== true
  if (filter.fieldId === 'shared')
    return (ticket.watchCount ?? 0) > 0
  if (filter.fieldId === 'externalSource')
    return filter.value === (isLocalTicketKey(ticket.key) ? 'local' : 'jira')
  return dateMatchesOperator(
    getTicketDateValue(ticket, filter.fieldId),
    getDateFilterOperator(filter.value),
  )
}

export function filterProjectsByClauses(
  projects: ProjectRow[],
  filters: readonly ViewFilterClause[],
  ctx: ProjectFilterContext,
): ProjectRow[] {
  if (!filters.length)
    return projects
  return projects.filter(project =>
    filterGroupsMatch(project, filters, (item, filter) => projectMatchesFilter(item, filter, ctx)),
  )
}

export function projectMatchesFilter(
  project: ProjectRow,
  filter: ViewFilterClause,
  ctx: ProjectFilterContext,
): boolean {
  if (filter.fieldId === 'status' || filter.fieldId === 'projectStatus')
    return normalizeFilterValue(project.status || 'No status') === filter.value
  if (
    filter.fieldId === 'assignee'
    || filter.fieldId === 'projectLead'
    || filter.fieldId === 'sharedWith'
  ) {
    return normalizeFilterValue(project.lead || 'Unassigned') === filter.value
  }
  if (filter.fieldId === 'priority' || filter.fieldId === 'projectPriority')
    return normalizeFilterValue(project.priority || 'No priority') === filter.value
  if (filter.fieldId === 'labels' || filter.fieldId === 'suggestedLabel')
    return normalizeFilterValue(project.health) === filter.value
  if (filter.fieldId === 'project')
    return project.key === filter.value
  if (filter.fieldId === 'team')
    return ctx.getProjectTeamFilterEntries(project).some(entry => entry.value === filter.value)
  if (filter.fieldId === 'initiative') {
    return project.initiativeKey === filter.value
  }
  if (filter.fieldId === 'externalSource')
    return filter.value === 'jira'
  if (filter.fieldId === 'subscribers' || filter.fieldId === 'shared')
    return true
  if (
    filter.fieldId === 'dueDate'
    || filter.fieldId === 'createdDate'
    || filter.fieldId === 'updatedDate'
    || filter.fieldId === 'completedDate'
  ) {
    return dateMatchesOperator(
      getProjectDateValue(project, filter.fieldId),
      getDateFilterOperator(filter.value),
    )
  }
  return false
}

export function filterInitiativesByClauses(
  initiatives: InitiativeRow[],
  filters: readonly ViewFilterClause[],
): InitiativeRow[] {
  if (!filters.length)
    return initiatives
  return initiatives.filter(initiative =>
    filterGroupsMatch(initiative, filters, initiativeMatchesFilter),
  )
}

export function initiativeMatchesFilter(
  initiative: InitiativeRow,
  filter: ViewFilterClause,
): boolean {
  if (filter.fieldId === 'initiative')
    return initiative.id === filter.value
  if (filter.fieldId === 'shared')
    return true
  if (
    filter.fieldId === 'status'
    || filter.fieldId === 'labels'
    || filter.fieldId === 'suggestedLabel'
  ) {
    return normalizeFilterValue(initiative.health) === filter.value
  }
  if (
    filter.fieldId === 'assignee'
    || filter.fieldId === 'projectLead'
    || filter.fieldId === 'sharedWith'
  ) {
    return normalizeFilterValue(initiative.lead || 'Unassigned') === filter.value
  }
  if (filter.fieldId === 'externalSource')
    return filter.value === 'jira'
  if (
    filter.fieldId === 'dueDate'
    || filter.fieldId === 'createdDate'
    || filter.fieldId === 'updatedDate'
    || filter.fieldId === 'completedDate'
  ) {
    return dateMatchesOperator(
      getInitiativeDateValue(initiative, filter.fieldId),
      getDateFilterOperator(filter.value),
    )
  }
  return false
}

export function filterSavedViewsByClauses(
  views: SavedViewRow[],
  filters: readonly ViewFilterClause[],
): SavedViewRow[] {
  if (!filters.length)
    return views
  return views.filter(row => filterGroupsMatch(row, filters, savedViewMatchesFilter))
}

export function savedViewMatchesFilter(row: SavedViewRow, filter: ViewFilterClause): boolean {
  if (filter.fieldId === 'shared')
    return true
  if (filter.fieldId === 'assignee' || filter.fieldId === 'sharedWith')
    return normalizeFilterValue(row.owner) === filter.value
  if (
    filter.fieldId === 'labels'
    || filter.fieldId === 'suggestedLabel'
    || filter.fieldId === 'project'
  ) {
    return (
      normalizeFilterValue(row.category) === filter.value
      || normalizeFilterValue(row.name).includes(filter.value)
    )
  }
  if (filter.fieldId === 'externalSource')
    return filter.value === 'jira'
  if (
    filter.fieldId === 'dueDate'
    || filter.fieldId === 'createdDate'
    || filter.fieldId === 'updatedDate'
    || filter.fieldId === 'completedDate'
  ) {
    return dateMatchesOperator(
      getSavedViewDateValue(row, filter.fieldId),
      getDateFilterOperator(filter.value),
    )
  }
  return false
}
