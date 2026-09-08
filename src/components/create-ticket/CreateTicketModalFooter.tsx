import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingInline: '1rem',
    paddingBlock: '0.75rem',
  },
  leftActions: { display: 'flex', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' },
  rightActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' },
  attachmentButton: {
    display: 'inline-flex',
    width: '1.75rem',
    height: '1.75rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' },
    color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] },
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' },
    transitionProperty: 'color, border-color, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: { 'default': 'pointer', ':disabled': 'not-allowed' },
    opacity: { 'default': 1, ':disabled': 0.5 },
  },
  attachmentIcon: { width: '0.875rem', height: '0.875rem' },
  createMoreLabel: {
    display: 'inline-flex',
    height: '1.75rem',
    alignItems: 'center',
    gap: '0.5rem',
    borderRadius: '0.375rem',
    paddingInline: '0.5rem',
    fontSize: 12,
    color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] },
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.035)' },
    transitionProperty: 'color, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  checkbox: {
    width: '0.875rem',
    height: '0.875rem',
    borderRadius: '0.25rem',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    accentColor: '#5e6ad2',
  },
  secondaryButton: {
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' },
    paddingInline: '0.75rem',
    paddingBlock: '0.375rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] },
    backgroundColor: 'transparent',
    transitionProperty: 'color, border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  primaryButton: {
    borderRadius: '0.375rem',
    backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)' },
    paddingInline: '0.75rem',
    paddingBlock: '0.375rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    color: colors['--color-white'],
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: { 'default': 'pointer', ':disabled': 'not-allowed' },
    opacity: { 'default': 1, ':disabled': 0.6 },
  },
})

function getCheckedValue(event: Event): boolean {
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : false
}

export default defineComponent({
  name: 'CreateTicketModalFooter',
  props: {
    canSubmit: {
      type: Boolean,
      required: true,
    },
    createMore: {
      type: Boolean,
      required: true,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    isLocalSpace: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    'attachment': () => true,
    'close': () => true,
    'submit': () => true,
    'update:createMore': (value: boolean) => typeof value === 'boolean',
  },
  setup(props, { emit }) {
    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.leftActions)}>
          <button
            type="button"
            {...stylex.attrs(styles.attachmentButton)}
            disabled={props.isCreatePending}
            aria-label="Add attachment"
            onClick={() => emit('attachment')}
          >
            <svg {...stylex.attrs(styles.attachmentIcon)} fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.82l8.48-8.49" />
            </svg>
          </button>
          <label {...stylex.attrs(styles.createMoreLabel)}>
            <input
              checked={props.createMore}
              type="checkbox"
              {...stylex.attrs(styles.checkbox)}
              disabled={props.isCreatePending}
              onChange={event => emit('update:createMore', getCheckedValue(event))}
            />
            <span>Create more</span>
          </label>
        </div>
        <div {...stylex.attrs(styles.rightActions)}>
          <button
            type="button"
            {...stylex.attrs(styles.secondaryButton)}
            disabled={props.isCreatePending}
            onClick={() => emit('close')}
          >
            Cancel
          </button>
          <button
            type="button"
            {...stylex.attrs(styles.primaryButton)}
            disabled={!props.canSubmit}
            onClick={() => emit('submit')}
          >
            {props.isCreatePending ? 'Creating...' : (props.isLocalSpace ? 'Create local issue' : 'Create issue')}
          </button>
        </div>
      </div>
    )
  },
})
