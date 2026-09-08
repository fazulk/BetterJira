import type { ProjectHealthTone } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, reactive } from 'vue'
import { Icon } from '#components'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import { uiStyles } from '@/styles/shared'
import IssueRow from '../IssueRow'

const styles = stylex.create({
  row: { display: 'grid', minHeight: '3rem', width: '100%', gridTemplateColumns: 'minmax(220px, 1fr) 108px 120px 132px', alignItems: 'center', paddingInline: '1rem', paddingBlock: '0.5rem', textAlign: 'left' },
  nameCell: { minWidth: 0, paddingRight: '1rem' },
  nameRow: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem', fontSize: 13, fontWeight: 500, color: '#e6e7ea' },
  icon: (color: string) => ({ height: '0.875rem', width: '0.875rem', flexShrink: 0, color }),
  name: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  description: { marginTop: '0.125rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#777a83' },
  healthBadge: { display: 'inline-flex', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.5rem', paddingBlock: '0.125rem', fontSize: 11 },
  healthCompleted: { borderColor: 'rgba(77, 187, 131, 0.2)', backgroundColor: 'rgba(77, 187, 131, 0.1)', color: '#63c891' },
  healthAtRisk: { borderColor: 'rgba(229, 147, 86, 0.2)', backgroundColor: 'rgba(229, 147, 86, 0.1)', color: '#e9a66c' },
  healthOnTrack: { borderColor: 'rgba(63, 159, 214, 0.2)', backgroundColor: 'rgba(63, 159, 214, 0.1)', color: '#6fb7de' },
  mutedCell: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem', fontSize: 12, color: '#aeb0b7' },
  statCell: { fontSize: 12, color: '#8f9198' },
  root: { minHeight: 0, flex: '1', overflow: 'hidden' },
  header: { flexShrink: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  searchBox: { display: 'flex', maxWidth: '48rem', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  searchLabel: { fontSize: 12, color: '#777a83' },
  input: { 'minWidth': 0, 'flex': '1', 'backgroundColor': 'transparent', 'fontSize': 13, 'color': '#e6e7ea', 'outlineStyle': 'none', '::placeholder': { color: '#6f727b' } },
  clearButton: { borderRadius: '0.25rem', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 11, color: { 'default': '#777a83', ':hover': '#d7d8dc' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  tabs: { marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' },
  tab: { borderRadius: '9999px', paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: 12, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  tabActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#f0f1f4' },
  tabInactive: { color: { 'default': '#8f9198', ':hover': '#d7d8dc' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' } },
  tabCount: { marginLeft: '0.25rem', color: '#6f727b' },
  results: { height: '100%', overflowY: 'auto', paddingBottom: '4rem' },
  section: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  sectionHeader: { display: 'flex', height: '2rem', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '1rem', fontSize: 12, fontWeight: 500, color: '#aeb0b7' },
  sectionCount: { color: '#6f727b' },
  empty: { display: 'flex', minHeight: '20rem', alignItems: 'center', justifyContent: 'center', paddingInline: '1.5rem', textAlign: 'center' },
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

export default defineComponent({
  name: 'TicketListSearchView',
  setup() {
    const { getProjectAppearance, getTicketProjectAppearance } = useProjectAppearances()
    const context = reactive(useTicketListContext())

    function renderIssueRows(tickets = context.searchedTickets) {
      return tickets.map((ticket) => {
        const rowKey = context.getDisplayedIssueRowKey(ticket)
        return (
          <IssueRow
            key={rowKey}
            ticket={ticket}
            selected={context.focusedIssueKey === rowKey}
            checked={context.checkedIssueKeySet.has(rowKey)}
            projectAppearance={getTicketProjectAppearance(ticket)}
            {...context.issueRowDisplayProps}
            onSelect={context.openTicket}
            onPrefetch={context.prefetchTicket}
            onToggleCheck={context.toggleCheckedIssue}
          />
        )
      })
    }

    function renderProjectRow(project: typeof context.searchedProjectRows[number]) {
      return (
        <button
          key={project.key}
          type="button"
          {...stylex.attrs(styles.row, uiStyles.row)}
          onMouseenter={() => context.prefetchTicket(project.key)}
          onClick={() => context.openTicket(project.key)}
        >
          <span {...stylex.attrs(styles.nameCell)}>
            <span {...stylex.attrs(styles.nameRow)}>
              <Icon
                name={`lucide:${getProjectAppearance(project.key).icon}`}
                {...stylex.attrs(styles.icon(getProjectAppearance(project.key).color))}
                aria-hidden="true"
              />
              <span {...stylex.attrs(styles.name)}>{project.name}</span>
            </span>
            <span {...stylex.attrs(styles.description)}>
              {project.key}
              {' '}
              ·
              {' '}
              {project.spaceName}
            </span>
          </span>
          <span>
            <span {...stylex.attrs(styles.healthBadge, healthStyle(context.getProjectHealthTone(project.health)))}>
              {project.health}
            </span>
          </span>
          <span {...stylex.attrs(styles.mutedCell)}>{project.lead}</span>
          <span {...stylex.attrs(styles.statCell)}>
            {project.progress}
            % complete
          </span>
        </button>
      )
    }

    function renderInitiativeRow(initiative: typeof context.searchedInitiativeRows[number]) {
      return (
        <button
          key={initiative.id}
          type="button"
          {...stylex.attrs(styles.row, uiStyles.row)}
          onMouseenter={() => context.prefetchTicket(initiative.id)}
          onClick={() => context.openTicket(initiative.id)}
        >
          <span {...stylex.attrs(styles.nameCell)}>
            <span {...stylex.attrs(styles.nameRow, styles.name)}>{initiative.name}</span>
            <span {...stylex.attrs(styles.description)}>{initiative.description}</span>
          </span>
          <span>
            <span {...stylex.attrs(styles.healthBadge, healthStyle(context.getProjectHealthTone(initiative.health)))}>
              {initiative.health}
            </span>
          </span>
          <span {...stylex.attrs(styles.mutedCell)}>{initiative.lead}</span>
          <span {...stylex.attrs(styles.statCell)}>
            {initiative.projectCount}
            {' '}
            projects
          </span>
        </button>
      )
    }

    return () => context.currentView === 'search' && (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header)}>
          <div {...stylex.attrs(styles.searchBox)}>
            <span {...stylex.attrs(styles.searchLabel)}>Search</span>
            <input
              ref={context.setSearchInputRef}
              v-model={context.issueSearch}
              type="search"
              {...stylex.attrs(styles.input)}
              placeholder="Search issues, projects, initiatives..."
            />
            {context.issueSearch && (
              <button type="button" {...stylex.attrs(styles.clearButton)} onClick={() => { context.issueSearch = '' }}>
                Clear
              </button>
            )}
          </div>

          <div {...stylex.attrs(styles.tabs)}>
            {context.searchTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                {...stylex.attrs(styles.tab, context.searchResultTab === tab.id ? styles.tabActive : styles.tabInactive)}
                onClick={() => { context.searchResultTab = tab.id }}
              >
                {tab.label}
                <span {...stylex.attrs(styles.tabCount)}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div {...stylex.attrs(styles.results)}>
          {context.searchResultTab === 'all'
            ? (
                <>
                  {context.searchedTickets.length > 0 && (
                    <section {...stylex.attrs(styles.section)}>
                      <div {...stylex.attrs(styles.sectionHeader)}>
                        <span>Issues</span>
                        <span {...stylex.attrs(styles.sectionCount)}>{context.searchedTickets.length}</span>
                      </div>
                      {renderIssueRows(context.searchedTickets.slice(0, 12))}
                    </section>
                  )}

                  {context.searchedProjectRows.length > 0 && (
                    <section {...stylex.attrs(styles.section)}>
                      <div {...stylex.attrs(styles.sectionHeader)}>
                        <span>Projects</span>
                        <span {...stylex.attrs(styles.sectionCount)}>{context.searchedProjectRows.length}</span>
                      </div>
                      {context.searchedProjectRows.slice(0, 8).map(renderProjectRow)}
                    </section>
                  )}

                  {context.searchedInitiativeRows.length > 0 && (
                    <section {...stylex.attrs(styles.section)}>
                      <div {...stylex.attrs(styles.sectionHeader)}>
                        <span>Initiatives</span>
                        <span {...stylex.attrs(styles.sectionCount)}>{context.searchedInitiativeRows.length}</span>
                      </div>
                      {context.searchedInitiativeRows.map(renderInitiativeRow)}
                    </section>
                  )}

                  {context.searchTabs[0]?.count === 0 && (
                    <div {...stylex.attrs(styles.empty)}>
                      <div {...stylex.attrs(styles.emptyContent)}>
                        <p {...stylex.attrs(styles.emptyTitle)}>No results found</p>
                        <p {...stylex.attrs(styles.emptyDescription)}>Try a different issue key, title, owner, status, or team.</p>
                      </div>
                    </div>
                  )}
                </>
              )
            : context.searchResultTab === 'issues'
              ? context.searchedTickets.length > 0 && <div>{renderIssueRows()}</div>
              : context.searchResultTab === 'projects'
                ? context.searchedProjectRows.length > 0 && <div>{context.searchedProjectRows.map(renderProjectRow)}</div>
                : context.searchResultTab === 'initiatives'
                  ? context.searchedInitiativeRows.length > 0 && <div>{context.searchedInitiativeRows.map(renderInitiativeRow)}</div>
                  : null}

          {(context.searchResultTab === 'documents'
            || (context.searchResultTab !== 'all' && context.searchTabs.find(tab => tab.id === context.searchResultTab)?.count === 0)) && (
            <div {...stylex.attrs(styles.empty)}>
              <div {...stylex.attrs(styles.emptyContent)}>
                <p {...stylex.attrs(styles.emptyTitle)}>
                  {context.searchResultTab === 'documents' ? 'No searchable documents' : 'No results found'}
                </p>
                <p {...stylex.attrs(styles.emptyDescription)}>
                  {context.searchResultTab === 'documents'
                    ? 'Document search will appear when workspace documents are connected.'
                    : 'Try a different issue key, title, owner, status, or team.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  },
})
