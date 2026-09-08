import type { JiraTeamRef } from '@/types/jira'
import type { AppSpaceTeamFilter } from '~/shared/settings'
import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { computed, defineComponent, ref, Teleport, Transition, watch } from 'vue'
import { fetchAvailableTeams } from '@/api/settings'
import { useAvailableSpaces } from '@/composables/useAvailableSpaces'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { colors } from '@/styles/tokens.stylex'
import { buildTeamSpaceKey } from '~/shared/settings'

type ModalMode = 'space' | 'team'

const styles = stylex.create({
  overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingInline: '0.75rem', paddingBlock: '12vh', backdropFilter: 'blur(4px)' },
  panel: { width: '100%', maxWidth: '34rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: colors['--color-surface-1'], boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  title: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-100'] },
  subtitle: { marginTop: '0.125rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  closeButton: { display: 'inline-flex', height: '1.75rem', width: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.08)' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.04)' }, fontSize: '0.875rem', lineHeight: '1.25rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'background-color, border-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  closeIcon: { height: '0.875rem', width: '0.875rem' },
  body: { display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingInline: '1rem', paddingBlock: '1rem' },
  tabs: { display: 'inline-flex', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.125rem', fontSize: '0.75rem', lineHeight: '1rem' },
  tab: { borderRadius: '0.25rem', paddingInline: '0.625rem', paddingBlock: '0.25rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  activeTab: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: colors['--color-slate-100'] },
  selectedProject: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-400'] },
  projectBadge: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.04)', paddingInline: '0.5rem', paddingBlock: '0.25rem', color: colors['--color-slate-200'] },
  linkButton: { color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] }, textDecorationLine: 'underline', textDecorationColor: 'rgba(255, 255, 255, 0.2)', textUnderlineOffset: '2px', transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  label: { display: 'block' },
  searchLabel: { marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-500'] },
  input: { 'width': '100%', 'borderRadius': '0.375rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.06)', ':focus': 'rgba(255, 255, 255, 0.16)' }, 'backgroundColor': { 'default': 'rgba(255, 255, 255, 0.04)', ':focus': 'rgba(255, 255, 255, 0.06)' }, 'paddingInline': '0.75rem', 'paddingBlock': '0.5rem', 'fontSize': '0.875rem', 'lineHeight': '1.25rem', 'color': colors['--color-slate-200'], 'outlineStyle': 'none', 'transitionProperty': 'background-color, border-color', 'transitionDuration': '150ms', 'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)', '::placeholder': { color: colors['--color-slate-500'] } },
  notice: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem' },
  amberNotice: { borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.08)', color: colors['--color-amber-200'] },
  loadingNotice: { borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', color: colors['--color-slate-500'] },
  errorNotice: { borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: colors['--color-rose-300'] },
  list: { maxHeight: '22rem', overflowY: 'auto', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  row: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.05)', paddingInline: '0.75rem', paddingBlock: '0.75rem', textAlign: 'left', transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.04)', ':disabled:hover': 'transparent' }, cursor: { ':disabled': 'default' } },
  lastRow: { borderBottomWidth: 0 },
  rowText: { minWidth: 0 },
  rowTitle: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  rowMeta: { marginTop: '0.125rem', display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: colors['--color-slate-500'] },
  added: { display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-emerald-400'] },
  checkIcon: { height: '0.875rem', width: '0.875rem' },
  rowAction: { flexShrink: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  emptyList: { paddingInline: '0.75rem', paddingBlock: '1.5rem', textAlign: 'center', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  feedback: { fontSize: '0.75rem', lineHeight: '1rem' },
  successFeedback: { color: colors['--color-slate-400'] },
  errorFeedback: { color: colors['--color-rose-300'] },
})

export default defineComponent({
  name: 'AddSpaceModal',
  props: {
    open: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    close: () => true,
  },
  setup(props, { emit }) {
    const {
      enabledSpaces,
      hasJiraCredentialsConfigured,
      isSaving,
      addOrEnableSpace,
    } = useSpaceSettings()
    const {
      availableSpaces,
      errorMessage,
      isLoading,
      ensureAvailableSpacesLoaded,
    } = useAvailableSpaces(hasJiraCredentialsConfigured)

    const mode = ref<ModalMode>('space')
    const searchQuery = ref('')
    const feedback = ref<{ kind: 'success' | 'error', message: string } | null>(null)
    const addingSpaceKey = ref<string | null>(null)
    const teamProject = ref<{ key: string, name: string } | null>(null)

    const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
    const enabledSpaceKeys = computed(() => new Set(enabledSpaces.value.map(space => space.key)))
    const searchedSpaces = computed(() => availableSpaces.value
      .filter((space) => {
        const query = normalizedSearchQuery.value
        if (!query) {
          return true
        }

        return space.name.toLowerCase().includes(query) || space.key.toLowerCase().includes(query)
      })
      .slice(0, 40))
    const visibleSpaces = searchedSpaces

    function isSpaceAdded(space: { key: string }): boolean {
      return enabledSpaceKeys.value.has(space.key)
    }

    const showTeamList = computed(() => mode.value === 'team' && teamProject.value !== null)

    const debouncedTeamSearchQuery = refDebounced(computed(() => searchQuery.value.trim()), 250)
    const teamsQuery = useQuery({
      queryKey: computed(() => ['jira-teams', debouncedTeamSearchQuery.value] as const),
      queryFn: () => fetchAvailableTeams(debouncedTeamSearchQuery.value || undefined),
      enabled: computed(() => props.open && showTeamList.value && hasJiraCredentialsConfigured.value),
      staleTime: 5 * 60_000,
    })
    const visibleTeams = computed(() => teamsQuery.data.value ?? [])
    const teamsErrorMessage = computed(() => {
      const error = teamsQuery.error.value
      return error instanceof Error ? error.message : null
    })

    const searchLabel = computed(() => (showTeamList.value ? 'Search Jira teams' : 'Search Jira spaces'))
    const searchPlaceholder = computed(() => (showTeamList.value ? 'Search by team name' : 'Search by space name or key'))

    watch(() => props.open, (open) => {
      if (!open) {
        mode.value = 'space'
        searchQuery.value = ''
        feedback.value = null
        addingSpaceKey.value = null
        teamProject.value = null
        return
      }

      void ensureAvailableSpacesLoaded()
    })

    function closeModal(): void {
      emit('close')
    }

    function setMode(nextMode: ModalMode): void {
      if (mode.value === nextMode) {
        return
      }

      mode.value = nextMode
      searchQuery.value = ''
      feedback.value = null
      teamProject.value = null
    }

    function selectTeamProject(space: { key: string, name: string }): void {
      teamProject.value = { key: space.key, name: space.name }
      searchQuery.value = ''
      feedback.value = null
    }

    function clearTeamProject(): void {
      teamProject.value = null
      searchQuery.value = ''
      feedback.value = null
    }

    function getTeamSpaceKey(team: JiraTeamRef): string {
      return teamProject.value ? buildTeamSpaceKey(teamProject.value.key, team.id) : ''
    }

    function isTeamAdded(team: JiraTeamRef): boolean {
      return enabledSpaceKeys.value.has(getTeamSpaceKey(team))
    }

    async function addSpace(space: { key: string, name: string, teamFilter?: AppSpaceTeamFilter }): Promise<void> {
      addingSpaceKey.value = space.key
      feedback.value = null

      try {
        await addOrEnableSpace(space)
        feedback.value = {
          kind: 'success',
          message: `Added ${space.name}.`,
        }
      }
      catch (error) {
        feedback.value = {
          kind: 'error',
          message: error instanceof Error ? error.message : 'Failed to add space.',
        }
      }
      finally {
        addingSpaceKey.value = null
      }
    }

    async function addTeamSpace(team: JiraTeamRef): Promise<void> {
      const project = teamProject.value
      if (!project) {
        return
      }

      await addSpace({
        key: buildTeamSpaceKey(project.key, team.id),
        name: team.name,
        teamFilter: {
          projectKey: project.key,
          teamId: team.id,
        },
      })
    }

    function handleSpaceRowClick(space: { key: string, name: string }): void {
      if (mode.value === 'team') {
        selectTeamProject(space)
        return
      }

      void addSpace(space)
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    function closeOnSelf(event: MouseEvent): void {
      if (event.target === event.currentTarget) {
        closeModal()
      }
    }

    return () => (
      <Teleport to="body">
        <Transition name="fade">
          {props.open && (
            <div {...stylex.attrs(styles.overlay)} onClick={closeOnSelf}>
              <div
                {...stylex.attrs(styles.panel)}
                role="dialog"
                aria-modal="true"
                aria-label="Add space"
                onKeydown={handleKeydown}
              >
                <div {...stylex.attrs(styles.header)}>
                  <div>
                    <p {...stylex.attrs(styles.title)}>Add space</p>
                    <p {...stylex.attrs(styles.subtitle)}>
                      {mode.value === 'team'
                        ? 'Add a space scoped to one Jira team: pick the project, then the team.'
                        : 'Search Jira spaces and add them to your sidebar.'}
                    </p>
                  </div>
                  <button type="button" {...stylex.attrs(styles.closeButton)} aria-label="Close" onClick={closeModal}>
                    <svg {...stylex.attrs(styles.closeIcon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
                    </svg>
                  </button>
                </div>

                <div {...stylex.attrs(styles.body)}>
                  <div {...stylex.attrs(styles.tabs)} role="tablist" aria-label="Space type">
                    <button type="button" role="tab" aria-selected={mode.value === 'space'} {...stylex.attrs(styles.tab, mode.value === 'space' ? styles.activeTab : null)} onClick={() => setMode('space')}>
                      Space
                    </button>
                    <button type="button" role="tab" aria-selected={mode.value === 'team'} {...stylex.attrs(styles.tab, mode.value === 'team' ? styles.activeTab : null)} onClick={() => setMode('team')}>
                      Team space
                    </button>
                  </div>

                  {showTeamList.value && (
                    <div {...stylex.attrs(styles.selectedProject)}>
                      <span {...stylex.attrs(styles.projectBadge)}>
                        {teamProject.value?.name}
                        {' '}
                        (
                        {teamProject.value?.key}
                        )
                      </span>
                      <button type="button" {...stylex.attrs(styles.linkButton)} onClick={clearTeamProject}>
                        Change project
                      </button>
                    </div>
                  )}

                  <label {...stylex.attrs(styles.label)}>
                    <span {...stylex.attrs(styles.searchLabel)}>{searchLabel.value}</span>
                    <input
                      v-model={searchQuery.value}
                      type="text"
                      name="sidebar-space-search"
                      placeholder={searchPlaceholder.value}
                      {...stylex.attrs(styles.input)}
                      autofocus
                    />
                  </label>

                  {!hasJiraCredentialsConfigured.value
                    ? <p {...stylex.attrs(styles.notice, styles.amberNotice)}>Complete Jira setup before browsing remote spaces.</p>
                    : showTeamList.value
                      ? (
                          <>
                            {teamsQuery.isLoading.value
                              ? <p {...stylex.attrs(styles.notice, styles.loadingNotice)}>Loading Jira teams...</p>
                              : teamsErrorMessage.value
                                ? <p {...stylex.attrs(styles.notice, styles.errorNotice)}>{teamsErrorMessage.value}</p>
                                : (
                                    <div {...stylex.attrs(styles.list)}>
                                      {visibleTeams.value.map((team, index) => (
                                        <button
                                          key={team.id}
                                          type="button"
                                          {...stylex.attrs(styles.row, index === visibleTeams.value.length - 1 ? styles.lastRow : null)}
                                          disabled={isSaving.value || addingSpaceKey.value !== null || isTeamAdded(team)}
                                          onClick={() => { void addTeamSpace(team) }}
                                        >
                                          <span {...stylex.attrs(styles.rowText)}>
                                            <span {...stylex.attrs(styles.rowTitle)}>{team.name}</span>
                                            <span {...stylex.attrs(styles.rowMeta)}>
                                              Team in
                                              {teamProject.value?.key}
                                            </span>
                                          </span>
                                          {isTeamAdded(team)
                                            ? (
                                                <span {...stylex.attrs(styles.added)}>
                                                  <svg {...stylex.attrs(styles.checkIcon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.25 8.5l3 3 6.5-7" />
                                                  </svg>
                                                  Added
                                                </span>
                                              )
                                            : <span {...stylex.attrs(styles.rowAction)}>{addingSpaceKey.value === getTeamSpaceKey(team) ? 'Adding...' : 'Add'}</span>}
                                        </button>
                                      ))}
                                      {!visibleTeams.value.length && <p {...stylex.attrs(styles.emptyList)}>No Jira teams matched your search.</p>}
                                    </div>
                                  )}
                          </>
                        )
                      : isLoading.value
                        ? <p {...stylex.attrs(styles.notice, styles.loadingNotice)}>Loading Jira spaces...</p>
                        : errorMessage.value
                          ? <p {...stylex.attrs(styles.notice, styles.errorNotice)}>{errorMessage.value}</p>
                          : (
                              <div {...stylex.attrs(styles.list)}>
                                {visibleSpaces.value.map((space, index) => (
                                  <button
                                    key={space.key}
                                    type="button"
                                    {...stylex.attrs(styles.row, index === visibleSpaces.value.length - 1 ? styles.lastRow : null)}
                                    disabled={isSaving.value || addingSpaceKey.value !== null || (mode.value === 'space' && isSpaceAdded(space))}
                                    onClick={() => handleSpaceRowClick(space)}
                                  >
                                    <span {...stylex.attrs(styles.rowText)}>
                                      <span {...stylex.attrs(styles.rowTitle)}>{space.name}</span>
                                      <span {...stylex.attrs(styles.rowMeta)}>{space.key}</span>
                                    </span>
                                    {mode.value === 'space' && isSpaceAdded(space)
                                      ? (
                                          <span {...stylex.attrs(styles.added)}>
                                            <svg {...stylex.attrs(styles.checkIcon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                              <path stroke-linecap="round" stroke-linejoin="round" d="M3.25 8.5l3 3 6.5-7" />
                                            </svg>
                                            Added
                                          </span>
                                        )
                                      : <span {...stylex.attrs(styles.rowAction)}>{mode.value === 'team' ? 'Choose' : addingSpaceKey.value === space.key ? 'Adding...' : 'Add'}</span>}
                                  </button>
                                ))}
                                {!visibleSpaces.value.length && <p {...stylex.attrs(styles.emptyList)}>No available Jira spaces matched your search.</p>}
                              </div>
                            )}

                  {feedback.value && (
                    <p {...stylex.attrs(styles.feedback, feedback.value.kind === 'success' ? styles.successFeedback : styles.errorFeedback)}>
                      {feedback.value.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Transition>
      </Teleport>
    )
  },
})
