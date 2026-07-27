import type { AppSettings, AppSpaceSetting, AppSpaceTeamFilter, AssistantSkillSetting, LabelColors, ProjectAppearances, StatusPreferences, UpdateAiConnectionInput, UpdateJiraConnectionInput, UpdateSidebarSettingsInput, UpdateStatusPreferencesInput } from '~/shared/settings'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  fetchAppSettings,
  updateAiConnection as persistAiConnection,
  updateAppSettings as persistAppSettings,
  updateJiraConnection as persistJiraConnection,
} from '@/api/settings'
import { TICKETS_QUERY_KEY } from '@/composables/queryKeys'
import { jiraSpaceDirectoryQueryKey, resetAvailableSpacesBootstrap } from '@/composables/useAvailableSpaces'
import { jiraCurrentUserQueryKey } from '@/composables/useJiraCurrentUser'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'
import {
  getDefaultAppSettings,
  hasConfiguredJiraCredentials,
  reconcileAppSettings,
} from '~/shared/settings'

export const APP_SETTINGS_QUERY_KEY = ['app-settings'] as const

let appSettingsMutationRevision = 0

function beginAppSettingsMutation(): number {
  appSettingsMutationRevision += 1
  return appSettingsMutationRevision
}

function isLatestAppSettingsMutation(revision: number): boolean {
  return revision === appSettingsMutationRevision
}

interface SpaceMutationInput {
  key: string
  name?: string
  teamFilter?: AppSpaceTeamFilter
}

interface SpaceAppearanceInput {
  icon?: string | null
  color?: string | null
}

function normalizeSpaceKey(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeSpaceName(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function useSpaceSettings() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: fetchAppSettings,
  })

  const settingsMutation = useMutation({
    mutationFn: persistAppSettings,
  })
  const jiraConnectionMutation = useMutation({
    mutationFn: persistJiraConnection,
  })
  const aiConnectionMutation = useMutation({
    mutationFn: persistAiConnection,
  })

  const settings = computed<AppSettings>(() => reconcileAppSettings(settingsQuery.data.value ?? getDefaultAppSettings()))
  const spaces = computed(() => settings.value.spaces)
  const enabledSpaces = computed(() => settings.value.spaces.filter(space => space.enabled))
  const disabledSpaces = computed(() => settings.value.spaces.filter(space => !space.enabled))
  const jiraConnection = computed(() => settings.value.jira)
  const aiConnection = computed(() => settings.value.ai)
  const hasJiraCredentialsConfigured = computed(() => hasConfiguredJiraCredentials(settings.value))

  async function updateSettings(nextSettings: Partial<AppSettings>, invalidateTickets: boolean): Promise<void> {
    const mutationRevision = beginAppSettingsMutation()
    const previousSettings = settings.value
    const mergedSettings = reconcileAppSettings({
      ...previousSettings,
      ...nextSettings,
    })

    queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, mergedSettings)

    try {
      const persistedSettings = await settingsMutation.mutateAsync(nextSettings)
      if (isLatestAppSettingsMutation(mutationRevision)) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, persistedSettings)
      }

      if (invalidateTickets) {
        await queryClient.invalidateQueries({
          queryKey: TICKETS_QUERY_KEY,
        })
      }
    }
    catch (error) {
      if (isLatestAppSettingsMutation(mutationRevision)) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, previousSettings)
      }
      throw error
    }
  }

  async function setFilterSpaceKeys(filterSpaceKeys: string[]): Promise<void> {
    const enabledSpaceKeySet = new Set(enabledSpaces.value.map(space => space.key))

    await updateSettings({
      filterSpaceKeys: filterSpaceKeys
        .map(normalizeSpaceKey)
        .filter(spaceKey => enabledSpaceKeySet.has(spaceKey)),
    }, false)
  }

  async function setSidebarSettings(sidebarSettings: UpdateSidebarSettingsInput): Promise<void> {
    await updateSettings({
      sidebar: {
        ...settings.value.sidebar,
        ...sidebarSettings,
      },
    }, false)
  }

  async function setAssistantSkills(assistantSkills: AssistantSkillSetting[]): Promise<void> {
    await updateSettings({
      assistantSkills,
    }, false)
  }

  async function setLabelColors(labelColors: LabelColors): Promise<void> {
    await updateSettings({
      labelColors,
    }, false)
  }

  async function setProjectAppearances(projectAppearances: ProjectAppearances): Promise<void> {
    await updateSettings({
      projectAppearances,
    }, false)
  }

  async function setStatusPreferences(statusPreferences: UpdateStatusPreferencesInput): Promise<void> {
    const nextStatusPreferences: StatusPreferences = {
      colors: statusPreferences.colors ?? settings.value.statusPreferences.colors,
      order: statusPreferences.order ?? settings.value.statusPreferences.order,
    }

    await updateSettings({
      statusPreferences: nextStatusPreferences,
    }, false)
  }

  async function addOrEnableSpace(space: SpaceMutationInput): Promise<void> {
    const key = normalizeSpaceKey(space.key)
    if (!key) {
      throw new Error('Space key is required.')
    }

    const nextName = normalizeSpaceName(space.name)
    const existingSpace = settings.value.spaces.find(currentSpace => currentSpace.key === key)

    const nextSpaces = existingSpace
      ? settings.value.spaces.map((currentSpace): AppSpaceSetting => {
          if (currentSpace.key !== key) {
            return currentSpace
          }

          return {
            ...currentSpace,
            name: nextName || currentSpace.name || currentSpace.key,
            enabled: true,
          }
        })
      : [
          ...settings.value.spaces,
          {
            key,
            name: nextName || key,
            enabled: true,
            ...(space.teamFilter ? { teamFilter: space.teamFilter } : {}),
          },
        ]

    await updateSettings({
      spaces: nextSpaces,
      // Clearing the sidebar's saved space filter makes newly enabled spaces visible immediately.
      filterSpaceKeys: [],
    }, true)
  }

  async function updateSpaceAppearance(spaceKey: string, appearance: SpaceAppearanceInput): Promise<void> {
    const normalizedSpaceKey = normalizeSpaceKey(spaceKey)

    const nextSpaces = settings.value.spaces.map((space): AppSpaceSetting => {
      if (space.key !== normalizedSpaceKey) {
        return space
      }

      const nextSpace: AppSpaceSetting = { ...space }

      if (appearance.icon !== undefined) {
        if (appearance.icon) {
          nextSpace.icon = appearance.icon
        }
        else {
          delete nextSpace.icon
        }
      }

      if (appearance.color !== undefined) {
        if (appearance.color) {
          nextSpace.color = appearance.color
        }
        else {
          delete nextSpace.color
        }
      }

      return nextSpace
    })

    await updateSettings({ spaces: nextSpaces }, false)
  }

  async function disableSpace(spaceKey: string): Promise<void> {
    const normalizedSpaceKey = normalizeSpaceKey(spaceKey)

    const nextSpaces = settings.value.spaces.map((space): AppSpaceSetting => (
      space.key === normalizedSpaceKey
        ? {
            ...space,
            enabled: false,
          }
        : space
    ))

    await updateSettings({
      spaces: nextSpaces,
      filterSpaceKeys: settings.value.filterSpaceKeys.filter(key => key !== normalizedSpaceKey),
    }, true)
  }

  async function deleteSpace(spaceKey: string): Promise<void> {
    const normalizedSpaceKey = normalizeSpaceKey(spaceKey)
    if (normalizedSpaceKey === LOCAL_SPACE_KEY) {
      throw new Error('The Local space cannot be removed.')
    }

    await updateSettings({
      spaces: settings.value.spaces.filter(space => space.key !== normalizedSpaceKey),
      filterSpaceKeys: settings.value.filterSpaceKeys.filter(key => key !== normalizedSpaceKey),
    }, true)
  }

  async function updateJiraCredentials(input: UpdateJiraConnectionInput): Promise<void> {
    const mutationRevision = beginAppSettingsMutation()
    const previousSettings = settings.value
    const mergedSettings = reconcileAppSettings({
      ...previousSettings,
      jira: {
        baseUrl: input.baseUrl ?? previousSettings.jira.baseUrl,
        email: input.email ?? previousSettings.jira.email,
        hasApiToken: input.apiToken === undefined
          ? previousSettings.jira.hasApiToken
          : input.apiToken.length > 0,
      },
    })

    queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, mergedSettings)

    try {
      const persistedSettings = await jiraConnectionMutation.mutateAsync(input)
      if (isLatestAppSettingsMutation(mutationRevision)) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, persistedSettings)
      }
      resetAvailableSpacesBootstrap()
      queryClient.removeQueries({
        queryKey: jiraSpaceDirectoryQueryKey,
      })
      await queryClient.invalidateQueries({
        queryKey: TICKETS_QUERY_KEY,
      })
      await queryClient.invalidateQueries({
        queryKey: jiraCurrentUserQueryKey,
      })
    }
    catch (error) {
      if (isLatestAppSettingsMutation(mutationRevision)) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, previousSettings)
      }
      throw error
    }
  }

  async function updateAiCredentials(input: UpdateAiConnectionInput): Promise<void> {
    const mutationRevision = beginAppSettingsMutation()
    const previousSettings = settings.value
    const mergedSettings = reconcileAppSettings({
      ...previousSettings,
      ai: {
        hasCerebrasApiKey: input.cerebrasApiKey === undefined
          ? previousSettings.ai.hasCerebrasApiKey
          : input.cerebrasApiKey.length > 0,
        provider: input.provider ?? previousSettings.ai.provider,
        model: input.model ?? previousSettings.ai.model,
      },
    })

    queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, mergedSettings)

    try {
      const persistedSettings = await aiConnectionMutation.mutateAsync(input)
      if (isLatestAppSettingsMutation(mutationRevision)) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, persistedSettings)
      }
    }
    catch (error) {
      if (isLatestAppSettingsMutation(mutationRevision)) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, previousSettings)
      }
      throw error
    }
  }

  return {
    settings,
    spaces,
    enabledSpaces,
    disabledSpaces,
    jiraConnection,
    aiConnection,
    hasJiraCredentialsConfigured,
    isLoading: computed(() => settingsQuery.isLoading.value),
    isSaving: computed(() => (
      settingsMutation.isPending.value
      || jiraConnectionMutation.isPending.value
      || aiConnectionMutation.isPending.value
    )),
    setFilterSpaceKeys,
    setSidebarSettings,
    setAssistantSkills,
    setLabelColors,
    setProjectAppearances,
    setStatusPreferences,
    addOrEnableSpace,
    updateSpaceAppearance,
    disableSpace,
    deleteSpace,
    updateJiraCredentials,
    updateAiCredentials,
  }
}
