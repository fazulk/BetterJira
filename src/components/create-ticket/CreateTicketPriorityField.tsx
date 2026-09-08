import type { PropType } from 'vue'
import type { CreateFieldOption } from '@/features/create-ticket/types'
import { defineComponent, ref } from 'vue'
import { priorityConfig } from '@/features/create-ticket/constants'

function getSelectValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLSelectElement ? target.value : ''
}

export default defineComponent({
  name: 'CreateTicketPriorityField',
  props: {
    fieldError: {
      type: String as PropType<string | null>,
      default: null,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    isFieldLoading: {
      type: Boolean,
      required: true,
    },
    options: {
      type: Array as PropType<CreateFieldOption[]>,
      required: true,
    },
    priorityName: {
      type: String,
      required: true,
    },
    priorityValue: {
      type: String,
      required: true,
    },
  },
  emits: {
    'update:priority': (value: string) => typeof value === 'string',
  },
  setup(props, { emit, expose }) {
    const prioritySelectRef = ref<HTMLSelectElement | null>(null)

    function focus(): void {
      prioritySelectRef.value?.focus()
    }

    expose({ focus })

    return () => (
      <div class="space-y-2">
        <label for="create-field-priority" class="flex items-center gap-2 text-sm font-medium text-slate-200">
          <span>Priority</span>
        </label>
        <div class="group relative flex items-center gap-1.5">
          <div class="flex items-center gap-2">
            <select
              id="create-field-priority"
              ref={prioritySelectRef}
              name="create-priority"
              value={props.priorityValue}
              class="rounded-md border border-white/[0.08] bg-surface-0 px-2.5 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]"
              disabled={props.isCreatePending || props.isFieldLoading}
              onChange={event => emit('update:priority', getSelectValue(event))}
            >
              {props.options.map(option => (
                <option key={`priority-${option.value || 'empty'}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div class="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
              <span class={['h-1.5 w-1.5 rounded-full', priorityConfig[props.priorityName]?.bg || 'bg-slate-500']} />
              <span class="text-[11px] font-medium text-slate-400">{props.priorityName}</span>
            </div>
          </div>
        </div>
        {props.isFieldLoading && <p class="text-xs text-slate-500">Loading priority options...</p>}
        {!props.isFieldLoading && props.fieldError && <p class="text-xs text-rose-300">{props.fieldError}</p>}
      </div>
    )
  },
})
