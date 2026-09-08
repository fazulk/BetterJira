import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType } from 'vue'
import type { IssueRowDisplayProps, IssueSection } from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { Icon } from '#components'
import IssueRow from '@/components/IssueRow'
import StatusIcon from '@/components/StatusIcon'
import { useProjectAppearances } from '@/composables/useProjectAppearances'

const styles = stylex.create({
  root: { minWidth: 0, overflowY: 'auto' },
  sectionHeader: { display: 'flex', height: '2rem', alignItems: 'center', gap: '0.5rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '1rem', fontSize: 12, fontWeight: 500, color: '#aeb0b7' },
  sectionButton: { display: 'flex', minWidth: 0, flex: '1', alignItems: 'center', gap: '0.5rem', textAlign: 'left', color: { 'default': null, ':hover': '#d7d8dc' } },
  chevron: { width: '0.75rem', height: '0.75rem', flexShrink: 0, color: '#777a83', transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  collapsedChevron: { transform: 'rotate(-90deg)' },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  count: { color: '#6f727b' },
  empty: { display: 'flex', height: '100%', minHeight: '20rem', alignItems: 'center', justifyContent: 'center', paddingInline: '1.5rem', textAlign: 'center' },
  emptyContent: { maxWidth: '24rem' },
  emptyTitle: { fontSize: 13, fontWeight: 500, color: '#d7d8dc' },
  emptyDescription: { marginTop: '0.25rem', fontSize: 12, color: '#777a83' },
})

export default defineComponent({
  name: 'TicketListIssueSections',
  props: {
    xstyle: { type: [Object, Array] as PropType<StyleXStyles> },
    sections: {
      type: Array as PropType<IssueSection[]>,
      required: true,
    },
    visibleCount: {
      type: Number,
      required: true,
    },
    hiddenCompletedCount: {
      type: Number,
      required: true,
    },
    completedRange: {
      type: String,
      required: true,
    },
    focusedIssueKey: {
      type: [String, null] as PropType<string | null>,
      required: true,
    },
    checkedIssueKeySet: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    rowDisplayProps: {
      type: Object as PropType<IssueRowDisplayProps>,
      required: true,
    },
    emptyTitle: {
      type: String,
      required: true,
    },
    emptyDescription: {
      type: String,
      required: true,
    },
    showHeaders: {
      type: Boolean,
      required: true,
    },
    getRowKey: {
      type: Function as PropType<(ticket: JiraTicket) => string>,
      required: true,
    },
    isCollapsed: {
      type: Function as PropType<(section: IssueSection) => boolean>,
      required: true,
    },
    isStatusGrouping: {
      type: Boolean,
    },
    getStatusCategoryForGroupLabel: {
      type: Function as PropType<((label: string) => string) | undefined>,
      default: undefined,
    },
  },
  emits: {
    showCompleted: () => true,
    toggleSection: (section: IssueSection) => Boolean(section),
    select: (key: string) => typeof key === 'string',
    prefetch: (key: string) => typeof key === 'string',
    toggleCheck: (key: string) => typeof key === 'string',
  },
  setup(props, { emit }) {
    const { getTicketProjectAppearance } = useProjectAppearances()

    return () => (
      <div {...stylex.attrs(styles.root, props.xstyle)}>
        {props.sections.length && props.visibleCount > 0
          ? (
              <div>
                {props.sections.map(section => (
                  <section key={section.id}>
                    {props.showHeaders && (
                      <div {...stylex.attrs(styles.sectionHeader)}>
                        <button
                          type="button"
                          {...stylex.attrs(styles.sectionButton)}
                          aria-expanded={!props.isCollapsed(section)}
                          onClick={() => emit('toggleSection', section)}
                        >
                          <Icon
                            name="lucide:chevron-down"
                            {...stylex.attrs(styles.chevron, props.isCollapsed(section) ? styles.collapsedChevron : null)}
                            aria-hidden="true"
                          />
                          {props.isStatusGrouping && props.getStatusCategoryForGroupLabel && (
                            <StatusIcon status={section.label} statusCategory={props.getStatusCategoryForGroupLabel(section.label)} size={16} />
                          )}
                          <span {...stylex.attrs(styles.truncate)}>{section.label}</span>
                          <span {...stylex.attrs(styles.count)}>{section.tickets.length}</span>
                        </button>
                      </div>
                    )}
                    {!props.isCollapsed(section) && section.tickets.map((ticket) => {
                      const rowKey = props.getRowKey(ticket)
                      return (
                        <IssueRow
                          key={rowKey}
                          ticket={ticket}
                          selected={props.focusedIssueKey === rowKey}
                          checked={props.checkedIssueKeySet.has(rowKey)}
                          projectAppearance={getTicketProjectAppearance(ticket)}
                          {...props.rowDisplayProps}
                          onSelect={key => emit('select', key)}
                          onPrefetch={key => emit('prefetch', key)}
                          onToggleCheck={key => emit('toggleCheck', key)}
                        />
                      )
                    })}
                  </section>
                ))}
              </div>
            )
          : (
              <div {...stylex.attrs(styles.empty)}>
                <div {...stylex.attrs(styles.emptyContent)}>
                  <p {...stylex.attrs(styles.emptyTitle)}>{props.emptyTitle}</p>
                  <p {...stylex.attrs(styles.emptyDescription)}>{props.emptyDescription}</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
