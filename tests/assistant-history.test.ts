// @vitest-environment happy-dom
import type { AssistantChatRequest, AssistantContext, AssistantStreamChunk } from '~/shared/assistant'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createAssistantSessions } from '@/composables/useAssistantSessions'
import { ASSISTANT_HISTORY_KEY } from '@/utils/assistantHistory'
import { getDefaultAssistantSettings } from '~/shared/assistant'

const stream = vi.hoisted(() => vi.fn())
vi.mock('@/api/assistant', () => ({ streamAssistantChat: stream }))

const ticket: AssistantContext = { kind: 'ticket', label: 'TEST-1', key: 'TEST-1', summary: 'Original issue', local: false }
const createStore = () => createAssistantSessions(ref(getDefaultAssistantSettings()))

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(ASSISTANT_HISTORY_KEY)
  stream.mockReset()
  stream.mockImplementation(async (_request: AssistantChatRequest, chunk: (chunk: AssistantStreamChunk) => void) => {
    chunk({ type: 'status', text: 'Reading tickets' })
    chunk({ type: 'delta', text: 'Saved answer' })
    chunk({ type: 'done' })
  })
})

describe('closed assistant history', () => {
  it('restores closed chats after a restart and continues with the original transcript and scope', async () => {
    const store = createStore()
    const conversation = store.create(ticket)
    await conversation.chat.send('Original question', [{ name: 'Triage', body: 'Check the issue' }])
    conversation.draft.value = 'Next question'
    conversation.selectedSkillIds.value = ['triage']
    const messages = conversation.chat.messages.value.map(message => ({ ...message }))
    store.close(conversation.id)
    store.close(conversation.id)
    expect(store.closedConversations.value).toHaveLength(1)
    expect(conversation.chat.messages.value).toEqual(messages)

    const refresh = vi.fn(async (context: AssistantContext) => ({ ...context, summary: 'Updated issue' }))
    const restarted = createAssistantSessions(ref(getDefaultAssistantSettings()), undefined, refresh)
    expect(restarted.conversations.value).toHaveLength(0)
    expect(restarted.closedConversations.value).toHaveLength(1)
    restarted.currentContext.value = { kind: 'workspace', label: 'Workspace' }
    restarted.reopen(conversation.id)
    restarted.reopen(conversation.id)
    const reopened = restarted.selected.value!
    expect(reopened.id).toBe(conversation.id)
    expect(reopened.context).toEqual(ticket)
    expect(reopened.title.value).toBe('Original question')
    expect(reopened.draft.value).toBe('Next question')
    expect(reopened.selectedSkillIds.value).toEqual(['triage'])
    expect(reopened.chat.messages.value).toMatchObject(messages)
    expect(restarted.conversations.value).toHaveLength(1)
    expect(restarted.closedConversations.value).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(ASSISTANT_HISTORY_KEY)!)).toEqual([])
    await reopened.chat.send('Next question')
    expect(refresh).toHaveBeenCalledWith(ticket, expect.any(AbortSignal))
    expect(stream.mock.calls.at(-1)![0]).toMatchObject({
      context: { key: 'TEST-1', summary: 'Updated issue' },
      messages: [{ content: 'Original question', skills: [{ name: 'Triage', body: 'Check the issue' }] }, { content: 'Saved answer' }, { content: 'Next question' }],
    })
    expect(reopened.chat.messages.value.map(message => message.id)).toEqual([0, 1, 2, 3])
  })

  it('lists the most recently closed first, retains empty drafts, and selects a remaining open chat', () => {
    const store = createStore()
    const first = store.create(ticket)
    const second = store.create()
    first.draft.value = 'Unsent draft'
    store.close(second.id)
    expect(store.selected.value).toBe(first)
    store.close(first.id)
    expect(store.selected.value).toBeNull()
    expect(store.closedConversations.value.map(entry => entry.conversation.id)).toEqual([first.id, second.id])
    const restarted = createStore()
    restarted.reopen(first.id)
    expect(restarted.selected.value?.draft.value).toBe('Unsent draft')
    store.reopen(second.id)
    store.close(second.id)
    expect(store.closedConversations.value.map(entry => entry.conversation.id)).toEqual([second.id, first.id])
  })

  it('stops a closed stream and ignores late callbacks after reopening', async () => {
    let emit: (chunk: AssistantStreamChunk) => void = () => {}
    let finish: () => void = () => {}
    let signal: AbortSignal | undefined
    stream.mockImplementation((_request, chunk, abortSignal) => new Promise<void>((resolve) => {
      emit = chunk
      finish = resolve
      signal = abortSignal
    }))
    const store = createStore()
    const conversation = store.create(ticket)
    const response = conversation.chat.send('Work in progress')
    emit({ type: 'delta', text: 'Partial answer' })
    store.close(conversation.id)
    expect(signal?.aborted).toBe(true)
    expect(conversation.chat.isStreaming.value).toBe(false)
    store.reopen(conversation.id)
    emit({ type: 'delta', text: 'Late answer' })
    emit({ type: 'error', message: 'Late error' })
    finish()
    await response
    expect(conversation.chat.messages.value.at(-1)).toMatchObject({ content: 'Partial answer', pending: false })
    expect(conversation.chat.errorText.value).toBe('')
  })

  it('reports unavailable storage while keeping closed chats reopenable in memory', () => {
    const store = createStore()
    const conversation = store.create(ticket)
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    store.close(conversation.id)
    expect(store.historyError.value).toContain('could not be saved')
    expect(store.closedConversations.value).toHaveLength(1)
    store.reopen(conversation.id)
    expect(store.selected.value).toBe(conversation)
  })

  it('handles corrupt storage and skips invalid records without breaking Home', () => {
    localStorage.setItem(ASSISTANT_HISTORY_KEY, '{broken')
    const broken = createStore()
    expect(broken.closedConversations.value).toEqual([])
    expect(broken.historyError.value).toContain('Could not load')
    localStorage.setItem(ASSISTANT_HISTORY_KEY, JSON.stringify([
      { id: 'invalid', context: null, closedAt: 1, messages: [] },
      { id: 'valid', context: ticket, closedAt: 2, messages: [{ id: 0, role: 'user', content: 'Question', createdAt: 1 }, { id: 'invalid' }] },
      { id: 'valid', context: ticket, closedAt: 3, messages: [] },
    ]))
    const store = createStore()
    expect(store.closedConversations.value).toHaveLength(1)
    store.reopen('valid')
    expect(store.selected.value?.chat.messages.value).toMatchObject([{ content: 'Question' }])
    expect(store.historyError.value).toBe('')
  })
})
