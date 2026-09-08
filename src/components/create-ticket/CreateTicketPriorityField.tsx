import type { PropType } from 'vue'
import type { CreatePriorityTone } from '@/features/create-ticket/constants'
import type { CreateFieldOption } from '@/features/create-ticket/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, ref } from 'vue'
import { priorityConfig } from '@/features/create-ticket/constants'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  controlRow: { position: 'relative', display: 'flex', alignItems: 'center', gap: '0.375rem' },
  controlGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  select: {
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    backgroundColor: colors['--color-surface-0'],
    paddingInline: '0.625rem',
    paddingBlock: '0.375rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    color: colors['--color-slate-200'],
    outlineStyle: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  selectedPriority: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingInline: '0.625rem',
    paddingBlock: '0.375rem',
  },
  dot: {
    width: '0.375rem',
    height: '0.375rem',
    borderRadius: '9999px',
  },
  highestDot: { backgroundColor: colors['--color-rose-400'] },
  highDot: { backgroundColor: colors['--color-orange-400'] },
  mediumDot: { backgroundColor: colors['--color-amber-400'] },
  lowDot: { backgroundColor: colors['--color-sky-400'] },
  lowestDot: { backgroundColor: colors['--color-slate-400'] },
  fallbackDot: { backgroundColor: colors['--color-slate-500'] },
  priorityName: { fontSize: 11, fontWeight: 500, color: colors['--color-slate-400'] },
  helper: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  error: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-300'] },
})

function priorityDotStyle(tone: CreatePriorityTone) {
  if (tone === 'highest')
    return styles.highestDot
  if (tone === 'high')
    return styles.highDot
  if (tone === 'medium')
    return styles.mediumDot
  if (tone === 'low')
    return styles.lowDot
  if (tone === 'lowest')
    return styles.lowestDot
  return styles.fallbackDot
}

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
      <div {...stylex.attrs(styles.root)}>
        <label for="create-field-priority" {...stylex.attrs(styles.label)}>
          <span>Priority</span>
        </label>
        <div {...stylex.attrs(styles.controlRow)}>
          <div {...stylex.attrs(styles.controlGroup)}>
            <select
              id="create-field-priority"
              ref={prioritySelectRef}
              name="create-priority"
              value={props.priorityValue}
              {...stylex.attrs(styles.select)}
              disabled={props.isCreatePending || props.isFieldLoading}
              onChange={event => emit('update:priority', getSelectValue(event))}
            >
              {props.options.map(option => (
                <option key={`priority-${option.value || 'empty'}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div {...stylex.attrs(styles.selectedPriority)}>
              <span {...stylex.attrs(styles.dot, priorityDotStyle(priorityConfig[props.priorityName]?.tone ?? 'fallback'))} />
              <span {...stylex.attrs(styles.priorityName)}>{props.priorityName}</span>
            </div>
          </div>
        </div>
        {props.isFieldLoading && <p {...stylex.attrs(styles.helper)}>Loading priority options...</p>}
        {!props.isFieldLoading && props.fieldError && <p {...stylex.attrs(styles.error)}>{props.fieldError}</p>}
      </div>
    )
  },
})
