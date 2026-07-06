import type {
  AiConnectionSettings,
  JiraConnectionSettings,
  UpdateAiConnectionInput,
  UpdateJiraConnectionInput,
} from './settingsTypes'
import {
  AI_PROVIDERS,
  DEFAULT_AI_PROVIDER,
  getDefaultModelForProvider,
  isAiProvider,
  normalizeAiSettings,
} from './ai'
import {
  normalizeAiValue,
  normalizeJiraValue,
} from './settingsNormalizers'
import { isRecord } from './typeGuards'

export function normalizeJiraConnectionSettings(value: unknown): JiraConnectionSettings {
  if (!isRecord(value)) {
    return {
      baseUrl: '',
      email: '',
      hasApiToken: false,
    }
  }

  const recordValue = value
  const apiToken = normalizeJiraValue(recordValue.apiToken)

  return {
    baseUrl: normalizeJiraValue(recordValue.baseUrl),
    email: normalizeJiraValue(recordValue.email),
    hasApiToken: recordValue.hasApiToken === true || apiToken.length > 0,
  }
}

export function normalizeJiraConnectionUpdate(value: unknown): UpdateJiraConnectionInput | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const recordValue = value
  const nextJira: UpdateJiraConnectionInput = {}

  if ('baseUrl' in recordValue) {
    nextJira.baseUrl = normalizeJiraValue(recordValue.baseUrl)
  }

  if ('email' in recordValue) {
    nextJira.email = normalizeJiraValue(recordValue.email)
  }

  if ('apiToken' in recordValue) {
    nextJira.apiToken = normalizeJiraValue(recordValue.apiToken)
  }

  return Object.keys(nextJira).length > 0 ? nextJira : undefined
}

export function getDefaultAiConnectionSettings(): AiConnectionSettings {
  return {
    hasCerebrasApiKey: false,
    provider: DEFAULT_AI_PROVIDER,
    model: getDefaultModelForProvider(DEFAULT_AI_PROVIDER),
  }
}

export function normalizeAiConnectionSettings(value: unknown): AiConnectionSettings {
  if (!isRecord(value)) {
    return getDefaultAiConnectionSettings()
  }

  const recordValue = value
  const cerebrasApiKey = normalizeAiValue(recordValue.cerebrasApiKey)
  const aiSettings = normalizeAiSettings(recordValue.provider, recordValue.model)

  return {
    hasCerebrasApiKey: recordValue.hasCerebrasApiKey === true || cerebrasApiKey.length > 0,
    provider: aiSettings.provider,
    model: aiSettings.model,
  }
}

export function normalizeAiConnectionUpdate(value: unknown): UpdateAiConnectionInput | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const recordValue = value
  const nextAi: UpdateAiConnectionInput = {}

  if ('cerebrasApiKey' in recordValue) {
    nextAi.cerebrasApiKey = normalizeAiValue(recordValue.cerebrasApiKey)
  }

  if ('provider' in recordValue && isAiProvider(recordValue.provider)) {
    nextAi.provider = recordValue.provider
  }

  if ('model' in recordValue && typeof recordValue.model === 'string') {
    nextAi.model = normalizeAiValue(recordValue.model)
  }

  return Object.keys(nextAi).length > 0 ? nextAi : undefined
}

export function normalizeAiSettingsForApp(settings: AiConnectionSettings): AiConnectionSettings {
  const aiSettings = normalizeAiSettings(
    settings.provider,
    settings.model,
    DEFAULT_AI_PROVIDER,
    AI_PROVIDERS,
  )

  return {
    hasCerebrasApiKey: settings.hasCerebrasApiKey,
    provider: aiSettings.provider,
    model: aiSettings.model,
  }
}

export function hasConfiguredJiraCredentials(settings: Pick<{ jira: JiraConnectionSettings }, 'jira'>): boolean {
  return (
    settings.jira.baseUrl.length > 0
    && settings.jira.email.length > 0
    && settings.jira.hasApiToken
  )
}
