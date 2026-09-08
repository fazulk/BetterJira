import { defineComponent, reactive } from 'vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'

export default defineComponent({
  name: 'TicketListFilterMenu',
  setup() {
    const context = reactive(useTicketListContext())

    function renderCheckbox(selected: boolean) {
      return (
        <span class={['flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition', selected ? 'border-[#4dbb83] bg-[#4dbb83] text-[#0d0e10]' : 'border-white/[0.18] text-transparent']}>
          ✓
        </span>
      )
    }

    function renderSwitch(checked: boolean) {
      return (
        <span class={['flex h-4 w-7 items-center rounded-full border p-0.5 transition', checked ? 'border-white/[0.14] bg-white/[0.08]' : 'border-white/[0.08] bg-white/[0.03]']}>
          <span class={['h-2.5 w-2.5 rounded-full bg-[#f0f1f4] transition', checked ? 'translate-x-3' : 'translate-x-0']} />
        </span>
      )
    }

    return () => context.filterMenuOpen && !context.selectedTicket && (
      <div
        data-ticket-list-menu="filters"
        class="absolute right-10 top-10 z-30 flex max-h-[35rem] w-[34rem] overflow-hidden rounded-lg border border-white/[0.08] bg-[#15161a] shadow-xl shadow-black/40"
      >
        <div class="flex w-[15rem] shrink-0 flex-col border-r border-white/[0.06] py-1.5">
          <div class="px-2 pb-1">
            <input
              v-model={context.filterFieldSearchQuery}
              type="text"
              name="linear-filter-field-search"
              class="h-8 w-full rounded-md border border-white/[0.06] bg-black/20 px-2 text-[12px] text-[#d7d8dc] outline-none placeholder:text-[#6f727b] focus:border-white/[0.14]"
              placeholder="Add Filter..."
            />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            {context.visibleFilterMenuEntries.map(entry => (
              <button
                key={entry.id}
                type="button"
                class={['flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] transition', context.activeFilterEntryId === entry.id ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]']}
                onMouseenter={() => { context.activeFilterEntryId = entry.id }}
                onFocus={() => { context.activeFilterEntryId = entry.id }}
                onClick={() => {
                  if (entry.id === 'shared') {
                    context.toggleFilterClause('shared', 'shared', 'Shared')
                  }
                  else {
                    context.activeFilterEntryId = entry.id
                  }
                }}
              >
                {entry.id === 'shared'
                  ? renderCheckbox(context.isFilterClauseSelected('shared', 'shared'))
                  : <span class="w-4 shrink-0 text-center text-[#8f9198]">{entry.icon}</span>}
                <span class="min-w-0 flex-1 truncate">{entry.label}</span>
                {entry.hasSubmenu && <span class="text-[11px] text-[#777a83]">›</span>}
              </button>
            ))}
            {context.visibleFilterMenuEntries.length === 0 && (
              <div class="px-3 py-8 text-center text-[12px] text-[#777a83]">No matching filters</div>
            )}
          </div>

          {context.isIssueDisplayView
            ? (
                <div class="border-t border-white/[0.06] px-3 py-2">
                  <p class="mb-2 text-[12px] font-medium text-[#d7d8dc]">Issue inclusion</p>
                  <label class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1.5">
                    <span class="text-[12px] text-[#aeb0b7]">Completed issues</span>
                    <select
                      v-model={context.completedRange}
                      name="filter-completed-issues-range"
                      class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
                    >
                      {context.issueVisibilityRangeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>

                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-4 rounded-md py-1.5 text-left transition hover:bg-white/[0.025]"
                    role="switch"
                    aria-checked={context.showSubIssues}
                    onClick={() => { context.showSubIssues = !context.showSubIssues }}
                  >
                    <span class="text-[12px] text-[#aeb0b7]">Show sub-issues</span>
                    {renderSwitch(context.showSubIssues)}
                  </button>

                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-4 rounded-md py-1.5 text-left transition hover:bg-white/[0.025]"
                    role="switch"
                    aria-checked={context.showBacklogIssues}
                    onClick={() => { context.showBacklogIssues = !context.showBacklogIssues }}
                  >
                    <span class="text-[12px] text-[#aeb0b7]">Show backlog</span>
                    {renderSwitch(context.showBacklogIssues)}
                  </button>
                </div>
              )
            : context.isProjectDisplayView
              ? (
                  <div class="border-t border-white/[0.06] px-3 py-2">
                    <p class="mb-2 text-[12px] font-medium text-[#d7d8dc]">Project inclusion</p>
                    <label class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1.5">
                      <span class="text-[12px] text-[#aeb0b7]">Completed projects</span>
                      <select
                        v-model={context.projectClosedRange}
                        name="filter-completed-projects-range"
                        class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
                      >
                        {context.projectClosedRangeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                )
              : null}
        </div>

        <div class="min-w-0 flex-1 py-1.5">
          <div class="mb-1 flex h-8 items-center justify-between gap-3 border-b border-white/[0.06] px-3 pb-1">
            <span class="text-[12px] font-medium text-[#d7d8dc]">Filters</span>
            <button
              type="button"
              class="rounded px-1.5 py-1 text-[12px] text-[#aeb0b7] hover:bg-white/[0.05] hover:text-[#f0f1f4] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!context.hasModifiedFilterOptions}
              onClick={context.clearCurrentViewFilters}
            >
              Reset
            </button>
          </div>

          {context.activeFilterEntryId === 'dates'
            ? (
                <>
                  <div class="border-b border-white/[0.06] px-2 pb-1">
                    {context.dateFilterFields.map(field => (
                      <button
                        key={field.id}
                        type="button"
                        class={['flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]', context.activeDateFilterId === field.id ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]']}
                        onMouseenter={() => { context.activeDateFilterId = field.id }}
                        onClick={() => { context.activeDateFilterId = field.id }}
                      >
                        <span class="w-4 text-center text-[#8f9198]">{field.icon}</span>
                        <span class="flex-1 truncate">{field.label}</span>
                        <span class="text-[11px] text-[#777a83]">›</span>
                      </button>
                    ))}
                  </div>
                  <div class="px-2 pt-1">
                    {context.activeDateFilterOptions.map((option) => {
                      const selected = context.isFilterClauseSelected(context.activeDateFilterId, option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          class={['flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition', selected ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]']}
                          onClick={() => context.toggleFilterClause(context.activeDateFilterId, option.value, option.label)}
                        >
                          {renderCheckbox(selected)}
                          <span class="w-4 text-center text-[#8f9198]">◷</span>
                          <span class="min-w-0 flex-1 truncate">{option.label}</span>
                          <span class="text-[11px] text-[#6f727b]">{option.count}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            : context.activeFilterEntryId === 'projectProperties'
              ? (
                  <>
                    <div class="border-b border-white/[0.06] px-2 pb-1">
                      {context.projectPropertyFilterFields.map(field => (
                        <button
                          key={field.id}
                          type="button"
                          class={['flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]', context.activeProjectPropertyFilterId === field.id ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]']}
                          onMouseenter={() => { context.activeProjectPropertyFilterId = field.id }}
                          onClick={() => { context.activeProjectPropertyFilterId = field.id }}
                        >
                          <span class="w-4 text-center text-[#8f9198]">{field.icon}</span>
                          <span class="flex-1 truncate">{field.label}</span>
                          <span class="text-[11px] text-[#777a83]">›</span>
                        </button>
                      ))}
                    </div>
                    <div class="px-2 pt-1">
                      {context.activeFilterOptions.map((option) => {
                        const selected = context.isFilterClauseSelected(context.activeProjectPropertyFilterId, option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            class={['flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition', selected ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]']}
                            onClick={() => context.toggleFilterClause(context.activeProjectPropertyFilterId, option.value, option.label)}
                          >
                            {renderCheckbox(selected)}
                            <span class="w-4 text-center text-[#8f9198]">{option.icon}</span>
                            <span class="min-w-0 flex-1 truncate">{option.label}</span>
                            <span class="text-[11px] text-[#6f727b]">{option.count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )
              : (
                  <>
                    <div class="px-2 pb-1">
                      <input
                        v-model={context.filterSearchQuery}
                        type="text"
                        name="linear-filter-search"
                        class="h-8 w-full rounded-md border border-white/[0.06] bg-black/20 px-2 text-[12px] text-[#d7d8dc] outline-none placeholder:text-[#6f727b] focus:border-white/[0.14]"
                        placeholder={`Filter ${context.activeFilterEntry.label.toLowerCase()}...`}
                      />
                    </div>
                    <div class="max-h-[30rem] overflow-y-auto px-2">
                      {context.activeFilterOptions.map((option) => {
                        const selected = context.isFilterClauseSelected(context.activeValueFilterFieldId, option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            class={['flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition', selected ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]']}
                            onClick={() => context.toggleFilterClause(context.activeValueFilterFieldId, option.value, option.label)}
                          >
                            {renderCheckbox(selected)}
                            <span class="w-4 shrink-0 text-center text-[#8f9198]">{option.icon}</span>
                            <span class="min-w-0 flex-1 truncate">{option.label}</span>
                            <span class="text-[11px] text-[#6f727b]">
                              {context.activeValueFilterFieldId === 'sprint' ? `${option.count} issues · ${option.storyPoints ?? 0} pts` : option.count}
                            </span>
                          </button>
                        )
                      })}
                      {context.activeFilterOptions.length === 0 && (
                        <div class="px-3 py-8 text-center text-[12px] text-[#777a83]">No matching options</div>
                      )}
                    </div>
                  </>
                )}
        </div>
      </div>
    )
  },
})
