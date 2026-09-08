import type { PropType } from 'vue'
import type { SavedViewRow, SavedViewRowFieldId } from '@/features/ticket-list/types'
import { defineComponent } from 'vue'
import { Icon } from '#components'

export default defineComponent({
  name: 'TicketListSavedViewsView',
  props: {
    rows: {
      type: Array as PropType<SavedViewRow[]>,
      required: true,
    },
    gridTemplate: {
      type: String,
      required: true,
    },
    isFieldVisible: {
      type: Function as PropType<(field: SavedViewRowFieldId) => boolean>,
      required: true,
    },
    getRelativeTimeLabel: {
      type: Function as PropType<(value?: string) => string>,
      required: true,
    },
  },
  emits: {
    open: (viewId: string) => typeof viewId === 'string',
  },
  setup(props, { emit }) {
    return () => (
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="grid border-b border-white/[0.06] px-4 py-2 text-[12px] text-[#777a83]" style={{ gridTemplateColumns: props.gridTemplate }}>
          <span>Name</span>
          {props.isFieldVisible('type') && <span>Type</span>}
          {props.isFieldVisible('items') && <span>Items</span>}
          {props.isFieldVisible('owner') && <span>Owner</span>}
          {props.isFieldVisible('updated') && <span>Updated</span>}
        </div>

        {props.rows.length
          ? (
              <div>
                {props.rows.map(row => (
                  <button
                    key={row.id}
                    type="button"
                    class="linear-row grid min-h-12 w-full items-center px-4 py-2 text-left"
                    style={{ gridTemplateColumns: props.gridTemplate }}
                    onClick={() => emit('open', row.viewId)}
                  >
                    <span class="flex min-w-0 items-center gap-3 pr-4">
                      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: row.color }} aria-hidden="true">
                        <Icon name={`lucide:${row.icon}`} class="h-4 w-4" />
                      </span>
                      <span class="min-w-0">
                        <span class="block truncate text-[13px] font-medium text-[#e6e7ea]">{row.name}</span>
                        <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{row.description}</span>
                      </span>
                    </span>

                    {props.isFieldVisible('type') && <span class="truncate text-[12px] text-[#aeb0b7]">{row.category}</span>}
                    {props.isFieldVisible('items') && <span class="text-[12px] text-[#8f9198]">{row.count}</span>}
                    {props.isFieldVisible('owner') && <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{row.owner}</span>}
                    {props.isFieldVisible('updated') && <span class="truncate text-[12px] text-[#777a83]">{props.getRelativeTimeLabel(row.updatedAt)}</span>}
                  </button>
                ))}
              </div>
            )
          : (
              <div class="flex h-full min-h-80 items-center justify-center px-6 text-center">
                <div class="max-w-sm">
                  <p class="text-[13px] font-medium text-[#d7d8dc]">No saved views found</p>
                  <p class="mt-1 text-[12px] text-[#777a83]">Create a custom issue or project view to see it here.</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
