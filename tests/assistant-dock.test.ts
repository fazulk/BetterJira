// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'
import AssistantDock from '@/components/AskAssistantPanel'
import AssistantHome from '@/components/ticket-list/TicketListAssistantHome'
import { useAssistantSessions } from '@/composables/useAssistantSessions'
import { getDefaultAssistantSettings } from '~/shared/assistant'

vi.mock('@tanstack/vue-query', () => ({ useQueryClient: () => ({ getQueryData: () => undefined }) }))

const stream = vi.hoisted(() => vi.fn())
vi.mock('@/api/assistant', () => ({ streamAssistantChat: stream }))
vi.mock('@/composables/useAssistantSettings', () => ({
  useAssistantSettings: () => ({ settings: ref(getDefaultAssistantSettings()), availableModels: ref([]), isProviderAvailable: () => true }),
}))
vi.mock('@/composables/useAssistantSkills', () => ({ useAssistantSkills: () => ({ skills: ref([]) }) }))
const route = reactive({ path: '/', query: { view: 'my-issues' }, fullPath: '/?view=my-issues' })
const push = vi.fn(async (target: string | { path: string, query: { view: string } }) => {
  const url = typeof target === 'string' ? new URL(target, 'http://localhost') : new URL(`${target.path}?view=${target.query.view}`, 'http://localhost')
  route.path = url.pathname
  route.query = { view: url.searchParams.get('view') ?? '' }
  route.fullPath = url.pathname + url.search
})
const sessions = useAssistantSessions()
const wrappers: ReturnType<typeof mount>[] = []
function render(component: typeof AssistantDock | typeof AssistantHome) {
  const wrapper = mount(component, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  stream.mockClear()
  push.mockClear()
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => ({ push }))
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
  sessions.conversations.value.forEach(chat => sessions.close(chat.id))
  sessions.previousScreen.value = null
  sessions.minimized.value = true
  sessions.currentContext.value = { kind: 'ticket', label: 'APP-1', key: 'APP-1', summary: 'App issue', local: false }
  route.path = '/APP-1'
  route.query = { view: 'my-issues' }
  route.fullPath = '/APP-1?view=my-issues'
  stream.mockImplementation(async (_request, chunk) => {
    chunk({ type: 'delta', text: 'Answer' })
    chunk({ type: 'done' })
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('agent dock and Home', () => {
  it('creates on each click, focuses the composer, retains drafts, and supports keyboard tab switching', async () => {
    const dock = render(AssistantDock)
    const agent = dock.findAll('button').find(button => button.text() === 'Agent')!
    await agent.trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(dock.get('textarea').element)
    await dock.get('textarea').setValue('draft one')
    await agent.trigger('click')
    expect(sessions.conversations.value).toHaveLength(2)
    expect(stream).not.toHaveBeenCalled()
    await dock.get('[role="tab"]').trigger('click')
    expect((dock.get('textarea').element as HTMLTextAreaElement).value).toBe('draft one')
    await dock.get('[aria-selected="true"]').trigger('keydown', { key: 'ArrowRight' })
    expect(sessions.selectedId.value).toBe(sessions.conversations.value[1]!.id)
    await dock.get('textarea').trigger('keydown', { key: 'Escape' })
    expect(dock.find('textarea').exists()).toBe(false)
    expect(dock.findAll('[role="tab"]')).toHaveLength(2)
  })

  it('expands the same conversation, switches Home tabs without popup, and returns minimized', async () => {
    const dock = render(AssistantDock)
    const first = sessions.create()
    first.draft.value = 'keep this'
    await first.chat.send('A prompt that should not become the footer label')
    const second = sessions.create()
    sessions.select(first.id)
    await nextTick()
    expect(dock.findAll('[role="tab"]').map(tab => tab.text())).toEqual(['APP-1', 'APP-1'])
    await dock.get('[aria-label="Expand"]').trigger('click')
    await flushPromises()
    const home = render(AssistantHome)
    expect(home.find('[aria-label="Close conversation"]').exists()).toBe(false)
    expect(dock.find('textarea').exists()).toBe(false)
    expect((home.get('textarea').element as HTMLTextAreaElement).value).toBe('keep this')
    await dock.findAll('[role="tab"]')[1]!.trigger('click')
    expect(sessions.selectedId.value).toBe(second.id)
    expect(document.querySelectorAll('textarea')).toHaveLength(1)
    await home.get('[aria-label="Move to toolbar"]').trigger('click')
    await flushPromises()
    expect(route.fullPath).toBe('/APP-1?view=my-issues')
    expect(sessions.minimized.value).toBe(true)
    expect(dock.find('textarea').exists()).toBe(false)
  })

  it('submits empty Home as a workspace chat and uses My issues as return fallback', async () => {
    route.path = '/'
    route.query = { view: 'assistant' }
    route.fullPath = '/?view=assistant'
    const home = render(AssistantHome)
    expect(sessions.conversations.value).toHaveLength(0)
    await home.get('textarea').setValue('Workspace question')
    await home.get('textarea').trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(stream).not.toHaveBeenCalled()
    await home.get('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(sessions.conversations.value).toHaveLength(1)
    expect(sessions.selected.value?.context).toEqual({ kind: 'workspace', label: 'Workspace' })
    expect(home.text()).toContain('Answer')
    expect(home.text()).toContain('Copy response')
    await home.get('[aria-label="Move to toolbar"]').trigger('click')
    expect(route.fullPath).toBe('/?view=my-issues')
  })

  it('captures workspace context in Settings even while the previous view snapshot remains', async () => {
    route.path = '/settings'
    route.fullPath = '/settings'
    const dock = render(AssistantDock)
    await dock.findAll('button').find(button => button.text() === 'Agent')!.trigger('click')
    expect(sessions.selected.value?.context.kind).toBe('workspace')
  })

  it('unmounting a presentation keeps its conversation alive', async () => {
    const active = computed(() => sessions.selected.value?.chat.isStreaming.value)
    let finish: () => void = () => {}
    stream.mockImplementation(() => new Promise<void>((resolve) => {
      finish = resolve
    }))
    const dock = render(AssistantDock)
    const chat = sessions.create()
    await nextTick()
    await dock.get('textarea').setValue('Work')
    await dock.get('[aria-label="Send"]').trigger('click')
    expect(active.value).toBe(true)
    dock.unmount()
    expect(chat.chat.isStreaming.value).toBe(true)
    chat.chat.stop()
    finish()
    await flushPromises()
  })
})
