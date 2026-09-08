import type { JiraTeamRef } from '@/types/jira'
import type { AppSpaceTeamFilter } from '~/shared/settings'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { computed, defineComponent, ref, Teleport, Transition, watch } from 'vue'
import { fetchAvailableTeams } from '@/api/settings'
import { useAvailableSpaces } from '@/composables/useAvailableSpaces'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { buildTeamSpaceKey } from '~/shared/settings'

type ModalMode = 'space' | 'team'

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
            <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 py-[12vh] backdrop-blur-sm" onClick={closeOnSelf}>
              <div
                class="w-full max-w-[34rem] overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1 shadow-xl shadow-black/40"
                role="dialog"
                aria-modal="true"
                aria-label="Add space"
                onKeydown={handleKeydown}
              >
                <div class="flex items-start justify-between gap-4 border-b border-white/[0.06] px-4 py-3">
                  <div>
                    <p class="text-sm font-medium text-slate-100">Add space</p>
                    <p class="mt-0.5 text-xs text-slate-500">
                      {mode.value === 'team'
                        ? 'Add a space scoped to one Jira team: pick the project, then the team.'
                        : 'Search Jira spaces and add them to your sidebar.'}
                    </p>
                  </div>
                  <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm text-slate-500 transition hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-slate-200" aria-label="Close" onClick={closeModal}>
                    <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
                    </svg>
                  </button>
                </div>

                <div class="space-y-3 px-4 py-4">
                  <div class="inline-flex rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5 text-xs" role="tablist" aria-label="Space type">
                    <button type="button" role="tab" aria-selected={mode.value === 'space'} class={['rounded px-2.5 py-1 transition', mode.value === 'space' ? 'bg-white/[0.08] text-slate-100' : 'text-slate-500 hover:text-slate-300']} onClick={() => setMode('space')}>
                      Space
                    </button>
                    <button type="button" role="tab" aria-selected={mode.value === 'team'} class={['rounded px-2.5 py-1 transition', mode.value === 'team' ? 'bg-white/[0.08] text-slate-100' : 'text-slate-500 hover:text-slate-300']} onClick={() => setMode('team')}>
                      Team space
                    </button>
                  </div>

                  {showTeamList.value && (
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                      <span class="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-slate-200">
                        {teamProject.value?.name}
                        {' '}
                        (
                        {teamProject.value?.key}
                        )
                      </span>
                      <button type="button" class="text-slate-500 underline decoration-white/20 underline-offset-2 transition hover:text-slate-300" onClick={clearTeamProject}>
                        Change project
                      </button>
                    </div>
                  )}

                  <label class="block">
                    <span class="mb-2 block text-xs font-medium text-slate-500">{searchLabel.value}</span>
                    <input
                      v-model={searchQuery.value}
                      type="text"
                      name="sidebar-space-search"
                      placeholder={searchPlaceholder.value}
                      class="w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-white/[0.16] focus:bg-white/[0.06]"
                      autofocus
                    />
                  </label>

                  {!hasJiraCredentialsConfigured.value
                    ? <p class="rounded-md border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-200">Complete Jira setup before browsing remote spaces.</p>
                    : showTeamList.value
                      ? (
                          <>
                            {teamsQuery.isLoading.value
                              ? <p class="rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-slate-500">Loading Jira teams...</p>
                              : teamsErrorMessage.value
                                ? <p class="rounded-md border border-rose-500/20 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-300">{teamsErrorMessage.value}</p>
                                : (
                                    <div class="max-h-[22rem] overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.015]">
                                      {visibleTeams.value.map(team => (
                                        <button
                                          key={team.id}
                                          type="button"
                                          class="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] px-3 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
                                          disabled={isSaving.value || addingSpaceKey.value !== null || isTeamAdded(team)}
                                          onClick={() => { void addTeamSpace(team) }}
                                        >
                                          <span class="min-w-0">
                                            <span class="block truncate text-sm font-medium text-slate-200">{team.name}</span>
                                            <span class="mt-0.5 block text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                              Team in
                                              {teamProject.value?.key}
                                            </span>
                                          </span>
                                          {isTeamAdded(team)
                                            ? (
                                                <span class="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-400">
                                                  <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.25 8.5l3 3 6.5-7" />
                                                  </svg>
                                                  Added
                                                </span>
                                              )
                                            : <span class="shrink-0 text-xs text-slate-500">{addingSpaceKey.value === getTeamSpaceKey(team) ? 'Adding...' : 'Add'}</span>}
                                        </button>
                                      ))}
                                      {!visibleTeams.value.length && <p class="px-3 py-6 text-center text-xs text-slate-500">No Jira teams matched your search.</p>}
                                    </div>
                                  )}
                          </>
                        )
                      : isLoading.value
                        ? <p class="rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-slate-500">Loading Jira spaces...</p>
                        : errorMessage.value
                          ? <p class="rounded-md border border-rose-500/20 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-300">{errorMessage.value}</p>
                          : (
                              <div class="max-h-[22rem] overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.015]">
                                {visibleSpaces.value.map(space => (
                                  <button
                                    key={space.key}
                                    type="button"
                                    class="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] px-3 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
                                    disabled={isSaving.value || addingSpaceKey.value !== null || (mode.value === 'space' && isSpaceAdded(space))}
                                    onClick={() => handleSpaceRowClick(space)}
                                  >
                                    <span class="min-w-0">
                                      <span class="block truncate text-sm font-medium text-slate-200">{space.name}</span>
                                      <span class="mt-0.5 block text-[11px] uppercase tracking-[0.14em] text-slate-500">{space.key}</span>
                                    </span>
                                    {mode.value === 'space' && isSpaceAdded(space)
                                      ? (
                                          <span class="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-400">
                                            <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                                              <path stroke-linecap="round" stroke-linejoin="round" d="M3.25 8.5l3 3 6.5-7" />
                                            </svg>
                                            Added
                                          </span>
                                        )
                                      : <span class="shrink-0 text-xs text-slate-500">{mode.value === 'team' ? 'Choose' : addingSpaceKey.value === space.key ? 'Adding...' : 'Add'}</span>}
                                  </button>
                                ))}
                                {!visibleSpaces.value.length && <p class="px-3 py-6 text-center text-xs text-slate-500">No available Jira spaces matched your search.</p>}
                              </div>
                            )}

                  {feedback.value && (
                    <p class={['text-xs', feedback.value.kind === 'success' ? 'text-slate-400' : 'text-rose-300']}>
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
