import type { PropType } from 'vue'
import type { CommandMenuItem } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, nextTick, ref, Teleport, Transition, watch } from 'vue'
import { Icon } from '#components'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.55)', paddingInline: '1rem', paddingTop: '12vh', backdropFilter: 'blur(4px)' },
  panel: { width: '100%', maxWidth: '42rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: colors['--color-surface-1'], boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.45), 0 8px 10px -6px rgb(0 0 0 / 0.45)' },
  searchHeader: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', padding: '0.5rem' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  searchIcon: { width: '0.875rem', height: '0.875rem', flexShrink: 0, color: colors['--color-slate-500'] },
  input: { 'minWidth': 0, 'flex': '1', 'backgroundColor': 'transparent', 'fontSize': '0.875rem', 'lineHeight': '1.25rem', 'color': colors['--color-slate-100'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  esc: { display: { 'default': 'none', '@media (min-width: 40rem)': 'inline' }, borderRadius: '0.25rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 10, color: colors['--color-slate-500'] },
  list: { maxHeight: '28rem', overflowY: 'auto', paddingBlock: '0.5rem' },
  sectionLabel: { paddingInline: '1rem', paddingBottom: '0.25rem', paddingTop: '0.5rem', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: colors['--color-slate-600'] },
  row: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.75rem', paddingInline: '0.75rem', paddingBlock: '0.5rem', textAlign: 'left', transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.035)' } },
  rowActive: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  iconBox: { display: 'flex', height: '1.75rem', width: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', fontSize: 12 },
  issueIconBox: { borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', color: colors['--color-slate-500'] },
  commandIconBox: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', color: colors['--color-slate-400'] },
  rowSearchIcon: { width: '0.875rem', height: '0.875rem' },
  textBlock: { minWidth: 0, flex: '1' },
  itemLabel: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: colors['--color-slate-200'] },
  itemDescription: { marginTop: '0.125rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: colors['--color-slate-500'] },
  empty: { paddingInline: '1.5rem', paddingBlock: '2.5rem', textAlign: 'center' },
  emptyTitle: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-300'] },
  emptyText: { marginTop: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
})

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
}

export default defineComponent({
  name: 'TicketListCommandMenu',
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    items: {
      type: Array as PropType<CommandMenuItem[]>,
      required: true,
    },
    activeIndex: {
      type: Number,
      required: true,
    },
  },
  emits: {
    'close': () => true,
    'update:query': (value: string) => typeof value === 'string',
    'keydown': (event: KeyboardEvent) => event instanceof KeyboardEvent,
    'activate': (index: number) => typeof index === 'number',
    'run': (item: CommandMenuItem) => Boolean(item),
  },
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const listRef = ref<HTMLElement | null>(null)

    watch(
      () => props.activeIndex,
      (index) => {
        nextTick(() => {
          listRef.value
            ?.querySelector<HTMLElement>(`[data-command-index="${index}"]`)
            ?.scrollIntoView({ block: 'nearest' })
        })
      },
    )

    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          nextTick(() => inputRef.value?.focus())
        }
      },
    )

    function closeOnSelf(event: MouseEvent): void {
      if (event.target === event.currentTarget) {
        emit('close')
      }
    }

    return () => (
      <Teleport to="body">
        <Transition name="fade">
          {props.open && (
            <div
              {...stylex.attrs(styles.overlay)}
              onClick={closeOnSelf}
            >
              <div {...stylex.attrs(styles.panel)}>
                <div {...stylex.attrs(styles.searchHeader)}>
                  <div {...stylex.attrs(styles.searchBox)}>
                    <Icon name="lucide:search" {...stylex.attrs(styles.searchIcon)} aria-hidden="true" />
                    <input
                      ref={inputRef}
                      value={props.query}
                      type="text"
                      {...stylex.attrs(styles.input)}
                      placeholder="Find an issue, project, or command..."
                      onInput={event => emit('update:query', getInputValue(event))}
                      onKeydown={event => emit('keydown', event)}
                    />
                    <span {...stylex.attrs(styles.esc)}>Esc</span>
                  </div>
                </div>

                <div ref={listRef} {...stylex.attrs(styles.list)}>
                  {props.items.length
                    ? props.items.map((item, index) => (
                        <div key={item.id}>
                          {(index === 0 || item.section !== props.items[index - 1]?.section) && (
                            <div {...stylex.attrs(styles.sectionLabel)}>
                              {item.section}
                            </div>
                          )}
                          <button
                            type="button"
                            data-command-index={index}
                            {...stylex.attrs(styles.row, props.activeIndex === index ? styles.rowActive : null)}
                            onMouseenter={() => emit('activate', index)}
                            onClick={() => emit('run', item)}
                          >
                            <span
                              {...stylex.attrs(styles.iconBox, item.section === 'Issues' ? styles.issueIconBox : styles.commandIconBox)}
                            >
                              {item.icon === 'search'
                                ? <Icon name="lucide:search" {...stylex.attrs(styles.rowSearchIcon)} aria-hidden="true" />
                                : item.icon ?? '>'}
                            </span>
                            <span {...stylex.attrs(styles.textBlock)}>
                              <span {...stylex.attrs(styles.itemLabel)}>{item.label}</span>
                              <span {...stylex.attrs(styles.itemDescription)}>{item.description}</span>
                            </span>
                          </button>
                        </div>
                      ))
                    : (
                        <div {...stylex.attrs(styles.empty)}>
                          <p {...stylex.attrs(styles.emptyTitle)}>No results</p>
                          <p {...stylex.attrs(styles.emptyText)}>Try a different issue key, project name, title, assignee, or command.</p>
                        </div>
                      )}
                </div>
              </div>
            </div>
          )}
        </Transition>
      </Teleport>
    )
  },
})
