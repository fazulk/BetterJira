import type {
  AppSettings,
  UpdateAppSettingsInput,
} from './settingsTypes'
import { DEFAULT_AI_PROVIDER, getDefaultModelForProvider } from './ai'
import {
  getDefaultAssistantSettings,
  normalizeAssistantConnectionSettings,
  normalizeAssistantConnectionUpdate,
} from './settingsAssistant'
import {
  getDefaultAiConnectionSettings,
  normalizeAiConnectionSettings,
  normalizeAiConnectionUpdate,
  normalizeAiSettingsForApp,
  normalizeJiraConnectionSettings,
  normalizeJiraConnectionUpdate,
} from './settingsConnections'
import {
  normalizeLabelColors,
  normalizeSpaceKeyList,
  normalizeStatusColors,
  normalizeStatusOrder,
} from './settingsNormalizers'
import {
  getDefaultSidebarSettings,
  normalizeSidebarSettings,
  normalizeSidebarSettingsUpdate,
  reconcileSidebarSettings,
} from './settingsSidebar'
import {
  normalizeAssistantSkillSettings,
  reconcileAssistantSkills,
} from './settingsSkills'
import {
  normalizeSpacesFromRecord,
  reconcileSpaceSettings,
} from './settingsSpaces'

function getRecordValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }

  const recordValue: Record<string, unknown> = value
  return recordValue
}

function normalizeStatusPreferences(value: unknown): AppSettings['statusPreferences'] {
  const recordValue = getRecordValue(value)

  return {
    colors: normalizeStatusColors(recordValue.colors),
    order: normalizeStatusOrder(recordValue.order),
  }
}

export function getDefaultAppSettings(): AppSettings {
  return {
    spaces: [],
    filterSpaceKeys: [],
    sidebar: getDefaultSidebarSettings(),
    jira: {
      baseUrl: '',
      email: '',
      hasApiToken: false,
    },
    ai: getDefaultAiConnectionSettings(),
    assistant: getDefaultAssistantSettings(),
    assistantSkills: [],
    labelColors: {},
    statusPreferences: {
      colors: {},
      order: [],
    },
  }
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (typeof value !== 'object' || value === null) {
    return getDefaultAppSettings()
  }

  const recordValue: Record<string, unknown> = value

  return reconcileAppSettings({
    spaces: normalizeSpacesFromRecord(recordValue),
    filterSpaceKeys: normalizeSpaceKeyList(recordValue.filterSpaceKeys),
    sidebar: normalizeSidebarSettings(recordValue.sidebar),
    jira: normalizeJiraConnectionSettings(recordValue.jira),
    ai: normalizeAiConnectionSettings(recordValue.ai),
    assistant: normalizeAssistantConnectionSettings(recordValue.assistant),
    assistantSkills: normalizeAssistantSkillSettings(recordValue.assistantSkills),
    labelColors: normalizeLabelColors(recordValue.labelColors),
    statusPreferences: normalizeStatusPreferences(recordValue.statusPreferences),
  })
}

export function normalizeAppSettingsUpdate(value: unknown): UpdateAppSettingsInput {
  if (typeof value !== 'object' || value === null) {
    return {}
  }

  const recordValue: Record<string, unknown> = value
  const nextSettings: UpdateAppSettingsInput = {}
  const nextSpaces = normalizeSpacesFromRecord(recordValue)

  if (nextSpaces.length > 0 || 'spaces' in recordValue || 'visibleSpaceKeys' in recordValue || 'hiddenSpaceKeys' in recordValue) {
    nextSettings.spaces = nextSpaces
  }

  if ('filterSpaceKeys' in recordValue) {
    nextSettings.filterSpaceKeys = normalizeSpaceKeyList(recordValue.filterSpaceKeys)
  }

  const nextSidebar = normalizeSidebarSettingsUpdate(recordValue.sidebar)
  if (nextSidebar) {
    nextSettings.sidebar = nextSidebar
  }

  const nextJira = normalizeJiraConnectionUpdate(recordValue.jira)
  if (nextJira) {
    nextSettings.jira = nextJira
  }

  const nextAi = normalizeAiConnectionUpdate(recordValue.ai)
  if (nextAi) {
    nextSettings.ai = nextAi
  }

  const nextAssistant = normalizeAssistantConnectionUpdate(recordValue.assistant)
  if (nextAssistant) {
    nextSettings.assistant = nextAssistant
  }

  if ('assistantSkills' in recordValue) {
    nextSettings.assistantSkills = normalizeAssistantSkillSettings(recordValue.assistantSkills)
  }

  if ('labelColors' in recordValue) {
    nextSettings.labelColors = normalizeLabelColors(recordValue.labelColors)
  }

  if ('statusPreferences' in recordValue) {
    const statusPreferencesRecord = getRecordValue(recordValue.statusPreferences)
    nextSettings.statusPreferences = {}
    if ('colors' in statusPreferencesRecord) {
      nextSettings.statusPreferences.colors = normalizeStatusColors(statusPreferencesRecord.colors)
    }
    if ('order' in statusPreferencesRecord) {
      nextSettings.statusPreferences.order = normalizeStatusOrder(statusPreferencesRecord.order)
    }
  }

  return nextSettings
}

export function reconcileAppSettings(settings: AppSettings): AppSettings {
  const spaces = reconcileSpaceSettings(settings.spaces)
  const enabledSpaceKeys = new Set(
    spaces
      .filter(space => space.enabled)
      .map(space => space.key),
  )

  return {
    spaces,
    filterSpaceKeys: settings.filterSpaceKeys.filter(spaceKey => enabledSpaceKeys.has(spaceKey)),
    sidebar: reconcileSidebarSettings(settings.sidebar),
    jira: {
      baseUrl: settings.jira.baseUrl.trim(),
      email: settings.jira.email.trim(),
      hasApiToken: settings.jira.hasApiToken,
    },
    ai: normalizeAiSettingsForApp({
      hasCerebrasApiKey: settings.ai.hasCerebrasApiKey,
      provider: settings.ai.provider ?? DEFAULT_AI_PROVIDER,
      model: settings.ai.model || getDefaultModelForProvider(DEFAULT_AI_PROVIDER),
    }),
    assistant: normalizeAssistantConnectionSettings(settings.assistant),
    assistantSkills: reconcileAssistantSkills(settings.assistantSkills),
    labelColors: normalizeLabelColors(settings.labelColors),
    statusPreferences: {
      colors: normalizeStatusColors(settings.statusPreferences.colors),
      order: normalizeStatusOrder(settings.statusPreferences.order),
    },
  }
}
