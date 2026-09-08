import type { PropType } from 'vue'
import type { InitiativeRow, InitiativeRowFieldId, ProjectHealthTone, ProjectRow } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { uiStyles } from '@/styles/shared'

const styles = stylex.create({
  root: { minHeight: 0, flex: '1', overflowY: 'auto' },
  header: (gridTemplateColumns: string) => ({ display: 'grid', gridTemplateColumns: { default: gridTemplateColumns }, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.5rem', fontSize: 12, color: '#777a83' }),
  row: (gridTemplateColumns: string) => ({ display: 'grid', minHeight: '3rem', width: '100%', alignItems: 'center', paddingInline: '1rem', paddingBlock: '0.5rem', textAlign: 'left', gridTemplateColumns: { default: gridTemplateColumns } }),
  nameCell: { minWidth: 0, paddingRight: '1rem' },
  name: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: '#e6e7ea' },
  description: { marginTop: '0.125rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#777a83' },
  healthBadge: { display: 'inline-flex', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.5rem', paddingBlock: '0.125rem', fontSize: 11 },
  healthCompleted: { borderColor: 'rgba(77, 187, 131, 0.2)', backgroundColor: 'rgba(77, 187, 131, 0.1)', color: '#63c891' },
  healthAtRisk: { borderColor: 'rgba(229, 147, 86, 0.2)', backgroundColor: 'rgba(229, 147, 86, 0.1)', color: '#e9a66c' },
  healthOnTrack: { borderColor: 'rgba(63, 159, 214, 0.2)', backgroundColor: 'rgba(63, 159, 214, 0.1)', color: '#6fb7de' },
  mutedCell: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#aeb0b7' },
  leadCell: { paddingRight: '1rem' },
  countCell: { fontSize: 12, color: '#8f9198' },
  issuesCell: { paddingRight: '1.25rem' },
  issueStats: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: 11, color: '#8f9198' },
  progressTrack: { marginTop: '0.25rem', display: 'block', height: '0.25rem', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  progressFill: (width: string) => ({ display: 'block', height: '100%', width, borderRadius: '9999px' }),
  progressCompleted: { backgroundColor: '#4dbb83' },
  progressAtRisk: { backgroundColor: '#e59356' },
  progressOnTrack: { backgroundColor: '#6f73ff' },
  updatedCell: { color: '#777a83' },
  empty: { display: 'flex', height: '100%', minHeight: '20rem', alignItems: 'center', justifyContent: 'center', paddingInline: '1.5rem', textAlign: 'center' },
  emptyContent: { maxWidth: '24rem' },
  emptyTitle: { fontSize: 13, fontWeight: 500, color: '#d7d8dc' },
  emptyDescription: { marginTop: '0.25rem', fontSize: 12, color: '#777a83' },
})

function healthStyle(tone: ProjectHealthTone) {
  if (tone === 'completed')
    return styles.healthCompleted
  if (tone === 'atRisk')
    return styles.healthAtRisk
  return styles.healthOnTrack
}

function progressStyle(tone: ProjectHealthTone) {
  if (tone === 'completed')
    return styles.progressCompleted
  if (tone === 'atRisk')
    return styles.progressAtRisk
  return styles.progressOnTrack
}

export default defineComponent({
  name: 'TicketListInitiativesView',
  props: {
    rows: {
      type: Array as PropType<InitiativeRow[]>,
      required: true,
    },
    gridTemplate: {
      type: String,
      required: true,
    },
    isFieldVisible: {
      type: Function as PropType<(field: InitiativeRowFieldId) => boolean>,
      required: true,
    },
    getHealthTone: {
      type: Function as PropType<(health: ProjectRow['health']) => ProjectHealthTone>,
      required: true,
    },
    getRelativeTimeLabel: {
      type: Function as PropType<(value?: string) => string>,
      required: true,
    },
  },
  emits: {
    open: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header(props.gridTemplate))}>
          <span>Name</span>
          {props.isFieldVisible('health') && <span>Health</span>}
          {props.isFieldVisible('lead') && <span>Lead</span>}
          {props.isFieldVisible('projects') && <span>Projects</span>}
          {props.isFieldVisible('issues') && <span>Issues</span>}
          {props.isFieldVisible('updated') && <span>Updated</span>}
        </div>

        {props.rows.length
          ? (
              <div>
                {props.rows.map(initiative => (
                  <button
                    key={initiative.id}
                    type="button"
                    {...stylex.attrs(styles.row(props.gridTemplate), uiStyles.row)}
                    onClick={() => emit('open', initiative.id)}
                  >
                    <span {...stylex.attrs(styles.nameCell)}>
                      <span {...stylex.attrs(styles.name)}>{initiative.name}</span>
                      <span {...stylex.attrs(styles.description)}>{initiative.description}</span>
                    </span>

                    {props.isFieldVisible('health') && (
                      <span>
                        <span {...stylex.attrs(styles.healthBadge, healthStyle(props.getHealthTone(initiative.health)))}>
                          {initiative.health}
                        </span>
                      </span>
                    )}

                    {props.isFieldVisible('lead') && <span {...stylex.attrs(styles.mutedCell, styles.leadCell)}>{initiative.lead}</span>}
                    {props.isFieldVisible('projects') && (
                      <span {...stylex.attrs(styles.countCell)}>
                        {initiative.projectCount}
                        {' '}
                        {initiative.projectCount === 1 ? 'project' : 'projects'}
                      </span>
                    )}

                    {props.isFieldVisible('issues') && (
                      <span {...stylex.attrs(styles.issuesCell)}>
                        <span {...stylex.attrs(styles.issueStats)}>
                          <span>
                            {initiative.completedCount}
                            /
                            {initiative.issueCount}
                          </span>
                          <span>
                            {initiative.progress}
                            %
                          </span>
                        </span>
                        <span {...stylex.attrs(styles.progressTrack)}>
                          <span {...stylex.attrs(styles.progressFill(`${initiative.progress}%`), progressStyle(props.getHealthTone(initiative.health)))} />
                        </span>
                      </span>
                    )}

                    {props.isFieldVisible('updated') && <span {...stylex.attrs(styles.mutedCell, styles.updatedCell)}>{props.getRelativeTimeLabel(initiative.updatedAt)}</span>}
                  </button>
                ))}
              </div>
            )
          : (
              <div {...stylex.attrs(styles.empty)}>
                <div {...stylex.attrs(styles.emptyContent)}>
                  <p {...stylex.attrs(styles.emptyTitle)}>No initiatives found</p>
                  <p {...stylex.attrs(styles.emptyDescription)}>Initiatives will appear when projects can be grouped into roadmap work.</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
