import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTicket, searchTickets } from '../server/jiraIssueQueries'

const { jiraFetch } = vi.hoisted(() => ({ jiraFetch: vi.fn() }))

vi.mock('../server/jiraClient', () => ({ jiraFetch }))
vi.mock('../server/settings', () => ({ getAppSettings: () => ({ spaces: [] }) }))

describe('linked issue queries', () => {
  beforeEach(() => {
    jiraFetch.mockReset()
  })

  it('loads linked issue summaries in the detail request without extra issue requests', async () => {
    jiraFetch.mockImplementation(async (path: string) => {
      if (path === '/issue/TEST-1') {
        return {
          key: 'TEST-1',
          fields: {
            issuelinks: [{
              id: '1',
              type: { inward: 'is blocked by' },
              inwardIssue: { key: 'OTHER-2', fields: { summary: 'Cross-project dependency' } },
            }],
          },
        }
      }
      return { values: [] }
    })

    const ticket = await getTicket('TEST-1')

    expect(ticket.linkedIssues).toEqual([
      { id: '1', relationship: 'is blocked by', key: 'OTHER-2', summary: 'Cross-project dependency', status: '', statusCategory: '' },
    ])
    const issueCalls = jiraFetch.mock.calls.filter(([path]) => path.startsWith('/issue/'))
    expect(issueCalls).toHaveLength(1)
    expect(issueCalls[0]?.[1].params.fields.split(',')).toContain('issuelinks')
  })

  it('keeps linked issues out of list search fields and responses', async () => {
    jiraFetch.mockImplementation(async (path: string) => path === '/search/jql'
      ? { issues: [{ key: 'TEST-1', fields: { issuelinks: [] } }], isLast: true }
      : { values: [] })

    const tickets = await searchTickets('project = TEST')

    expect(tickets[0]?.linkedIssues).toBeUndefined()
    const searchCall = jiraFetch.mock.calls.find(([path]) => path === '/search/jql')
    expect(searchCall?.[1].params.fields.split(',')).not.toContain('issuelinks')
  })
})
