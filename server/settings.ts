import type { AppSettings, UpdateAppSettingsInput } from '../shared/settings'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {

  getDefaultAppSettings,
  normalizeAppSettings,
  reconcileAppSettings,

} from '../shared/settings'
import { getAppDataDir } from './runtimePaths'

const settingsFilePath = resolve(getAppDataDir(), 'settings.json')

interface StoredJiraSettings {
  baseUrl: string
  email: string
  apiToken: string
}

interface StoredAiSettings {
  cerebrasApiKey: string
  provider: AppSettings['ai']['provider']
  model: string
}

interface StoredAppSettings {
  spaces: AppSettings['spaces']
  filterSpaceKeys: AppSettings['filterSpaceKeys']
  sidebar: AppSettings['sidebar']
  jira: StoredJiraSettings
  ai: StoredAiSettings
  assistant: AppSettings['assistant']
  assistantSkills: AppSettings['assistantSkills']
  labelColors: AppSettings['labelColors']
  statusPreferences: AppSettings['statusPreferences']
}

function ensureSettingsDirectoryExists(): void {
  mkdirSync(dirname(settingsFilePath), { recursive: true })
}

function createDefaultStoredSettings(): StoredAppSettings {
  return {
    ...getDefaultAppSettings(),
    jira: {
      baseUrl: '',
      email: '',
      apiToken: '',
    },
    ai: {
      cerebrasApiKey: '',
      provider: getDefaultAppSettings().ai.provider,
      model: getDefaultAppSettings().ai.model,
    },
  }
}

function normalizeStoredJiraSettings(value: unknown): StoredJiraSettings {
  if (typeof value !== 'object' || value === null) {
    return createDefaultStoredSettings().jira
  }

  const recordValue: Record<string, unknown> = value

  return {
    baseUrl: typeof recordValue.baseUrl === 'string' ? recordValue.baseUrl.trim() : '',
    email: typeof recordValue.email === 'string' ? recordValue.email.trim() : '',
    apiToken: typeof recordValue.apiToken === 'string' ? recordValue.apiToken.trim() : '',
  }
}

function normalizeStoredAiSettings(value: unknown): StoredAiSettings {
  if (typeof value !== 'object' || value === null) {
    return createDefaultStoredSettings().ai
  }

  const recordValue: Record<string, unknown> = value
  const normalizedAiSettings = normalizeAppSettings({ ai: recordValue }).ai

  return {
    cerebrasApiKey: typeof recordValue.cerebrasApiKey === 'string' ? recordValue.cerebrasApiKey.trim() : '',
    provider: normalizedAiSettings.provider,
    model: normalizedAiSettings.model,
  }
}

function normalizeStoredSettings(value: unknown): StoredAppSettings {
  const normalizedAppSettings = normalizeAppSettings(value)
  const defaultStoredSettings = createDefaultStoredSettings()

  if (typeof value !== 'object' || value === null) {
    return defaultStoredSettings
  }

  const recordValue: Record<string, unknown> = value

  return {
    spaces: normalizedAppSettings.spaces,
    filterSpaceKeys: normalizedAppSettings.filterSpaceKeys,
    sidebar: normalizedAppSettings.sidebar,
    jira: normalizeStoredJiraSettings(recordValue.jira),
    ai: normalizeStoredAiSettings(recordValue.ai),
    assistant: normalizedAppSettings.assistant,
    assistantSkills: normalizedAppSettings.assistantSkills,
    labelColors: normalizedAppSettings.labelColors,
    statusPreferences: normalizedAppSettings.statusPreferences,
  }
}

function toPublicAppSettings(settings: StoredAppSettings): AppSettings {
  return reconcileAppSettings({
    spaces: settings.spaces,
    filterSpaceKeys: settings.filterSpaceKeys,
    sidebar: settings.sidebar,
    jira: {
      baseUrl: settings.jira.baseUrl,
      email: settings.jira.email,
      hasApiToken: settings.jira.apiToken.length > 0,
    },
    ai: {
      hasCerebrasApiKey: settings.ai.cerebrasApiKey.length > 0,
      provider: settings.ai.provider,
      model: settings.ai.model,
    },
    assistant: settings.assistant,
    assistantSkills: settings.assistantSkills,
    labelColors: settings.labelColors,
    statusPreferences: settings.statusPreferences,
  })
}

function writeSettingsFile(settings: StoredAppSettings): void {
  ensureSettingsDirectoryExists()
  writeFileSync(settingsFilePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
}

function readStoredSettings(): StoredAppSettings {
  if (!existsSync(settingsFilePath)) {
    return createDefaultStoredSettings()
  }

  try {
    const rawSettings = readFileSync(settingsFilePath, 'utf8')
    return normalizeStoredSettings(JSON.parse(rawSettings))
  }
  catch (error) {
    console.error('Failed to read settings file:', error)
    return createDefaultStoredSettings()
  }
}

export function getStoredJiraSettings(): StoredJiraSettings {
  return readStoredSettings().jira
}

export function getStoredAiSettings(): StoredAiSettings {
  return readStoredSettings().ai
}

export function getAppSettings(): AppSettings {
  return toPublicAppSettings(readStoredSettings())
}

export function updateAppSettings(input: UpdateAppSettingsInput): AppSettings {
  const currentSettings = readStoredSettings()
  const nextSettings = reconcileAppSettings({
    spaces: input.spaces ?? currentSettings.spaces,
    filterSpaceKeys: input.filterSpaceKeys ?? currentSettings.filterSpaceKeys,
    sidebar: {
      ...currentSettings.sidebar,
      ...input.sidebar,
    },
    jira: {
      baseUrl: input.jira?.baseUrl ?? currentSettings.jira.baseUrl,
      email: input.jira?.email ?? currentSettings.jira.email,
      hasApiToken: (input.jira?.apiToken ?? currentSettings.jira.apiToken).length > 0,
    },
    ai: {
      hasCerebrasApiKey: (input.ai?.cerebrasApiKey ?? currentSettings.ai.cerebrasApiKey).length > 0,
      provider: input.ai?.provider ?? currentSettings.ai.provider,
      model: input.ai?.model ?? currentSettings.ai.model,
    },
    assistant: {
      provider: input.assistant?.provider ?? currentSettings.assistant.provider,
      model: input.assistant?.model ?? currentSettings.assistant.model,
      reasoning: input.assistant?.reasoning ?? currentSettings.assistant.reasoning,
      systemPrompt: input.assistant?.systemPrompt ?? currentSettings.assistant.systemPrompt,
    },
    assistantSkills: input.assistantSkills ?? currentSettings.assistantSkills,
    labelColors: input.labelColors ?? currentSettings.labelColors,
    statusPreferences: {
      colors: input.statusPreferences?.colors ?? currentSettings.statusPreferences.colors,
      order: input.statusPreferences?.order ?? currentSettings.statusPreferences.order,
    },
  })
  const storedSettings: StoredAppSettings = {
    spaces: nextSettings.spaces,
    filterSpaceKeys: nextSettings.filterSpaceKeys,
    sidebar: nextSettings.sidebar,
    jira: {
      baseUrl: input.jira?.baseUrl ?? currentSettings.jira.baseUrl,
      email: input.jira?.email ?? currentSettings.jira.email,
      apiToken: input.jira?.apiToken ?? currentSettings.jira.apiToken,
    },
    ai: {
      cerebrasApiKey: input.ai?.cerebrasApiKey ?? currentSettings.ai.cerebrasApiKey,
      provider: nextSettings.ai.provider,
      model: nextSettings.ai.model,
    },
    assistant: nextSettings.assistant,
    assistantSkills: nextSettings.assistantSkills,
    labelColors: nextSettings.labelColors,
    statusPreferences: nextSettings.statusPreferences,
  }

  writeSettingsFile(storedSettings)
  return nextSettings
}
