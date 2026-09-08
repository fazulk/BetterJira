import type { PropType } from 'vue'
import type { ProjectHealthTone, ProjectRow, ProjectRowFieldId, ProjectSection } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { Icon } from '#components'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { uiStyles } from '@/styles/shared'

const styles = stylex.create({
  root: { minHeight: 0, flex: '1', overflowY: 'auto' },
  header: (gridTemplateColumns: string) => ({ display: 'grid', gridTemplateColumns: { default: gridTemplateColumns }, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.5rem', fontSize: 12, color: '#777a83' }),
  sectionHeader: { display: 'flex', height: '2rem', alignItems: 'center', gap: '0.5rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '1rem', fontSize: 12, fontWeight: 500, color: '#aeb0b7' },
  sectionButton: { display: 'flex', minWidth: 0, flex: '1', alignItems: 'center', gap: '0.5rem', textAlign: 'left', color: { 'default': null, ':hover': '#d7d8dc' } },
  chevron: { width: '0.75rem', height: '0.75rem', flexShrink: 0, color: '#777a83', transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  collapsedChevron: { transform: 'rotate(-90deg)' },
  sectionLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sectionCount: { color: '#6f727b' },
  row: (gridTemplateColumns: string) => ({ display: 'grid', minHeight: '3rem', width: '100%', alignItems: 'center', gap: 0, paddingInline: '1rem', paddingBlock: '0.5rem', textAlign: 'left', gridTemplateColumns: { default: gridTemplateColumns } }),
  projectCell: { minWidth: 0, paddingRight: '1rem' },
  projectNameRow: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem', fontSize: 13, fontWeight: 500, color: '#e6e7ea' },
  projectIcon: (color: string) => ({ width: '0.875rem', height: '0.875rem', flexShrink: 0, color }),
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  projectMeta: { marginTop: '0.125rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#777a83' },
  healthBadge: { display: 'inline-flex', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.5rem', paddingBlock: '0.125rem', fontSize: 11 },
  healthCompleted: { borderColor: 'rgba(77, 187, 131, 0.2)', backgroundColor: 'rgba(77, 187, 131, 0.1)', color: '#63c891' },
  healthAtRisk: { borderColor: 'rgba(229, 147, 86, 0.2)', backgroundColor: 'rgba(229, 147, 86, 0.1)', color: '#e9a66c' },
  healthOnTrack: { borderColor: 'rgba(63, 159, 214, 0.2)', backgroundColor: 'rgba(63, 159, 214, 0.1)', color: '#6fb7de' },
  mutedCell: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#aeb0b7' },
  leadCell: { paddingRight: '1rem' },
  dateCell: { color: '#8f9198' },
  issuesCell: { paddingRight: '1.25rem' },
  issueStats: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: 11, color: '#8f9198' },
  progressTrack: { marginTop: '0.25rem', display: 'block', height: '0.25rem', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  progressFill: (width: string) => ({ display: 'block', height: '100%', width, borderRadius: '9999px' }),
  progressCompleted: { backgroundColor: '#4dbb83' },
  progressAtRisk: { backgroundColor: '#e59356' },
  progressOnTrack: { backgroundColor: '#6f73ff' },
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
  name: 'TicketListProjectView',
  props: {
    sections: {
      type: Array as PropType<ProjectSection[]>,
      required: true,
    },
    visibleCount: {
      type: Number,
      required: true,
    },
    grouping: {
      type: String,
      required: true,
    },
    gridTemplate: {
      type: String,
      required: true,
    },
    isFieldVisible: {
      type: Function as PropType<(field: ProjectRowFieldId) => boolean>,
      required: true,
    },
    isSectionCollapsed: {
      type: Function as PropType<(section: ProjectSection) => boolean>,
      required: true,
    },
    getHealthTone: {
      type: Function as PropType<(health: ProjectRow['health']) => ProjectHealthTone>,
      required: true,
    },
  },
  emits: {
    toggleSection: (section: ProjectSection) => Boolean(section),
    prefetch: (key: string) => typeof key === 'string',
    open: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    const { getProjectAppearance } = useProjectAppearances()

    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header(props.gridTemplate))}>
          <span>Name</span>
          {props.isFieldVisible('health') && <span>Health</span>}
          {props.isFieldVisible('priority') && <span>Priority</span>}
          {props.isFieldVisible('lead') && <span>Lead</span>}
          {props.isFieldVisible('targetDate') && <span>Target date</span>}
          {props.isFieldVisible('issues') && <span>Issues</span>}
          {props.isFieldVisible('status') && <span>Status</span>}
        </div>

        {props.visibleCount > 0
          ? (
              <div>
                {props.sections.map(section => (
                  <section key={section.id}>
                    {props.grouping !== 'none' && (
                      <div {...stylex.attrs(styles.sectionHeader)}>
                        <button
                          type="button"
                          {...stylex.attrs(styles.sectionButton)}
                          aria-expanded={!props.isSectionCollapsed(section)}
                          onClick={() => emit('toggleSection', section)}
                        >
                          <Icon
                            name="lucide:chevron-down"
                            {...stylex.attrs(styles.chevron, props.isSectionCollapsed(section) ? styles.collapsedChevron : null)}
                            aria-hidden="true"
                          />
                          <span {...stylex.attrs(styles.sectionLabel)}>{section.label}</span>
                          <span {...stylex.attrs(styles.sectionCount)}>{section.projects.length}</span>
                        </button>
                      </div>
                    )}

                    {!props.isSectionCollapsed(section) && section.projects.map(project => (
                      <button
                        key={project.key}
                        type="button"
                        {...stylex.attrs(styles.row(props.gridTemplate), uiStyles.row)}
                        onMouseenter={() => emit('prefetch', project.key)}
                        onClick={() => emit('open', project.key)}
                      >
                        <span {...stylex.attrs(styles.projectCell)}>
                          <span {...stylex.attrs(styles.projectNameRow)}>
                            <Icon
                              name={`lucide:${getProjectAppearance(project.key).icon}`}
                              {...stylex.attrs(styles.projectIcon(getProjectAppearance(project.key).color))}
                              aria-hidden="true"
                            />
                            <span {...stylex.attrs(styles.truncate)}>{project.name}</span>
                          </span>
                          <span {...stylex.attrs(styles.projectMeta)}>
                            {project.key}
                            {' '}
                            ·
                            {' '}
                            {project.spaceName}
                          </span>
                        </span>

                        {props.isFieldVisible('health') && (
                          <span>
                            <span {...stylex.attrs(styles.healthBadge, healthStyle(props.getHealthTone(project.health)))}>
                              {project.health}
                            </span>
                          </span>
                        )}
                        {props.isFieldVisible('priority') && <span {...stylex.attrs(styles.mutedCell)}>{project.priority}</span>}
                        {props.isFieldVisible('lead') && <span {...stylex.attrs(styles.mutedCell, styles.leadCell)}>{project.lead}</span>}
                        {props.isFieldVisible('targetDate') && <span {...stylex.attrs(styles.mutedCell, styles.dateCell)}>{project.targetDate}</span>}

                        {props.isFieldVisible('issues') && (
                          <span {...stylex.attrs(styles.issuesCell)}>
                            <span {...stylex.attrs(styles.issueStats)}>
                              <span>
                                {project.completedCount}
                                /
                                {project.issueCount}
                              </span>
                              <span>
                                {project.progress}
                                %
                              </span>
                            </span>
                            <span {...stylex.attrs(styles.progressTrack)}>
                              <span {...stylex.attrs(styles.progressFill(`${project.progress}%`), progressStyle(props.getHealthTone(project.health)))} />
                            </span>
                          </span>
                        )}

                        {props.isFieldVisible('status') && <span {...stylex.attrs(styles.mutedCell)}>{project.status}</span>}
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            )
          : (
              <div {...stylex.attrs(styles.empty)}>
                <div {...stylex.attrs(styles.emptyContent)}>
                  <p {...stylex.attrs(styles.emptyTitle)}>No projects found</p>
                  <p {...stylex.attrs(styles.emptyDescription)}>Projects will appear here when enabled teams have project-level work.</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
