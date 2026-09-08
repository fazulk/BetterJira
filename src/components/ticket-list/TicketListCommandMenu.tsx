import type { PropType } from 'vue'
import type { CommandMenuItem } from '@/features/ticket-list/types'
import { defineComponent, nextTick, ref, Teleport, Transition, watch } from 'vue'
import { Icon } from '#components'

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
              class="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
              onClick={closeOnSelf}
            >
              <div class="w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1 shadow-xl shadow-black/45">
                <div class="border-b border-white/[0.06] p-2">
                  <div class="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2">
                    <Icon name="lucide:search" class="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <input
                      ref={inputRef}
                      value={props.query}
                      type="text"
                      class="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                      placeholder="Find an issue, project, or command..."
                      onInput={event => emit('update:query', getInputValue(event))}
                      onKeydown={event => emit('keydown', event)}
                    />
                    <span class="hidden rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">Esc</span>
                  </div>
                </div>

                <div ref={listRef} class="max-h-[28rem] overflow-y-auto py-2">
                  {props.items.length
                    ? props.items.map((item, index) => (
                        <div key={item.id}>
                          {(index === 0 || item.section !== props.items[index - 1]?.section) && (
                            <div class="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                              {item.section}
                            </div>
                          )}
                          <button
                            type="button"
                            data-command-index={index}
                            class={['flex w-full items-center gap-3 px-3 py-2 text-left transition', props.activeIndex === index ? 'bg-white/[0.06]' : 'hover:bg-white/[0.035]']}
                            onMouseenter={() => emit('activate', index)}
                            onClick={() => emit('run', item)}
                          >
                            <span
                              class={[
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[12px]',
                                item.section === 'Issues'
                                  ? 'border-white/[0.06] bg-white/[0.025] text-slate-500'
                                  : 'border-white/[0.08] bg-white/[0.035] text-slate-400',
                              ]}
                            >
                              {item.icon === 'search'
                                ? <Icon name="lucide:search" class="h-3.5 w-3.5" aria-hidden="true" />
                                : item.icon ?? '>'}
                            </span>
                            <span class="min-w-0 flex-1">
                              <span class="block truncate text-[13px] font-medium text-slate-200">{item.label}</span>
                              <span class="mt-0.5 block truncate text-[12px] text-slate-500">{item.description}</span>
                            </span>
                          </button>
                        </div>
                      ))
                    : (
                        <div class="px-6 py-10 text-center">
                          <p class="text-sm font-medium text-slate-300">No results</p>
                          <p class="mt-1 text-xs text-slate-600">Try a different issue key, project name, title, assignee, or command.</p>
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
