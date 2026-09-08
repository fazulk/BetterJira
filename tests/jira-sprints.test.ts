import type { AppSpaceSetting } from '../shared/settings'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSpaceCycles, setCurrentSprint, setSpaceBoard } from '../server/jiraSprints'

const mocks = vi.hoisted(() => ({ jiraFetch: vi.fn(), getAppSettings: vi.fn(), updateAppSettings: vi.fn() }))
vi.mock('../server/jiraClient', () => ({ jiraFetch: mocks.jiraFetch }))
vi.mock('../server/settings', () => ({ getAppSettings: mocks.getAppSettings, updateAppSettings: mocks.updateAppSettings }))
vi.mock('../server/jiraIssueQueries', () => ({ getTicket: vi.fn() }))
vi.mock('../server/events', () => ({ broadcast: vi.fn() }))

let spaces: AppSpaceSetting[]
beforeEach(() => {
  vi.clearAllMocks()
  spaces = [{ key: 'ENG', name: 'Engineering', enabled: true, boardId: 1 }]
  mocks.getAppSettings.mockImplementation(() => ({ spaces }))
  mocks.updateAppSettings.mockImplementation((input: { spaces: AppSpaceSetting[] }) => {
    spaces = input.spaces
  })
  mocks.jiraFetch.mockImplementation(async (path: string, options: { params?: { state?: string } }) => ({
    isLast: true,
    values: path === '/board'
      ? [{ id: 1, name: 'Engineering', type: 'scrum' }, { id: 2, name: 'Other', type: 'scrum' }]
      : options.params?.state === 'active'
        ? [{ id: 10, name: 'First', state: 'active' }, { id: 20, name: 'Second', state: 'active' }]
        : [],
  }))
})

describe('current sprint preference', () => {
  it('persists an override, uses it on reload, and restores automatic selection', async () => {
    expect((await setCurrentSprint('ENG', '20')).current?.id).toBe('20')
    expect(spaces[0]?.currentSprintId).toBe('20')
    expect((await getSpaceCycles('ENG')).current?.id).toBe('20')
    const automatic = await setCurrentSprint('ENG', null)
    expect(automatic.current?.id).toBe('10')
    expect(automatic.currentSprintId).toBeUndefined()
    expect(spaces[0]?.currentSprintId).toBeUndefined()
    expect(mocks.jiraFetch.mock.calls.every(([, options]) => !options.method)).toBe(true)
  })

  it('rejects a sprint outside the active sprints on the bound board', async () => {
    await expect(setCurrentSprint('ENG', '999')).rejects.toThrow('Choose an active sprint')
    expect(mocks.updateAppSettings).not.toHaveBeenCalled()
  })

  it('clears the override when switching boards', async () => {
    await setCurrentSprint('ENG', '20')
    await setSpaceBoard('ENG', 2)
    expect(spaces[0]?.boardId).toBe(2)
    expect(spaces[0]?.currentSprintId).toBeUndefined()
  })
})
