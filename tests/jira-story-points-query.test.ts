import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTicket } from '../server/jiraIssueQueries'

const mocks = vi.hoisted(() => ({
  jiraFetch: vi.fn(),
  resolveStoryPointFieldIds: vi.fn(),
}))

vi.mock('../server/jiraClient', () => ({ jiraFetch: mocks.jiraFetch }))
vi.mock('../server/settings', () => ({ getAppSettings: () => ({ spaces: [] }) }))
vi.mock('../server/jiraIssueMapping', async importOriginal => ({
  ...(await importOriginal<typeof import('../server/jiraIssueMapping')>()),
  resolveStoryPointFieldIds: mocks.resolveStoryPointFieldIds,
}))

describe('getTicket story points editability', () => {
  beforeEach(() => {
    mocks.jiraFetch.mockReset()
    mocks.resolveStoryPointFieldIds.mockReset()
    mocks.resolveStoryPointFieldIds.mockResolvedValue({
      estimate: 'customfield_10016',
      points: 'customfield_10059',
    })
  })

  it('marks stories editable when Story Points is in editmeta, even if empty', async () => {
    mocks.jiraFetch.mockImplementation(async (path: string) => {
      if (path === '/issue/LMD-1689') {
        return { key: 'LMD-1689', fields: { issuetype: { name: 'Bug' }, summary: 'Empty bug' } }
      }
      if (path === '/issue/LMD-1689/editmeta') {
        return { fields: { customfield_10059: { operations: ['set'] } } }
      }
      return { values: [] }
    })

    const ticket = await getTicket('LMD-1689')
    expect(ticket.storyPointsEditable).toBe(true)
    expect(ticket.storyPoints).toBeUndefined()
  })

  it('marks epics not editable when the field is absent from editmeta', async () => {
    mocks.jiraFetch.mockImplementation(async (path: string) => {
      if (path === '/issue/LMD-1483') {
        return { key: 'LMD-1483', fields: { issuetype: { name: 'Epic' }, summary: 'Epic' } }
      }
      if (path === '/issue/LMD-1483/editmeta') {
        return { fields: { summary: { operations: ['set'] } } }
      }
      return { values: [] }
    })

    const ticket = await getTicket('LMD-1483')
    expect(ticket.storyPointsEditable).toBe(false)
    expect(ticket.issueType).toBe('Epic')
  })
})
