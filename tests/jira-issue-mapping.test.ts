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

describe('mapIssue workflow people', () => {
  const workflowPeopleFields = {
    testedBy: 'customfield_tested_by',
    approvers: 'customfield_approvers',
    approvedToProductionBy: 'customfield_approved_to_prod',
  }

  it('maps tested by, approvers, and approved-to-production users when present', () => {
    const fields = {
      customfield_tested_by: { accountId: 'u-1', displayName: 'Jon Prevost' },
      customfield_approvers: [
        { accountId: 'u-2', displayName: 'Pedro Moreira' },
        { accountId: 'u-3', displayName: 'Naomi Golovin' },
      ],
      customfield_approved_to_prod: { accountId: 'u-4', displayName: 'Raja Sharma' },
    } as JiraApiIssueFields

    const ticket = mapIssue(
      { key: 'TEST-1', fields },
      false,
      null,
      null,
      storyPointFields,
      workflowPeopleFields,
    )

    expect(ticket.testedBy).toBe('Jon Prevost')
    expect(ticket.approvers).toEqual(['Pedro Moreira', 'Naomi Golovin'])
    expect(ticket.approvedToProductionBy).toBe('Raja Sharma')
  })

  it('omits empty or invalid workflow people values', () => {
    const fields = {
      customfield_tested_by: { accountId: 'u-1' },
      customfield_approvers: [],
      customfield_approved_to_prod: null,
    } as JiraApiIssueFields

    const ticket = mapIssue(
      { key: 'TEST-1', fields },
      false,
      null,
      null,
      storyPointFields,
      workflowPeopleFields,
    )

    expect(ticket.testedBy).toBeUndefined()
    expect(ticket.approvers).toBeUndefined()
    expect(ticket.approvedToProductionBy).toBeUndefined()
  })
})
