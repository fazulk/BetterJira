import type { SettingsSectionId } from './settingsTypes'
import type { AiProviderAvailability } from '~/shared/ai'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAiSettings } from '@/composables/useAiSettings'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { getProviderLabel, isAiProvider } from '~/shared/ai'
import { useSettingsDerivedRows } from './useSettingsDerivedRows'

interface SettingsNavigationItem {
  id: SettingsSectionId
  label: string
  description: string
}

interface SettingsNavigationGroup {
  label: string
  items: SettingsNavigationItem[]
}

const settingsNavigationGroups: SettingsNavigationGroup[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'workspace', label: 'Jira connection', description: 'Credentials' },
      { id: 'team-statuses', label: 'Statuses', description: 'Colors and order' },
    ],
  },
  {
    label: 'Features',
    items: [
      { id: 'assistant', label: 'Assistant', description: 'Ask Claude / Ask Codex' },
    ],
  },
  {
    label: 'Project',
    items: [
      { id: 'about', label: 'About', description: 'GitHub and contributing' },
    ],
  },
]

export function useSettingsPageState() {
  const {
    providers,
    providerAvailability,
    isLoadingProviders,
    providerAvailabilityError,
    settings: aiSettings,
    availableModels,
    setProvider,
    setModel,
  } = useAiSettings()
  const {
    aiConnection,
    spaces,
    jiraConnection,
    hasJiraCredentialsConfigured,
    isSaving: isSavingSpaceSettings,
    updateJiraCredentials,
    updateAiCredentials,
  } = useSpaceSettings()
  const { tickets } = useJiraTickets()

  const activeSettingsSection = ref<SettingsSectionId>('workspace')
  const jiraBaseUrlDraft = ref('')
  const jiraEmailDraft = ref('')
  const cerebrasApiKey = ref('')
  const jiraApiToken = ref('')
  const settingsSearchQuery = ref('')
  const aiFeedback = ref<{ kind: 'success' | 'error', message: string } | null>(null)
  const jiraFeedback = ref<{ kind: 'success' | 'error', message: string } | null>(null)
  let aiFeedbackTimeout: ReturnType<typeof setTimeout> | null = null
  let jiraFeedbackTimeout: ReturnType<typeof setTimeout> | null = null

  const filteredSettingsNavigationGroups = computed<SettingsNavigationGroup[]>(() => {
    const query = settingsSearchQuery.value.trim().toLowerCase()
    if (!query)
      return settingsNavigationGroups

    return settingsNavigationGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => [
          group.label,
          item.label,
          item.description,
        ].some(value => value.toLowerCase().includes(query))),
      }))
      .filter(group => group.items.length > 0)
  })

  function isHtmlSelectElement(target: EventTarget | null): target is HTMLSelectElement {
    return target instanceof HTMLSelectElement
  }

  async function handleProviderChange(event: Event): Promise<void> {
    if (!isHtmlSelectElement(event.target))
      return
    const provider = event.target.value
    if (isAiProvider(provider) && providers.value.includes(provider)) {
      try {
        await setProvider(provider)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save AI provider.'
        setAiFeedback('error', message)
      }
    }
  }

  function getProviderStatusClass(status: AiProviderAvailability): string {
    return status.available
      ? 'border-white/[0.08] bg-white/[0.035] text-slate-300'
      : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
  }

  async function handleModelChange(event: Event): Promise<void> {
    if (!isHtmlSelectElement(event.target))
      return
    try {
      await setModel(event.target.value)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save AI model.'
      setAiFeedback('error', message)
    }
  }

  function clearAiFeedbackTimeout(): void {
    if (aiFeedbackTimeout) {
      clearTimeout(aiFeedbackTimeout)
      aiFeedbackTimeout = null
    }
  }

  function clearJiraFeedbackTimeout(): void {
    if (jiraFeedbackTimeout) {
      clearTimeout(jiraFeedbackTimeout)
      jiraFeedbackTimeout = null
    }
  }

  function setAiFeedback(kind: 'success' | 'error', message: string): void {
    clearAiFeedbackTimeout()
    aiFeedback.value = { kind, message }
    aiFeedbackTimeout = setTimeout(() => {
      aiFeedback.value = null
      aiFeedbackTimeout = null
    }, 3000)
  }

  function setJiraFeedback(kind: 'success' | 'error', message: string): void {
    clearJiraFeedbackTimeout()
    jiraFeedback.value = { kind, message }
    jiraFeedbackTimeout = setTimeout(() => {
      jiraFeedback.value = null
      jiraFeedbackTimeout = null
    }, 3000)
  }

  const jiraConnectionSummary = computed(() => {
    if (!hasJiraCredentialsConfigured.value) {
      return 'Jira setup is incomplete. The startup modal will ask for the missing values.'
    }
    return `${jiraConnection.value.baseUrl || 'Jira URL missing'} · ${jiraConnection.value.email || 'Email missing'}`
  })
  const {
    constrainedSettingsRows,
    constrainedSettingsSectionDescription,
    constrainedSettingsSectionTitle,
    statusGroupLabels,
    teamMemberRows,
    teamSettingsRows,
    teamStatusRows,
  } = useSettingsDerivedRows({
    activeSettingsSection,
    aiSettings,
    spaces,
    tickets,
  })

  watch(jiraConnection, (connection) => {
    jiraBaseUrlDraft.value = connection.baseUrl
    jiraEmailDraft.value = connection.email
  }, { immediate: true })

  const canSaveJiraConnectionDetails = computed(() => (
    !isSavingSpaceSettings.value
    && jiraBaseUrlDraft.value.trim().length > 0
    && jiraEmailDraft.value.trim().length > 0
    && (
      jiraBaseUrlDraft.value.trim() !== jiraConnection.value.baseUrl
      || jiraEmailDraft.value.trim() !== jiraConnection.value.email
    )
  ))

  async function saveCerebrasApiKey(): Promise<void> {
    if (!cerebrasApiKey.value.trim()) {
      setAiFeedback('error', 'Enter a Cerebras API key to save it.')
      return
    }
    try {
      await updateAiCredentials({ cerebrasApiKey: cerebrasApiKey.value.trim() })
      cerebrasApiKey.value = ''
      setAiFeedback('success', 'Saved local Cerebras API key.')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Cerebras API key.'
      setAiFeedback('error', message)
    }
  }

  async function saveJiraApiToken(): Promise<void> {
    if (!jiraApiToken.value.trim()) {
      setJiraFeedback('error', 'Enter a Jira API token to save it.')
      return
    }
    try {
      await updateJiraCredentials({ apiToken: jiraApiToken.value.trim() })
      jiraApiToken.value = ''
      setJiraFeedback('success', 'Saved Jira API token.')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Jira API token.'
      setJiraFeedback('error', message)
    }
  }

  async function saveJiraConnectionDetails(): Promise<void> {
    if (!jiraBaseUrlDraft.value.trim() || !jiraEmailDraft.value.trim()) {
      setJiraFeedback('error', 'Enter a Jira URL and email to save connection details.')
      return
    }
    try {
      await updateJiraCredentials({
        baseUrl: jiraBaseUrlDraft.value.trim(),
        email: jiraEmailDraft.value.trim(),
      })
      setJiraFeedback('success', 'Saved Jira connection details.')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Jira connection details.'
      setJiraFeedback('error', message)
    }
  }

  onBeforeUnmount(() => {
    clearAiFeedbackTimeout()
    clearJiraFeedbackTimeout()
  })

  return {
    activeSettingsSection,
    aiConnection,
    aiFeedback,
    aiSettings,
    availableModels,
    canSaveJiraConnectionDetails,
    cerebrasApiKey,
    constrainedSettingsRows,
    constrainedSettingsSectionDescription,
    constrainedSettingsSectionTitle,
    filteredSettingsNavigationGroups,
    getProviderLabel,
    getProviderStatusClass,
    handleModelChange,
    handleProviderChange,
    isLoadingProviders,
    isSavingSpaceSettings,
    jiraApiToken,
    jiraBaseUrlDraft,
    jiraConnectionSummary,
    jiraEmailDraft,
    jiraFeedback,
    providerAvailability,
    providerAvailabilityError,
    providers,
    saveCerebrasApiKey,
    saveJiraApiToken,
    saveJiraConnectionDetails,
    settingsSearchQuery,
    statusGroupLabels,
    teamMemberRows,
    teamSettingsRows,
    teamStatusRows,
  }
}
