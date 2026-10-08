import type { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAssistantModels } from '../server/ai/assistantModels'
import { normalizeAssistantChatRequest, normalizeAssistantSettings } from '../shared/assistant'
import { normalizeAppSettings } from '../shared/settings'

const spawned = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawn: spawned }))
vi.mock('../server/ai/localProviders', () => ({
  resolveLocalAiCommand: (provider: string) => `/tmp/${provider}`,
  getLocalAiCommandPathEnv: () => '/tmp',
  requiresWindowsCommandShell: () => false,
}))

function mockCli(onRequest: (request: Record<string, unknown>, reply: (message: unknown) => void) => void) {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    kill: vi.fn(),
  })
  const requests: Record<string, unknown>[] = []
  child.stdin.on('data', (chunk: Buffer) => {
    const request: Record<string, unknown> = JSON.parse(chunk.toString())
    requests.push(request)
    queueMicrotask(() => onRequest(request, (message) => {
      child.stdout.write(`${JSON.stringify(message)}\n`)
    }))
  })
  spawned.mockReturnValue(child)
  return { child, requests }
}

beforeEach(() => spawned.mockReset())
afterEach(() => vi.useRealTimers())

describe('assistant model discovery', () => {
  it('discovers new Codex models across pages without starting a chat', async () => {
    const { child, requests } = mockCli((request, reply) => {
      if (request.method === 'initialize')
        reply({ id: request.id, result: {} })
      if (request.method === 'model/list') {
        reply({
          id: request.id,
          result: request.id === 2
            ? { data: [{ model: 'gpt-new', displayName: 'New model' }, { model: 'hidden', hidden: true }], nextCursor: 'page-2' }
            : { data: [{ model: 'gpt-next', displayName: 'Next model' }], nextCursor: null },
        })
      }
    })
    expect(await getAssistantModels('codex')).toEqual([
      { id: 'default', label: 'Codex configured default', provider: 'codex' },
      { id: 'gpt-new', label: 'New model', provider: 'codex' },
      { id: 'gpt-next', label: 'Next model', provider: 'codex' },
    ])
    expect(requests.map(request => request.method)).toEqual(['initialize', 'initialized', 'model/list', 'model/list'])
    expect(requests[3]?.params).toMatchObject({ cursor: 'page-2' })
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('reads Claude aliases and versioned models from initialization', async () => {
    const { requests } = mockCli((request, reply) => {
      reply({
        type: 'control_response',
        response: {
          request_id: request.request_id,
          subtype: 'success',
          response: { models: [
            { value: 'sonnet', displayName: 'Sonnet', resolvedModel: 'claude-sonnet-new' },
            { value: 'claude-new[1m]', displayName: 'New Claude' },
            { value: 'claude-new[1m]', displayName: 'New Claude' },
          ] },
        },
      })
    })
    expect(await getAssistantModels('claude')).toEqual([
      { id: 'sonnet', label: 'Sonnet (claude-sonnet-new)', provider: 'claude' },
      { id: 'claude-new[1m]', label: 'New Claude', provider: 'claude' },
    ])
    expect(requests).toEqual([{ type: 'control_request', request_id: 'models', request: { subtype: 'initialize' } }])
    expect(spawned.mock.calls[0]?.[1]).toContain('--no-session-persistence')
    expect(spawned.mock.calls[0]?.[2].env).not.toHaveProperty('ANTHROPIC_API_KEY')
  })

  it('deduplicates concurrent requests but discovers again on the next refresh', async () => {
    const respond = (request: Record<string, unknown>, reply: (message: unknown) => void) => {
      if (request.method === 'initialize')
        reply({ id: request.id, result: {} })
      if (request.method === 'model/list')
        reply({ id: request.id, result: { data: [{ model: 'gpt-new' }] } })
    }
    mockCli(respond)
    await Promise.all([getAssistantModels('codex'), getAssistantModels('codex')])
    expect(spawned).toHaveBeenCalledTimes(1)
    mockCli(respond)
    await getAssistantModels('codex')
    expect(spawned).toHaveBeenCalledTimes(2)
  })

  it('rejects failed or empty lists instead of reporting a successful refresh', async () => {
    mockCli((request, reply) => {
      reply({ type: 'control_response', response: { request_id: request.request_id, subtype: 'error', error: 'Please log in' } })
    })
    await expect(getAssistantModels('claude')).rejects.toThrow('Please log in')
    mockCli((request, reply) => {
      reply({ type: 'control_response', response: { request_id: request.request_id, subtype: 'success', response: { models: [] } } })
    })
    await expect(getAssistantModels('claude')).rejects.toThrow('no available models')
  })

  it('terminates an unresponsive CLI and allows a later retry', async () => {
    vi.useFakeTimers()
    const { child } = mockCli(() => {})
    const result = expect(getAssistantModels('codex')).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(30_000)
    await result
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
    child.emit('close', 1)
  })
})

describe('discovered model persistence', () => {
  it.each(['gpt-new', 'claude-new[1m]'])('preserves %s through settings reload and chat requests', (model) => {
    const provider = model.startsWith('gpt') ? 'codex' : 'claude'
    const settings = normalizeAppSettings({ assistant: { provider, model, reasoning: 'high' } })
    expect(normalizeAppSettings(JSON.parse(JSON.stringify(settings))).assistant.model).toBe(model)
    expect(normalizeAssistantChatRequest({ provider, model, messages: [{ role: 'user', content: 'Hello' }] })?.model).toBe(model)
  })

  it.each(['', '--flag', 'model with spaces', 'model;command', 'a'.repeat(201)])('falls back for an invalid model ID', (model) => {
    expect(normalizeAssistantSettings('codex', model, 'medium').model).toBe('default')
  })
})
