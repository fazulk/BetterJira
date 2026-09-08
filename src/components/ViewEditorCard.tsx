import type { PropType } from 'vue'
import type { ActiveFilterChip } from '@/features/ticket-list/types'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '#components'
import SpaceIconPicker from './SpaceIconPicker'

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
}

export default defineComponent({
  name: 'ViewEditorCard',
  props: {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    saveDisabled: {
      type: Boolean,
    },
    activeFilterChips: {
      type: Array as PropType<readonly ActiveFilterChip[] | undefined>,
      default: undefined,
    },
  },
  emits: {
    'update:name': (value: string) => typeof value === 'string',
    'update:description': (value: string) => typeof value === 'string',
    'update:icon': (value: string) => typeof value === 'string',
    'update:color': (value: string) => typeof value === 'string',
    'openFilters': () => true,
    'openSettings': () => true,
    'removeFilter': (chip: ActiveFilterChip) => Boolean(chip),
    'save': () => true,
    'cancel': () => true,
  },
  setup(props, { emit }) {
    const iconPickerOpen = ref(false)
    const rootElement = ref<HTMLElement | null>(null)
    const displayedFilterChips = computed(() => props.activeFilterChips ?? [])

    function toggleIconPicker(): void {
      iconPickerOpen.value = !iconPickerOpen.value
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!iconPickerOpen.value) {
        return
      }

      const target = event.target
      if (target instanceof Node && rootElement.value?.contains(target)) {
        return
      }

      iconPickerOpen.value = false
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        iconPickerOpen.value = false
      }
    }

    onMounted(() => {
      window.addEventListener('pointerdown', handlePointerDown)
      window.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeydown)
    })

    return () => (
      <div ref={rootElement} class="relative mx-1.5 mb-1.5 shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.035]">
        <div class="flex min-h-[6.25rem] items-start justify-between gap-4 px-3 py-3">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition hover:brightness-110"
              style={{ backgroundColor: props.color }}
              title="Change icon and color"
              onClick={toggleIconPicker}
            >
              <Icon name={`lucide:${props.icon}`} class="h-5 w-5" aria-hidden="true" />
            </button>

            {iconPickerOpen.value && (
              <div class="absolute left-3 top-12 z-50">
                <SpaceIconPicker
                  icon={props.icon}
                  color={props.color}
                  onUpdate:icon={value => emit('update:icon', value)}
                  onUpdate:color={value => emit('update:color', value)}
                />
              </div>
            )}

            <div class="min-w-0 flex-1 space-y-2">
              <input
                value={props.name}
                type="text"
                class="h-7 w-full bg-transparent text-[15px] font-medium text-[#f0f1f4] outline-none placeholder:text-[#71737c]"
                placeholder="All issues"
                onInput={event => emit('update:name', getInputValue(event))}
              />
              <input
                value={props.description}
                type="text"
                class="h-6 w-full bg-transparent text-[13px] text-[#aeb0b7] outline-none placeholder:text-[#5f626b]"
                placeholder="Description (optional)"
                onInput={event => emit('update:description', getInputValue(event))}
              />
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="rounded-md px-2 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.05] hover:text-[#f0f1f4]" onClick={() => emit('cancel')}>
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-[12px] text-[#f0f1f4] hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={props.saveDisabled}
              onClick={() => emit('save')}
            >
              Save
            </button>
          </div>
        </div>

        <div class="flex min-h-12 items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-2">
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {displayedFilterChips.value.map(filter => (
              <span key={filter.id} class="inline-flex h-7 max-w-[18rem] items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.045] px-2 text-[12px] text-[#d7d8dc]">
                <span class="truncate">{filter.fieldLabel}</span>
                <span class="text-[#777a83]">is</span>
                <span class="truncate text-[#f0f1f4]">{filter.valueLabel}</span>
                <button
                  type="button"
                  class="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-[#777a83] hover:bg-white/[0.08] hover:text-[#f0f1f4]"
                  aria-label={`Remove ${filter.fieldLabel} filter`}
                  onClick={() => emit('removeFilter', filter)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-[#8f9198] hover:bg-white/[0.08] hover:text-[#f0f1f4]" title="Filter" onClick={() => emit('openFilters')}>
              <Icon name="lucide:list-filter" class="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-[#8f9198] hover:bg-white/[0.08] hover:text-[#f0f1f4]" title="Settings" onClick={() => emit('openSettings')}>
              <Icon name="lucide:sliders-horizontal" class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    )
  },
})
