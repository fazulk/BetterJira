import type { JiraAdfDocument } from './jiraAdf'

export type AiProvider = 'openai' | 'anthropic' | 'cerebras' | 'codex' | 'claude'
export const AI_PROVIDERS: AiProvider[] = ['openai', 'anthropic', 'cerebras', 'codex', 'claude']
export const LOCAL_AI_PROVIDERS: AiProvider[] = ['codex', 'claude']

export interface AiModelOption {
  id: string
  label: string
  provider: AiProvider
}

export interface AiProviderAvailability {
  provider: AiProvider
  available: boolean
  detail: string
  commandPath?: string
}

export type CliTool = 'acli'

export interface CliToolAvailability {
  tool: CliTool
  label: string
  available: boolean
  detail: string
  commandPath?: string
  installInstructions?: string[]
}

export interface AiProviderAvailabilityResponse {
  providers: AiProviderAvailability[]
  tools?: CliToolAvailability[]
}

export interface AiSettings {
  provider: AiProvider
  model: string
}

export interface GenerateAiDescriptionRequest {
  instruction: string
  currentDescriptionAdf: JiraAdfDocument | null
  provider: AiProvider
  model: string
}

export interface GenerateAiDescriptionResponse {
  descriptionText: string
  descriptionAdf: JiraAdfDocument | null
}

export const DEFAULT_AI_PROVIDER: AiProvider = 'cerebras'

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest'
export const DEFAULT_CEREBRAS_MODEL = 'llama3.1-8b'
export const DEFAULT_CODEX_MODEL = 'default'
export const DEFAULT_CLAUDE_MODEL = 'sonnet'

export const AI_MODEL_CATALOG: Record<AiProvider, AiModelOption[]> = {
  openai: [
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
    { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  ],
  cerebras: [
    { id: 'llama3.1-8b', label: 'Llama 3.1 8B', provider: 'cerebras' },
  ],
  codex: [
    { id: 'default', label: 'Codex configured default', provider: 'codex' },
    { id: 'gpt-6-astra', label: 'GPT-6.0 Astra', provider: 'codex' },
    { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'codex' },
    { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'codex' },
    { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'codex' },
    { id: 'gpt-5.5', label: 'GPT-5.5', provider: 'codex' },
    { id: 'gpt-5.4', label: 'GPT-5.4', provider: 'codex' },
    { id: 'gpt-5.1-codex', label: 'GPT-5.1 Codex', provider: 'codex' },
  ],
  claude: [
    { id: 'sonnet', label: 'Claude Sonnet', provider: 'claude' },
    { id: 'opus', label: 'Claude Opus', provider: 'claude' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'claude' },
  ],
}

export function isAiProvider(value: unknown): value is AiProvider {
  return value === 'openai'
    || value === 'anthropic'
    || value === 'cerebras'
    || value === 'codex'
    || value === 'claude'
}

export function getProviderLabel(provider: AiProvider): string {
  if (provider === 'openai')
    return 'OpenAI'
  if (provider === 'anthropic')
    return 'Anthropic'
  if (provider === 'codex')
    return 'Codex'
  if (provider === 'claude')
    return 'Claude Code'
  return 'Cerebras'
}

export function getDefaultModelForProvider(provider: AiProvider): string {
  if (provider === 'openai')
    return DEFAULT_OPENAI_MODEL
  if (provider === 'anthropic')
    return DEFAULT_ANTHROPIC_MODEL
  if (provider === 'codex')
    return DEFAULT_CODEX_MODEL
  if (provider === 'claude')
    return DEFAULT_CLAUDE_MODEL
  return DEFAULT_CEREBRAS_MODEL
}

export function getAiModelsForProvider(provider: AiProvider): AiModelOption[] {
  return AI_MODEL_CATALOG[provider]
}

export function isSupportedModel(provider: AiProvider, model: string): boolean {
  return getAiModelsForProvider(provider).some(option => option.id === model)
}

function getFallbackProvider(allowedProviders: readonly AiProvider[], fallbackProvider: AiProvider): AiProvider {
  if (allowedProviders.includes(fallbackProvider)) {
    return fallbackProvider
  }

  return allowedProviders[0] ?? DEFAULT_AI_PROVIDER
}

export function normalizeAiSettings(
  provider: unknown,
  model: unknown,
  fallbackProvider: AiProvider = DEFAULT_AI_PROVIDER,
  allowedProviders: readonly AiProvider[] = AI_PROVIDERS,
): AiSettings {
  const allowedFallbackProvider = getFallbackProvider(allowedProviders, fallbackProvider)
  const normalizedProvider = isAiProvider(provider) && allowedProviders.includes(provider)
    ? provider
    : allowedFallbackProvider
  const normalizedModel = typeof model === 'string' && isSupportedModel(normalizedProvider, model)
    ? model
    : getDefaultModelForProvider(normalizedProvider)

  return {
    provider: normalizedProvider,
    model: normalizedModel,
  }
}
