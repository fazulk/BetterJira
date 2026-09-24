// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import SettingsWorkspaceSection from '@/components/settings/SettingsWorkspaceSection'
import { provideSettingsPageContext } from '@/features/settings/settingsPageContext'
import { useSettingsPageState } from '@/features/settings/useSettingsPageState'
import { getDefaultAppSettings } from '~/shared/settings'

const appSettings = ref(getDefaultAppSettings())
const setOpenJiraLinksInApp = vi.fn(async (value: boolean) => {
  appSettings.value.openJiraLinksInApp = value
})

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
    settings: appSettings,
    setOpenJiraLinksInApp,
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
  it('lets the user reverse link clicks and explains the selected behavior', async () => {
    const Host = defineComponent({
      setup() {
        provideSettingsPageContext(useSettingsPageState())
        return () => h(SettingsWorkspaceSection)
      },
    })
    const wrapper = mount(Host)
    const toggle = wrapper.get<HTMLInputElement>('input[type="checkbox"]')
    expect(toggle.element.checked).toBe(true)
    expect(wrapper.get('#jira-link-behavior').text()).toContain('Hold Ctrl to open the original Jira URL.')
    await toggle.setValue(false)
    await nextTick()
    expect(setOpenJiraLinksInApp).toHaveBeenCalledExactlyOnceWith(false)
    expect(wrapper.get('#jira-link-behavior').text()).toContain('Hold Ctrl to open it in Better Jira.')
    wrapper.unmount()
    appSettings.value = getDefaultAppSettings()
  })

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
