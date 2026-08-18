import type { JiraApiIssueFields } from '../server/jiraTypes'
import { describe, expect, it } from 'vitest'
import { mapIssue } from '../server/jiraIssueMapping'

const storyPointFields = {
  estimate: 'customfield_estimate',
  points: 'customfield_points',
}

function mapStoryPoints(estimate: unknown, points: unknown): number | undefined {
  const fields = {
    customfield_estimate: estimate,
    customfield_points: points,
  } as JiraApiIssueFields

  return mapIssue({ key: 'TEST-1', fields }, false, null, null, storyPointFields).storyPoints
}

describe('mapIssue sprints', () => {
  it('keeps sprint state so the ticket can show its assigned cycle', () => {
    const fields = {
      customfield_sprint: [
        { id: 1, name: 'Sprint 1', state: 'closed' },
        { id: 2, name: 'Sprint 2', state: 'active' },
      ],
    } as JiraApiIssueFields

    const ticket = mapIssue({ key: 'TEST-1', fields }, false, 'customfield_sprint', null, storyPointFields)
    expect(ticket.inCurrentSprint).toBe(true)
    expect(ticket.sprints).toEqual([
      { id: '1', name: 'Sprint 1', state: 'closed' },
      { id: '2', name: 'Sprint 2', state: 'active' },
    ])
  })
})

describe('mapIssue story points', () => {
  it('maps integer and decimal values from both Jira project variants', () => {
    expect(mapStoryPoints(5, undefined)).toBe(5)
    expect(mapStoryPoints(undefined, 2.5)).toBe(2.5)
  })

  it('prefers Story point estimate when both fields are populated', () => {
    expect(mapStoryPoints(3, 8)).toBe(3)
  })

  it('falls back from an invalid estimate and ignores missing or invalid values', () => {
    expect(mapStoryPoints('invalid', 1.5)).toBe(1.5)
    expect(mapStoryPoints(undefined, undefined)).toBeUndefined()
    expect(mapStoryPoints(Number.NaN, Number.POSITIVE_INFINITY)).toBeUndefined()
  })
})
