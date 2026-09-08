import * as stylex from '@stylexjs/stylex'
import { defineComponent, Teleport, Transition } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  overlay: { position: 'fixed', insetInline: 0, bottom: '1.25rem', zIndex: 40, display: 'flex', justifyContent: 'center', paddingInline: '1rem' },
  bar: { display: 'flex', maxWidth: 'calc(100vw - 2rem)', alignItems: 'center', gap: '0.25rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(18, 19, 22, 0.95)', padding: '0.375rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)', backdropFilter: 'blur(8px)' },
  countGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem', borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.625rem', fontSize: '0.75rem', lineHeight: '1rem', color: '#d7d8dc' },
  countBadge: { display: 'flex', height: '1.25rem', minWidth: '1.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.045)', paddingInline: '0.375rem', fontSize: 11, fontWeight: 600, color: colors['--color-slate-200'] },
  nowrap: { whiteSpace: 'nowrap' },
  actionButton: { height: '1.75rem', borderRadius: '0.375rem', paddingInline: '0.625rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': '#bfc1c8', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  clearButton: { color: { 'default': '#8f9198', ':hover': '#f0f1f4' } },
})

export default defineComponent({
  name: 'TicketListSelectionBar',
  props: {
    count: {
      type: Number,
      required: true,
    },
    canCreateChild: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    open: () => true,
    copy: () => true,
    createChild: () => true,
    clear: () => true,
  },
  setup(props, { emit }) {
    return () => (
      <Teleport to="body">
        <Transition name="fade">
          {props.count > 0 && (
            <div
              {...stylex.attrs(styles.overlay)}
              aria-live="polite"
            >
              <div {...stylex.attrs(styles.bar)}>
                <div {...stylex.attrs(styles.countGroup)}>
                  <span {...stylex.attrs(styles.countBadge)}>
                    {props.count}
                  </span>
                  <span {...stylex.attrs(styles.nowrap)}>
                    {props.count === 1 ? 'issue selected' : 'issues selected'}
                  </span>
                </div>

                <button type="button" {...stylex.attrs(styles.actionButton)} onClick={() => emit('open')}>Open</button>
                <button type="button" {...stylex.attrs(styles.actionButton)} onClick={() => emit('copy')}>Copy IDs</button>
                {props.canCreateChild && (
                  <button type="button" {...stylex.attrs(styles.actionButton)} onClick={() => emit('createChild')}>Add sub-issue</button>
                )}
                <button type="button" {...stylex.attrs(styles.actionButton, styles.clearButton)} onClick={() => emit('clear')}>Clear</button>
              </div>
            </div>
          )}
        </Transition>
      </Teleport>
    )
  },
})
