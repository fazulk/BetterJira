import type { ComputedRef } from 'vue'
import type { InitiativeRow, ProjectAccumulator, ProjectRow } from './types'
import type { JiraTicket } from '@/types/jira'
import { computed } from 'vue'
import { getStatusGroup } from '@/types/jira'
import {
  formatCompactDate,
  getMostCommonLead,
  getPriorityRank,
  getProjectHealth,
  getProjectHealthRank,
  getTimeValue,
  isEpicIssue,
  isEpicIssueType,
  isInitiativeIssue,
  isInitiativeIssueType,
} from './helpers'

interface TicketRowsDeps {
  enabledTickets: ComputedRef<JiraTicket[]>
}

/**
 * Base row-derivation pipeline: aggregates the flat ticket list into project
 * rows (epics + their child issues) and initiative rows (initiative tickets +
 * their projects), plus the parent-chain resolution helpers the filter engine
 * needs (project key, project row, initiative ids, per-project team entries).
 *
 * Pure computeds + functions — no watches or lifecycle hooks. Team scoping,
 * view filters, and ordering stay in the controller.
 */
export function useTicketRows(deps: TicketRowsDeps) {
  const { enabledTickets } = deps

  // Key → first ticket with that key (`Array#find` semantics: first match wins).
  const ticketsByKey = computed(() => {
    const ticketMap = new Map<string, JiraTicket>()
    for (const ticket of enabledTickets.value) {
      if (!ticketMap.has(ticket.key)) {
        ticketMap.set(ticket.key, ticket)
      }
    }
    return ticketMap
  })

  function getProjectKey(ticket: JiraTicket): string | null {
    if (isInitiativeIssue(ticket))
      return null
    if (isEpicIssue(ticket))
      return ticket.key
    let currentParent = ticket.parent
    const visitedKeys = new Set<string>()
    while (currentParent?.key && !visitedKeys.has(currentParent.key)) {
      const parentKey = currentParent.key
      visitedKeys.add(parentKey)
      if (isEpicIssueType(currentParent.issueType)) {
        return parentKey
      }
      const parentTicket = ticketsByKey.value.get(parentKey)
      currentParent = parentTicket?.parent
    }
    return null
  }

  function getProjectSourceTicket(ticket: JiraTicket, projectKey: string): JiraTicket | null {
    if (ticket.key === projectKey)
      return ticket
    return ticketsByKey.value.get(projectKey) ?? null
  }

  function getInitiativeParent(ticket: JiraTicket): NonNullable<JiraTicket['parent']> | null {
    if (isInitiativeIssue(ticket)) {
      return {
        key: ticket.key,
        summary: ticket.summary,
        issueType: ticket.issueType,
      }
    }

    let currentParent = ticket.parent
    const visitedKeys = new Set<string>()
    while (currentParent?.key && !visitedKeys.has(currentParent.key)) {
      const parentKey = currentParent.key
      visitedKeys.add(parentKey)
      if (isInitiativeIssueType(currentParent.issueType)) {
        return currentParent
      }

      const parentTicket = ticketsByKey.value.get(parentKey)
      if (parentTicket && isInitiativeIssue(parentTicket)) {
        return {
          key: parentTicket.key,
          summary: parentTicket.summary,
          issueType: parentTicket.issueType,
        }
      }
      currentParent = parentTicket?.parent
    }

    return null
  }

  function getInitiativeSourceTicket(initiativeKey: string): JiraTicket | null {
    const ticket = ticketsByKey.value.get(initiativeKey)
    return ticket && isInitiativeIssue(ticket) ? ticket : null
  }

  function getInitiativeDescription(ticket: JiraTicket | null, projectCount: number): string {
    if (ticket) {
      return `${ticket.spaceName || ticket.spaceKey || 'Jira'} initiative`
    }

    return projectCount === 1
      ? 'Parent of 1 epic from Jira hierarchy'
      : `Parent of ${projectCount} epics from Jira hierarchy`
  }

  function getInitiativeHealth(
    ticket: JiraTicket | null,
    projects: ProjectRow[],
    progress: number,
  ): ProjectRow['health'] {
    if (ticket) {
      return getProjectHealth(ticket.status, progress)
    }
    if (projects.some(project => project.health === 'At risk')) {
      return 'At risk'
    }
    if (projects.length > 0 && projects.every(project => project.health === 'Completed')) {
      return 'Completed'
    }
    return 'On track'
  }

  const projectRows = computed<ProjectRow[]>(() => {
    const projects = new Map<string, ProjectAccumulator>()
    for (const ticket of enabledTickets.value) {
      const projectKey = getProjectKey(ticket)
      if (!projectKey)
        continue
      const existing = projects.get(projectKey)
      const sourceTicket = getProjectSourceTicket(ticket, projectKey)
      const initiativeParent = getInitiativeParent(sourceTicket ?? ticket)
      const nextProject = existing ?? {
        key: projectKey,
        name: sourceTicket?.summary ?? ticket.parent?.summary ?? ticket.summary,
        spaceKey: sourceTicket?.spaceKey ?? ticket.spaceKey,
        spaceName: sourceTicket?.spaceName ?? ticket.spaceName,
        priority: sourceTicket?.priority ?? ticket.priority,
        lead: sourceTicket?.assignee ?? ticket.assignee,
        targetDate: sourceTicket?.dueDate ?? ticket.dueDate,
        status: sourceTicket?.status ?? ticket.status,
        updatedAt: sourceTicket?.updatedAt ?? ticket.updatedAt,
        initiativeKey: initiativeParent?.key,
        initiativeName: initiativeParent?.summary,
        issues: [],
      }
      if (!existing && sourceTicket) {
        nextProject.priority = sourceTicket.priority
        nextProject.lead = sourceTicket.assignee
        nextProject.targetDate = sourceTicket.dueDate
        nextProject.status = sourceTicket.status
        nextProject.updatedAt = sourceTicket.updatedAt
      }
      if (initiativeParent && !nextProject.initiativeKey) {
        nextProject.initiativeKey = initiativeParent.key
        nextProject.initiativeName = initiativeParent.summary
      }
      if (ticket.key !== projectKey) {
        nextProject.issues = [...nextProject.issues, ticket]
      }
      if (!nextProject.targetDate && ticket.dueDate) {
        nextProject.targetDate = ticket.dueDate
      }
      if (getTimeValue(ticket.updatedAt) > getTimeValue(nextProject.updatedAt)) {
        nextProject.updatedAt = ticket.updatedAt
      }
      projects.set(projectKey, nextProject)
    }
    return [...projects.values()]
      .map((project) => {
        const issueCount = project.issues.length
        const completedCount = project.issues.filter(
          ticket => getStatusGroup(ticket.statusCategory) === 'done',
        ).length
        const progress = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0
        return {
          key: project.key,
          name: project.name,
          spaceKey: project.spaceKey,
          spaceName: project.spaceName,
          health: getProjectHealth(project.status, progress),
          priority: project.priority || 'No priority',
          lead: project.lead && project.lead !== 'Unassigned' ? project.lead : 'Unassigned',
          targetDate: formatCompactDate(project.targetDate),
          targetDateValue: project.targetDate,
          issueCount,
          completedCount,
          progress,
          status: project.status,
          updatedAt: project.updatedAt,
          initiativeKey: project.initiativeKey,
          initiativeName: project.initiativeName,
        }
      })
      .sort(
        (left, right) =>
          getProjectHealthRank(left.health) - getProjectHealthRank(right.health)
          || getPriorityRank(left.priority) - getPriorityRank(right.priority)
          || getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt)
          || left.key.localeCompare(right.key, undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
      )
  })

  // Project keys are unique (projectRows is built from a Map), so a lookup map
  // is exactly equivalent to `projectRows.value.find(...)`.
  const projectsByKey = computed(() => {
    const projectMap = new Map<string, ProjectRow>()
    for (const project of projectRows.value) {
      projectMap.set(project.key, project)
    }
    return projectMap
  })

  const baseInitiativeRows = computed<InitiativeRow[]>(() => {
    const groups = new Map<
      string,
      {
        key: string
        name: string
        ticket: JiraTicket | null
        projects: ProjectRow[]
      }
    >()

    for (const ticket of enabledTickets.value) {
      if (!isInitiativeIssue(ticket)) {
        continue
      }

      groups.set(ticket.key, {
        key: ticket.key,
        name: ticket.summary,
        ticket,
        projects: [],
      })
    }

    for (const project of projectRows.value) {
      if (!project.initiativeKey) {
        continue
      }

      const ticket = getInitiativeSourceTicket(project.initiativeKey)
      const existing = groups.get(project.initiativeKey)
      const group = existing ?? {
        key: project.initiativeKey,
        name: ticket?.summary ?? project.initiativeName ?? project.initiativeKey,
        ticket,
        projects: [],
      }

      if (ticket && !group.ticket) {
        group.ticket = ticket
        group.name = ticket.summary
      }

      group.projects.push(project)
      groups.set(group.key, group)
    }

    return [...groups.values()]
      .map((group) => {
        const issueCount = group.projects.reduce((count, project) => count + project.issueCount, 0)
        const completedCount = group.projects.reduce(
          (count, project) => count + project.completedCount,
          0,
        )
        const progress = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0
        const lead = group.ticket?.assignee && group.ticket.assignee !== 'Unassigned'
          ? group.ticket.assignee
          : getMostCommonLead(group.projects)

        return {
          id: group.key,
          name: group.ticket?.summary ?? group.name,
          description: getInitiativeDescription(group.ticket, group.projects.length),
          health: getInitiativeHealth(group.ticket, group.projects, progress),
          projectCount: group.projects.length,
          issueCount,
          completedCount,
          progress,
          lead,
          updatedAt: [group.ticket?.updatedAt, ...group.projects.map(project => project.updatedAt)]
            .sort((left, right) => getTimeValue(right) - getTimeValue(left))[0],
        }
      })
      .sort(
        (left, right) =>
          getProjectHealthRank(left.health) - getProjectHealthRank(right.health)
          || getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt)
          || left.id.localeCompare(right.id, undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
      )
  })

  function getTicketProject(ticket: JiraTicket): ProjectRow | null {
    const projectKey = getProjectKey(ticket)
    if (!projectKey)
      return null
    return projectsByKey.value.get(projectKey) ?? null
  }

  function getTicketInitiativeIds(ticket: JiraTicket): string[] {
    if (isInitiativeIssue(ticket)) {
      return [ticket.key]
    }

    const project = getTicketProject(ticket)
    return project?.initiativeKey ? [project.initiativeKey] : []
  }

  function getProjectTeamFilterEntries(project: ProjectRow): Array<{ value: string, label: string, icon: string }> {
    const teamEntries = new Map<string, { value: string, label: string, icon: string }>()
    for (const ticket of enabledTickets.value) {
      if (getProjectKey(ticket) !== project.key) {
        continue
      }

      const value = ticket.team?.id ?? 'no-team'
      teamEntries.set(value, {
        value,
        label: ticket.team?.name ?? 'No team',
        icon: '◴',
      })
    }
    return [...teamEntries.values()]
  }

  return {
    projectRows,
    baseInitiativeRows,
    getProjectKey,
    getTicketProject,
    getTicketInitiativeIds,
    getProjectTeamFilterEntries,
  }
}
