import type { ComputedRef } from 'vue'
import type { CommandMenuItem, ProjectRow } from './types'
import type { JiraTicket } from '@/types/jira'
import type { AppSpaceSetting } from '~/shared/settings'
import { computed, nextTick, ref, watch } from 'vue'
import { getIssueTypeIcon } from './helpers'

interface CommandMenuDeps {
  enabledSpaces: ComputedRef<AppSpaceSetting[]>
  projectRows: ComputedRef<ProjectRow[]>
  issueTickets: ComputedRef<JiraTicket[]>
  scopedTickets: ComputedRef<JiraTicket[]>
  sortTickets: (tickets: JiraTicket[]) => JiraTicket[]
  openTicket: (ticketKey: string) => void
  handleViewChange: (viewId: string) => void
  openGlobalCreate: () => void
  openSettings: () => void
  handleRefresh: () => Promise<void>
}

/**
 * Command palette (⌘K) state + item building: open/query/active-index refs,
 * the navigation/project/issue command item computeds, keyboard handling, and
 * the watches that focus the input and keep the active index in bounds.
 * Opening the menu stays in the controller because it also closes the other
 * ticket-list menus.
 */
export function useCommandMenu(deps: CommandMenuDeps) {
  const {
    enabledSpaces,
    projectRows,
    issueTickets,
    scopedTickets,
    sortTickets,
    openTicket,
    handleViewChange,
    openGlobalCreate,
    openSettings,
    handleRefresh,
  } = deps
  const commandMenuOpen = ref(false)
  const commandQuery = ref('')
  const commandActiveIndex = ref(0)
  const commandInputRef = ref<HTMLInputElement | null>(null)
  const commandSearchQuery = computed(() => commandQuery.value.trim().toLowerCase())
  const navigationCommands = computed<CommandMenuItem[]>(() => {
    const teamCommands = enabledSpaces.value.flatMap<CommandMenuItem>(space => [
      {
        id: `team:${space.key}:active`,
        label: `${space.name || space.key} issues`,
        description: `Open active issues for ${space.key}`,
        section: 'Teams',
        icon: space.key.slice(0, 1).toUpperCase(),
        execute: () => handleViewChange(`team:${space.key}:active`),
      },
      {
        id: `team:${space.key}:backlog`,
        label: `${space.name || space.key} backlog`,
        description: `Open backlog for ${space.key}`,
        section: 'Teams',
        icon: space.key.slice(0, 1).toUpperCase(),
        execute: () => handleViewChange(`team:${space.key}:backlog`),
      },
      {
        id: `team:${space.key}:projects`,
        label: `${space.name || space.key} projects`,
        description: `Open projects for ${space.key}`,
        section: 'Teams',
        icon: '◈',
        execute: () => handleViewChange(`team:${space.key}:projects`),
      },
      {
        id: `team:${space.key}:views`,
        label: `${space.name || space.key} views`,
        description: `Open saved views for ${space.key}`,
        section: 'Teams',
        icon: '◌',
        execute: () => handleViewChange(`team:${space.key}:views`),
      },
    ])
    return [
      {
        id: 'create',
        label: 'Create issue',
        description: 'Open the new issue composer',
        section: 'Actions',
        icon: '＋',
        execute: () => openGlobalCreate(),
      },
      {
        id: 'refresh',
        label: 'Sync Jira',
        description: 'Refresh issues and selected issue details',
        section: 'Actions',
        icon: '↻',
        execute: () => {
          void handleRefresh()
        },
      },
      {
        id: 'my-issues',
        label: 'My issues',
        description: 'Open assigned active issues',
        section: 'Navigation',
        icon: '◎',
        execute: () => handleViewChange('my-issues'),
      },
      {
        id: 'search',
        label: 'Search',
        description: 'Open workspace search',
        section: 'Navigation',
        icon: 'search',
        execute: () => handleViewChange('search'),
      },
      {
        id: 'initiatives',
        label: 'Initiatives',
        description: 'Open roadmap rollups',
        section: 'Navigation',
        icon: '◇',
        execute: () => handleViewChange('initiatives'),
      },
      {
        id: 'projects',
        label: 'Projects',
        description: 'Open project table',
        section: 'Navigation',
        icon: '◈',
        execute: () => handleViewChange('projects'),
      },
      {
        id: 'views',
        label: 'Views',
        description: 'Open saved views',
        section: 'Navigation',
        icon: '◌',
        execute: () => handleViewChange('views'),
      },
      {
        id: 'settings',
        label: 'Settings',
        description: 'Open workspace settings',
        section: 'Navigation',
        icon: '⚙',
        execute: openSettings,
      },
      ...teamCommands,
    ]
  })
  const projectCommandItems = computed<CommandMenuItem[]>(() => {
    const query = commandSearchQuery.value
    const baseProjects = query
      ? projectRows.value.filter(project =>
          [
            project.key,
            project.name,
            project.spaceKey,
            project.spaceName,
            project.health,
            project.priority,
            project.lead,
            project.status,
            'project',
            'projects',
            'epic',
            'epics',
          ].some(value => value.toLowerCase().includes(query)),
        )
      : projectRows.value
    return baseProjects
      .slice(0, 20)
      .map(project => ({
        id: `project:${project.key}`,
        label: project.name,
        description: `${project.key} · ${project.status} · ${project.lead}`,
        section: 'Projects',
        icon: '◈',
        execute: () => openTicket(project.key),
      }))
  })
  const issueCommandItems = computed<CommandMenuItem[]>(() => {
    const query = commandSearchQuery.value
    const baseTickets = query
      ? issueTickets.value.filter(ticket =>
          [
            ticket.key,
            ticket.summary,
            ticket.status,
            ticket.priority,
            ticket.assignee,
            ticket.spaceKey,
            ticket.spaceName,
          ].some(value => value?.toLowerCase().includes(query)),
        )
      : scopedTickets.value
    return sortTickets(baseTickets)
      .slice(0, 20)
      .map(ticket => ({
        id: `issue:${ticket.key}`,
        label: ticket.summary,
        description: `${ticket.key} · ${ticket.status} · ${ticket.assignee || 'Unassigned'}`,
        section: 'Issues',
        icon: getIssueTypeIcon(ticket.issueType),
        execute: () => openTicket(ticket.key),
      }))
  })
  const commandItems = computed<CommandMenuItem[]>(() => {
    const query = commandSearchQuery.value
    const navigationItems = query
      ? navigationCommands.value.filter(item =>
          [item.label, item.description, item.section].some(value =>
            value?.toLowerCase().includes(query),
          ),
        )
      : navigationCommands.value
    return [...navigationItems, ...projectCommandItems.value, ...issueCommandItems.value].slice(0, 40)
  })
  watch(commandMenuOpen, (isOpen) => {
    if (!isOpen)
      return
    commandActiveIndex.value = 0
    nextTick(() => {
      commandInputRef.value?.focus()
    })
  })
  watch(commandSearchQuery, () => {
    commandActiveIndex.value = 0
  })
  watch(commandItems, (items) => {
    if (commandActiveIndex.value >= items.length) {
      commandActiveIndex.value = Math.max(items.length - 1, 0)
    }
  })
  function closeCommandMenu() {
    commandMenuOpen.value = false
    commandQuery.value = ''
    commandActiveIndex.value = 0
  }
  function runCommandItem(item: CommandMenuItem) {
    closeCommandMenu()
    item.execute()
  }
  function runActiveCommand() {
    const item = commandItems.value[commandActiveIndex.value]
    if (!item)
      return
    runCommandItem(item)
  }
  function moveCommandSelection(delta: number) {
    const itemCount = commandItems.value.length
    if (itemCount === 0)
      return
    commandActiveIndex.value = (commandActiveIndex.value + delta + itemCount) % itemCount
  }
  function handleCommandMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveCommandSelection(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveCommandSelection(-1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      runActiveCommand()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeCommandMenu()
    }
  }
  return {
    commandMenuOpen,
    commandQuery,
    commandActiveIndex,
    commandInputRef,
    commandItems,
    closeCommandMenu,
    runCommandItem,
    handleCommandMenuKeydown,
  }
}
