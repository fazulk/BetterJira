import type { AiModelOption, AiProviderAvailability, CliToolAvailability } from '~/shared/ai'
import type { AssistantProvider, AssistantReasoning, AssistantSettings } from '~/shared/assistant'
import type { AppSettings, UpdateAssistantSettingsInput } from '~/shared/settings'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  fetchAiProviderAvailability,
  fetchAppSettings,
  fetchAssistantModels,
  updateAssistantConnection,
} from '@/api/settings'
import { AI_PROVIDER_AVAILABILITY_QUERY_KEY } from '@/composables/useAiSettings'
import { APP_SETTINGS_QUERY_KEY } from '@/composables/useSpaceSettings'
import {
  ASSISTANT_PROVIDERS,
  DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  getAssistantModelsForProvider,
  getDefaultAssistantModel,
  normalizeAssistantSettings,
} from '~/shared/assistant'
import { getDefaultAppSettings, reconcileAppSettings } from '~/shared/settings'

function modelsQueryKey(provider: AssistantProvider) {
  return ['assistant-models', provider] as const
}

function getCurrentAppSettings(currentSettings: AppSettings | undefined): AppSettings {
  return currentSettings ?? getDefaultAppSettings()
}

function mergeAssistantSettings(currentSettings: AppSettings | undefined, input: UpdateAssistantSettingsInput): AppSettings {
  const appSettings = getCurrentAppSettings(currentSettings)

  return reconcileAppSettings({
    ...appSettings,
    assistant: normalizeAssistantSettings(
      input.provider ?? appSettings.assistant.provider,
      input.model ?? appSettings.assistant.model,
      input.reasoning ?? appSettings.assistant.reasoning,
      input.systemPrompt ?? appSettings.assistant.systemPrompt,
    ),
  })
}

export function useAssistantSettings() {
  const queryClient = useQueryClient()

  const appSettingsQuery = useQuery({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: fetchAppSettings,
  })
  const providerAvailabilityQuery = useQuery({
    queryKey: AI_PROVIDER_AVAILABILITY_QUERY_KEY,
    queryFn: fetchAiProviderAvailability,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
  const assistantMutation = useMutation({
    mutationFn: updateAssistantConnection,
  })

  const settings = computed<AssistantSettings>(() => normalizeAssistantSettings(
    appSettingsQuery.data.value?.assistant.provider,
    appSettingsQuery.data.value?.assistant.model,
    appSettingsQuery.data.value?.assistant.reasoning,
    appSettingsQuery.data.value?.assistant.systemPrompt,
  ))

  const providerAvailability = computed<AiProviderAvailability[]>(() => (
    (providerAvailabilityQuery.data.value?.providers ?? [])
      .filter(entry => entry.provider === 'claude' || entry.provider === 'codex')
  ))

  const acliAvailability = computed<CliToolAvailability | null>(() => (
    providerAvailabilityQuery.data.value?.tools?.find(entry => entry.tool === 'acli') ?? null
  ))

  function isProviderAvailable(provider: AssistantProvider): boolean {
    return providerAvailability.value.find(entry => entry.provider === provider)?.available ?? false
  }

  const modelsQuery = useQuery({
    queryKey: computed(() => modelsQueryKey(settings.value.provider)),
    queryFn: ({ queryKey }) => fetchAssistantModels(queryKey[1]),
    enabled: computed(() => isProviderAvailable(settings.value.provider)),
    staleTime: Infinity,
    retry: false,
  })
  const availableModels = computed(() => {
    const models = modelsQuery.data.value ?? getAssistantModelsForProvider(settings.value.provider)
    // Keep an existing selection visible even if the CLI no longer advertises it.
    return models.some(model => model.id === settings.value.model)
      ? models
      : [...models, { id: settings.value.model, label: settings.value.model, provider: settings.value.provider }]
  })

  async function refreshModels(): Promise<void> {
    await modelsQuery.refetch({ cancelRefetch: false })
  }

  async function persistAssistantSettings(input: UpdateAssistantSettingsInput): Promise<void> {
    const previousSettings = getCurrentAppSettings(queryClient.getQueryData<AppSettings>(APP_SETTINGS_QUERY_KEY))
    const optimisticSettings = mergeAssistantSettings(previousSettings, input)

    queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, optimisticSettings)

    try {
      const persistedSettings = await assistantMutation.mutateAsync(input)
      queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, persistedSettings)
    }
    catch (error) {
      queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, previousSettings)
      throw error
    }
  }

  async function setProvider(provider: AssistantProvider): Promise<void> {
    if (!ASSISTANT_PROVIDERS.includes(provider)) {
      return
    }

    const models = queryClient.getQueryData<AiModelOption[]>(modelsQueryKey(provider)) ?? getAssistantModelsForProvider(provider)
    const nextModel = models.some(model => model.id === settings.value.model)
      ? settings.value.model
      : getDefaultAssistantModel(provider)

    await persistAssistantSettings({ provider, model: nextModel })
  }

  async function setModel(model: string): Promise<void> {
    const nextModel = availableModels.value.some(option => option.id === model)
      ? model
      : getDefaultAssistantModel(settings.value.provider)

    await persistAssistantSettings({ model: nextModel })
  }

  async function setReasoning(reasoning: AssistantReasoning): Promise<void> {
    await persistAssistantSettings({ reasoning })
  }

  async function setSystemPrompt(systemPrompt: string): Promise<void> {
    await persistAssistantSettings({ systemPrompt })
  }

  return {
    settings,
    providers: ASSISTANT_PROVIDERS,
    providerAvailability,
    acliAvailability,
    isProviderAvailable,
    isLoadingProviders: computed(() => providerAvailabilityQuery.isLoading.value),
    availableModels,
    isRefreshingModels: computed(() => modelsQuery.isFetching.value),
    modelsError: computed(() => modelsQuery.error.value?.message ?? null),
    refreshModels,
    defaultSystemPrompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
    setProvider,
    setModel,
    setReasoning,
    setSystemPrompt,
  }
}
