import { computed, defineComponent, ref, watch } from 'vue'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceCycles } from '@/composables/useSpaceCycles'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { ticketBelongsToCycle } from '~/shared/cycles'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

export default defineComponent({
  name: 'SettingsCyclesSection',
  setup() {
    const { enabledSpaces } = useSpaceSettings()
    const { tickets } = useJiraTickets()
    const teams = computed(() => enabledSpaces.value.filter(space => space.key !== LOCAL_SPACE_KEY))
    const selectedTeam = ref('')

    watch(teams, (value) => {
      if (!value.some(team => team.key === selectedTeam.value)) {
        selectedTeam.value = value[0]?.key ?? ''
      }
    }, { immediate: true })

    const cycles = useSpaceCycles(computed(() => selectedTeam.value || null))
    const { payload, isLoading, isMutating, errorMessage } = cycles
    const activeSprints = computed(() => payload.value.cycles.filter(cycle => cycle.state === 'active'))
    const currentCount = computed(() => {
      const current = payload.value.current
      return current ? tickets.value.filter(ticket => ticket.spaceKey === selectedTeam.value && ticketBelongsToCycle(ticket, current)).length : 0
    })
    const saveError = ref('')

    watch(selectedTeam, () => {
      saveError.value = ''
    })

    async function save(kind: 'board' | 'sprint', event: Event): Promise<void> {
      const target = event.target
      if (!(target instanceof HTMLSelectElement)) {
        return
      }
      const value = target.value
      saveError.value = ''
      try {
        if (kind === 'board') {
          await cycles.setBoard(Number(value))
        }
        else {
          await cycles.setCurrentSprint(value || null)
        }
      }
      catch (error) {
        saveError.value = error instanceof Error ? error.message : 'Unable to save cycle settings.'
      }
      finally {
        target.value = kind === 'board' ? String(payload.value.board?.id ?? '') : payload.value.currentSprintId ?? ''
      }
    }

    return () => (
      <div class="space-y-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        {teams.value.length === 0
          ? <p class="text-sm text-slate-400">Enable a Jira team to configure cycles.</p>
          : (
              <>
                <label class="block space-y-2 text-sm text-slate-200">
                  <span>Team</span>
                  <select v-model={selectedTeam.value} disabled={isMutating.value} class="block w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 disabled:opacity-50">
                    {teams.value.map(team => <option key={team.key} value={team.key}>{team.name || team.key}</option>)}
                  </select>
                </label>
                {isLoading.value
                  ? <p class="text-sm text-slate-400">Loading sprints…</p>
                  : (
                      <>
                        <label class="block space-y-2 text-sm text-slate-200">
                          <span>Jira board</span>
                          <select value={payload.value.board?.id ?? ''} disabled={isMutating.value || !payload.value.boards.length} class="block w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 disabled:opacity-50" onChange={(event) => { void save('board', event) }}>
                            <option value="" disabled>Select a board</option>
                            {payload.value.board && !payload.value.boards.some(board => board.id === payload.value.board?.id) && <option value={payload.value.board.id}>{payload.value.board.name}</option>}
                            {payload.value.boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
                          </select>
                        </label>
                        {!payload.value.boards.length && !errorMessage.value && <p class="text-sm text-slate-400">No sprint boards found for this team.</p>}
                        <label class="block space-y-2 text-sm text-slate-200">
                          <span>Current sprint</span>
                          <select value={payload.value.currentSprintId ?? ''} disabled={isMutating.value || !payload.value.board} class="block w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 disabled:opacity-50" onChange={(event) => { void save('sprint', event) }}>
                            <option value="">Automatic from Jira</option>
                            {activeSprints.value.map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
                          </select>
                        </label>
                        <p class="text-xs leading-5 text-slate-500">
                          Choose which active sprint this team follows in BetterJira. Automatic uses the board’s first active sprint. When a selected sprint closes, selection returns to automatic.
                        </p>
                        <p class="text-sm text-slate-400" aria-live="polite">
                          {payload.value.current ? `${payload.value.current.name} · ${currentCount.value} issues` : 'No active sprint on this board.'}
                          {isMutating.value && (
                            <span>
                              {' '}
                              Saving…
                            </span>
                          )}
                        </p>
                      </>
                    )}
                {(saveError.value || errorMessage.value) && <p role="alert" class="text-sm text-red-400">{saveError.value || errorMessage.value}</p>}
              </>
            )}
      </div>
    )
  },
})
