import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { streamAssistantChat } from '../server/ai/assistant'
import { getDefaultAssistantSettings } from '../shared/assistant'

const spawned = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawn: spawned }))
vi.mock('../server/settings', () => ({ getAppSettings: () => ({ assistant: { systemPrompt: 'Test persona' } }) }))
vi.mock('../server/ai/localProviders', () => ({
  resolveLocalAiCommand: () => '/tmp/test-cli',
  getLocalAiCommandPathEnv: () => '/tmp',
  requiresWindowsCommandShell: () => false,
}))

describe('provider context prompts', () => {
  it.each(['claude', 'codex'] as const)('includes refreshed context in the %s prompt', async (provider) => {
    let input = ''
    let args: string[] = []
    spawned.mockImplementation((_path: string, commandArgs: string[]) => {
      args = commandArgs
      const child = new EventEmitter()
      return Object.assign(child, {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        kill: vi.fn(),
        stdin: { end: (text: string) => {
          input = text
          queueMicrotask(() => child.emit('close', 0))
        } },
      })
    })
    await streamAssistantChat({
      ...getDefaultAssistantSettings(),
      provider,
      context: { kind: 'view', label: 'Current cycle', viewId: 'team-cycle', teamKey: 'TEAM', cycleId: '17', filters: 'Status is open', search: 'release', totalCount: 70, items: [{ key: 'TEAM-1', summary: 'Ship it' }], truncated: true },
      messages: [{ role: 'user', content: 'Summarize this view' }],
    }, vi.fn())
    const prompt = provider === 'codex' ? input : args[args.indexOf('--append-system-prompt') + 1]!
    expect(prompt).toContain('Test persona')
    expect(prompt).toContain('Current context')
    expect(prompt).toContain('refreshed before each turn')
    expect(prompt).toContain('TEAM-1')
    expect(prompt).toContain('Status is open')
    expect(prompt).toContain('"truncated": true')
    expect(prompt).toContain('"cycleId": "17"')
  })
})
