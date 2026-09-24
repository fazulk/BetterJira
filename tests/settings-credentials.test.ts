import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let dataDir: string

function readJson(fileName: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dataDir, fileName), 'utf8')) as Record<string, unknown>
}

describe('settings credential storage', () => {
  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'better-jira-credentials-'))
    vi.stubEnv('BETTER_JIRA_APP_DATA_DIR', dataDir)
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    rmSync(dataDir, { recursive: true, force: true })
  })

  it('moves legacy tokens before removing them from settings', async () => {
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({
      jira: { baseUrl: 'https://jira.example.com', email: 'me@example.com', apiToken: 'old-jira-token' },
      ai: { provider: 'cerebras', model: 'llama-3.3-70b', cerebrasApiKey: 'old-cerebras-key' },
    }))

    const { getAppSettings, getStoredJiraSettings, getStoredAiSettings } = await import('../server/settings')
    const settings = getAppSettings()

    expect(settings.jira.hasApiToken).toBe(true)
    expect(settings.ai.hasCerebrasApiKey).toBe(true)
    expect(getStoredJiraSettings().apiToken).toBe('old-jira-token')
    expect(getStoredAiSettings().cerebrasApiKey).toBe('old-cerebras-key')
    expect(readJson('credentials.json')).toEqual({ jiraApiToken: 'old-jira-token', cerebrasApiKey: 'old-cerebras-key' })
    expect(JSON.stringify(readJson('settings.json'))).not.toMatch(/old-jira-token|old-cerebras-key|apiToken|cerebrasApiKey/)
    if (process.platform !== 'win32') {
      expect(statSync(join(dataDir, 'credentials.json')).mode & 0o777).toBe(0o600)
    }
  })

  it('writes new tokens only to credentials.json and keeps them through settings updates', async () => {
    const { updateAppSettings, getStoredJiraSettings, getStoredAiSettings } = await import('../server/settings')
    updateAppSettings({
      jira: { baseUrl: 'https://jira.example.com', email: 'me@example.com', apiToken: 'new-jira-token' },
      ai: { cerebrasApiKey: 'new-cerebras-key' },
    })
    updateAppSettings({ labelColors: { bug: '#123456' } })

    expect(getStoredJiraSettings().apiToken).toBe('new-jira-token')
    expect(getStoredAiSettings().cerebrasApiKey).toBe('new-cerebras-key')
    expect(readJson('credentials.json')).toEqual({ jiraApiToken: 'new-jira-token', cerebrasApiKey: 'new-cerebras-key' })
    expect(JSON.stringify(readJson('settings.json'))).not.toMatch(/new-jira-token|new-cerebras-key|apiToken|cerebrasApiKey/)
  })

  it('preserves an existing credentials file during migration', async () => {
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({
      jira: { apiToken: 'old-jira-token' },
      ai: { cerebrasApiKey: 'old-cerebras-key' },
    }))
    writeFileSync(join(dataDir, 'credentials.json'), JSON.stringify({ jiraApiToken: 'current-jira-token', cerebrasApiKey: 'current-cerebras-key' }))

    const { getAppSettings } = await import('../server/settings')
    expect(getAppSettings().jira.hasApiToken).toBe(true)
    expect(readJson('credentials.json')).toEqual({ jiraApiToken: 'current-jira-token', cerebrasApiKey: 'current-cerebras-key' })
    expect(JSON.stringify(readJson('settings.json'))).not.toMatch(/old-jira-token|old-cerebras-key/)
  })

  it('defaults issue links to the app and persists the reversed preference across reloads', async () => {
    const { getAppSettings, updateAppSettings } = await import('../server/settings')
    const { normalizeAppSettingsUpdate } = await import('../shared/settings')
    expect(getAppSettings().openJiraLinksInApp).toBe(true)
    updateAppSettings(normalizeAppSettingsUpdate({ openJiraLinksInApp: false }))
    updateAppSettings({ labelColors: { bug: '#123456' } })
    expect(readJson('settings.json').openJiraLinksInApp).toBe(false)

    vi.resetModules()
    const reloaded = await import('../server/settings')
    expect(reloaded.getAppSettings().openJiraLinksInApp).toBe(false)
    expect(normalizeAppSettingsUpdate({ openJiraLinksInApp: 'false' })).toEqual({})
    expect(reloaded.updateAppSettings({ openJiraLinksInApp: true }).openJiraLinksInApp).toBe(true)
  })

  it.each(['{invalid json', '{}'])('keeps legacy tokens in place if the new credentials file is invalid', async (content) => {
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({ jira: { apiToken: 'old-jira-token' } }))
    writeFileSync(join(dataDir, 'credentials.json'), content)

    const { getAppSettings } = await import('../server/settings')
    expect(() => getAppSettings()).toThrow()
    expect(JSON.stringify(readJson('settings.json'))).toContain('old-jira-token')
  })
})
