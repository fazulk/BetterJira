import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTicketAssignableUsers } from '../server/jiraAssignableUsers'

const { jiraFetch, getJiraConfig } = vi.hoisted(() => ({
  jiraFetch: vi.fn(),
  getJiraConfig: vi.fn(),
}))

vi.mock('../server/jiraClient', () => ({ jiraFetch, getJiraConfig }))

const jeff = { accountId: 'jeff', displayName: 'Jeff Fasulkey', active: true, accountType: 'atlassian' }
let connection = 0

beforeEach(() => {
  jiraFetch.mockReset()
  getJiraConfig.mockReturnValue({ baseUrl: 'https://jira.example.com', email: 'me@example.com', apiToken: String(++connection) })
})

afterEach(() => vi.useRealTimers())

describe('ticket assignees', () => {
  it('requests suggestions for the subtask itself, without consulting other projects', async () => {
    jiraFetch.mockResolvedValue([jeff])
    await expect(getTicketAssignableUsers('LMD-1569')).resolves.toEqual([{ accountId: 'jeff', displayName: 'Jeff Fasulkey' }])
    expect(jiraFetch).toHaveBeenCalledExactlyOnceWith('/user/assignable/search', {
      params: { issueKey: 'LMD-1569', query: '', recommend: 'true', maxResults: '50', accountType: 'atlassian' },
    })
  })

  it('searches beyond 1000 raw directory entries and checks each matching account for this issue', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ ...jeff, accountId: `inactive-${i}`, active: false }))
    jiraFetch.mockImplementation(async (path: string, options: { params: Record<string, string> }) => {
      const params = options.params
      if (path === '/users/search') {
        if (params.startAt === '0')
          return firstPage
        if (params.startAt === '1000')
          return [jeff, jeff, { ...jeff, accountId: 'ineligible' }, { ...jeff, accountId: 'app', accountType: 'app' }]
        return []
      }
      expect(params.issueKey).toBe('LMD-1569')
      return params.accountId === 'jeff' ? [jeff] : []
    })

    await expect(getTicketAssignableUsers('LMD-1569', ' FASULKEY ')).resolves.toEqual([{ accountId: 'jeff', displayName: 'Jeff Fasulkey' }])
    expect(jiraFetch.mock.calls.filter(([path]) => path === '/users/search').map(([, options]) => options.params.startAt)).toEqual(['0', '1000', '1004'])
    expect(jiraFetch.mock.calls.filter(([path]) => path === '/user/assignable/search').map(([, options]) => options.params.accountId)).toEqual(['jeff', 'ineligible'])
  })

  it('does not cache directory failures as empty results', async () => {
    jiraFetch.mockRejectedValueOnce(new Error('Directory unavailable'))
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).rejects.toThrow('Directory unavailable')
    jiraFetch.mockResolvedValueOnce([jeff]).mockResolvedValueOnce([]).mockResolvedValueOnce([jeff])
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).resolves.toHaveLength(1)
  })

  it('does not cache eligibility failures and scopes successful checks to the issue and connection', async () => {
    jiraFetch.mockResolvedValueOnce([jeff]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Rate limited'))
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).rejects.toThrow('Rate limited')
    jiraFetch.mockResolvedValue([jeff])
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).resolves.toHaveLength(1)
    const calls = jiraFetch.mock.calls.length
    await getTicketAssignableUsers('LMD-1569', 'Fasulkey')
    expect(jiraFetch).toHaveBeenCalledTimes(calls)
    await getTicketAssignableUsers('LMD-1570', 'Jeff')
    expect(jiraFetch).toHaveBeenCalledTimes(calls + 1)
    getJiraConfig.mockReturnValue({ baseUrl: 'https://other.example.com', email: 'me@example.com', apiToken: 'other' })
    jiraFetch.mockResolvedValueOnce([])
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).resolves.toEqual([])
    expect(jiraFetch).toHaveBeenLastCalledWith('/users/search', { params: { startAt: '0', maxResults: '1000' } })
  })

  it('limits concurrent eligibility requests and sorts results', async () => {
    const users = Array.from({ length: 9 }, (_, i) => ({ ...jeff, accountId: String(i), displayName: `Jeff ${9 - i}` }))
    let active = 0
    let peak = 0
    jiraFetch.mockImplementation(async (path: string, options: { params: Record<string, string> }) => {
      if (path === '/users/search')
        return options.params.startAt === '0' ? users : []
      active++
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      return users.filter(user => user.accountId === options.params.accountId)
    })
    const result = await getTicketAssignableUsers('LMD-1569', 'Jeff')
    expect(peak).toBeLessThanOrEqual(4)
    expect(result.map(user => user.displayName)).toEqual(users.map(user => user.displayName).sort())
  })

  it('refreshes eligibility after two minutes and the directory after five minutes', async () => {
    vi.useFakeTimers()
    jiraFetch.mockImplementation(async (path: string, options: { params: Record<string, string> }) => {
      if (path === '/users/search')
        return options.params.startAt === '0' ? [jeff] : []
      return [jeff]
    })
    await getTicketAssignableUsers('LMD-1569', 'Jeff')
    expect(jiraFetch).toHaveBeenCalledTimes(3)
    vi.advanceTimersByTime(120_001)
    await getTicketAssignableUsers('LMD-1569', 'Jeff')
    expect(jiraFetch).toHaveBeenCalledTimes(4)
    vi.advanceTimersByTime(180_000)
    await getTicketAssignableUsers('LMD-1569', 'Jeff')
    expect(jiraFetch).toHaveBeenCalledTimes(7)
  })

  it('rejects incomplete or malformed directory responses instead of returning partial results', async () => {
    jiraFetch.mockResolvedValueOnce([jeff]).mockResolvedValueOnce({ error: 'Unexpected response' })
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).rejects.toThrow('invalid user list')
    jiraFetch.mockResolvedValueOnce([jeff]).mockResolvedValueOnce([]).mockResolvedValueOnce([jeff])
    await expect(getTicketAssignableUsers('LMD-1569', 'Jeff')).resolves.toHaveLength(1)
  })
})
