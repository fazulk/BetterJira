import type { AssistantSettings } from './assistant'
import type { UpdateAssistantSettingsInput } from './settingsTypes'
import {
  getDefaultAssistantSettings,
  isAssistantProvider,
  isAssistantReasoning,
  normalizeAssistantSettings,
} from './assistant'
import { isRecord } from './typeGuards'

export { getDefaultAssistantSettings } from './assistant'

export function normalizeAssistantConnectionSettings(value: unknown): AssistantSettings {
  if (!isRecord(value)) {
    return getDefaultAssistantSettings()
  }

  const recordValue = value
  return normalizeAssistantSettings(recordValue.provider, recordValue.model, recordValue.reasoning, recordValue.systemPrompt)
}

export function normalizeAssistantConnectionUpdate(value: unknown): UpdateAssistantSettingsInput | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const recordValue = value
  const nextAssistant: UpdateAssistantSettingsInput = {}

  if ('provider' in recordValue && isAssistantProvider(recordValue.provider)) {
    nextAssistant.provider = recordValue.provider
  }

  if ('model' in recordValue && typeof recordValue.model === 'string') {
    nextAssistant.model = recordValue.model
  }

  if ('reasoning' in recordValue && isAssistantReasoning(recordValue.reasoning)) {
    nextAssistant.reasoning = recordValue.reasoning
  }

  if ('systemPrompt' in recordValue && typeof recordValue.systemPrompt === 'string') {
    nextAssistant.systemPrompt = recordValue.systemPrompt
  }

  return Object.keys(nextAssistant).length > 0 ? nextAssistant : undefined
}
