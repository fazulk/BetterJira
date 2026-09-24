import type { AppSettings, UpdateAppSettingsInput } from '../shared/settings'
import type { StoredCredentials } from './credentials'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {

  getDefaultAppSettings,
  normalizeAppSettings,
  reconcileAppSettings,

} from '../shared/settings'
import { isRecord } from '../shared/typeGuards'
import { migrateLegacyCredentials, readStoredCredentials, writeStoredCredentials } from './credentials'
import { getAppDataDir } from './runtimePaths'

const settingsFilePath = resolve(getAppDataDir(), 'settings.json')

interface StoredJiraSettings {
  baseUrl: string
  email: string
}

interface StoredAiSettings {
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
  projectAppearances: AppSettings['projectAppearances']
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
    },
    ai: {
      provider: getDefaultAppSettings().ai.provider,
      model: getDefaultAppSettings().ai.model,
    },
  }
}

function normalizeStoredJiraSettings(value: unknown): StoredJiraSettings {
  if (!isRecord(value)) {
    return createDefaultStoredSettings().jira
  }

  const recordValue = value

  return {
    baseUrl: typeof recordValue.baseUrl === 'string' ? recordValue.baseUrl.trim() : '',
    email: typeof recordValue.email === 'string' ? recordValue.email.trim() : '',
  }
}

function normalizeStoredAiSettings(value: unknown): StoredAiSettings {
  if (!isRecord(value)) {
    return createDefaultStoredSettings().ai
  }

  const recordValue = value
  const normalizedAiSettings = normalizeAppSettings({ ai: recordValue }).ai

  return {
    provider: normalizedAiSettings.provider,
    model: normalizedAiSettings.model,
  }
}

function getLegacyCredentials(value: unknown): StoredCredentials | null {
  if (!isRecord(value)) {
    return null
  }

  const jira = isRecord(value.jira) ? value.jira : {}
  const ai = isRecord(value.ai) ? value.ai : {}
  if (!('apiToken' in jira) && !('cerebrasApiKey' in ai)) {
    return null
  }

  return {
    jiraApiToken: typeof jira.apiToken === 'string' ? jira.apiToken.trim() : '',
    cerebrasApiKey: typeof ai.cerebrasApiKey === 'string' ? ai.cerebrasApiKey.trim() : '',
  }
}

function normalizeStoredSettings(value: unknown): StoredAppSettings {
  const normalizedAppSettings = normalizeAppSettings(value)
  const defaultStoredSettings = createDefaultStoredSettings()

  if (!isRecord(value)) {
    return defaultStoredSettings
  }

  const recordValue = value

  return {
    spaces: normalizedAppSettings.spaces,
    filterSpaceKeys: normalizedAppSettings.filterSpaceKeys,
    sidebar: normalizedAppSettings.sidebar,
    jira: normalizeStoredJiraSettings(recordValue.jira),
    ai: normalizeStoredAiSettings(recordValue.ai),
    assistant: normalizedAppSettings.assistant,
    assistantSkills: normalizedAppSettings.assistantSkills,
    labelColors: normalizedAppSettings.labelColors,
    projectAppearances: normalizedAppSettings.projectAppearances,
    statusPreferences: normalizedAppSettings.statusPreferences,
  }
}

function toPublicAppSettings(settings: StoredAppSettings, credentials: StoredCredentials): AppSettings {
  return reconcileAppSettings({
    spaces: settings.spaces,
    filterSpaceKeys: settings.filterSpaceKeys,
    sidebar: settings.sidebar,
    jira: {
      baseUrl: settings.jira.baseUrl,
      email: settings.jira.email,
      hasApiToken: credentials.jiraApiToken.length > 0,
    },
    ai: {
      hasCerebrasApiKey: credentials.cerebrasApiKey.length > 0,
      provider: settings.ai.provider,
      model: settings.ai.model,
    },
    assistant: settings.assistant,
    assistantSkills: settings.assistantSkills,
    labelColors: settings.labelColors,
    projectAppearances: settings.projectAppearances,
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

  let value: unknown
  try {
    value = JSON.parse(readFileSync(settingsFilePath, 'utf8'))
  }
  catch (error) {
    console.error('Failed to read settings file:', error)
    return createDefaultStoredSettings()
  }

  const settings = normalizeStoredSettings(value)
  const legacyCredentials = getLegacyCredentials(value)
  if (legacyCredentials) {
    migrateLegacyCredentials(legacyCredentials)
    writeSettingsFile(settings)
  }
  return settings
}

export function getStoredJiraSettings(): StoredJiraSettings & { apiToken: string } {
  return { ...readStoredSettings().jira, apiToken: readStoredCredentials().jiraApiToken }
}

export function getStoredAiSettings(): StoredAiSettings & { cerebrasApiKey: string } {
  return { ...readStoredSettings().ai, cerebrasApiKey: readStoredCredentials().cerebrasApiKey }
}

export function getAppSettings(): AppSettings {
  return toPublicAppSettings(readStoredSettings(), readStoredCredentials())
}

export function updateAppSettings(input: UpdateAppSettingsInput): AppSettings {
  const currentSettings = readStoredSettings()
  const currentCredentials = readStoredCredentials()
  const credentials: StoredCredentials = {
    jiraApiToken: input.jira?.apiToken ?? currentCredentials.jiraApiToken,
    cerebrasApiKey: input.ai?.cerebrasApiKey ?? currentCredentials.cerebrasApiKey,
  }
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
      hasApiToken: credentials.jiraApiToken.length > 0,
    },
    ai: {
      hasCerebrasApiKey: credentials.cerebrasApiKey.length > 0,
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
    projectAppearances: input.projectAppearances ?? currentSettings.projectAppearances,
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
    },
    ai: {
      provider: nextSettings.ai.provider,
      model: nextSettings.ai.model,
    },
    assistant: nextSettings.assistant,
    assistantSkills: nextSettings.assistantSkills,
    labelColors: nextSettings.labelColors,
    projectAppearances: nextSettings.projectAppearances,
    statusPreferences: nextSettings.statusPreferences,
  }

  if (input.jira?.apiToken !== undefined || input.ai?.cerebrasApiKey !== undefined) {
    writeStoredCredentials(credentials)
  }
  writeSettingsFile(storedSettings)
  return nextSettings
}
