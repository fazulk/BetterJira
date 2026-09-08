import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  label: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  input: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: colors['--color-surface-0'], paddingInline: '0.625rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-200'], outlineStyle: 'none', transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})

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
      <div>
        <label for="create-field-duedate" {...stylex.attrs(styles.label)}>
          <span>Due Date</span>
        </label>
        <input
          id="create-field-duedate"
          name="create-due-date"
          value={props.dueDateValue}
          type="date"
          {...stylex.attrs(styles.input)}
          disabled={props.isCreatePending}
          onInput={event => emit('update:dueDate', getInputValue(event))}
        />
      </div>
    )
  },
})
