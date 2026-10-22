import type { JiraAdfDocument } from '../shared/jiraAdf'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ jiraFetch: vi.fn(), broadcast: vi.fn() }))
vi.mock('../server/jiraClient', () => ({ jiraFetch: mocks.jiraFetch }))
vi.mock('../server/events', () => ({ broadcast: mocks.broadcast }))
vi.mock('../server/settings', () => ({ getAppSettings: () => ({ spaces: [] }) }))

const content: JiraAdfDocument = {
  type: 'doc',
  version: 1,
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important context' }] }],
}

beforeEach(() => {
  vi.resetModules()
  mocks.jiraFetch.mockReset()
  mocks.broadcast.mockReset()
  mocks.jiraFetch.mockImplementation(async (path: string, options?: { params?: Record<string, string> }) => {
    if (path === '/field/search') {
      return { values: options?.params?.query === 'Additional'
        ? [{
            id: 'customfield_12345',
            name: 'Additional Bug Details',
            schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textarea' },
          }]
        : [] }
    }
    if (path.endsWith('/editmeta'))
      return { fields: { customfield_12345: { operations: ['set'] } } }
    return { key: 'TEST-1', fields: { issuetype: { name: 'Bug' }, description: 'Original description', customfield_12345: content } }
  })
})

describe('additional bug details Jira round trip', () => {
  it('requests the custom field and includes its rich text and editability in ticket details', async () => {
    const { getTicket } = await import('../server/jiraIssueQueries')
    const ticket = await getTicket('TEST-1')
    expect(mocks.jiraFetch).toHaveBeenCalledWith('/issue/TEST-1', {
      params: { fields: expect.stringContaining('customfield_12345') },
    })
    expect(ticket).toMatchObject({
      description: 'Original description',
      additionalBugDetails: 'Important context',
      additionalBugDetailsAdf: content,
      additionalBugDetailsFieldId: 'customfield_12345',
      additionalBugDetailsEditable: true,
    })
  })

  it('shows an empty editable field so bug details can be added', async () => {
    const original = mocks.jiraFetch.getMockImplementation()!
    mocks.jiraFetch.mockImplementation(async (path: string, options?: { params?: Record<string, string> }) =>
      path === '/issue/TEST-1' ? { key: 'TEST-1', fields: { customfield_12345: null } } : original(path, options))
    const { getTicket } = await import('../server/jiraIssueQueries')
    expect(await getTicket('TEST-1')).toMatchObject({ additionalBugDetails: '', additionalBugDetailsFieldId: 'customfield_12345', additionalBugDetailsEditable: true })
  })

  it('writes only Additional Bug Details, then returns and broadcasts the refreshed ticket', async () => {
    const { updateTicketAdditionalBugDetails } = await import('../server/jiraFieldUpdates')
    const ticket = await updateTicketAdditionalBugDetails('TEST-1', content)
    expect(mocks.jiraFetch).toHaveBeenCalledWith('/issue/TEST-1', {
      method: 'PUT',
      body: { fields: { customfield_12345: content } },
    })
    expect(mocks.broadcast).toHaveBeenCalledWith('ticket-updated', ticket)
  })

  it('supports clearing Additional Bug Details', async () => {
    const { updateTicketAdditionalBugDetails } = await import('../server/jiraFieldUpdates')
    await updateTicketAdditionalBugDetails('TEST-1', null)
    expect(mocks.jiraFetch).toHaveBeenCalledWith('/issue/TEST-1', {
      method: 'PUT',
      body: { fields: { customfield_12345: null } },
    })
  })

  it('keeps existing content visible but refuses writes when Jira disallows editing', async () => {
    const original = mocks.jiraFetch.getMockImplementation()!
    mocks.jiraFetch.mockImplementation(async (path: string, options?: { params?: Record<string, string> }) =>
      path.endsWith('/editmeta') ? { fields: {} } : original(path, options))
    const { getTicket } = await import('../server/jiraIssueQueries')
    expect(await getTicket('TEST-1')).toMatchObject({ additionalBugDetailsAdf: content, additionalBugDetailsEditable: false })
    const { updateTicketAdditionalBugDetails } = await import('../server/jiraFieldUpdates')
    await expect(updateTicketAdditionalBugDetails('TEST-1', content)).rejects.toThrow('Additional Bug Details cannot be set')
    expect(mocks.jiraFetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false)
  })
})
