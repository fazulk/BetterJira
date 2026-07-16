import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAllAssignableUsers } from '../server/jiraAssignableUsers'
import { getCandidateProjects } from '../server/jiraProjects'

const { jiraFetch } = vi.hoisted(() => ({
  jiraFetch: vi.fn(),
}))

vi.mock('../server/jiraClient', () => ({
  getJiraConfig: vi.fn(),
  jiraFetch,
}))

describe('jira assignable users', () => {
  beforeEach(() => {
    jiraFetch.mockReset()
  })

  it('returns the union of users assignable across every project', async () => {
    jiraFetch.mockImplementation((path: string, options?: { params?: Record<string, string> }) => {
      if (path === '/project/search') {
        return { isLast: true, values: [{ key: 'ONE' }, { key: 'TWO' }, { key: 'ONE' }] }
      }

      const startAt = options?.params?.startAt
      if (startAt === '0') {
        return [
          { accountId: '2', displayName: 'Zulu' },
          { accountId: '1', displayName: 'Alpha' },
          { accountId: '1', displayName: 'Alpha duplicate' },
          { accountId: 'missing-name' },
          null,
        ]
      }
      if (startAt === '900') {
        return [{ accountId: '3', displayName: 'Middle' }]
      }
      return []
    })

    await expect(getAllAssignableUsers()).resolves.toEqual([
      { accountId: '1', displayName: 'Alpha duplicate' },
      { accountId: '3', displayName: 'Middle' },
      { accountId: '2', displayName: 'Zulu' },
    ])

    const userCalls = jiraFetch.mock.calls.filter(([path]) => path === '/user/assignable/multiProjectSearch')
    expect(userCalls).toHaveLength(10)
    expect(userCalls.map(([, options]) => options.params.startAt)).toEqual([
      '0',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ])
    expect(userCalls.every(([, options]) => (
      options.params.projectKeys === 'ONE,TWO' && options.params.maxResults === '100'
    ))).toBe(true)
  })
})

describe('jira project pagination', () => {
  beforeEach(() => {
    jiraFetch.mockReset()
  })

  it('retrieves subsequent project search pages', async () => {
    jiraFetch
      .mockResolvedValueOnce({
        startAt: 0,
        maxResults: 2,
        total: 3,
        values: [{ key: 'FIRST' }, { key: 'SECOND' }],
      })
      .mockResolvedValueOnce({
        startAt: 2,
        maxResults: 2,
        total: 3,
        values: [{ key: 'LAST' }],
      })

    const projects = await getCandidateProjects()

    expect(projects).toHaveLength(3)
    expect(projects.at(-1)).toEqual({ key: 'LAST' })
    expect(jiraFetch).toHaveBeenNthCalledWith(1, '/project/search', {
      params: { startAt: '0', maxResults: '50' },
    })
    expect(jiraFetch).toHaveBeenNthCalledWith(2, '/project/search', {
      params: { startAt: '2', maxResults: '50' },
    })
  })
})
