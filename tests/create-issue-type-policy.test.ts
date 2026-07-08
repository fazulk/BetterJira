/**
 * Regression tests for the sub-issue "SUBTYPE" chips.
 *
 * The create dialog previously merged issue types from every accessible
 * project and admitted "Task" as a child of a standard-level (hierarchy 0)
 * parent via a name-based fallback. Jira then rejected the create with
 * "Given parent work item does not belong to appropriate hierarchy".
 * The chips must come only from the parent project's hierarchy.
 */
import type { JiraCreateIssueTypeOption } from '~/server/jiraTypes'
import { describe, expect, it } from 'vitest'
import { getAvailableChildIssueTypeOptions } from '~/server/jiraIssueTypePolicy'

function makeOption(overrides: Partial<JiraCreateIssueTypeOption> & { name: string }): JiraCreateIssueTypeOption {
  return {
    id: `id-${overrides.name}`,
    subtask: false,
    hierarchyLevel: 0,
    parentRequired: false,
    parentSupported: true,
    ...overrides,
  }
}

const PROJECT_OPTIONS: JiraCreateIssueTypeOption[] = [
  makeOption({ name: 'Epic', hierarchyLevel: 1 }),
  makeOption({ name: 'Story' }),
  makeOption({ name: 'Task' }),
  makeOption({ name: 'Bug' }),
  makeOption({ name: 'Subtask', subtask: true, hierarchyLevel: -1, parentRequired: true }),
]

describe('getAvailableChildIssueTypeOptions', () => {
  it('offers only subtask types under a standard-level parent (Task/Story/Bug)', () => {
    for (const parent of ['Task', 'Story', 'Bug']) {
      const names = getAvailableChildIssueTypeOptions(parent, PROJECT_OPTIONS).map(option => option.name)
      expect(names, `children of ${parent}`).toEqual(['Subtask'])
    }
  })

  it('offers standard types (not subtasks, not epics) under an Epic parent', () => {
    const names = getAvailableChildIssueTypeOptions('Epic', PROJECT_OPTIONS).map(option => option.name)
    expect(names).toEqual(['Story', 'Task', 'Bug'])
  })

  it('offers nothing under a subtask parent', () => {
    expect(getAvailableChildIssueTypeOptions('Subtask', PROJECT_OPTIONS)).toEqual([])
  })

  it('excludes issue types whose create screen has no parent field', () => {
    const options = [
      ...PROJECT_OPTIONS.filter(option => option.name !== 'Subtask'),
      makeOption({ name: 'Subtask', subtask: true, hierarchyLevel: -1, parentSupported: false }),
    ]
    expect(getAvailableChildIssueTypeOptions('Task', options)).toEqual([])
  })

  it('does not admit Task under a standard-level parent via the name fallback', () => {
    // Parent issue type absent from the project's creatable types → the
    // name-based fallback applies; it must not offer same-level children.
    const options = PROJECT_OPTIONS.filter(option => option.name !== 'Story')
    const names = getAvailableChildIssueTypeOptions('Story', options).map(option => option.name)
    expect(names).toEqual(['Subtask'])
  })
})
