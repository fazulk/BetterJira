import { defineComponent, reactive } from 'vue'
import { Icon } from '#components'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import IssueRow from '../IssueRow'

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
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
          class="linear-row grid min-h-12 w-full grid-cols-[minmax(220px,1fr)_108px_120px_132px] items-center px-4 py-2 text-left"
          onMouseenter={() => context.prefetchTicket(project.key)}
          onClick={() => context.openTicket(project.key)}
        >
          <span class="min-w-0 pr-4">
            <span class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#e6e7ea]">
              <Icon
                name={`lucide:${getProjectAppearance(project.key).icon}`}
                class="h-3.5 w-3.5 shrink-0"
                style={{ color: getProjectAppearance(project.key).color }}
                aria-hidden="true"
              />
              <span class="truncate">{project.name}</span>
            </span>
            <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">
              {project.key}
              {' '}
              ·
              {' '}
              {project.spaceName}
            </span>
          </span>
          <span>
            <span class={['inline-flex rounded-full border px-2 py-0.5 text-[11px]', context.getProjectHealthClass(project.health)]}>
              {project.health}
            </span>
          </span>
          <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{project.lead}</span>
          <span class="text-[12px] text-[#8f9198]">
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
          class="linear-row grid min-h-12 w-full grid-cols-[minmax(220px,1fr)_108px_120px_132px] items-center px-4 py-2 text-left"
          onMouseenter={() => context.prefetchTicket(initiative.id)}
          onClick={() => context.openTicket(initiative.id)}
        >
          <span class="min-w-0 pr-4">
            <span class="block truncate text-[13px] font-medium text-[#e6e7ea]">{initiative.name}</span>
            <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{initiative.description}</span>
          </span>
          <span>
            <span class={['inline-flex rounded-full border px-2 py-0.5 text-[11px]', context.getProjectHealthClass(initiative.health)]}>
              {initiative.health}
            </span>
          </span>
          <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{initiative.lead}</span>
          <span class="text-[12px] text-[#8f9198]">
            {initiative.projectCount}
            {' '}
            projects
          </span>
        </button>
      )
    }

    return () => context.currentView === 'search' && (
      <div class="min-h-0 flex-1 overflow-hidden">
        <div class="shrink-0 border-b border-white/[0.06] px-4 py-3">
          <div class="flex max-w-3xl items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2">
            <span class="text-[12px] text-[#777a83]">Search</span>
            <input
              ref={context.setSearchInputRef}
              value={context.issueSearch}
              type="search"
              class="min-w-0 flex-1 bg-transparent text-[13px] text-[#e6e7ea] outline-none placeholder:text-[#6f727b]"
              placeholder="Search issues, projects, initiatives..."
              onInput={(event) => { context.issueSearch = getInputValue(event) }}
            />
            {context.issueSearch && (
              <button type="button" class="rounded px-1.5 py-0.5 text-[11px] text-[#777a83] hover:bg-white/[0.06] hover:text-[#d7d8dc]" onClick={() => { context.issueSearch = '' }}>
                Clear
              </button>
            )}
          </div>

          <div class="mt-3 flex items-center gap-1">
            {context.searchTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                class={['rounded-full px-3 py-1.5 text-[12px] transition', context.searchResultTab === tab.id ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]']}
                onClick={() => { context.searchResultTab = tab.id }}
              >
                {tab.label}
                <span class="ml-1 text-[#6f727b]">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div class="h-full overflow-y-auto pb-16">
          {context.searchResultTab === 'all'
            ? (
                <>
                  {context.searchedTickets.length > 0 && (
                    <section class="border-b border-white/[0.06]">
                      <div class="flex h-8 items-center gap-2 bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]">
                        <span>Issues</span>
                        <span class="text-[#6f727b]">{context.searchedTickets.length}</span>
                      </div>
                      {renderIssueRows(context.searchedTickets.slice(0, 12))}
                    </section>
                  )}

                  {context.searchedProjectRows.length > 0 && (
                    <section class="border-b border-white/[0.06]">
                      <div class="flex h-8 items-center gap-2 bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]">
                        <span>Projects</span>
                        <span class="text-[#6f727b]">{context.searchedProjectRows.length}</span>
                      </div>
                      {context.searchedProjectRows.slice(0, 8).map(renderProjectRow)}
                    </section>
                  )}

                  {context.searchedInitiativeRows.length > 0 && (
                    <section class="border-b border-white/[0.06]">
                      <div class="flex h-8 items-center gap-2 bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]">
                        <span>Initiatives</span>
                        <span class="text-[#6f727b]">{context.searchedInitiativeRows.length}</span>
                      </div>
                      {context.searchedInitiativeRows.map(renderInitiativeRow)}
                    </section>
                  )}

                  {context.searchTabs[0]?.count === 0 && (
                    <div class="flex min-h-80 items-center justify-center px-6 text-center">
                      <div class="max-w-sm">
                        <p class="text-[13px] font-medium text-[#d7d8dc]">No results found</p>
                        <p class="mt-1 text-[12px] text-[#777a83]">Try a different issue key, title, owner, status, or team.</p>
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
            <div class="flex min-h-80 items-center justify-center px-6 text-center">
              <div class="max-w-sm">
                <p class="text-[13px] font-medium text-[#d7d8dc]">
                  {context.searchResultTab === 'documents' ? 'No searchable documents' : 'No results found'}
                </p>
                <p class="mt-1 text-[12px] text-[#777a83]">
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
