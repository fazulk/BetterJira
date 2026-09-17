import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateTicketStoryPoints } from '../server/jiraFieldUpdates'
import {
  canEditStoryPointsProperty,
  formatStoryPointsLabel,
  parseStoryPointsDraft,
  shouldShowStoryPointsProperty,
} from '../src/features/ticket-detail/storyPoints'

const mocks = vi.hoisted(() => ({
  jiraFetch: vi.fn(),
  getTicket: vi.fn(),
  resolveStoryPointFieldIds: vi.fn(),
  broadcast: vi.fn(),
}))

vi.mock('../server/jiraClient', () => ({ jiraFetch: mocks.jiraFetch }))
vi.mock('../server/jiraIssueQueries', () => ({ getTicket: mocks.getTicket }))
vi.mock('../server/events', () => ({ broadcast: mocks.broadcast }))
vi.mock('../server/jiraIssueMapping', async importOriginal => ({
  ...(await importOriginal<typeof import('../server/jiraIssueMapping')>()),
  resolveStoryPointFieldIds: mocks.resolveStoryPointFieldIds,
}))

describe('story points property visibility', () => {
  it('shows an empty add row for stories, bugs, and tasks without waiting for editmeta', () => {
    expect(shouldShowStoryPointsProperty({ issueType: 'Story' }, false)).toBe(true)
    expect(shouldShowStoryPointsProperty({ issueType: 'Bug' }, false)).toBe(true)
    expect(shouldShowStoryPointsProperty({ issueType: 'Task' }, false)).toBe(true)
    expect(shouldShowStoryPointsProperty({ issueType: 'Epic' }, false)).toBe(false)
    expect(shouldShowStoryPointsProperty({ issueType: 'Sub-task' }, false)).toBe(false)
    expect(shouldShowStoryPointsProperty({ issueType: 'Initiative' }, false)).toBe(false)
    expect(shouldShowStoryPointsProperty({ issueType: 'Story' }, true)).toBe(false)
    expect(shouldShowStoryPointsProperty({ issueType: 'Epic', storyPoints: 5 }, false)).toBe(true)
    expect(shouldShowStoryPointsProperty({ issueType: 'Story', storyPointsEditable: false }, false)).toBe(false)
  })

  it('allows editing stories/bugs/tasks even before editmeta loads', () => {
    expect(canEditStoryPointsProperty({ issueType: 'Story' }, false)).toBe(true)
    expect(canEditStoryPointsProperty({ issueType: 'Bug' }, false)).toBe(true)
    expect(canEditStoryPointsProperty({ issueType: 'Epic' }, false)).toBe(false)
    expect(canEditStoryPointsProperty({ issueType: 'Story', storyPointsEditable: true }, false)).toBe(true)
    expect(canEditStoryPointsProperty({ issueType: 'Story', storyPointsEditable: false }, false)).toBe(false)
    expect(canEditStoryPointsProperty({ issueType: 'Story' }, true)).toBe(false)
  })

  it('parses drafts and formats labels', () => {
    expect(parseStoryPointsDraft('')).toBeNull()
    expect(parseStoryPointsDraft('  8 ')).toBe(8)
    expect(parseStoryPointsDraft('2.5')).toBe(2.5)
    expect(parseStoryPointsDraft('-1')).toBe('invalid')
    expect(parseStoryPointsDraft('abc')).toBe('invalid')
    expect(formatStoryPointsLabel(1)).toBe('1 story point')
    expect(formatStoryPointsLabel(5)).toBe('5 story points')
  })
})

describe('updateTicketStoryPoints', () => {
  beforeEach(() => {
    mocks.jiraFetch.mockReset()
    mocks.getTicket.mockReset()
    mocks.resolveStoryPointFieldIds.mockReset()
    mocks.broadcast.mockReset()
  })

  it('writes Story Points when that is the editable field and rejects issue types without it', async () => {
    mocks.resolveStoryPointFieldIds.mockResolvedValue({
      estimate: 'customfield_10016',
      points: 'customfield_10059',
    })
    mocks.getTicket.mockResolvedValue({ key: 'LMD-338', storyPoints: 8, storyPointsEditable: true })
    mocks.jiraFetch.mockImplementation(async (path: string) => {
      if (path === '/issue/LMD-338/editmeta') {
        return { fields: { customfield_10059: { operations: ['set'] } } }
      }
      return null
    })

    await updateTicketStoryPoints('LMD-338', 8)

    expect(mocks.jiraFetch).toHaveBeenCalledWith('/issue/LMD-338', {
      method: 'PUT',
      body: { fields: { customfield_10059: 8 } },
    })

    mocks.jiraFetch.mockImplementation(async (path: string) => {
      if (path === '/issue/LMD-1483/editmeta') {
        return { fields: {} }
      }
      return null
    })

    await expect(updateTicketStoryPoints('LMD-1483', 3)).rejects.toThrow('Story points cannot be set on this work item')
    expect(mocks.jiraFetch).not.toHaveBeenCalledWith('/issue/LMD-1483', expect.objectContaining({ method: 'PUT' }))
  })

  it('clears story points with null', async () => {
    mocks.resolveStoryPointFieldIds.mockResolvedValue({
      estimate: 'customfield_10016',
      points: 'customfield_10059',
    })
    mocks.getTicket.mockResolvedValue({ key: 'LMD-338', storyPointsEditable: true })
    mocks.jiraFetch.mockImplementation(async (path: string) => {
      if (path === '/issue/LMD-338/editmeta') {
        return { fields: { customfield_10059: { operations: ['set'] } } }
      }
      return null
    })

    await updateTicketStoryPoints('LMD-338', null)

    expect(mocks.jiraFetch).toHaveBeenCalledWith('/issue/LMD-338', {
      method: 'PUT',
      body: { fields: { customfield_10059: null } },
    })
  })
})
