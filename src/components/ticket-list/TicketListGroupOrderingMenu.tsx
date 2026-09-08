import type { IssueGroupMarkerTone } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, reactive } from 'vue'
import StatusIcon from '@/components/StatusIcon'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'

const styles = stylex.create({
  root: { overflow: 'hidden' },
  header: { display: 'flex', height: '2.75rem', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem' },
  backButton: { display: 'flex', height: '1.75rem', minWidth: 0, alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingRight: '0.5rem', fontSize: 13, color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' } },
  backIcon: { fontSize: 16, lineHeight: 1 },
  resetButton: { borderRadius: '0.25rem', paddingInline: '0.375rem', paddingBlock: '0.25rem', fontSize: 12, color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  list: { maxHeight: '22rem', overflowY: 'auto', paddingBlock: '0.5rem' },
  stack: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  row: { display: 'flex', height: '2rem', alignItems: 'center', gap: '0.5rem', paddingInline: '0.75rem', fontSize: 13, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  rowVisible: { color: '#d7d8dc' },
  rowHidden: { color: '#777a83' },
  handle: { cursor: { 'default': 'grab', ':active': 'grabbing' }, fontSize: 14, color: '#555861' },
  marker: { height: '0.875rem', width: '0.875rem', flexShrink: 0, borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid' },
  markerDone: { borderColor: '#3aa7ff', backgroundColor: 'rgba(58, 167, 255, 0.1)' },
  markerActive: { borderColor: '#e59356', backgroundColor: 'rgba(229, 147, 86, 0.1)' },
  markerTodo: { borderColor: '#d7d8dc', backgroundColor: 'transparent' },
  markerDefault: { borderColor: '#8f9198', backgroundColor: 'transparent' },
  label: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  visibilityButton: { display: 'flex', height: '1.5rem', width: '1.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  icon: { height: '0.875rem', width: '0.875rem' },
  empty: { paddingInline: '0.75rem', paddingBlock: '2rem', textAlign: 'center', fontSize: 12, color: '#777a83' },
})

function markerStyle(tone: IssueGroupMarkerTone) {
  if (tone === 'done')
    return styles.markerDone
  if (tone === 'active')
    return styles.markerActive
  if (tone === 'todo')
    return styles.markerTodo
  return styles.markerDefault
}

export default defineComponent({
  name: 'TicketListGroupOrderingMenu',
  setup() {
    const context = reactive(useTicketListContext())

    return () => context.groupOrderingOpen && (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header)}>
          <button type="button" {...stylex.attrs(styles.backButton)} onClick={context.closeGroupOrdering}>
            <span {...stylex.attrs(styles.backIcon)}>‹</span>
            <span>Group ordering</span>
          </button>
          <button type="button" {...stylex.attrs(styles.resetButton)} onClick={context.resetCurrentIssueGroupOrdering}>
            Reset
          </button>
        </div>

        <div {...stylex.attrs(styles.list)}>
          {context.issueGroupOrderingRows.length
            ? (
                <div {...stylex.attrs(styles.stack)}>
                  {context.issueGroupOrderingRows.map(row => (
                    <div
                      key={row.id}
                      {...stylex.attrs(styles.row, row.visible ? styles.rowVisible : styles.rowHidden)}
                      draggable="true"
                      onDragstart={() => context.startIssueGroupDrag(row.id)}
                      onDragover={event => event.preventDefault()}
                      onDrop={() => context.dropIssueGroup(row.id)}
                      onDragend={context.finishIssueGroupDrag}
                    >
                      <span {...stylex.attrs(styles.handle)}>⁝⁝</span>
                      {context.listGrouping === 'status'
                        ? <StatusIcon status={row.label} statusCategory={context.getStatusCategoryForGroupLabel(row.label)} size={16} />
                        : <span {...stylex.attrs(styles.marker, markerStyle(context.getIssueGroupMarkerTone(row.label)))} />}
                      <span {...stylex.attrs(styles.label)}>{row.label}</span>
                      <button
                        type="button"
                        {...stylex.attrs(styles.visibilityButton)}
                        aria-label={row.visible ? `Hide ${row.label}` : `Show ${row.label}`}
                        onClick={() => context.toggleIssueGroupVisibility(row.id)}
                      >
                        {row.visible
                          ? (
                              <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M1.75 8s2.25-4 6.25-4 6.25 4 6.25 4-2.25 4-6.25 4-6.25-4-6.25-4Z" />
                                <circle cx="8" cy="8" r="1.75" />
                              </svg>
                            )
                          : (
                              <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 2.5l11 11M6.2 6.2A2 2 0 0 0 8 10a2 2 0 0 0 1.8-1.1M4.7 4.9C2.8 6.1 1.75 8 1.75 8s2.25 4 6.25 4c1.1 0 2.05-.3 2.85-.72M7.2 4.04A6.7 6.7 0 0 1 8 4c4 0 6.25 4 6.25 4a9.02 9.02 0 0 1-1.55 1.88" />
                              </svg>
                            )}
                      </button>
                    </div>
                  ))}
                </div>
              )
            : <div {...stylex.attrs(styles.empty)}>No groups to order</div>}
        </div>
      </div>
    )
  },
})
