/**
 * Characterization tests for the shared settings normalizers.
 *
 * These tests lock in the CURRENT behavior of `normalizeAppSettings` and the
 * `settingsNormalizers` primitives, including quirks. They intentionally do
 * not assert what the code "should" do.
 */
import type { AppSettings } from '~/shared/settings'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CUSTOM_VIEW_COLOR,
  DEFAULT_CUSTOM_VIEW_ICON,
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  getDefaultAppSettings,
  normalizeAppSettings,
} from '~/shared/settings'
import {
  normalizeBoolean,
  normalizeSpaceColor,
  normalizeSpaceIcon,
  normalizeSpaceKey,
  normalizeStringList,
  normalizeStringListRecord,
} from '~/shared/settingsNormalizers'

const DEFAULT_ASSISTANT_SYSTEM_PROMPT = [
  'You are the BetterJira assistant, embedded inside the BetterJira desktop app.',
  'You help the user read and manage Jira tickets by running the acli command-line tool.',
  'Use the acli reference below. Prefer acli over guessing; run read commands to ground your answers in live data.',
  'Be concise and conversational. When you change a ticket, state exactly what you changed and include the issue link.',
  'You are running with full permissions and no confirmation prompts, so double-check destructive actions before running them.',
].join('\n')

const LOCAL_SPACE = { key: 'LOCAL', name: 'Local', enabled: true }

const DEFAULT_ISSUE_ROW_FIELDS = ['id', 'status', 'assignee', 'priority', 'project', 'due', 'labels', 'created']
const DEFAULT_PROJECT_ROW_FIELDS = ['health', 'priority', 'lead', 'targetDate', 'issues', 'status']
const DEFAULT_INITIATIVE_ROW_FIELDS = ['health', 'lead', 'projects', 'issues', 'updated']

function expectedDefaults(): AppSettings {
  return {
    spaces: [],
    filterSpaceKeys: [],
    sidebar: {
      pinnedTicketKeys: [],
      favoriteViews: [],
      customViews: [],
      viewOverrides: {},
      filterTypeKeys: [],
      filterStatuses: [],
      filterAssignees: [],
      showCompletedTickets: false,
      ticketScope: 'all',
      sortBy: 'key',
      groupBy: 'hierarchy',
      sortReversed: false,
    },
    jira: {
      baseUrl: '',
      email: '',
      hasApiToken: false,
    },
    ai: {
      hasCerebrasApiKey: false,
      provider: 'cerebras',
      model: 'llama3.1-8b',
    },
    assistant: {
      provider: 'claude',
      model: 'sonnet',
      reasoning: 'medium',
      systemPrompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
    },
    assistantSkills: [],
    labelColors: {},
    projectAppearances: {},
    statusPreferences: {
      colors: {},
      order: [],
    },
  }
}

describe('getDefaultAppSettings', () => {
  it('returns the exact default fallback values', () => {
    expect(getDefaultAppSettings()).toEqual(expectedDefaults())
  })
})

describe('normalizeAppSettings round-trip', () => {
  it('normalizing the defaults injects the LOCAL space (not a no-op)', () => {
    const once = normalizeAppSettings(getDefaultAppSettings())

    expect(once).toEqual({
      ...expectedDefaults(),
      spaces: [LOCAL_SPACE],
    })
  })

  it('is idempotent: normalize(normalize(x)) deep-equals normalize(x)', () => {
    const inputs: unknown[] = [
      getDefaultAppSettings(),
      {},
      {
        spaces: [{ key: ' abc ', name: ' My Space ', icon: ' Rocket ', color: ' #AABBCC ' }],
        filterSpaceKeys: ['abc'],
        sidebar: { sortBy: 'status', customViews: [{ id: 'v', name: 'V', contextKey: 'ck' }] },
        jira: { baseUrl: ' https://x.atlassian.net ', email: ' a@b.c ', apiToken: 'tok' },
        labelColors: { Bug: '#FF0000' },
        statusPreferences: { colors: { Done: '#00FF00' }, order: ['Done', 'done'] },
      },
    ]

    for (const input of inputs) {
      const once = normalizeAppSettings(input)
      expect(normalizeAppSettings(once)).toEqual(once)
    }
  })
})

describe('normalizeAppSettings garbage input', () => {
  it('falls back to the raw defaults (no LOCAL space) for non-object input', () => {
    for (const value of [null, undefined, 'settings', 42, true]) {
      expect(normalizeAppSettings(value)).toEqual(expectedDefaults())
    }
  })

  it('treats arrays as records (isRecord quirk): [] behaves like {} and gains the LOCAL space', () => {
    expect(normalizeAppSettings([])).toEqual(normalizeAppSettings({}))
    expect(normalizeAppSettings([])).toEqual({
      ...expectedDefaults(),
      spaces: [LOCAL_SPACE],
    })
  })

  it('falls back per-field for wrong-typed fields without throwing (array labelColors index-key quirk)', () => {
    const result = normalizeAppSettings({
      spaces: 'nope',
      filterSpaceKeys: {},
      sidebar: 'nah',
      jira: 17,
      ai: false,
      assistant: false,
      assistantSkills: {},
      // Arrays pass isRecord, so entries are keyed by their array index.
      labelColors: ['#ff0000'],
      statusPreferences: 3,
    })

    expect(result).toEqual({
      ...expectedDefaults(),
      spaces: [LOCAL_SPACE],
      labelColors: { 0: '#ff0000' },
    })
  })

  it('drops unknown top-level keys', () => {
    const result = normalizeAppSettings({ bogusKey: 1, another: { nested: true } })

    expect(Object.keys(result).sort()).toEqual([
      'ai',
      'assistant',
      'assistantSkills',
      'filterSpaceKeys',
      'jira',
      'labelColors',
      'projectAppearances',
      'sidebar',
      'spaces',
      'statusPreferences',
    ])
  })
})

describe('normalizeAppSettings space normalization', () => {
  it('normalizes key/icon/color/teamFilter, merges duplicates, appends LOCAL, and sorts by display name', () => {
    const result = normalizeAppSettings({
      spaces: [
        {
          key: ' abc ',
          name: ' My Space ',
          icon: ' Rocket ',
          color: ' #AABBCC ',
          teamFilter: { projectKey: 'abc', teamId: ' t1 ' },
          boardId: '84',
        },
        // Duplicate key: first entry wins on name/icon; enabled is OR-ed.
        { key: 'abc', enabled: false, icon: 'star' },
        // Invalid icon (space) and color (short hex) are dropped entirely.
        { key: 'zed', icon: 'Rock et', color: '#abc' },
        // Non-string key is dropped.
        { key: 42, name: 'Ignored' },
        'garbage',
      ],
    })

    expect(result.spaces).toEqual([
      LOCAL_SPACE,
      {
        key: 'ABC',
        name: 'My Space',
        enabled: true,
        icon: 'rocket',
        color: '#aabbcc',
        teamFilter: { projectKey: 'ABC', teamId: 't1' },
        boardId: 84,
      },
      { key: 'ZED', name: '', enabled: true },
    ])
  })

  it('supports legacy visibleSpaceKeys/hiddenSpaceKeys records', () => {
    const result = normalizeAppSettings({
      visibleSpaceKeys: ['dev'],
      hiddenSpaceKeys: ['ops'],
    })

    expect(result.spaces).toEqual([
      { key: 'DEV', name: 'DEV', enabled: true },
      LOCAL_SPACE,
      { key: 'OPS', name: 'OPS', enabled: false },
    ])
  })

  it('uppercases filterSpaceKeys and drops keys that are not enabled spaces', () => {
    const result = normalizeAppSettings({
      spaces: [
        { key: 'abc' },
        { key: 'off', enabled: false },
      ],
      filterSpaceKeys: [' abc ', 'off', 'zzz', 7],
    })

    expect(result.filterSpaceKeys).toEqual(['ABC'])
  })
})

describe('normalizeAppSettings custom view display', () => {
  it('locks direction values, visibility ranges (incl. legacy boolean), string-list records, and defaults', () => {
    const result = normalizeAppSettings({
      sidebar: {
        customViews: [
          {
            id: ' v1 ',
            name: ' My view ',
            contextKey: 'space:ABC',
            display: {
              groupingDirection: 'desc',
              // Only the exact string 'desc' counts; everything else is 'asc'.
              orderingDirection: 'DESC',
              completedRange: '  7d  ',
              // Blank range string falls through to the legacy boolean.
              showSubIssuesRange: '',
              showSubIssueContext: true,
              issueGroupOrders: {
                ' g1 ': 'solo',
                'g2': ['a', ' a ', ' b ', 3],
                '': ['x'],
                'g3': [],
              },
              hiddenIssueGroupIds: 'nope',
              visibleIssueRowFields: [],
              projectClosedRange: 42,
            },
          },
        ],
      },
    })

    expect(DEFAULT_CUSTOM_VIEW_ICON).toBe('layers')
    expect(DEFAULT_CUSTOM_VIEW_COLOR).toBe('#8f9198')

    expect(result.sidebar.customViews).toEqual([
      {
        id: 'v1',
        name: 'My view',
        description: '',
        contextKey: 'space:ABC',
        icon: 'layers',
        color: '#8f9198',
        filters: [],
        display: {
          grouping: 'none',
          ordering: 'manual',
          groupingDirection: 'desc',
          orderingDirection: 'asc',
          completedRange: '7d',
          showSubIssuesRange: 'all',
          showTriageIssuesRange: 'hidden',
          issueGroupOrders: { g1: ['solo'], g2: ['a', 'b'] },
          hiddenIssueGroupIds: {},
          collapsedIssueSectionIds: [],
          visibleIssueRowFields: DEFAULT_ISSUE_ROW_FIELDS,
          visibleProjectRowFields: DEFAULT_PROJECT_ROW_FIELDS,
          projectGrouping: 'none',
          projectOrdering: 'manual',
          projectClosedRange: 'hidden',
          collapsedProjectSectionIds: [],
          visibleInitiativeRowFields: DEFAULT_INITIATIVE_ROW_FIELDS,
          visibleSavedViewRowFields: ['owner'],
        },
      },
    ])
  })

  it('maps legacy showSubIssueContext=false to hidden', () => {
    const result = normalizeAppSettings({
      sidebar: {
        customViews: [
          {
            id: 'v2',
            name: 'V2',
            contextKey: 'ck',
            display: { showSubIssuesRange: '   ', showSubIssueContext: false },
          },
        ],
      },
    })

    expect(result.sidebar.customViews[0]?.display.showSubIssuesRange).toBe('hidden')
  })

  it('drops custom views missing id/name/contextKey and duplicate ids (first wins)', () => {
    const result = normalizeAppSettings({
      sidebar: {
        customViews: [
          { id: 'a', name: 'A', contextKey: 'ck' },
          { id: 'a', name: 'Duplicate', contextKey: 'ck' },
          { id: '', name: 'NoId', contextKey: 'ck' },
          { id: 'b', name: '', contextKey: 'ck' },
          { id: 'c', name: 'C' },
          'garbage',
        ],
      },
    })

    expect(result.sidebar.customViews.map(view => ({ id: view.id, name: view.name }))).toEqual([
      { id: 'a', name: 'A' },
    ])
  })
})

describe('normalizeAppSettings label/status colors', () => {
  it('lowercases keys, keeps only full lowercase hex colors, and dedupes status order', () => {
    const result = normalizeAppSettings({
      labelColors: {
        'Bug': '#FF0000',
        ' Feature ': ' #00ff00 ',
        'nope': 'red',
        '': '#0000ff',
      },
      statusPreferences: {
        colors: { ' Done ': '#AABBCC', 'bad': '#ab' },
        order: ['Done', ' done ', '', 42, 'To Do'],
      },
    })

    expect(result.labelColors).toEqual({ bug: '#ff0000', feature: '#00ff00' })
    expect(result.statusPreferences).toEqual({
      colors: { done: '#aabbcc' },
      order: ['done', 'to do'],
    })
  })
})

describe('normalizeAppSettings project appearances', () => {
  it('uppercases issue keys and falls back per-field for invalid icon/color values', () => {
    const result = normalizeAppSettings({
      projectAppearances: {
        ' abc-12 ': { icon: ' Flame ', color: ' #AABBCC ' },
        'DEF-3': { icon: 'not a lucide name', color: 'red' },
        'GHI-4': {},
        '': { icon: 'flame' },
        'JKL-5': 'nope',
      },
    })

    expect(result.projectAppearances).toEqual({
      'ABC-12': { icon: 'flame', color: '#aabbcc' },
      'DEF-3': { icon: DEFAULT_PROJECT_ICON, color: DEFAULT_PROJECT_COLOR },
      'GHI-4': { icon: DEFAULT_PROJECT_ICON, color: DEFAULT_PROJECT_COLOR },
    })
  })

  it('drops non-record project appearance maps', () => {
    expect(normalizeAppSettings({ projectAppearances: 'nope' }).projectAppearances).toEqual({})
  })
})

describe('settingsNormalizers primitives', () => {
  it('normalizeBoolean only accepts actual booleans, otherwise the fallback', () => {
    expect(normalizeBoolean(true, false)).toBe(true)
    expect(normalizeBoolean(false, true)).toBe(false)
    expect(normalizeBoolean('true', false)).toBe(false)
    expect(normalizeBoolean(1, true)).toBe(true)
    expect(normalizeBoolean(undefined, true)).toBe(true)
  })

  it('normalizeStringList wraps single strings, trims, dedupes, drops non-strings', () => {
    expect(normalizeStringList('solo')).toEqual(['solo'])
    expect(normalizeStringList('  ')).toEqual([])
    expect(normalizeStringList(['a', ' a ', 'b', 2, ''])).toEqual(['a', 'b'])
    expect(normalizeStringList({})).toEqual([])
    expect(normalizeStringList(null)).toEqual([])
  })

  it('normalizeStringListRecord trims keys and drops empty keys/lists', () => {
    expect(normalizeStringListRecord({ ' k ': ['v'], 'empty': '', '': ['x'], 'single': 'one' }))
      .toEqual({ k: ['v'], single: ['one'] })
    expect(normalizeStringListRecord('nope')).toEqual({})
  })

  it('normalizeSpaceKey trims + uppercases, returns null for blank or non-string', () => {
    expect(normalizeSpaceKey(' dev ')).toBe('DEV')
    expect(normalizeSpaceKey('')).toBeNull()
    expect(normalizeSpaceKey('   ')).toBeNull()
    expect(normalizeSpaceKey(42)).toBeNull()
  })

  it('normalizeSpaceIcon accepts only lowercase kebab tokens after trim/lowercase', () => {
    expect(normalizeSpaceIcon(' Rocket-2 ')).toBe('rocket-2')
    expect(normalizeSpaceIcon('two words')).toBeUndefined()
    expect(normalizeSpaceIcon('')).toBeUndefined()
    expect(normalizeSpaceIcon(7)).toBeUndefined()
  })

  it('normalizeSpaceColor accepts only 6-digit hex after trim/lowercase', () => {
    expect(normalizeSpaceColor(' #AABBCC ')).toBe('#aabbcc')
    expect(normalizeSpaceColor('#abc')).toBeUndefined()
    expect(normalizeSpaceColor('red')).toBeUndefined()
    expect(normalizeSpaceColor(null)).toBeUndefined()
  })
})
