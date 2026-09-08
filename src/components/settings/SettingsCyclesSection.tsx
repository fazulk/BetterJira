import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref, watch } from 'vue'
import { useJiraTickets } from '@/composables/useJiraTickets'
import { useSpaceCycles } from '@/composables/useSpaceCycles'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { colors } from '@/styles/tokens.stylex'
import { ticketBelongsToCycle } from '~/shared/cycles'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem' },
  muted: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-400'] },
  field: { display: 'block', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'] },
  fieldControlGap: { marginTop: '0.5rem' },
  select: { display: 'block', width: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: colors['--color-slate-900'], paddingInline: '0.75rem', paddingBlock: '0.5rem', opacity: { 'default': 1, ':disabled': 0.5 } },
  detail: { fontSize: '0.75rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  error: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-red-400'] },
})

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
      <div {...stylex.attrs(styles.root)}>
        {teams.value.length === 0
          ? <p {...stylex.attrs(styles.muted)}>Enable a Jira team to configure cycles.</p>
          : (
              <>
                <label {...stylex.attrs(styles.field)}>
                  <span>Team</span>
                  <select v-model={selectedTeam.value} disabled={isMutating.value} {...stylex.attrs(styles.select, styles.fieldControlGap)}>
                    {teams.value.map(team => <option key={team.key} value={team.key}>{team.name || team.key}</option>)}
                  </select>
                </label>
                {isLoading.value
                  ? <p {...stylex.attrs(styles.muted)}>Loading sprints…</p>
                  : (
                      <>
                        <label {...stylex.attrs(styles.field)}>
                          <span>Jira board</span>
                          <select value={payload.value.board?.id ?? ''} disabled={isMutating.value || !payload.value.boards.length} {...stylex.attrs(styles.select, styles.fieldControlGap)} onChange={(event) => { void save('board', event) }}>
                            <option value="" disabled>Select a board</option>
                            {payload.value.board && !payload.value.boards.some(board => board.id === payload.value.board?.id) && <option value={payload.value.board.id}>{payload.value.board.name}</option>}
                            {payload.value.boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
                          </select>
                        </label>
                        {!payload.value.boards.length && !errorMessage.value && <p {...stylex.attrs(styles.muted)}>No sprint boards found for this team.</p>}
                        <label {...stylex.attrs(styles.field)}>
                          <span>Current sprint</span>
                          <select value={payload.value.currentSprintId ?? ''} disabled={isMutating.value || !payload.value.board} {...stylex.attrs(styles.select, styles.fieldControlGap)} onChange={(event) => { void save('sprint', event) }}>
                            <option value="">Automatic from Jira</option>
                            {activeSprints.value.map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
                          </select>
                        </label>
                        <p {...stylex.attrs(styles.detail)}>
                          Choose which active sprint this team follows in BetterJira. Automatic uses the board’s first active sprint. When a selected sprint closes, selection returns to automatic.
                        </p>
                        <p {...stylex.attrs(styles.muted)} aria-live="polite">
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
                {(saveError.value || errorMessage.value) && <p role="alert" {...stylex.attrs(styles.error)}>{saveError.value || errorMessage.value}</p>}
              </>
            )}
      </div>
    )
  },
})
