// @vitest-environment happy-dom
import type { AiModelOption } from '~/shared/ai'
import type { UpdateAssistantSettingsInput } from '~/shared/settings'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { fetchAssistantModels, updateAssistantConnection } from '@/api/settings'
import SettingsAssistantSection from '@/components/settings/SettingsAssistantSection'
import { AI_PROVIDER_AVAILABILITY_QUERY_KEY } from '@/composables/useAiSettings'
import { APP_SETTINGS_QUERY_KEY } from '@/composables/useSpaceSettings'
import { normalizeAppSettings } from '~/shared/settings'

vi.mock('@/api/settings', () => ({
  fetchAppSettings: vi.fn(),
  fetchAiProviderAvailability: vi.fn(),
  fetchAssistantModels: vi.fn(),
  updateAssistantConnection: vi.fn(),
}))
vi.mock('@/composables/useAssistantSkills', () => ({
  formatSkillUpdatedAt: vi.fn(),
  useAssistantSkills: () => ({ skills: ref([]) }),
}))

const oldModel: AiModelOption = { id: 'gpt-old', label: 'Old model', provider: 'codex' }
const newModel: AiModelOption = { id: 'gpt-new', label: 'New model', provider: 'codex' }
const claudeModel: AiModelOption = { id: 'sonnet', label: 'Current Sonnet', provider: 'claude' }
const clients: QueryClient[] = []
const wrappers: ReturnType<typeof mount>[] = []

function mountPicker() {
  let settings = normalizeAppSettings({ assistant: { provider: 'codex', model: oldModel.id } })
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity, retry: false } } })
  clients.push(queryClient)
  queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, settings)
  queryClient.setQueryData(AI_PROVIDER_AVAILABILITY_QUERY_KEY, { providers: [
    { provider: 'codex', available: true },
    { provider: 'claude', available: true },
  ] })
  queryClient.setQueryData(['assistant-models', 'codex'], [oldModel])
  queryClient.setQueryData(['assistant-models', 'claude'], [claudeModel])
  vi.mocked(updateAssistantConnection).mockImplementation(async (input: UpdateAssistantSettingsInput) => {
    settings = normalizeAppSettings({ ...settings, assistant: { ...settings.assistant, ...input } })
    return settings
  })
  const wrapper = mount(SettingsAssistantSection, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })
  wrappers.push(wrapper)
  return { wrapper, queryClient }
}

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  clients.splice(0).forEach(client => client.clear())
  vi.resetAllMocks()
})

describe('assistant model picker refresh', () => {
  it('shows loading, adds new models, and saves a discovered selection', async () => {
    let finishRefresh: (models: AiModelOption[]) => void = () => {}
    vi.mocked(fetchAssistantModels).mockReturnValue(new Promise(resolve => finishRefresh = resolve))
    const { wrapper, queryClient } = mountPicker()
    const button = wrapper.findAll('button').find(button => button.text() === 'Refresh models')!
    await button.trigger('click')
    await flushPromises()
    expect(button.text()).toBe('Refreshing…')
    expect(button.attributes('disabled')).toBeDefined()
    expect(fetchAssistantModels).toHaveBeenCalledExactlyOnceWith('codex')

    // A retired/current model stays selected and visible after a refresh.
    finishRefresh([newModel])
    await flushPromises()
    expect(wrapper.get<HTMLSelectElement>('#assistant-model').element.value).toBe(oldModel.id)
    expect(wrapper.text()).toContain('New model')
    expect(button.text()).toBe('Refresh models')
    await wrapper.get('#assistant-model').setValue(newModel.id)
    await flushPromises()
    expect(vi.mocked(updateAssistantConnection).mock.calls.map(call => call[0])).toEqual([{ model: newModel.id }])
    expect(queryClient.getQueryData(APP_SETTINGS_QUERY_KEY)).toMatchObject({ assistant: { model: newModel.id } })
    expect(wrapper.get<HTMLSelectElement>('#assistant-model').element.value).toBe(newModel.id)
  })

  it('keeps the previous list and selection when refresh fails', async () => {
    vi.mocked(fetchAssistantModels).mockRejectedValue(new Error('Please log in to Codex'))
    const { wrapper } = mountPicker()
    await wrapper.findAll('button').find(button => button.text() === 'Refresh models')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Please log in to Codex')
    expect(wrapper.get<HTMLSelectElement>('#assistant-model').element.value).toBe(oldModel.id)
    expect(wrapper.text()).toContain('Old model')
    expect(updateAssistantConnection).not.toHaveBeenCalled()
  })

  it('keeps results with their provider when switching during a refresh', async () => {
    let finishRefresh: (models: AiModelOption[]) => void = () => {}
    vi.mocked(fetchAssistantModels).mockReturnValue(new Promise(resolve => finishRefresh = resolve))
    const { wrapper, queryClient } = mountPicker()
    await wrapper.findAll('button').find(button => button.text() === 'Refresh models')!.trigger('click')
    await wrapper.get('select[name="assistant-provider"]').setValue('claude')
    await flushPromises()
    finishRefresh([newModel])
    await flushPromises()
    expect(wrapper.get<HTMLSelectElement>('#assistant-model').element.value).toBe('sonnet')
    expect(wrapper.text()).toContain('Current Sonnet')
    expect(wrapper.text()).not.toContain('New model')
    expect(queryClient.getQueryData(['assistant-models', 'codex'])).toEqual([newModel])
  })
})
