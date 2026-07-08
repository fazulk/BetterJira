import type { StatusLane } from '@/composables/useStatusPreferences'
import type { StatusGroup } from '@/types/jira'

export type SettingsSectionId
  = | 'workspace'
    | 'assistant'
    | 'team-overview'
    | 'team-members'
    | 'team-statuses'
    | 'team-workflows'
    | 'team-triage'
    | 'team-cycles'
    | 'team-ai'
    | 'about'

export interface SettingsSummaryRow {
  label: string
  value: string
  detail: string
}

export interface SettingsDetailRow {
  label: string
  value: string
  detail: string
}

export interface TeamStatusSettingsRow {
  key: string
  status: string
  group: StatusGroup
  lane: StatusLane
  issueCount: number
  spaces: string
}

export interface TeamMemberSettingsRow {
  teamKey: string
  teamName: string
  memberCount: number
  issueCount: number
  topMembers: string
}
