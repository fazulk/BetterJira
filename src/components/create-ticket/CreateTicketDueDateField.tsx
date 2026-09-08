import { defineComponent } from 'vue'

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
}

export default defineComponent({
  name: 'CreateTicketDueDateField',
  props: {
    dueDateValue: {
      type: String,
      required: true,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    'update:dueDate': (value: string) => typeof value === 'string',
  },
  setup(props, { emit }) {
    return () => (
      <div class="space-y-2">
        <label for="create-field-duedate" class="flex items-center gap-2 text-sm font-medium text-slate-200">
          <span>Due Date</span>
        </label>
        <input
          id="create-field-duedate"
          name="create-due-date"
          value={props.dueDateValue}
          type="date"
          class="rounded-md border border-white/[0.08] bg-surface-0 px-2.5 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16]"
          disabled={props.isCreatePending}
          onInput={event => emit('update:dueDate', getInputValue(event))}
        />
      </div>
    )
  },
})
