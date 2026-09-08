import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, onMounted, onUnmounted, ref, Teleport, watch, withModifiers } from 'vue'
import { addHexAlpha, normalizeLabelHexColor, useLabelColors } from '@/composables/useLabelColors'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { position: 'fixed', zIndex: 100, width: '14rem', borderRadius: '1rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'color-mix(in oklab, #11131a 95%, transparent)', padding: '0.75rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'], boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' },
  position: (left: string, top: string) => ({ left, top }),
  heading: { marginBottom: '0.75rem', minWidth: 0 },
  title: { fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.18em', color: colors['--color-slate-500'] },
  label: { marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: colors['--color-slate-100'] },
  palette: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.5rem' },
  swatch: { display: 'flex', width: '2rem', height: '2rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', borderWidth: 1, borderStyle: 'solid', scale: { 'default': null, ':hover': '105%' }, filter: { 'default': null, ':hover': 'brightness(1.25)' }, transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
  swatchColor: (background: string, color: string) => ({ backgroundColor: { default: background }, borderColor: { default: color }, color }),
  selected: { boxShadow: '0 0 0 2px #11131a, 0 0 0 4px rgba(255,255,255,0.7)' },
  dot: { width: '0.75rem', height: '0.75rem', borderRadius: '9999px', backgroundColor: 'currentColor' },
  custom: { marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderRadius: '1rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-300'] },
  colorInput: { height: '1.75rem', width: '2.25rem', cursor: 'pointer', borderRadius: '0.25rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent', padding: 0 },
  reset: { marginTop: '0.5rem', width: '100%', borderRadius: '1rem', paddingInline: '0.75rem', paddingBlock: '0.5rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-100'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255,255,255,0.05)' }, transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
})

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
            {...stylex.attrs(styles.root, styles.position(menuStyle.value.left, menuStyle.value.top))}

            role="menu"
            onContextmenu={withModifiers(() => {}, ['prevent'])}
          >
            <div {...stylex.attrs(styles.heading)}>
              <div {...stylex.attrs(styles.title)}>Label color</div>
              <div {...stylex.attrs(styles.label)}>{currentLabel.value}</div>
            </div>
            <div {...stylex.attrs(styles.palette)} aria-label="Preset label colors">
              {labelColorPalette.map(color => (
                <button
                  key={color}
                  type="button"
                  {...stylex.attrs(styles.swatch, styles.swatchColor(addHexAlpha(color, '26'), color), currentColor.value === color && styles.selected)}

                  aria-label={`Set ${currentLabel.value} to ${color}`}
                  onPointerdown={withModifiers(() => chooseColor(color), ['prevent', 'stop'])}
                  onClick={() => chooseColor(color)}
                >
                  <span {...stylex.attrs(styles.dot)} />
                </button>
              ))}
            </div>
            <label {...stylex.attrs(styles.custom)}>
              <span>Custom</span>
              <input
                v-model={customColor.value}
                type="color"
                {...stylex.attrs(styles.colorInput)}
                aria-label="Custom label color"
                onInput={previewCustomColor}
                onChange={commitCustomColor}
              />
            </label>
            <button
              type="button"
              {...stylex.attrs(styles.reset)}
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
