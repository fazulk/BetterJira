// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useSettingsPageState } from '@/features/settings/useSettingsPageState'

vi.mock('@/composables/useAiSettings', () => ({
  useAiSettings: () => ({
    providers: ref(['codex']),
    providerAvailability: ref({}),
    isLoadingProviders: ref(false),
    providerAvailabilityError: ref(null),
    settings: ref({ provider: 'codex', model: 'gpt-5.5' }),
    availableModels: ref([]),
    setProvider: vi.fn(),
    setModel: vi.fn(),
  }),
}))

vi.mock('@/composables/useSpaceSettings', () => ({
  useSpaceSettings: () => ({
    aiConnection: ref({}),
    spaces: ref([]),
    jiraConnection: ref({ baseUrl: '', email: '', hasApiToken: false }),
    hasJiraCredentialsConfigured: ref(false),
    isSaving: ref(false),
    updateJiraCredentials: vi.fn(),
    updateAiCredentials: vi.fn(),
  }),
}))

vi.mock('@/composables/useJiraCurrentUser', () => ({
  useJiraCurrentUser: () => ({
    isError: ref(false),
    data: ref(null),
    error: ref(null),
    isFetching: ref(false),
    refetch: vi.fn(),
  }),
}))

vi.mock('@/composables/useJiraTickets', () => ({
  useJiraTickets: () => ({
    tickets: ref([]),
  }),
}))

vi.mock('@/features/settings/useSettingsDerivedRows', () => ({
  useSettingsDerivedRows: () => ({
    constrainedSettingsRows: ref([]),
    constrainedSettingsSectionDescription: computed(() => ''),
    constrainedSettingsSectionTitle: computed(() => ''),
    statusGroupLabels: {},
    teamMemberRows: ref([]),
    teamSettingsRows: ref([]),
    teamStatusRows: ref([]),
  }),
}))

describe('settings page state', () => {
  it('filters navigation groups from settingsSearchQuery', () => {
    const state = useSettingsPageState()

    state.settingsSearchQuery.value = 'assistant'

    expect(state.filteredSettingsNavigationGroups.value).toEqual([
      {
        label: 'Features',
        items: [
          { id: 'assistant', label: 'Assistant', description: 'Ask Claude / Ask Codex' },
        ],
      },
    ])
  })
})
