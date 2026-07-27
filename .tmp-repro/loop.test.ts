/* TEMPORARY repro - delete after use */
import { describe, expect, it, vi } from 'vitest'

const updateCalls: unknown[] = []
const unhandled: unknown[] = []
let bailed = false

process.on('unhandledRejection', (reason) => {
  unhandled.push(reason)
})

Object.assign(globalThis, {
  window: { addEventListener() {}, removeEventListener() {} },
  document: {
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
    createElement: () => ({ innerHTML: '', content: { firstChild: null }, style: {} }),
    createElementNS: () => ({ innerHTML: '', style: {} }),
    createTextNode: () => ({}),
    createComment: () => ({}),
    querySelector: () => null,
  },
})

vi.mock('@/api/settings', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api/settings')

  return {
    ...actual,
    fetchAppSettings: () => Promise.reject(new Error('not used')),
    updateAppSettings: (input: unknown) => {
      updateCalls.push(input)
      console.warn(`[write #${updateCalls.length}]`, JSON.stringify(input))
      if (updateCalls.length > 12) {
        bailed = true
        // Stop the runaway loop so the test can finish.
        return Promise.resolve(input)
      }
      return Promise.reject(new Error('settings write failed (disk full)'))
    },
  }
})

vi.mock('@/api/jira', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api/jira')
  return { ...actual, fetchTicket: () => Promise.reject(new Error('offline')) }
})

vi.mock('@/api/localTickets', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/api/localTickets')
  return { ...actual, fetchLocalTicket: () => Promise.reject(new Error('offline')) }
})

async function flush(ticks: number): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('pinned key rename inside the query-cache subscriber', () => {
  it('does not loop settings writes when the settings write fails', async () => {
    const { createRenderer, defineComponent, h } = await import('@vue/runtime-core')
    const { QueryClient, VueQueryPlugin } = await import('@tanstack/vue-query')
    const { ticketQueryKey } = await import('@/composables/queryKeys')
    const { APP_SETTINGS_QUERY_KEY } = await import('@/composables/useSpaceSettings')
    const { useSidebarNavigation } = await import('@/features/sidebar/useSidebarNavigation')
    const { getDefaultAppSettings } = await import('~/shared/settings')

    interface FakeNode { children: FakeNode[] }
    const createNode = (): FakeNode => ({ children: [] })
    const { createApp } = createRenderer<FakeNode, FakeNode>({
      createElement: createNode,
      createText: createNode,
      createComment: createNode,
      setText() {},
      setElementText() {},
      insert(child, parent) { parent.children.push(child) },
      remove() {},
      parentNode: () => null,
      nextSibling: () => null,
      patchProp() {},
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
    })

    const defaults = getDefaultAppSettings()
    queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, {
      ...defaults,
      sidebar: { ...defaults.sidebar, pinnedTicketKeys: ['OLD-1'] },
    })

    const Comp = defineComponent({
      setup() {
        useSidebarNavigation({ tickets: [], selectedKey: null, currentView: 'inbox' }, () => {})
        return () => h('div')
      },
    })

    createApp(Comp).use(VueQueryPlugin, { queryClient }).mount(createNode())

    await flush(5)
    const callsBeforeRename = updateCalls.length
    console.warn('--- injecting rename; writes so far:', callsBeforeRename)

    queryClient.setQueryData(ticketQueryKey('OLD-1'), {
      key: 'NEW-5',
      summary: 'moved epic',
      status: 'To Do',
      statusCategory: 'new',
      spaceKey: 'NEW',
      issueType: 'Epic',
    })

    await flush(40)

    const settingsData = queryClient.getQueryData(APP_SETTINGS_QUERY_KEY) as { sidebar: { pinnedTicketKeys: string[] } } | undefined
    console.warn('writes after rename:', updateCalls.length - callsBeforeRename, 'bailed:', bailed)
    console.warn('unhandled rejections:', unhandled.length)
    console.warn('pins now:', JSON.stringify(settingsData?.sidebar?.pinnedTicketKeys))

    expect(updateCalls.length - callsBeforeRename).toBeLessThan(3)
  })
})
