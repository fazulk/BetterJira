import type { ComputedRef, Ref } from 'vue'
import type {
  SettingsDetailRow,
  SettingsSectionId,
  SettingsSummaryRow,
  TeamMemberSettingsRow,
  TeamStatusSettingsRow,
} from './settingsTypes'
import type { JiraTicket, StatusGroup } from '@/types/jira'
import type { AiSettings } from '~/shared/ai'
import { computed } from 'vue'
import { compareStatusesByPreference, getStatusLane, getStatusPreferenceKey, useStatusPreferences } from '@/composables/useStatusPreferences'
import { getStatusGroup } from '@/types/jira'
import { getProviderLabel } from '~/shared/ai'

interface SpaceSettingsItem {
  key: string
  name: string
  enabled: boolean
}

interface SettingsDerivedRowsInput {
  activeSettingsSection: Ref<SettingsSectionId>
  aiSettings: Ref<AiSettings> | ComputedRef<AiSettings>
  spaces: Ref<readonly SpaceSettingsItem[]> | ComputedRef<readonly SpaceSettingsItem[]>
  tickets: Ref<readonly JiraTicket[]> | ComputedRef<readonly JiraTicket[]>
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function useSettingsDerivedRows(input: SettingsDerivedRowsInput) {
  const { statusPreferences } = useStatusPreferences()
  const enabledSpaceItems = computed(() => input.spaces.value
    .filter(space => space.enabled)
    .map(space => ({ key: space.key, name: space.name.trim() || space.key })))
  const enabledSpaceKeySet = computed(() => new Set(enabledSpaceItems.value.map(space => space.key)))
  const teamSettingsRows = computed<SettingsSummaryRow[]>(() => enabledSpaceItems.value.map(space => ({
    label: space.name,
    value: space.key,
    detail: 'Visible in the sidebar',
  })))
  const enabledTickets = computed(() => input.tickets.value.filter(ticket => enabledSpaceKeySet.value.has(ticket.spaceKey)))
  const statusGroupLabels: Record<StatusGroup, string> = {
    new: 'Todo',
    indeterminate: 'In progress',
    done: 'Done',
  }

  const teamStatusRows = computed<TeamStatusSettingsRow[]>(() => {
    const rows = new Map<string, { key: string, status: string, statusCategory: string, group: StatusGroup, lane: TeamStatusSettingsRow['lane'], issueCount: number, spaceKeys: Set<string> }>()
    for (const ticket of input.tickets.value) {
      if (!enabledSpaceKeySet.value.has(ticket.spaceKey))
        continue
      const status = ticket.status.trim() || 'No status'
      const group = getStatusGroup(ticket.statusCategory)
      const key = getStatusPreferenceKey(status, ticket.statusCategory)
      const lane = getStatusLane(status, ticket.statusCategory)
      const current = rows.get(key)
      if (current) {
        current.issueCount += 1
        current.spaceKeys.add(ticket.spaceKey)
        continue
      }
      rows.set(key, { key, status, statusCategory: ticket.statusCategory, group, lane, issueCount: 1, spaceKeys: new Set([ticket.spaceKey]) })
    }
    return [...rows.values()]
      .sort((left, right) => compareStatusesByPreference(
        { status: left.status, statusCategory: left.statusCategory },
        { status: right.status, statusCategory: right.statusCategory },
        statusPreferences.value.order,
      ))
      .map(row => ({ key: row.key, status: row.status, group: row.group, lane: row.lane, issueCount: row.issueCount, spaces: [...row.spaceKeys].sort().join(', ') }))
  })

  const teamMemberRows = computed<TeamMemberSettingsRow[]>(() => enabledSpaceItems.value.map((space) => {
    const teamTickets = input.tickets.value.filter(ticket => ticket.spaceKey === space.key)
    const memberIssueCounts = new Map<string, number>()
    for (const ticket of teamTickets) {
      const name = ticket.assignee.trim() || 'Unassigned'
      memberIssueCounts.set(name, (memberIssueCounts.get(name) ?? 0) + 1)
    }
    const topMembers = [...memberIssueCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([name, issueCount]) => `${name} (${issueCount})`)
      .join(', ')
    return {
      teamKey: space.key,
      teamName: space.name,
      memberCount: memberIssueCounts.size,
      issueCount: teamTickets.length,
      topMembers: topMembers || 'No assignees yet',
    }
  }))

  const activeIssueCount = computed(() => enabledTickets.value.filter(ticket => getStatusGroup(ticket.statusCategory) !== 'done').length)
  const triageIssueCount = computed(() => enabledTickets.value.filter(ticket => getStatusGroup(ticket.statusCategory) === 'new').length)
  const backlogIssueCount = computed(() => enabledTickets.value.filter(ticket => !ticket.inCurrentSprint && getStatusGroup(ticket.statusCategory) !== 'done').length)
  const currentSprintIssueCount = computed(() => enabledTickets.value.filter(ticket => ticket.inCurrentSprint && getStatusGroup(ticket.statusCategory) !== 'done').length)

  const teamWorkflowRows = computed<SettingsDetailRow[]>(() => [
    { label: 'Workflow statuses', value: formatCount(teamStatusRows.value.length, 'status', 'statuses'), detail: 'Loaded from Jira and grouped into Linear-style Todo, In progress, and Done categories.' },
    { label: 'Active work', value: formatCount(activeIssueCount.value, 'issue', 'issues'), detail: 'Issues from enabled spaces that are not in a completed Jira status category.' },
    { label: 'Status transitions', value: 'Jira managed', detail: 'Issue status changes continue to use Jira transitions from the selected issue.' },
  ])
  const teamTriageRows = computed<SettingsDetailRow[]>(() => [
    { label: 'Triage source', value: formatCount(triageIssueCount.value, 'issue', 'issues'), detail: 'Issues in Jira Todo status categories appear in team triage views.' },
    { label: 'Routing', value: 'By team', detail: 'Jira spaces define the Linear-style team boundary for intake and issue views.' },
  ])
  const teamCycleRows = computed<SettingsDetailRow[]>(() => [
    { label: 'Current sprint', value: formatCount(currentSprintIssueCount.value, 'issue', 'issues'), detail: 'Jira sprint membership is surfaced as issue metadata and filters only.' },
    { label: 'Backlog', value: formatCount(backlogIssueCount.value, 'issue', 'issues'), detail: 'Active issues outside the current Jira sprint appear in backlog-style views.' },
    { label: 'Linear cycles', value: 'Deferred', detail: 'Full cycle planning remains out of scope until this app has a dedicated cycle model.' },
  ])
  const teamAiRows = computed<SettingsDetailRow[]>(() => [
    { label: 'Provider', value: getProviderLabel(input.aiSettings.value.provider), detail: input.aiSettings.value.model },
    { label: 'Agent chat', value: 'Out of scope', detail: 'Linear-style agent chat is intentionally excluded from the first pass.' },
  ])
  const constrainedSettingsSectionTitle = computed(() => {
    if (input.activeSettingsSection.value === 'team-workflows')
      return 'Workflows'
    if (input.activeSettingsSection.value === 'team-triage')
      return 'Triage'
    if (input.activeSettingsSection.value === 'team-cycles')
      return 'Cycles'
    if (input.activeSettingsSection.value === 'team-ai')
      return 'AI & Agents'
    return ''
  })
  const constrainedSettingsSectionDescription = computed(() => {
    if (input.activeSettingsSection.value === 'team-workflows')
      return 'Workflow behavior inferred from enabled Jira spaces.'
    if (input.activeSettingsSection.value === 'team-triage')
      return 'How intake-like issue views are derived from Jira data.'
    if (input.activeSettingsSection.value === 'team-cycles')
      return 'Sprint-backed metadata without full Linear cycle planning.'
    if (input.activeSettingsSection.value === 'team-ai')
      return 'Assistant capabilities available in this first pass.'
    return ''
  })
  const constrainedSettingsRows = computed<SettingsDetailRow[]>(() => {
    if (input.activeSettingsSection.value === 'team-workflows')
      return teamWorkflowRows.value
    if (input.activeSettingsSection.value === 'team-triage')
      return teamTriageRows.value
    if (input.activeSettingsSection.value === 'team-cycles')
      return teamCycleRows.value
    if (input.activeSettingsSection.value === 'team-ai')
      return teamAiRows.value
    return []
  })

  return {
    constrainedSettingsRows,
    constrainedSettingsSectionDescription,
    constrainedSettingsSectionTitle,
    statusGroupLabels,
    teamMemberRows,
    teamSettingsRows,
    teamStatusRows,
  }
}
