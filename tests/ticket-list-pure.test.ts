// Characterization tests: these assert what the code CURRENTLY does,
// including quirks. They are not a specification of intended behavior.
import type { ProjectRow, ViewFilterClause } from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import type { CustomViewFilter } from '~/shared/settingsTypes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clausesToCustomViewFilters,
  createViewFilterClause,
  customViewFiltersToClauses,
  getFilterFieldLabel,
  isFilterFieldId,
  normalizeFilterFieldId,
} from '@/features/ticket-list/filterDisplay'
import {
  buildInsightSlices,
  compareOptionalDates,
  dateMatchesOperator,
  formatCompactDate,
  getBaseViewIdForCustomContext,
  getCustomViewKind,
  getDateFilterOperator,
  getInitials,
  getIssueTypeIcon,
  getMostCommonLead,
  getPriorityRank,
  getProjectDateValue,
  getProjectGroupingLabel,
  getProjectGroupingRank,
  getProjectHealth,
  getRelativeTimeLabel,
  getStatusRank,
  getTeamSectionLabel,
  getTicketDateValue,
  getTimeValue,
  getViewsDirectoryTabFromViewId,
  isEpicIssue,
  isEpicIssueType,
  isInitiativeIssue,
  isInitiativeIssueType,
  isRecentlyUpdated,
  isSubIssueTicket,
  normalizeFilterValue,
} from '@/features/ticket-list/helpers'
import {
  dateFilterFields,
  filterMenuEntries,
  projectPropertyFilterFields,
} from '@/features/ticket-list/options'

function makeTicket(overrides: Partial<JiraTicket> = {}): JiraTicket {
  return {
    key: 'ISS-1',
    summary: 'Test ticket',
    status: 'To Do',
    statusCategory: 'new',
    inCurrentSprint: false,
    priority: 'Medium',
    issueType: 'Task',
    labels: [],
    spaceKey: 'ISS',
    spaceName: 'Issues',
    assignee: 'Unassigned',
    self: 'https://example.test/ISS-1',
    ...overrides,
  }
}

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    key: 'PROJ-1',
    name: 'Project One',
    spaceKey: 'PROJ',
    spaceName: 'Projects',
    health: 'On track',
    priority: 'Medium',
    lead: 'Alice',
    targetDate: 'Jun 1',
    issueCount: 10,
    completedCount: 5,
    progress: 50,
    status: 'In progress',
    ...overrides,
  }
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

function makeCustomViewFilter(overrides: Partial<CustomViewFilter> = {}): CustomViewFilter {
  return {
    id: 'filter-1',
    fieldId: 'status',
    fieldLabel: 'Status',
    value: 'done',
    valueLabel: 'Done',
    ...overrides,
  }
}

describe('view id grammar (team:<key>:<section>)', () => {
  describe('getBaseViewIdForCustomContext', () => {
    it('maps a plain team id (no section) to the "all" section', () => {
      expect(getBaseViewIdForCustomContext('team:eng')).toBe('team:eng:all')
    })

    it('preserves the projects section', () => {
      expect(getBaseViewIdForCustomContext('team:eng:projects')).toBe('team:eng:projects')
    })

    it('collapses every non-projects section to "all"', () => {
      expect(getBaseViewIdForCustomContext('team:eng:issues')).toBe('team:eng:all')
      expect(getBaseViewIdForCustomContext('team:eng:views')).toBe('team:eng:all')
      expect(getBaseViewIdForCustomContext('team:eng:whatever')).toBe('team:eng:all')
    })

    it('returns non-team context keys unchanged', () => {
      expect(getBaseViewIdForCustomContext('my-issues')).toBe('my-issues')
      expect(getBaseViewIdForCustomContext('projects')).toBe('projects')
      expect(getBaseViewIdForCustomContext('user:eng:projects')).toBe('user:eng:projects')
    })

    it('returns malformed team ids unchanged when the key is empty or missing', () => {
      expect(getBaseViewIdForCustomContext('team')).toBe('team')
      expect(getBaseViewIdForCustomContext('team:')).toBe('team:')
      expect(getBaseViewIdForCustomContext('team::projects')).toBe('team::projects')
    })

    it('only looks at the third segment when there are extra colons', () => {
      expect(getBaseViewIdForCustomContext('team:eng:projects:extra')).toBe('team:eng:projects')
      expect(getBaseViewIdForCustomContext('team:eng:extra:projects')).toBe('team:eng:all')
    })
  })

  describe('getViewsDirectoryTabFromViewId', () => {
    it('passes through the bare directory ids', () => {
      expect(getViewsDirectoryTabFromViewId('views')).toBe('views')
      expect(getViewsDirectoryTabFromViewId('project-views')).toBe('project-views')
    })

    it('extracts the tab from team-scoped view ids', () => {
      expect(getViewsDirectoryTabFromViewId('team:eng:views')).toBe('views')
      expect(getViewsDirectoryTabFromViewId('team:eng:project-views')).toBe('project-views')
    })

    it('returns null for other sections, scopes, and malformed ids', () => {
      expect(getViewsDirectoryTabFromViewId('team:eng:all')).toBeNull()
      expect(getViewsDirectoryTabFromViewId('team:eng')).toBeNull()
      expect(getViewsDirectoryTabFromViewId('team:views')).toBeNull()
      expect(getViewsDirectoryTabFromViewId('other:eng:views')).toBeNull()
      expect(getViewsDirectoryTabFromViewId('my-issues')).toBeNull()
    })

    it('quirk: does not validate the team key, so an empty key still yields a tab', () => {
      expect(getViewsDirectoryTabFromViewId('team::views')).toBe('views')
    })

    it('ignores extra trailing segments beyond the third', () => {
      expect(getViewsDirectoryTabFromViewId('team:eng:views:extra')).toBe('views')
    })
  })

  describe('getCustomViewKind', () => {
    it('maps the two special non-team context keys', () => {
      expect(getCustomViewKind('my-issues')).toBe('issues')
      expect(getCustomViewKind('projects')).toBe('projects')
    })

    it('maps team issues/projects sections and rejects everything else', () => {
      expect(getCustomViewKind('team:eng:issues')).toBe('issues')
      expect(getCustomViewKind('team:eng:projects')).toBe('projects')
      expect(getCustomViewKind('team:eng:all')).toBeNull()
      expect(getCustomViewKind('team:eng')).toBeNull()
      expect(getCustomViewKind('other:eng:issues')).toBeNull()
      expect(getCustomViewKind('random-key')).toBeNull()
    })

    it('quirk: does not validate the team key either', () => {
      expect(getCustomViewKind('team::issues')).toBe('issues')
    })
  })
})

describe('filterDisplay', () => {
  const allFieldIds = [
    'status',
    'assignee',
    'reporter',
    'priority',
    'labels',
    'suggestedLabel',
    'dueDate',
    'createdDate',
    'updatedDate',
    'completedDate',
    'project',
    'team',
    'sprint',
    'projectStatus',
    'projectPriority',
    'projectLead',
    'initiative',
    'subscribers',
    'shared',
    'sharedWith',
    'externalSource',
  ] as const

  describe('normalizeFilterFieldId', () => {
    it('returns every known field id unchanged, including team', () => {
      for (const fieldId of allFieldIds) {
        expect(normalizeFilterFieldId(fieldId)).toBe(fieldId)
      }
    })

    it('returns null for unknown values and is case-sensitive', () => {
      expect(normalizeFilterFieldId('bogus')).toBeNull()
      expect(normalizeFilterFieldId('Team')).toBeNull()
      expect(normalizeFilterFieldId('STATUS')).toBeNull()
      expect(normalizeFilterFieldId('')).toBeNull()
      expect(normalizeFilterFieldId('dates')).toBeNull()
    })
  })

  describe('isFilterFieldId', () => {
    it('mirrors normalizeFilterFieldId', () => {
      expect(isFilterFieldId('team')).toBe(true)
      expect(isFilterFieldId('externalSource')).toBe(true)
      expect(isFilterFieldId('bogus')).toBe(false)
      expect(isFilterFieldId('')).toBe(false)
    })
  })

  describe('getFilterFieldLabel', () => {
    it('returns the human label for each mapped field', () => {
      expect(getFilterFieldLabel('status')).toBe('Status')
      expect(getFilterFieldLabel('assignee')).toBe('Assignee')
      expect(getFilterFieldLabel('reporter')).toBe('Creator')
      expect(getFilterFieldLabel('priority')).toBe('Priority')
      expect(getFilterFieldLabel('labels')).toBe('Labels')
      expect(getFilterFieldLabel('suggestedLabel')).toBe('Suggested label')
      expect(getFilterFieldLabel('dueDate')).toBe('Due date')
      expect(getFilterFieldLabel('createdDate')).toBe('Created date')
      expect(getFilterFieldLabel('updatedDate')).toBe('Updated date')
      expect(getFilterFieldLabel('completedDate')).toBe('Completed date')
      expect(getFilterFieldLabel('project')).toBe('Project')
      expect(getFilterFieldLabel('projectStatus')).toBe('Project status')
      expect(getFilterFieldLabel('projectPriority')).toBe('Project priority')
      expect(getFilterFieldLabel('projectLead')).toBe('Project lead')
      expect(getFilterFieldLabel('initiative')).toBe('Initiative')
      expect(getFilterFieldLabel('subscribers')).toBe('Subscribers')
      expect(getFilterFieldLabel('shared')).toBe('Shared')
      expect(getFilterFieldLabel('sharedWith')).toBe('Shared with')
      expect(getFilterFieldLabel('externalSource')).toBe('External source')
    })

    it('labels "team" as Team', () => {
      expect(getFilterFieldLabel('team')).toBe('Team')
    })
  })

  describe('customViewFiltersToClauses', () => {
    it('converts valid filters and preserves all fields', () => {
      const filter = makeCustomViewFilter({
        id: 'f1',
        fieldId: 'team',
        fieldLabel: 'Team label from storage',
        value: 'team-1',
        valueLabel: 'Engineering',
      })
      expect(customViewFiltersToClauses([filter])).toEqual([
        {
          id: 'f1',
          fieldId: 'team',
          fieldLabel: 'Team label from storage',
          value: 'team-1',
          valueLabel: 'Engineering',
        },
      ])
    })

    it('silently drops filters with unknown field ids', () => {
      const filters = [
        makeCustomViewFilter({ id: 'good', fieldId: 'status' }),
        makeCustomViewFilter({ id: 'bad', fieldId: 'not-a-field' }),
      ]
      const clauses = customViewFiltersToClauses(filters)
      expect(clauses).toHaveLength(1)
      expect(clauses[0]?.id).toBe('good')
    })
  })

  describe('clausesToCustomViewFilters', () => {
    it('maps 1:1 with no filtering', () => {
      const clause = makeClause({ fieldId: 'assignee', value: 'user-1', valueLabel: 'Alice' })
      expect(clausesToCustomViewFilters([clause])).toEqual([
        {
          id: 'clause-1',
          fieldId: 'assignee',
          fieldLabel: 'Status',
          value: 'user-1',
          valueLabel: 'Alice',
        },
      ])
    })
  })

  describe('clause <-> filter round-trips', () => {
    it('clauses -> filters -> clauses is lossless', () => {
      const clauses = [
        makeClause({ id: 'a', fieldId: 'status', value: 'done' }),
        makeClause({ id: 'b', fieldId: 'team', value: 'team-1' }),
      ]
      expect(customViewFiltersToClauses(clausesToCustomViewFilters(clauses))).toEqual(clauses)
    })

    it('filters -> clauses -> filters drops entries with unknown field ids (asymmetric)', () => {
      const filters = [
        makeCustomViewFilter({ id: 'keep', fieldId: 'priority' }),
        makeCustomViewFilter({ id: 'drop', fieldId: 'legacyField' }),
      ]
      const roundTripped = clausesToCustomViewFilters(customViewFiltersToClauses(filters))
      expect(roundTripped).toEqual([filters[0]])
    })
  })

  describe('createViewFilterClause', () => {
    it('builds the default:<fieldId>:<value> id and derives the field label', () => {
      expect(createViewFilterClause('status', 'done', 'Done')).toEqual({
        id: 'default:status:done',
        fieldId: 'status',
        fieldLabel: 'Status',
        value: 'done',
        valueLabel: 'Done',
      })
    })

    it('team clauses get the Team field label', () => {
      expect(createViewFilterClause('team', 'team-1', 'Engineering')).toEqual({
        id: 'default:team:team-1',
        fieldId: 'team',
        fieldLabel: 'Team',
        value: 'team-1',
        valueLabel: 'Engineering',
      })
    })

    it('does not escape colons in values, so ids can be ambiguous', () => {
      expect(createViewFilterClause('status', 'a:b', 'A:B').id).toBe('default:status:a:b')
    })
  })
})

describe('options entries used for filtering', () => {
  it('every dateFilterFields and projectPropertyFilterFields id is a valid FilterFieldId', () => {
    for (const field of [...dateFilterFields, ...projectPropertyFilterFields]) {
      expect(isFilterFieldId(field.id)).toBe(true)
    }
  })

  it('filterMenuEntries mixes real field ids with menu-only ids (dates, projectProperties)', () => {
    const menuIds = filterMenuEntries.map(entry => entry.id)
    expect(menuIds).toContain('team')
    expect(menuIds).toContain('dates')
    expect(menuIds).toContain('projectProperties')
    expect(isFilterFieldId('dates')).toBe(false)
    expect(isFilterFieldId('projectProperties')).toBe(false)
  })
})

describe('date/time helpers', () => {
  // Fixed "now": 2026-06-15 12:00 local time.
  const NOW = new Date(2026, 5, 15, 12, 0, 0)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getTimeValue', () => {
    it('returns 0 for missing or unparseable values', () => {
      expect(getTimeValue(undefined)).toBe(0)
      expect(getTimeValue(null)).toBe(0)
      expect(getTimeValue('')).toBe(0)
      expect(getTimeValue('not a date')).toBe(0)
    })

    it('returns the epoch millis for parseable values', () => {
      expect(getTimeValue('2026-06-15T00:00:00.000Z')).toBe(Date.parse('2026-06-15T00:00:00.000Z'))
    })

    it('quirk: the exact epoch instant is indistinguishable from "no date"', () => {
      expect(getTimeValue('1970-01-01T00:00:00.000Z')).toBe(0)
    })
  })

  describe('formatCompactDate', () => {
    it('returns "No target" for missing or invalid values', () => {
      expect(formatCompactDate(undefined)).toBe('No target')
      expect(formatCompactDate(null)).toBe('No target')
      expect(formatCompactDate('')).toBe('No target')
      expect(formatCompactDate('garbage')).toBe('No target')
    })

    it('formats valid dates with short month + numeric day in the runtime locale', () => {
      const value = '2026-03-05T10:00:00'
      const expected = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(new Date(value))
      expect(formatCompactDate(value)).toBe(expected)
    })
  })

  describe('getRelativeTimeLabel', () => {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    it('returns "No date" for missing or invalid values', () => {
      expect(getRelativeTimeLabel(undefined)).toBe('No date')
      expect(getRelativeTimeLabel(null)).toBe('No date')
      expect(getRelativeTimeLabel('')).toBe('No date')
      expect(getRelativeTimeLabel('garbage')).toBe('No date')
    })

    it('uses minutes below one hour', () => {
      const value = new Date(NOW.getTime() - 30 * minute).toISOString()
      expect(getRelativeTimeLabel(value)).toBe(rtf.format(-30, 'minute'))
    })

    it('switches to hours at exactly one hour', () => {
      const value = new Date(NOW.getTime() + 60 * minute).toISOString()
      expect(getRelativeTimeLabel(value)).toBe(rtf.format(1, 'hour'))
    })

    it('quirk: 90 minutes ago rounds to -1 hour (Math.round rounds -1.5 toward zero/up)', () => {
      const value = new Date(NOW.getTime() - 90 * minute).toISOString()
      expect(getRelativeTimeLabel(value)).toBe(rtf.format(-1, 'hour'))
    })

    it('uses days at one day and beyond', () => {
      const future = new Date(NOW.getTime() + 3 * day).toISOString()
      const past = new Date(NOW.getTime() - 2 * day).toISOString()
      expect(getRelativeTimeLabel(future)).toBe(rtf.format(3, 'day'))
      expect(getRelativeTimeLabel(past)).toBe(rtf.format(-2, 'day'))
    })
  })

  describe('isRecentlyUpdated', () => {
    it('is true strictly within the last 7 days, false at exactly 7 days', () => {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      expect(isRecentlyUpdated(new Date(NOW.getTime() - sevenDays + 1).toISOString())).toBe(true)
      expect(isRecentlyUpdated(new Date(NOW.getTime() - sevenDays).toISOString())).toBe(false)
    })

    it('quirk: future timestamps count as recently updated', () => {
      expect(isRecentlyUpdated(new Date(NOW.getTime() + 60_000).toISOString())).toBe(true)
    })

    it('is false for missing or invalid values', () => {
      expect(isRecentlyUpdated(undefined)).toBe(false)
      expect(isRecentlyUpdated(null)).toBe(false)
      expect(isRecentlyUpdated('')).toBe(false)
      expect(isRecentlyUpdated('garbage')).toBe(false)
    })
  })

  describe('dateMatchesOperator', () => {
    function localIso(year: number, month: number, dayOfMonth: number, hours = 12): string {
      return new Date(year, month, dayOfMonth, hours).toISOString()
    }

    it('hasDate / noDate hinge on getTimeValue being non-zero', () => {
      expect(dateMatchesOperator(localIso(2026, 5, 15), 'hasDate')).toBe(true)
      expect(dateMatchesOperator(undefined, 'hasDate')).toBe(false)
      expect(dateMatchesOperator('garbage', 'hasDate')).toBe(false)
      expect(dateMatchesOperator(undefined, 'noDate')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 5, 15), 'noDate')).toBe(false)
    })

    it('quirk: the epoch instant itself counts as "no date"', () => {
      expect(dateMatchesOperator('1970-01-01T00:00:00.000Z', 'hasDate')).toBe(false)
      expect(dateMatchesOperator('1970-01-01T00:00:00.000Z', 'noDate')).toBe(true)
    })

    it('past means strictly before the local start of today', () => {
      expect(dateMatchesOperator(localIso(2026, 5, 14), 'past')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 5, 15, 0), 'past')).toBe(false)
      expect(dateMatchesOperator('garbage', 'past')).toBe(false)
    })

    it('today spans the local calendar day only', () => {
      expect(dateMatchesOperator(localIso(2026, 5, 15, 0), 'today')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 5, 15, 23), 'today')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 5, 16, 0), 'today')).toBe(false)
      expect(dateMatchesOperator(localIso(2026, 5, 14), 'today')).toBe(false)
    })

    it('next7 includes today through day 6, excludes day 7 and the past', () => {
      expect(dateMatchesOperator(localIso(2026, 5, 15), 'next7')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 5, 21, 23), 'next7')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 5, 22, 0), 'next7')).toBe(false)
      expect(dateMatchesOperator(localIso(2026, 5, 14), 'next7')).toBe(false)
    })

    it('next30 includes today through day 29, excludes day 30', () => {
      expect(dateMatchesOperator(localIso(2026, 6, 14, 23), 'next30')).toBe(true)
      expect(dateMatchesOperator(localIso(2026, 6, 15, 0), 'next30')).toBe(false)
    })
  })

  describe('compareOptionalDates', () => {
    it('sorts dated values ascending and undated values last', () => {
      expect(compareOptionalDates('2026-01-01', '2026-01-02')).toBeLessThan(0)
      expect(compareOptionalDates('2026-01-02', '2026-01-01')).toBeGreaterThan(0)
      expect(compareOptionalDates('2026-01-01', '2026-01-01')).toBe(0)
      expect(compareOptionalDates(undefined, '2026-01-01')).toBe(1)
      expect(compareOptionalDates('2026-01-01', undefined)).toBe(-1)
      expect(compareOptionalDates(undefined, undefined)).toBe(0)
    })

    it('treats unparseable strings as undated', () => {
      expect(compareOptionalDates('garbage', '2026-01-01')).toBe(1)
      expect(compareOptionalDates('garbage', 'also garbage')).toBe(0)
    })
  })

  describe('getDateFilterOperator', () => {
    it('passes known operators through and defaults everything else to hasDate', () => {
      expect(getDateFilterOperator('noDate')).toBe('noDate')
      expect(getDateFilterOperator('past')).toBe('past')
      expect(getDateFilterOperator('today')).toBe('today')
      expect(getDateFilterOperator('next7')).toBe('next7')
      expect(getDateFilterOperator('next30')).toBe('next30')
      expect(getDateFilterOperator('hasDate')).toBe('hasDate')
      expect(getDateFilterOperator('anything else')).toBe('hasDate')
      expect(getDateFilterOperator('')).toBe('hasDate')
    })
  })
})

describe('epic / initiative / sub-issue detection', () => {
  it('isEpicIssueType is a case-insensitive substring match on "epic"', () => {
    expect(isEpicIssueType('Epic')).toBe(true)
    expect(isEpicIssueType('epic')).toBe(true)
    expect(isEpicIssueType('Sub-Epic')).toBe(true)
    expect(isEpicIssueType('EPIC-LIKE')).toBe(true)
    expect(isEpicIssueType('Story')).toBe(false)
    expect(isEpicIssueType('')).toBe(false)
  })

  it('isEpicIssue delegates to the ticket issueType', () => {
    expect(isEpicIssue(makeTicket({ issueType: 'Epic' }))).toBe(true)
    expect(isEpicIssue(makeTicket({ issueType: 'Task' }))).toBe(false)
  })

  it('isInitiativeIssueType is a case-insensitive substring match on "initiative"', () => {
    expect(isInitiativeIssueType('Initiative')).toBe(true)
    expect(isInitiativeIssueType('sub-initiative')).toBe(true)
    expect(isInitiativeIssueType('Epic')).toBe(false)
    expect(isInitiativeIssue(makeTicket({ issueType: 'Initiative' }))).toBe(true)
  })

  it('isSubIssueTicket: true only when the parent exists and is not epic-ish', () => {
    const withStoryParent = makeTicket({
      parent: { key: 'ISS-9', summary: 'Parent', issueType: ' Story ' },
    })
    const withEpicParent = makeTicket({
      parent: { key: 'ISS-9', summary: 'Parent', issueType: 'Epic' },
    })
    const withBlankParentType = makeTicket({
      parent: { key: 'ISS-9', summary: 'Parent', issueType: '   ' },
    })
    expect(isSubIssueTicket(withStoryParent)).toBe(true)
    expect(isSubIssueTicket(withEpicParent)).toBe(false)
    expect(isSubIssueTicket(withBlankParentType)).toBe(false)
    expect(isSubIssueTicket(makeTicket())).toBe(false)
  })
})

describe('misc pure helpers', () => {
  describe('getInitials', () => {
    it('takes the first letter of the first two words', () => {
      expect(getInitials('Ada Lovelace')).toBe('AL')
      expect(getInitials('Ada Byron King')).toBe('AB')
      expect(getInitials('  ada   lovelace  ')).toBe('AL')
    })

    it('takes the first two characters of a single word', () => {
      expect(getInitials('ada')).toBe('AD')
      expect(getInitials('a')).toBe('A')
      expect(getInitials('')).toBe('')
    })

    it('quirk: whitespace-only input returns the raw (whitespace) slice', () => {
      expect(getInitials('  ')).toBe('  ')
    })
  })

  describe('getTeamSectionLabel', () => {
    it('maps known sections; triage and backlog both label as "Backlog"', () => {
      expect(getTeamSectionLabel('triage')).toBe('Backlog')
      expect(getTeamSectionLabel('backlog')).toBe('Backlog')
      expect(getTeamSectionLabel('all')).toBe('All issues')
      expect(getTeamSectionLabel('projects')).toBe('Projects')
      expect(getTeamSectionLabel('views')).toBe('Views')
      expect(getTeamSectionLabel('project-views')).toBe('Views · Projects')
      expect(getTeamSectionLabel('ready-qa')).toBe('Ready for QA')
    })

    it('defaults to "Active" for anything else, including missing values', () => {
      expect(getTeamSectionLabel('active')).toBe('Active')
      expect(getTeamSectionLabel('garbage')).toBe('Active')
      expect(getTeamSectionLabel(undefined)).toBe('Active')
      expect(getTeamSectionLabel(null)).toBe('Active')
    })
  })

  describe('normalizeFilterValue', () => {
    it('trims, lowercases, and maps empty to "none"', () => {
      expect(normalizeFilterValue('  Foo  ')).toBe('foo')
      expect(normalizeFilterValue('BAR')).toBe('bar')
      expect(normalizeFilterValue('   ')).toBe('none')
      expect(normalizeFilterValue('')).toBe('none')
      expect(normalizeFilterValue(undefined)).toBe('none')
      expect(normalizeFilterValue(null)).toBe('none')
    })
  })

  describe('getIssueTypeIcon', () => {
    it('maps Linear subtypes to glyphs; bug wins over story when both match', () => {
      expect(getIssueTypeIcon('Story')).toBe('◇')
      expect(getIssueTypeIcon('Bug')).toBe('◆')
      expect(getIssueTypeIcon('Feature')).toBe('◈')
      expect(getIssueTypeIcon('Task')).toBe('○')
      expect(getIssueTypeIcon('Epic')).toBe('○')
      expect(getIssueTypeIcon('bug story')).toBe('◆')
    })
  })

  describe('getStatusRank', () => {
    it('ranks indeterminate first, then new, then done; unknown counts as indeterminate', () => {
      expect(getStatusRank('indeterminate')).toBe(0)
      expect(getStatusRank('new')).toBe(1)
      expect(getStatusRank('done')).toBe(2)
      expect(getStatusRank('mystery')).toBe(0)
    })
  })

  describe('getPriorityRank', () => {
    it('ranks the five known priorities case/whitespace-insensitively; unknown is 5', () => {
      expect(getPriorityRank('highest')).toBe(0)
      expect(getPriorityRank(' HIGH ')).toBe(1)
      expect(getPriorityRank('Medium')).toBe(2)
      expect(getPriorityRank('low')).toBe(3)
      expect(getPriorityRank('lowest')).toBe(4)
      expect(getPriorityRank('critical')).toBe(5)
      expect(getPriorityRank('')).toBe(5)
    })
  })

  describe('getProjectHealth', () => {
    it('completed by status keyword or 100% progress, before the at-risk checks', () => {
      expect(getProjectHealth('Done', 5)).toBe('Completed')
      expect(getProjectHealth('complete-ish', 0)).toBe('Completed')
      expect(getProjectHealth('In progress', 100)).toBe('Completed')
    })

    it('at risk when blocked or progress under 20', () => {
      expect(getProjectHealth('Blocked', 80)).toBe('At risk')
      expect(getProjectHealth('Healthy', 19)).toBe('At risk')
    })

    it('otherwise on track', () => {
      expect(getProjectHealth('Healthy', 20)).toBe('On track')
      expect(getProjectHealth('In progress', 50)).toBe('On track')
    })
  })

  describe('getMostCommonLead', () => {
    it('returns the most frequent lead, skipping Unassigned, ties broken alphabetically', () => {
      const projects = [
        makeProject({ lead: 'Bob' }),
        makeProject({ lead: 'Bob' }),
        makeProject({ lead: 'Alice' }),
        makeProject({ lead: 'Alice' }),
        makeProject({ lead: 'Unassigned' }),
        makeProject({ lead: 'Unassigned' }),
        makeProject({ lead: 'Unassigned' }),
      ]
      expect(getMostCommonLead(projects)).toBe('Alice')
      expect(getMostCommonLead([])).toBe('Unassigned')
      expect(getMostCommonLead([makeProject({ lead: 'Unassigned' })])).toBe('Unassigned')
    })
  })

  describe('buildInsightSlices', () => {
    it('counts labels, sorts by count desc then label asc, and rounds percents', () => {
      const tickets = [
        makeTicket({ assignee: 'Bob' }),
        makeTicket({ assignee: 'Bob' }),
        makeTicket({ assignee: 'Bob' }),
        makeTicket({ assignee: 'Alice' }),
        makeTicket({ assignee: 'Alice' }),
        makeTicket({ assignee: 'Alice' }),
        makeTicket({ assignee: '   ' }),
      ]
      expect(buildInsightSlices(tickets, ticket => ticket.assignee)).toEqual([
        { id: 'Alice', label: 'Alice', count: 3, percent: 43 },
        { id: 'Bob', label: 'Bob', count: 3, percent: 43 },
        { id: 'None', label: 'None', count: 1, percent: 14 },
      ])
    })

    it('applies the limit after sorting and returns [] for no tickets', () => {
      const tickets = [
        makeTicket({ assignee: 'A' }),
        makeTicket({ assignee: 'B' }),
        makeTicket({ assignee: 'B' }),
        makeTicket({ assignee: 'C' }),
      ]
      const slices = buildInsightSlices(tickets, ticket => ticket.assignee, 2)
      expect(slices.map(slice => slice.label)).toEqual(['B', 'A'])
      expect(buildInsightSlices([], ticket => ticket.assignee)).toEqual([])
    })
  })

  describe('date value accessors', () => {
    it('getTicketDateValue maps each date field id to the matching ticket field', () => {
      const ticket = makeTicket({
        dueDate: 'due',
        createdAt: 'created',
        updatedAt: 'updated',
        completedAt: 'completed',
      })
      expect(getTicketDateValue(ticket, 'dueDate')).toBe('due')
      expect(getTicketDateValue(ticket, 'createdDate')).toBe('created')
      expect(getTicketDateValue(ticket, 'updatedDate')).toBe('updated')
      expect(getTicketDateValue(ticket, 'completedDate')).toBe('completed')
    })

    it('getProjectDateValue only supports dueDate and updatedDate', () => {
      const project = makeProject({ targetDateValue: 'target', updatedAt: 'updated' })
      expect(getProjectDateValue(project, 'dueDate')).toBe('target')
      expect(getProjectDateValue(project, 'updatedDate')).toBe('updated')
      expect(getProjectDateValue(project, 'createdDate')).toBeUndefined()
      expect(getProjectDateValue(project, 'completedDate')).toBeUndefined()
    })
  })

  describe('project grouping', () => {
    it('getProjectGroupingLabel maps fields with per-field fallbacks', () => {
      const project = makeProject({
        health: 'At risk',
        status: '',
        priority: '',
        lead: '',
      })
      expect(getProjectGroupingLabel(project, 'health')).toBe('At risk')
      expect(getProjectGroupingLabel(project, 'status')).toBe('No status')
      expect(getProjectGroupingLabel(project, 'priority')).toBe('No priority')
      expect(getProjectGroupingLabel(project, 'lead')).toBe('Unassigned')
      expect(getProjectGroupingLabel(project, 'none')).toBe('Projects')
    })

    it('getProjectGroupingRank orders health At risk < On track < Completed', () => {
      expect(getProjectGroupingRank('At risk', 'health')).toBe(0)
      expect(getProjectGroupingRank('On track', 'health')).toBe(1)
      expect(getProjectGroupingRank('Completed', 'health')).toBe(2)
      expect(getProjectGroupingRank('Unknown', 'health')).toBe(0)
    })

    it('getProjectGroupingRank uses priority ranks for priority and 0 otherwise', () => {
      expect(getProjectGroupingRank('Low', 'priority')).toBe(3)
      expect(getProjectGroupingRank('Nonsense', 'priority')).toBe(5)
      expect(getProjectGroupingRank('Anything', 'lead')).toBe(0)
      expect(getProjectGroupingRank('Anything', 'status')).toBe(0)
    })
  })
})
