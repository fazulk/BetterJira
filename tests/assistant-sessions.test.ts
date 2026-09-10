import type { AssistantChatRequest, AssistantContext, AssistantStreamChunk } from '~/shared/assistant'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createAssistantSessions } from '@/composables/useAssistantSessions'
import { formatAssistantContext, getDefaultAssistantSettings, normalizeAssistantChatRequest } from '~/shared/assistant'

const stream = vi.hoisted(() => vi.fn())
vi.mock('@/api/assistant', () => ({ streamAssistantChat: stream }))
vi.mock('@/composables/useAssistantSettings', () => ({ useAssistantSettings: vi.fn() }))
interface Pending {
  request: AssistantChatRequest
  chunk: (chunk: AssistantStreamChunk) => void
  signal: AbortSignal
  resolve: () => void
  reject: (error: Error) => void
}
let pending: Pending[]
beforeEach(() => {
  pending = []
  stream.mockClear()
  stream.mockImplementation((request, chunk, signal) => new Promise<void>((resolve, reject) => pending.push({ request, chunk, signal, resolve, reject })))
})
const ticket: AssistantContext = { kind: 'ticket', label: 'TEST-1', key: 'TEST-1', summary: 'Original issue', local: false }
const view: AssistantContext = { kind: 'view', label: 'My issues', viewId: 'my-issues', filters: 'Open', totalCount: 1, items: [{ key: 'TEST-2', summary: 'Second' }], truncated: false }

describe('assistant session lifecycle', () => {
  it('refreshes the original context before every turn and retains the transcript', async () => {
    const completed = vi.fn()
    let revision = 0
    const refresh = vi.fn(async (context: AssistantContext) => ({ ...context, summary: `Revision ${++revision}` }))
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()), completed, refresh)
    const conversation = store.create(ticket)
    for (let turn = 1; turn <= 2; turn++) {
      store.currentContext.value = view
      const response = conversation.chat.send(`Turn ${turn}`)
      expect(conversation.chat.statusText.value).toBe('Refreshing context…')
      expect(pending).toHaveLength(turn - 1)
      await vi.waitFor(() => expect(pending).toHaveLength(turn))
      const request = pending[turn - 1]!
      expect(request.request).toMatchObject({ context: { key: 'TEST-1', summary: `Revision ${turn}` }, ticketKey: 'TEST-1', ticketSummary: `Revision ${turn}` })
      expect(request.request.messages.filter(message => message.role === 'user')).toHaveLength(turn)
      request.chunk({ type: 'delta', text: 'Done' })
      request.chunk({ type: 'done' })
      request.resolve()
      await response
      expect(conversation.context).toMatchObject({ summary: `Revision ${turn}` })
      expect(completed).toHaveBeenLastCalledWith(conversation.context)
    }
    expect(pending[0]!.request.context).toMatchObject({ summary: 'Revision 1' })
  })

  it('captures the original view refresher independently for each chat', async () => {
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()))
    const firstRefresh = vi.fn(async () => ({ ...view, totalCount: 2, items: [...view.items, { key: 'NEW-1', summary: 'New issue' }] }))
    store.currentContext.value = view
    store.captureContextRefresher.value = () => firstRefresh
    const conversation = store.create()
    store.currentContext.value = ticket
    store.captureContextRefresher.value = () => vi.fn(async () => ticket)
    const response = conversation.chat.send('What changed?')
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    expect(firstRefresh).toHaveBeenCalledOnce()
    expect(pending[0]!.request.context).toMatchObject({ viewId: view.viewId, totalCount: 2 })
    expect(pending[0]!.request.ticketKey).toBeUndefined()
    pending[0]!.chunk({ type: 'done' })
    pending[0]!.resolve()
    await response
  })

  it('does not send or replace context after stopping during refresh', async () => {
    let finishRefresh: (context: AssistantContext) => void = () => {}
    const refresh = vi.fn(() => new Promise<AssistantContext>((resolve) => {
      finishRefresh = resolve
    }))
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()), undefined, refresh)
    const conversation = store.create(ticket)
    const response = conversation.chat.send('Stopped turn')
    conversation.chat.stop()
    finishRefresh({ ...ticket, summary: 'Late snapshot' })
    await response
    expect(stream).not.toHaveBeenCalled()
    expect(conversation.context).toMatchObject({ summary: 'Original issue' })
    expect(conversation.chat.isStreaming.value).toBe(false)
  })

  it('surfaces refresh errors without sending a stale snapshot', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('Unable to sync context'))
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()), undefined, refresh)
    const conversation = store.create(ticket)
    await conversation.chat.send('What changed?')
    expect(stream).not.toHaveBeenCalled()
    expect(conversation.chat.errorText.value).toBe('Unable to sync context')
    expect(conversation.chat.isStreaming.value).toBe(false)
  })

  it('creates fresh chats, preserves drafts and skills, and pins the original scope', async () => {
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()))
    store.currentContext.value = view
    const first = store.create()
    first.draft.value = 'unsent'
    first.selectedSkillIds.value = ['triage']
    const second = store.create()
    expect(first.id).not.toBe(second.id)
    expect(stream).not.toHaveBeenCalled()
    store.currentContext.value = { ...view, items: [{ key: 'TEST-2', summary: 'Changed after capture' }] }
    store.currentContext.value = ticket
    store.select(first.id)
    store.minimized.value = true
    expect(first.draft.value).toBe('unsent')
    expect(first.selectedSkillIds.value).toEqual(['triage'])
    const response = first.chat.send('First line\nMore detail')
    expect(first.title.value).toBe('First line')
    expect(pending[0]!.request.context).toMatchObject({ kind: 'view', items: [{ summary: 'Second' }] })
    pending[0]!.chunk({ type: 'done' })
    pending[0]!.resolve()
    await response
  })

  it('streams concurrently and isolates close, late callbacks, and completion context', async () => {
    const completed = vi.fn()
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()), completed)
    const first = store.create(ticket)
    const second = store.create(view)
    const a = first.chat.send('A')
    const b = second.chat.send('B')
    store.close(first.id)
    expect(pending[0]!.signal.aborted).toBe(true)
    expect(pending[1]!.signal.aborted).toBe(false)
    pending[0]!.chunk({ type: 'delta', text: 'late' })
    pending[0]!.chunk({ type: 'error', message: 'late error' })
    pending[0]!.resolve()
    pending[1]!.chunk({ type: 'status', text: 'Reading tickets' })
    pending[1]!.chunk({ type: 'delta', text: 'B response' })
    pending[1]!.chunk({ type: 'done' })
    pending[1]!.resolve()
    await Promise.all([a, b])
    expect(first.chat.errorText.value).toBe('')
    expect(first.chat.messages.value.at(-1)?.content).toBe('_Stopped._')
    expect(second.chat.messages.value.at(-1)).toMatchObject({ content: 'B response', updates: ['Reading tickets'], pending: false })
    expect(completed).toHaveBeenCalledExactlyOnceWith(second.context)
  })

  it('does not let an old stopped request finish or fail a replacement request', async () => {
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()))
    const conversation = store.create(ticket)
    const old = conversation.chat.send('old')
    conversation.chat.stop()
    const replacement = conversation.chat.send('new')
    pending[0]!.chunk({ type: 'delta', text: 'stale' })
    pending[0]!.reject(new Error('old failure'))
    await old
    expect(conversation.chat.isStreaming.value).toBe(true)
    expect(conversation.chat.errorText.value).toBe('')
    pending[1]!.chunk({ type: 'delta', text: 'fresh' })
    pending[1]!.chunk({ type: 'done' })
    pending[1]!.resolve()
    await replacement
    expect(conversation.chat.messages.value.at(-1)?.content).toBe('fresh')
  })

  it('surfaces provider errors and interrupted streams without refreshing Jira', async () => {
    const completed = vi.fn()
    const store = createAssistantSessions(ref(getDefaultAssistantSettings()), completed)
    const chat = store.create().chat
    const failed = chat.send('fail')
    pending[0]!.chunk({ type: 'error', message: 'Provider failed' })
    pending[0]!.resolve()
    await failed
    expect(chat.errorText.value).toBe('Provider failed')
    const interrupted = chat.send('retry')
    pending[1]!.resolve()
    await interrupted
    expect(chat.errorText.value).toContain('connection ended')
    expect(completed).not.toHaveBeenCalled()
  })
})

describe('context request normalization and prompt rendering', () => {
  it('caps snapshots, sanitizes counts, preserves identifiers and supports legacy tickets', () => {
    const request = normalizeAssistantChatRequest({ messages: [{ role: 'user', content: 'hello' }], ticketKey: ' OLD-1 ', ticketSummary: 'Old issue', context: { ...view, items: Array.from({ length: 55 }, (_, i) => ({ key: `T-${i}`, summary: 'Issue' })), totalCount: 55 } })!
    expect(request.ticketKey).toBe('OLD-1')
    expect(request.context).toMatchObject({ totalCount: 55, truncated: true, viewId: 'my-issues' })
    expect(request.context?.kind === 'view' && request.context.items).toHaveLength(50)
    expect(formatAssistantContext(request.context!)).toContain('Navigation does not change the scope')
    expect(normalizeAssistantChatRequest({ messages: [{ content: 'hello' }], context: { kind: 'ticket', key: 42 } })?.context).toBeUndefined()
  })
  it('marks local snapshots explicitly in provider instructions', () => {
    expect(formatAssistantContext({ ...ticket, local: true, snapshot: 'Local description' })).toContain('do not look up this local key in Jira')
    expect(formatAssistantContext({ kind: 'workspace', label: 'Workspace' })).toContain('Workspace')
  })
})
