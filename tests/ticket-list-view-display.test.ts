// Characterization tests for src/features/ticket-list/viewDisplay.ts.
// These assert what the code CURRENTLY does, including quirks.
import type { ViewFilterClause } from '@/features/ticket-list/types'
import type { CustomViewDisplay } from '~/shared/settingsTypes'
import { describe, expect, it } from 'vitest'
import {
  copyIssueGroupConfigMap,
  copyViewDisplay,
  filterClausesMatch,
  filterGroupsMatch,
  getDefaultViewDisplay,
  issueGroupConfigMapsMatch,
  normalizeDirection,
  normalizeInitiativeRowFields,
  normalizeIssueGroupConfigMap,
  normalizeIssueGroupingFieldId,
  normalizeIssueOrderingFieldId,
  normalizeIssueRowFields,
  normalizeIssueVisibilityRange,
  normalizeProjectClosedRange,
  normalizeProjectGroupingFieldId,
  normalizeProjectOrderingFieldId,
  normalizeProjectRowFields,
  normalizeSavedViewRowFields,
  parseIssueGroupingFieldId,
  stringArraysMatch,
  stringSetsMatch,
  viewDisplayMatches,
} from '@/features/ticket-list/viewDisplay'

function makeDisplay(overrides: Partial<CustomViewDisplay> = {}): CustomViewDisplay {
  return { ...getDefaultViewDisplay(), ...overrides }
}

function makeClause(overrides: Partial<ViewFilterClause> = {}): ViewFilterClause {
  return {
    id: 'clause-1',
    fieldId: 'status',
    fieldLabel: 'Status',
    value: 'done',
    valueLabel: 'Done',
    ...overrides,
  }
}

describe('getDefaultViewDisplay', () => {
  it('returns the full default shape', () => {
    expect(getDefaultViewDisplay()).toEqual({
      grouping: 'none',
      ordering: 'manual',
      groupingDirection: 'asc',
      orderingDirection: 'asc',
      completedRange: 'hidden',
      showSubIssuesRange: 'hidden',
      showTriageIssuesRange: 'hidden',
      issueGroupOrders: {},
      hiddenIssueGroupIds: {},
      collapsedIssueSectionIds: [],
      visibleIssueRowFields: [
        'id',
        'status',
        'assignee',
        'priority',
        'project',
        'due',
        'labels',
        'created',
      ],
      visibleProjectRowFields: ['health', 'priority', 'lead', 'targetDate', 'issues', 'status'],
      projectGrouping: 'none',
      projectOrdering: 'manual',
      projectClosedRange: 'hidden',
      collapsedProjectSectionIds: [],
      visibleInitiativeRowFields: ['health', 'lead', 'projects', 'issues', 'updated'],
      visibleSavedViewRowFields: ['owner'],
    })
  })

  it('returns fresh objects on every call (no shared references)', () => {
    const first = getDefaultViewDisplay()
    const second = getDefaultViewDisplay()
    expect(first).not.toBe(second)
    expect(first.issueGroupOrders).not.toBe(second.issueGroupOrders)
    expect(first.visibleIssueRowFields).not.toBe(second.visibleIssueRowFields)
    expect(first.collapsedIssueSectionIds).not.toBe(second.collapsedIssueSectionIds)
  })
})

describe('field id / enum normalizers', () => {
  it('normalizeIssueGroupingFieldId passes valid ids and falls back to "status" (not "none")', () => {
    for (const id of ['none', 'status', 'assignee', 'agent', 'project', 'priority', 'label']) {
      expect(normalizeIssueGroupingFieldId(id)).toBe(id)
    }
    expect(normalizeIssueGroupingFieldId('garbage')).toBe('status')
    expect(normalizeIssueGroupingFieldId('')).toBe('status')
    expect(normalizeIssueGroupingFieldId('Status')).toBe('status')
  })

  it('parseIssueGroupingFieldId returns null instead of a fallback', () => {
    expect(parseIssueGroupingFieldId('label')).toBe('label')
    expect(parseIssueGroupingFieldId('garbage')).toBeNull()
    expect(parseIssueGroupingFieldId('')).toBeNull()
  })

  it('normalizeIssueOrderingFieldId falls back to "status" (not "manual")', () => {
    const valid = [
      'manual',
      'title',
      'status',
      'priority',
      'assignee',
      'agent',
      'estimate',
      'updated',
      'created',
      'due',
      'linkCount',
      'timeInStatus',
    ]
    for (const id of valid) {
      expect(normalizeIssueOrderingFieldId(id)).toBe(id)
    }
    expect(normalizeIssueOrderingFieldId('garbage')).toBe('status')
    expect(normalizeIssueOrderingFieldId('')).toBe('status')
  })

  it('normalizeProjectGroupingFieldId falls back to "none"', () => {
    expect(normalizeProjectGroupingFieldId('lead')).toBe('lead')
    expect(normalizeProjectGroupingFieldId('garbage')).toBe('none')
  })

  it('normalizeProjectOrderingFieldId falls back to "manual"', () => {
    expect(normalizeProjectOrderingFieldId('targetDate')).toBe('targetDate')
    expect(normalizeProjectOrderingFieldId('garbage')).toBe('manual')
  })

  it('normalizeProjectClosedRange accepts all/day/week only; "month" is invalid here', () => {
    expect(normalizeProjectClosedRange('all')).toBe('all')
    expect(normalizeProjectClosedRange('day')).toBe('day')
    expect(normalizeProjectClosedRange('week')).toBe('week')
    expect(normalizeProjectClosedRange('hidden')).toBe('hidden')
    expect(normalizeProjectClosedRange('month')).toBe('hidden')
    expect(normalizeProjectClosedRange('garbage')).toBe('hidden')
  })

  it('normalizeIssueVisibilityRange additionally accepts "month"', () => {
    expect(normalizeIssueVisibilityRange('month')).toBe('month')
    expect(normalizeIssueVisibilityRange('all')).toBe('all')
    expect(normalizeIssueVisibilityRange('hidden')).toBe('hidden')
    expect(normalizeIssueVisibilityRange('garbage')).toBe('hidden')
  })

  it('normalizeDirection maps exactly "desc" to desc and everything else to asc', () => {
    expect(normalizeDirection('desc')).toBe('desc')
    expect(normalizeDirection('asc')).toBe('asc')
    expect(normalizeDirection('DESC')).toBe('asc')
    expect(normalizeDirection('garbage')).toBe('asc')
    expect(normalizeDirection('')).toBe('asc')
  })
})

describe('row field list normalizers', () => {
  it('normalizeIssueRowFields keeps order, drops unknowns, dedupes, defaults when empty', () => {
    expect(normalizeIssueRowFields(['status', 'id', 'status', 'bogus', 'labels', 'storyPoints'])).toEqual([
      'status',
      'id',
      'labels',
      'storyPoints',
    ])
    const defaults = ['id', 'status', 'assignee', 'priority', 'project', 'due', 'labels', 'created']
    expect(normalizeIssueRowFields([])).toEqual(defaults)
    expect(normalizeIssueRowFields(['bogus', 'nope'])).toEqual(defaults)
  })

  it('normalizeProjectRowFields behaves the same with its own defaults', () => {
    expect(normalizeProjectRowFields(['lead', 'lead', 'bogus', 'health'])).toEqual([
      'lead',
      'health',
    ])
    expect(normalizeProjectRowFields([])).toEqual([
      'health',
      'priority',
      'lead',
      'targetDate',
      'issues',
      'status',
    ])
  })

  it('normalizeInitiativeRowFields defaults when nothing survives', () => {
    expect(normalizeInitiativeRowFields(['issues', 'bogus'])).toEqual(['issues'])
    expect(normalizeInitiativeRowFields(['bogus'])).toEqual([
      'health',
      'lead',
      'projects',
      'issues',
      'updated',
    ])
  })

  it('normalizeSavedViewRowFields defaults to ["owner"]', () => {
    expect(normalizeSavedViewRowFields(['updated', 'type'])).toEqual(['updated', 'type'])
    expect(normalizeSavedViewRowFields([])).toEqual(['owner'])
  })
})

describe('issue group config maps', () => {
  it('copyIssueGroupConfigMap copies entries into new arrays and drops empty arrays', () => {
    const source = { status: ['a', 'b'], priority: [] }
    const copy = copyIssueGroupConfigMap(source)
    expect(copy).toEqual({ status: ['a', 'b'] })
    expect(copy.status).not.toBe(source.status)
  })

  it('normalizeIssueGroupConfigMap drops unknown keys and empty arrays, copies arrays', () => {
    const source = { status: ['a'], bogus: ['x'], label: [] }
    const normalized = normalizeIssueGroupConfigMap(source)
    expect(normalized).toEqual({ status: ['a'] })
    expect(normalized.status).not.toBe(source.status)
  })

  it('issueGroupConfigMapsMatch treats missing keys and empty arrays as equal, ignores unknown keys', () => {
    expect(issueGroupConfigMapsMatch({ status: ['a'] }, { status: ['a'] })).toBe(true)
    expect(issueGroupConfigMapsMatch({ status: ['a'] }, { status: ['b'] })).toBe(false)
    expect(issueGroupConfigMapsMatch({ status: ['a', 'b'] }, { status: ['b', 'a'] })).toBe(false)
    expect(issueGroupConfigMapsMatch({ status: [] }, {})).toBe(true)
    expect(issueGroupConfigMapsMatch({ status: ['a'] }, {})).toBe(false)
  })
})

describe('array/set matching semantics', () => {
  it('stringArraysMatch is order-sensitive', () => {
    expect(stringArraysMatch(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(stringArraysMatch(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(stringArraysMatch(['a'], ['a', 'b'])).toBe(false)
    expect(stringArraysMatch([], [])).toBe(true)
  })

  it('stringSetsMatch is order-insensitive', () => {
    expect(stringSetsMatch(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(stringSetsMatch(['a', 'b'], ['a', 'c'])).toBe(false)
    expect(stringSetsMatch(['a'], ['a', 'b'])).toBe(false)
  })

  it('quirk: stringSetsMatch is asymmetric when duplicates are involved', () => {
    // Left duplicates are each found in right, and lengths match, so this passes...
    expect(stringSetsMatch(['a', 'a'], ['a', 'b'])).toBe(true)
    // ...but the reverse direction fails.
    expect(stringSetsMatch(['a', 'b'], ['a', 'a'])).toBe(false)
  })
})

describe('filterClausesMatch', () => {
  it('compares fieldId+value pairs order-insensitively and ignores id/labels', () => {
    const left = [
      makeClause({ id: 'x1', fieldId: 'status', value: 'done', valueLabel: 'Done!' }),
      makeClause({ id: 'x2', fieldId: 'assignee', value: 'alice' }),
    ]
    const right = [
      makeClause({ id: 'y1', fieldId: 'assignee', value: 'alice', fieldLabel: 'Other' }),
      makeClause({ id: 'y2', fieldId: 'status', value: 'done' }),
    ]
    expect(filterClausesMatch(left, right)).toBe(true)
    expect(filterClausesMatch(left, [right[0] ?? makeClause()])).toBe(false)
    expect(filterClausesMatch([], [])).toBe(true)
  })

  it('quirk: duplicates make the comparison asymmetric', () => {
    const duplicated = [
      makeClause({ id: 'a', fieldId: 'status', value: 'done' }),
      makeClause({ id: 'b', fieldId: 'status', value: 'done' }),
    ]
    const distinct = [
      makeClause({ id: 'c', fieldId: 'status', value: 'done' }),
      makeClause({ id: 'd', fieldId: 'status', value: 'todo' }),
    ]
    expect(filterClausesMatch(duplicated, distinct)).toBe(true)
    expect(filterClausesMatch(distinct, duplicated)).toBe(false)
  })
})

describe('filterGroupsMatch', () => {
  interface Item { status: string, assignee: string }
  const item: Item = { status: 'done', assignee: 'alice' }

  function matches(candidate: Item, filter: ViewFilterClause): boolean {
    if (filter.fieldId === 'status')
      return candidate.status === filter.value
    if (filter.fieldId === 'assignee')
      return candidate.assignee === filter.value
    return false
  }

  it('returns true with no filters', () => {
    expect(filterGroupsMatch(item, [], matches)).toBe(true)
  })

  it('oRs clauses within the same field', () => {
    const filters = [
      makeClause({ fieldId: 'status', value: 'todo' }),
      makeClause({ fieldId: 'status', value: 'done' }),
    ]
    expect(filterGroupsMatch(item, filters, matches)).toBe(true)
  })

  it('aNDs across different fields', () => {
    const passing = [
      makeClause({ fieldId: 'status', value: 'done' }),
      makeClause({ fieldId: 'assignee', value: 'alice' }),
    ]
    const failing = [
      makeClause({ fieldId: 'status', value: 'done' }),
      makeClause({ fieldId: 'assignee', value: 'bob' }),
    ]
    expect(filterGroupsMatch(item, passing, matches)).toBe(true)
    expect(filterGroupsMatch(item, failing, matches)).toBe(false)
  })
})

describe('viewDisplayMatches', () => {
  it('matches identical displays and independently built defaults', () => {
    expect(viewDisplayMatches(getDefaultViewDisplay(), getDefaultViewDisplay())).toBe(true)
  })

  it('detects scalar field differences', () => {
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ grouping: 'status' }))).toBe(false)
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ ordering: 'title' }))).toBe(false)
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ completedRange: 'week' }))).toBe(false)
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ projectGrouping: 'lead' }))).toBe(false)
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ projectClosedRange: 'all' }))).toBe(false)
  })

  it('detects direction differences', () => {
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ groupingDirection: 'desc' }))).toBe(false)
    expect(viewDisplayMatches(makeDisplay(), makeDisplay({ orderingDirection: 'desc' }))).toBe(false)
  })

  it('compares group config maps after normalization: unknown keys and empty arrays are ignored', () => {
    const left = makeDisplay({ issueGroupOrders: { status: ['a', 'b'] } })
    const sameOrders = makeDisplay({ issueGroupOrders: { status: ['a', 'b'] } })
    const differentOrders = makeDisplay({ issueGroupOrders: { status: ['b', 'a'] } })
    expect(viewDisplayMatches(left, sameOrders)).toBe(true)
    expect(viewDisplayMatches(left, differentOrders)).toBe(false)

    const bogusOnly = makeDisplay({ issueGroupOrders: { bogus: ['x'] } })
    const emptyEntry = makeDisplay({ issueGroupOrders: { status: [] } })
    expect(viewDisplayMatches(bogusOnly, makeDisplay())).toBe(true)
    expect(viewDisplayMatches(emptyEntry, makeDisplay())).toBe(true)

    const hiddenLeft = makeDisplay({ hiddenIssueGroupIds: { priority: ['p1'] } })
    expect(viewDisplayMatches(hiddenLeft, makeDisplay())).toBe(false)
  })

  it('collapsed section ids are order-sensitive; visible row fields are order-insensitive', () => {
    const collapsedA = makeDisplay({ collapsedIssueSectionIds: ['one', 'two'] })
    const collapsedB = makeDisplay({ collapsedIssueSectionIds: ['two', 'one'] })
    expect(viewDisplayMatches(collapsedA, collapsedB)).toBe(false)

    const fieldsA = makeDisplay({ visibleIssueRowFields: ['id', 'status'] })
    const fieldsB = makeDisplay({ visibleIssueRowFields: ['status', 'id'] })
    expect(viewDisplayMatches(fieldsA, fieldsB)).toBe(true)
    expect(viewDisplayMatches(fieldsA, makeDisplay({ visibleIssueRowFields: ['id'] }))).toBe(false)

    const projectFieldsA = makeDisplay({ visibleProjectRowFields: ['lead', 'health'] })
    const projectFieldsB = makeDisplay({ visibleProjectRowFields: ['health', 'lead'] })
    expect(viewDisplayMatches(projectFieldsA, projectFieldsB)).toBe(true)

    const collapsedProjectsA = makeDisplay({ collapsedProjectSectionIds: ['x', 'y'] })
    const collapsedProjectsB = makeDisplay({ collapsedProjectSectionIds: ['y', 'x'] })
    expect(viewDisplayMatches(collapsedProjectsA, collapsedProjectsB)).toBe(false)
  })
})

describe('copyViewDisplay', () => {
  it('produces an equal display for fully populated input', () => {
    const source = makeDisplay({
      grouping: 'assignee',
      ordering: 'due',
      groupingDirection: 'desc',
      completedRange: 'week',
      issueGroupOrders: { status: ['a'] },
      hiddenIssueGroupIds: { priority: ['p1'] },
      collapsedIssueSectionIds: ['s1'],
      visibleIssueRowFields: ['id', 'status'],
      projectGrouping: 'lead',
      collapsedProjectSectionIds: ['p1'],
    })
    expect(copyViewDisplay(source)).toEqual(source)
  })

  it('deep-copies maps and arrays (no shared references)', () => {
    const source = makeDisplay({
      issueGroupOrders: { status: ['a', 'b'] },
      hiddenIssueGroupIds: { label: ['l1'] },
      collapsedIssueSectionIds: ['s1'],
      visibleIssueRowFields: ['id'],
      visibleProjectRowFields: ['lead'],
      collapsedProjectSectionIds: ['p1'],
      visibleInitiativeRowFields: ['lead'],
      visibleSavedViewRowFields: ['owner'],
    })
    const copy = copyViewDisplay(source)
    expect(copy).not.toBe(source)
    expect(copy.issueGroupOrders).not.toBe(source.issueGroupOrders)
    expect(copy.issueGroupOrders.status).not.toBe(source.issueGroupOrders.status)
    expect(copy.hiddenIssueGroupIds).not.toBe(source.hiddenIssueGroupIds)
    expect(copy.hiddenIssueGroupIds.label).not.toBe(source.hiddenIssueGroupIds.label)
    expect(copy.collapsedIssueSectionIds).not.toBe(source.collapsedIssueSectionIds)
    expect(copy.visibleIssueRowFields).not.toBe(source.visibleIssueRowFields)
    expect(copy.visibleProjectRowFields).not.toBe(source.visibleProjectRowFields)
    expect(copy.collapsedProjectSectionIds).not.toBe(source.collapsedProjectSectionIds)
    expect(copy.visibleInitiativeRowFields).not.toBe(source.visibleInitiativeRowFields)
    expect(copy.visibleSavedViewRowFields).not.toBe(source.visibleSavedViewRowFields)
  })

  it('quirk: empty group-config arrays are dropped during the copy', () => {
    const source = makeDisplay({ issueGroupOrders: { status: [], priority: ['p1'] } })
    expect(copyViewDisplay(source).issueGroupOrders).toEqual({ priority: ['p1'] })
  })

  it('fills in defaults for fields missing at runtime (legacy/partial data)', () => {
    // The type marks every field required, but the implementation guards each
    // field with ?? defaults. Simulate legacy persisted data by deleting keys.
    const partial = makeDisplay({ ordering: 'due' })
    Reflect.deleteProperty(partial, 'grouping')
    Reflect.deleteProperty(partial, 'groupingDirection')
    Reflect.deleteProperty(partial, 'issueGroupOrders')
    Reflect.deleteProperty(partial, 'collapsedIssueSectionIds')
    Reflect.deleteProperty(partial, 'visibleIssueRowFields')
    Reflect.deleteProperty(partial, 'projectClosedRange')
    Reflect.deleteProperty(partial, 'visibleSavedViewRowFields')

    const copy = copyViewDisplay(partial)
    const defaults = getDefaultViewDisplay()
    expect(copy.ordering).toBe('due')
    expect(copy.grouping).toBe(defaults.grouping)
    expect(copy.groupingDirection).toBe(defaults.groupingDirection)
    expect(copy.issueGroupOrders).toEqual({})
    expect(copy.collapsedIssueSectionIds).toEqual([])
    expect(copy.visibleIssueRowFields).toEqual(defaults.visibleIssueRowFields)
    expect(copy.projectClosedRange).toBe(defaults.projectClosedRange)
    expect(copy.visibleSavedViewRowFields).toEqual(defaults.visibleSavedViewRowFields)
  })
})
