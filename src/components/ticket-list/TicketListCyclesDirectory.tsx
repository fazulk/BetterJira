import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import type { Cycle, SpaceCyclesPayload } from '~/shared/cycles'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent } from 'vue'
import { getTeamCycleViewId } from '@/features/ticket-list/helpers'
import { uiStyles } from '@/styles/shared'
import { colors } from '@/styles/tokens.stylex'
import { cycleProgress, formatCycleDateRange, ticketBelongsToCycle } from '~/shared/cycles'

const styles = stylex.create({
  root: { minHeight: 0, flex: '1', overflowY: 'auto', paddingInline: '1.5rem', paddingBlock: '1.25rem' },
  intro: { marginBottom: '1.25rem' },
  introText: { fontSize: 13, color: '#8f9198' },
  error: { marginTop: '0.25rem', fontSize: 12, color: colors['--color-rose-300'] },
  boardPicker: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)', padding: '1rem' },
  boardTitle: { fontSize: 13, fontWeight: 500, color: '#e6e7ea' },
  boardDescription: { marginTop: '0.25rem', fontSize: 12, color: '#8f9198' },
  boardList: { marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  boardButton: { display: 'flex', height: '2.25rem', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.375rem', paddingInline: '0.75rem', textAlign: 'left', fontSize: 13, color: '#d7d8dc', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  boardType: { fontSize: 11, color: '#6f727b' },
  emptyCenter: { display: 'flex', minHeight: '16rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  emptyContent: { maxWidth: '24rem' },
  emptyTitle: { fontSize: 13, fontWeight: 500, color: '#d7d8dc' },
  emptyText: { marginTop: '0.25rem', fontSize: 12, color: '#777a83' },
  sections: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sectionTitle: { marginBottom: '0.5rem', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.025em', color: '#6f727b' },
  cycleRow: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem', textAlign: 'left' },
  cycleTitle: { display: 'block', fontSize: 13, fontWeight: 500, color: '#e6e7ea' },
  cycleDate: { marginTop: '0.125rem', display: 'block', fontSize: 12, color: '#8f9198' },
  cycleStat: { fontSize: 12, color: '#8f9198' },
  dashedEmpty: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '1rem', paddingBlock: '0.75rem', fontSize: 12, color: '#8f9198' },
  pastList: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)' },
  pastRow: { borderRadius: 0, borderWidth: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  lastPastRow: { borderBottomWidth: 0 },
})

export default defineComponent({
  name: 'TicketListCyclesDirectory',
  props: {
    payload: {
      type: Object as PropType<SpaceCyclesPayload>,
      required: true,
    },
    tickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    teamKey: {
      type: String,
      required: true,
    },
    errorMessage: {
      type: [String, null] as PropType<string | null>,
      required: true,
    },
  },
  emits: {
    open: (viewId: string) => typeof viewId === 'string',
    selectBoard: (boardId: number) => typeof boardId === 'number',
  },
  setup(props, { emit }) {
    const currentTickets = computed(() => (
      props.payload.current
        ? props.tickets.filter(ticket => ticketBelongsToCycle(ticket, props.payload.current as Cycle))
        : []
    ))
    const upcomingTickets = computed(() => (
      props.payload.upcoming
        ? props.tickets.filter(ticket => ticketBelongsToCycle(ticket, props.payload.upcoming as Cycle))
        : []
    ))
    const previousTickets = computed(() => (
      props.payload.previous
        ? props.tickets.filter(ticket => ticketBelongsToCycle(ticket, props.payload.previous as Cycle))
        : []
    ))
    const pastCycles = computed(() => props.payload.cycles.filter(cycle => (
      cycle.state === 'closed' && cycle.id !== props.payload.previous?.id
    )))

    function progressFor(cycle: Cycle, tickets: JiraTicket[]) {
      return cycleProgress(tickets.filter(ticket => ticketBelongsToCycle(ticket, cycle)))
    }

    function openCycle(cycle: Cycle): void {
      if (cycle.id === props.payload.current?.id) {
        emit('open', getTeamCycleViewId(props.teamKey, 'current'))
        return
      }
      if (cycle.id === props.payload.upcoming?.id) {
        emit('open', getTeamCycleViewId(props.teamKey, 'upcoming'))
        return
      }
      if (cycle.id === props.payload.previous?.id) {
        emit('open', getTeamCycleViewId(props.teamKey, 'previous'))
        return
      }
      emit('open', getTeamCycleViewId(props.teamKey, { sprintId: cycle.id }))
    }

    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.intro)}>
          <p {...stylex.attrs(styles.introText)}>
            {props.payload.board ? `Board · ${props.payload.board.name}` : 'Jira sprints, presented as cycles.'}
          </p>
          {props.errorMessage && <p {...stylex.attrs(styles.error)}>{props.errorMessage}</p>}
        </div>

        {props.payload.needsBoardPicker
          ? (
              <div {...stylex.attrs(styles.boardPicker)}>
                <p {...stylex.attrs(styles.boardTitle)}>Choose a Scrum board</p>
                <p {...stylex.attrs(styles.boardDescription)}>This project has more than one board. Cycles use the board’s sprint sequence.</p>
                <div {...stylex.attrs(styles.boardList)}>
                  {props.payload.boards.map(board => (
                    <button
                      key={board.id}
                      type="button"
                      {...stylex.attrs(styles.boardButton)}
                      onClick={() => emit('selectBoard', board.id)}
                    >
                      <span>{board.name}</span>
                      <span {...stylex.attrs(styles.boardType)}>{board.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          : !props.payload.board
              ? (
                  <div {...stylex.attrs(styles.emptyCenter)}>
                    <div {...stylex.attrs(styles.emptyContent)}>
                      <p {...stylex.attrs(styles.emptyTitle)}>No cycle board</p>
                      <p {...stylex.attrs(styles.emptyText)}>This team has no Scrum board in Jira, so cycles are unavailable.</p>
                    </div>
                  </div>
                )
              : (
                  <div {...stylex.attrs(styles.sections)}>
                    <section>
                      <h2 {...stylex.attrs(styles.sectionTitle)}>Current</h2>
                      {props.payload.current
                        ? (
                            <button type="button" {...stylex.attrs(styles.cycleRow, uiStyles.row)} onClick={() => openCycle(props.payload.current as Cycle)}>
                              <span>
                                <span {...stylex.attrs(styles.cycleTitle)}>{props.payload.current.name}</span>
                                <span {...stylex.attrs(styles.cycleDate)}>{formatCycleDateRange(props.payload.current)}</span>
                              </span>
                              <span {...stylex.attrs(styles.cycleStat)}>
                                {progressFor(props.payload.current, currentTickets.value).percent}
                                % ·
                                {' '}
                                {currentTickets.value.length}
                              </span>
                            </button>
                          )
                        : <p {...stylex.attrs(styles.dashedEmpty)}>No active sprint in Jira.</p>}
                    </section>

                    <section>
                      <h2 {...stylex.attrs(styles.sectionTitle)}>Upcoming</h2>
                      {props.payload.upcoming
                        ? (
                            <button type="button" {...stylex.attrs(styles.cycleRow, uiStyles.row)} onClick={() => openCycle(props.payload.upcoming as Cycle)}>
                              <span>
                                <span {...stylex.attrs(styles.cycleTitle)}>{props.payload.upcoming.name}</span>
                                <span {...stylex.attrs(styles.cycleDate)}>{formatCycleDateRange(props.payload.upcoming)}</span>
                              </span>
                              <span {...stylex.attrs(styles.cycleStat)}>
                                {upcomingTickets.value.length}
                                {' '}
                                issues
                              </span>
                            </button>
                          )
                        : <p {...stylex.attrs(styles.dashedEmpty)}>No upcoming cycle yet.</p>}
                    </section>

                    <section>
                      <h2 {...stylex.attrs(styles.sectionTitle)}>Previous</h2>
                      {props.payload.previous
                        ? (
                            <button type="button" {...stylex.attrs(styles.cycleRow, uiStyles.row)} onClick={() => openCycle(props.payload.previous as Cycle)}>
                              <span>
                                <span {...stylex.attrs(styles.cycleTitle)}>{props.payload.previous.name}</span>
                                <span {...stylex.attrs(styles.cycleDate)}>{formatCycleDateRange(props.payload.previous)}</span>
                              </span>
                              <span {...stylex.attrs(styles.cycleStat)}>
                                {progressFor(props.payload.previous, previousTickets.value).percent}
                                % ·
                                {' '}
                                {previousTickets.value.length}
                              </span>
                            </button>
                          )
                        : <p {...stylex.attrs(styles.dashedEmpty)}>No previous cycle yet.</p>}
                    </section>

                    <section>
                      <h2 {...stylex.attrs(styles.sectionTitle)}>Past</h2>
                      {pastCycles.value.length
                        ? (
                            <div {...stylex.attrs(styles.pastList)}>
                              {pastCycles.value.map((cycle, index) => (
                                <button key={cycle.id} type="button" {...stylex.attrs(styles.cycleRow, styles.pastRow, index === pastCycles.value.length - 1 ? styles.lastPastRow : null, uiStyles.row)} onClick={() => openCycle(cycle)}>
                                  <span>
                                    <span {...stylex.attrs(styles.cycleTitle)}>{cycle.name}</span>
                                    <span {...stylex.attrs(styles.cycleDate)}>{formatCycleDateRange(cycle)}</span>
                                  </span>
                                  <span {...stylex.attrs(styles.cycleStat)}>
                                    {progressFor(cycle, props.tickets).percent}
                                    %
                                  </span>
                                </button>
                              ))}
                            </div>
                          )
                        : <p {...stylex.attrs(styles.cycleStat)}>No earlier cycles.</p>}
                    </section>
                  </div>
                )}
      </div>
    )
  },
})
