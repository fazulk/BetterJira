import { computed, defineComponent, onMounted, onUnmounted, ref, Teleport, watch, withModifiers } from 'vue'
import { addHexAlpha, normalizeLabelHexColor, useLabelColors } from '@/composables/useLabelColors'

export default defineComponent({
  name: 'LabelColorMenu',
  setup() {
    const {
      labelColorPalette,
      labelColorMenuState,
      getLabelColor,
      setLabelColor,
      resetLabelColor,
      closeLabelColorMenu,
    } = useLabelColors()

    const menuElement = ref<HTMLElement | null>(null)
    const customColor = ref('#ef4444')

    const currentLabel = computed(() => labelColorMenuState.value.label)
    const currentColor = computed(() => getLabelColor(currentLabel.value))
    const menuStyle = computed(() => {
      const leftBoundary = typeof window === 'undefined' ? labelColorMenuState.value.x : window.innerWidth - 232
      const topBoundary = typeof window === 'undefined' ? labelColorMenuState.value.y : window.innerHeight - 246

      return {
        left: `${Math.max(8, Math.min(labelColorMenuState.value.x, leftBoundary))}px`,
        top: `${Math.max(8, Math.min(labelColorMenuState.value.y, topBoundary))}px`,
      }
    })

    watch(currentColor, (color) => {
      customColor.value = color
    }, { immediate: true })

    function swatchStyle(color: string) {
      return {
        backgroundColor: addHexAlpha(color, '26'),
        borderColor: color,
        color,
      }
    }

    function chooseColor(color: string): void {
      setLabelColor(currentLabel.value, color)
      closeLabelColorMenu()
    }

    function readColorInputValue(event: Event): string | null {
      const target = event.target
      if (!(target instanceof HTMLInputElement)) {
        return null
      }

      return normalizeLabelHexColor(target.value)
    }

    function previewCustomColor(event: Event): void {
      const normalizedColor = readColorInputValue(event)
      if (!normalizedColor) {
        return
      }

      customColor.value = normalizedColor
    }

    function commitCustomColor(event: Event): void {
      const normalizedColor = readColorInputValue(event)
      if (!normalizedColor) {
        return
      }

      customColor.value = normalizedColor
      setLabelColor(currentLabel.value, normalizedColor)
    }

    function resetColor(): void {
      resetLabelColor(currentLabel.value)
      closeLabelColorMenu()
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!labelColorMenuState.value.open) {
        return
      }

      const target = event.target
      if (target instanceof Node && menuElement.value?.contains(target)) {
        return
      }

      closeLabelColorMenu()
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        closeLabelColorMenu()
      }
    }

    onMounted(() => {
      window.addEventListener('pointerdown', handlePointerDown)
      window.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeydown)
    })

    return () => (
      <Teleport to="body">
        {labelColorMenuState.value.open && (
          <div
            ref={menuElement}
            class="fixed z-[100] w-56 rounded-2xl border border-white/[0.08] bg-[#11131a]/95 p-3 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur"
            style={menuStyle.value}
            role="menu"
            onContextmenu={withModifiers(() => {}, ['prevent'])}
          >
            <div class="mb-3 min-w-0">
              <div class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Label color</div>
              <div class="mt-1 truncate font-semibold text-slate-100">{currentLabel.value}</div>
            </div>
            <div class="grid grid-cols-5 gap-2" aria-label="Preset label colors">
              {labelColorPalette.map(color => (
                <button
                  key={color}
                  type="button"
                  class={['flex h-8 w-8 items-center justify-center rounded-2xl border transition hover:scale-105 hover:brightness-125', currentColor.value === color && 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#11131a]']}
                  style={swatchStyle(color)}
                  aria-label={`Set ${currentLabel.value} to ${color}`}
                  onPointerdown={withModifiers(() => chooseColor(color), ['prevent', 'stop'])}
                  onClick={() => chooseColor(color)}
                >
                  <span class="h-3 w-3 rounded-full bg-current" />
                </button>
              ))}
            </div>
            <label class="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
              <span>Custom</span>
              <input
                v-model={customColor.value}
                type="color"
                class="h-7 w-9 cursor-pointer rounded border border-white/[0.1] bg-transparent p-0"
                aria-label="Custom label color"
                onInput={previewCustomColor}
                onChange={commitCustomColor}
              />
            </label>
            <button
              type="button"
              class="mt-2 w-full rounded-2xl px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100"
              onPointerdown={withModifiers(resetColor, ['prevent', 'stop'])}
              onClick={resetColor}
            >
              Reset to default color
            </button>
          </div>
        )}
      </Teleport>
    )
  },
})
