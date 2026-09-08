import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingInline: '1rem',
    paddingBlock: '0.625rem',
  },
  spaceWrap: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem' },
  spacePill: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingInline: '0.5rem',
    paddingBlock: '0.25rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    color: colors['--color-slate-300'],
  },
  closeButton: {
    display: 'inline-flex',
    width: '1.75rem',
    height: '1.75rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.08)' },
    color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] },
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' },
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    transitionProperty: 'color, border-color, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  closeIcon: { width: '0.875rem', height: '0.875rem' },
})

export default defineComponent({
  name: 'CreateTicketModalHeader',
  props: {
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    selectedSpaceName: {
      type: String,
      required: true,
    },
  },
  emits: {
    close: () => true,
  },
  setup(props, { emit }) {
    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.spaceWrap)}>
          <span {...stylex.attrs(styles.spacePill)}>
            {props.selectedSpaceName}
          </span>
        </div>
        <button
          type="button"
          {...stylex.attrs(styles.closeButton)}
          disabled={props.isCreatePending}
          aria-label="Close"
          onClick={() => emit('close')}
        >
          <svg {...stylex.attrs(styles.closeIcon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
          </svg>
        </button>
      </div>
    )
  },
})
