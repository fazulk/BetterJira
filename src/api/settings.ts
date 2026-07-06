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

const SETTINGS_BASE = '/api/settings'
const SPACES_BASE = '/api/spaces'
const TEAMS_BASE = '/api/teams'
const AI_PROVIDERS_BASE = '/api/ai/providers'

export async function fetchAppSettings(): Promise<AppSettings> {
  const response = await fetch(SETTINGS_BASE)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  return response.json()
}

export async function updateAppSettings(input: UpdateAppSettingsInput): Promise<AppSettings> {
  const response = await fetch(SETTINGS_BASE, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to update settings: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  return response.json()
}

export async function updateJiraConnection(input: UpdateJiraConnectionInput): Promise<AppSettings> {
  return updateAppSettings({
    jira: input,
  })
}

export async function updateAiConnection(input: UpdateAiConnectionInput): Promise<AppSettings> {
  return updateAppSettings({
    ai: input,
  })
}

export async function updateAssistantConnection(input: UpdateAssistantSettingsInput): Promise<AppSettings> {
  return updateAppSettings({
    assistant: input,
  })
}

export async function fetchAvailableSpaces(): Promise<JiraSpaceDirectoryEntry[]> {
  const response = await fetch(SPACES_BASE)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch spaces: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  return response.json()
}

export async function fetchAvailableTeams(query?: string): Promise<JiraTeamRef[]> {
  const url = query ? `${TEAMS_BASE}?query=${encodeURIComponent(query)}` : TEAMS_BASE
  const response = await fetch(url)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  return response.json()
}

export async function fetchAiProviderAvailability(): Promise<AiProviderAvailabilityResponse> {
  const response = await fetch(AI_PROVIDERS_BASE)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch AI providers: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  return response.json()
}
