import type { JiraTeamRef } from '@/types/jira'
import type { AiProviderAvailabilityResponse } from '~/shared/ai'
import type {
  AppSettings,
  JiraSpaceDirectoryEntry,
  UpdateAiConnectionInput,
  UpdateAppSettingsInput,
  UpdateAssistantSettingsInput,
  UpdateJiraConnectionInput,
} from '~/shared/settings'
import { apiFetch } from '@/api/http'

export function fetchAppSettings(): Promise<AppSettings> {
  return apiFetch('/settings', 'Failed to fetch settings')
}

export function updateAppSettings(input: UpdateAppSettingsInput): Promise<AppSettings> {
  return apiFetch('/settings', 'Failed to update settings', { method: 'PUT', json: input })
}

export function updateJiraConnection(input: UpdateJiraConnectionInput): Promise<AppSettings> {
  return updateAppSettings({
    jira: input,
  })
}

export function updateAiConnection(input: UpdateAiConnectionInput): Promise<AppSettings> {
  return updateAppSettings({
    ai: input,
  })
}

export function updateAssistantConnection(input: UpdateAssistantSettingsInput): Promise<AppSettings> {
  return updateAppSettings({
    assistant: input,
  })
}

export function fetchAvailableSpaces(): Promise<JiraSpaceDirectoryEntry[]> {
  return apiFetch('/spaces', 'Failed to fetch spaces')
}

export function fetchAvailableTeams(query?: string): Promise<JiraTeamRef[]> {
  return apiFetch('/teams', 'Failed to fetch teams', { query: { query } })
}

export function fetchAiProviderAvailability(): Promise<AiProviderAvailabilityResponse> {
  return apiFetch('/ai/providers', 'Failed to fetch AI providers')
}
