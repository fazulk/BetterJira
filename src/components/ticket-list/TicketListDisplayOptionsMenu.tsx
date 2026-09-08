import { defineComponent, reactive } from 'vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import TicketListGroupOrderingMenu from './TicketListGroupOrderingMenu'

function getSelectValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLSelectElement ? target.value : ''
}

export default defineComponent({
  name: 'TicketListDisplayOptionsMenu',
  setup() {
    const context = reactive(useTicketListContext())

    function renderCheck(visible: boolean) {
      return (
        <span class={['flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]', visible ? 'border-white/[0.18] text-slate-200' : 'border-white/[0.1] text-transparent']}>
          ✓
        </span>
      )
    }

    return () => context.displayOptionsOpen && !context.selectedTicket && (
      <div
        data-ticket-list-menu="display-options"
        class="absolute right-0 top-10 z-20 w-[22rem] overflow-hidden rounded-lg border border-white/[0.08] bg-surface-2 shadow-xl shadow-black/35"
      >
        {context.groupOrderingOpen && <TicketListGroupOrderingMenu />}

        {!context.groupOrderingOpen && (
          <div class="space-y-0.5 p-2">
            <div class="rounded-md px-2 py-1.5">
              <div class="grid grid-cols-2 gap-1 rounded-md bg-black/20 p-0.5">
                <button type="button" class="rounded bg-white/[0.08] px-2 py-1 text-[12px] text-[#f0f1f4]">List</button>
                <button type="button" class="rounded px-2 py-1 text-[12px] text-[#777a83]" disabled>Board</button>
              </div>
            </div>

            {context.isIssueDisplayView && (
              <>
                <label class="grid grid-cols-[7.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.025]">
                  <span class="text-[12px] text-[#8f9198]">Grouping</span>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md text-[#aeb0b7] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
                    aria-label="Group ordering"
                    title="Group ordering"
                    onClick={(event) => {
                      event.preventDefault()
                      context.openGroupOrdering()
                    }}
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 12V4m0 0L2.75 6.25M5 4l2.25 2.25M11 4v8m0 0 2.25-2.25M11 12 8.75 9.75" />
                    </svg>
                  </button>
                  <select
                    value={context.listGrouping}
                    name="issue-grouping"
                    class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
                    onChange={(event) => { context.listGrouping = getSelectValue(event) as typeof context.listGrouping }}
                  >
                    {context.issueGroupingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>

                <label class="grid grid-cols-[7.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.025]">
                  <span class="text-[12px] text-[#8f9198]">Ordering</span>
                  <button
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md text-[#aeb0b7] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
                    aria-label={context.listOrderingDirection === 'asc' ? 'Order ascending' : 'Order descending'}
                    title={context.listOrderingDirection === 'asc' ? 'Order ascending' : 'Order descending'}
                    onClick={(event) => {
                      event.preventDefault()
                      context.toggleOrderingDirection()
                    }}
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                      {context.listOrderingDirection === 'asc'
                        ? <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 12V4m0 0L2.5 6.25M4.75 4 7 6.25M9 5h4.5M9 8h3.5M9 11h2" />
                        : <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 4v8m0 0L7 9.75M4.75 12 2.5 9.75M9 5h2M9 8h3.5M9 11h4.5" />}
                    </svg>
                  </button>
                  <select
                    value={context.listOrdering}
                    name="issue-ordering"
                    class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
                    onChange={(event) => { context.listOrdering = getSelectValue(event) as typeof context.listOrdering }}
                  >
                    {context.issueOrderingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
        )}

        {!context.groupOrderingOpen && context.isIssueDisplayView && (
          <div class="border-t border-white/[0.06] p-3">
            <p class="mb-2 text-[12px] font-medium text-[#d7d8dc]">List options</p>
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="text-[12px] text-[#8f9198]">Display properties</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              {context.issueRowFieldOptions.map(field => (
                <button
                  key={field.id}
                  type="button"
                  class={['inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition', context.isIssueRowFieldVisible(field.id) ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]' : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]']}
                  disabled={context.visibleIssueRowFields.length === 1 && context.isIssueRowFieldVisible(field.id)}
                  aria-pressed={context.isIssueRowFieldVisible(field.id)}
                  onClick={() => context.toggleIssueRowField(field.id)}
                >
                  <span>{field.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!context.groupOrderingOpen && context.isIssueDisplayView
          ? (
              <div class="flex items-center justify-end gap-4 border-t border-white/[0.06] px-3 py-2">
                <button type="button" class="rounded px-1.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.05] hover:text-[#f0f1f4]" onClick={context.resetIssueDisplayOptions}>
                  Reset
                </button>
              </div>
            )
          : !context.groupOrderingOpen && context.isProjectDisplayView
              ? (
                  <div class="border-t border-white/[0.06] p-3">
                    <div class="space-y-2 pb-3">
                      <label class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1">
                        <span class="text-[12px] text-[#8f9198]">Grouping</span>
                        <select
                          value={context.projectGrouping}
                          name="project-grouping"
                          class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
                          onChange={(event) => { context.projectGrouping = getSelectValue(event) as typeof context.projectGrouping }}
                        >
                          {context.projectGroupingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </label>
                      <label class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1">
                        <span class="text-[12px] text-[#8f9198]">Ordering</span>
                        <select
                          value={context.projectOrdering}
                          name="project-ordering"
                          class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
                          onChange={(event) => { context.projectOrdering = getSelectValue(event) as typeof context.projectOrdering }}
                        >
                          {context.projectOrderingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <div class="mb-2 flex items-center justify-between gap-3">
                      <span class="text-[12px] text-[#8f9198]">Visible properties</span>
                      <span class="text-[11px] text-[#6f727b]">
                        {context.visibleProjectRowFields.length}
                        {' '}
                        shown
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      {context.projectRowFieldOptions.map((field) => {
                        const visible = context.isProjectRowFieldVisible(field.id)
                        return (
                          <button
                            key={field.id}
                            type="button"
                            class={['inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition', visible ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]' : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]']}
                            disabled={context.visibleProjectRowFields.length === 1 && visible}
                            onClick={() => context.toggleProjectRowField(field.id)}
                          >
                            {renderCheck(visible)}
                            <span>{field.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div class="mt-3 flex items-center justify-end border-t border-white/[0.06] pt-2">
                      <button type="button" class="rounded px-1.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.05] hover:text-[#f0f1f4]" onClick={context.resetProjectDisplayOptions}>Reset</button>
                    </div>
                  </div>
                )
              : !context.groupOrderingOpen && context.isInitiativeDisplayView
                  ? (
                      <div class="border-t border-white/[0.06] p-3">
                        <div class="mb-2 flex items-center justify-between gap-3">
                          <span class="text-[12px] text-[#8f9198]">Visible properties</span>
                          <span class="text-[11px] text-[#6f727b]">
                            {context.visibleInitiativeRowFields.length}
                            {' '}
                            shown
                          </span>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                          {context.initiativeRowFieldOptions.map((field) => {
                            const visible = context.isInitiativeRowFieldVisible(field.id)
                            return (
                              <button
                                key={field.id}
                                type="button"
                                class={['inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition', visible ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]' : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]']}
                                disabled={context.visibleInitiativeRowFields.length === 1 && visible}
                                onClick={() => context.toggleInitiativeRowField(field.id)}
                              >
                                {renderCheck(visible)}
                                <span>{field.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  : !context.groupOrderingOpen && context.isViewsDirectory
                      ? (
                          <div class="border-t border-white/[0.06] p-3">
                            <div class="mb-2 flex items-center justify-between gap-3">
                              <span class="text-[12px] text-[#8f9198]">Visible properties</span>
                              <span class="text-[11px] text-[#6f727b]">
                                {context.visibleSavedViewRowFields.length}
                                {' '}
                                shown
                              </span>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                              {context.savedViewRowFieldOptions.map((field) => {
                                const visible = context.isSavedViewRowFieldVisible(field.id)
                                return (
                                  <button
                                    key={field.id}
                                    type="button"
                                    class={['inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition', visible ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]' : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]']}
                                    disabled={context.visibleSavedViewRowFields.length === 1 && visible}
                                    onClick={() => context.toggleSavedViewRowField(field.id)}
                                  >
                                    {renderCheck(visible)}
                                    <span>{field.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      : null}
      </div>
    )
  },
})
