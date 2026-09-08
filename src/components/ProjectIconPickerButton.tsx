import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '#components'
import SpaceIconPicker from '@/components/SpaceIconPicker'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from '~/shared/settings'

const styles = stylex.create({
  root: { position: 'relative', flexShrink: 0 },
  trigger: { display: 'flex', width: '2.25rem', height: '2.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: '#fff', filter: { 'default': null, ':hover': 'brightness(1.1)' }, transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
  color: (color: string) => ({ backgroundColor: color }),
  icon: { width: '1.25rem', height: '1.25rem' },
  popover: { position: 'absolute', left: 0, top: '2.75rem', zIndex: 50 },
  reset: { marginTop: '0.25rem', width: '100%', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: { 'default': '#16181d', ':hover': 'rgba(255,255,255,0.06)' }, paddingInline: '0.75rem', paddingBlock: '0.5rem', textAlign: 'left', fontSize: 12, color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' }, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
})

export default defineComponent({
  name: 'ProjectIconPickerButton',
  props: { projectKey: { type: String, required: true }, xstyle: { type: [Object, Array] as PropType<StyleXStyles> } },
  setup(props) {
    const { getProjectAppearance, setProjectAppearance, resetProjectAppearance } = useProjectAppearances()

    const pickerOpen = ref(false)
    const rootElement = ref<HTMLElement | null>(null)
    const appearance = computed(() => getProjectAppearance(props.projectKey))
    const isDefaultAppearance = computed(() => (
      appearance.value.icon === DEFAULT_PROJECT_ICON && appearance.value.color === DEFAULT_PROJECT_COLOR
    ))

    function togglePicker(): void {
      pickerOpen.value = !pickerOpen.value
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!pickerOpen.value) {
        return
      }

      const target = event.target
      if (target instanceof Node && rootElement.value?.contains(target)) {
        return
      }

      pickerOpen.value = false
    }

    // Captured before it can bubble: the ticket detail closes itself on Escape, and
    // dismissing the picker should not also close the project you are editing.
    function handleKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || !pickerOpen.value) {
        return
      }

      event.stopPropagation()
      pickerOpen.value = false
    }

    // Navigating epic -> epic keeps this instance alive, so an open picker would
    // otherwise start editing the newly opened project.
    watch(() => props.projectKey, () => {
      pickerOpen.value = false
    })

    onMounted(() => {
      window.addEventListener('pointerdown', handlePointerDown)
      window.addEventListener('keydown', handleKeydown, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeydown, true)
    })

    return () => (
      <div ref={rootElement} {...stylex.attrs(styles.root, props.xstyle)}>
        <button
          type="button"
          {...stylex.attrs(styles.trigger, styles.color(appearance.value.color))}

          title="Change project icon and color"
          aria-label="Change project icon and color"
          aria-expanded={pickerOpen.value}
          onClick={togglePicker}
        >
          <Icon name={`lucide:${appearance.value.icon}`} {...stylex.attrs(styles.icon)} aria-hidden="true" />
        </button>
        {pickerOpen.value && (
          <div {...stylex.attrs(styles.popover)}>
            <SpaceIconPicker
              icon={appearance.value.icon}
              color={appearance.value.color}
              onUpdate:icon={icon => setProjectAppearance(props.projectKey, { icon })}
              onUpdate:color={color => setProjectAppearance(props.projectKey, { color })}
            />
            {!isDefaultAppearance.value && (
              <button
                type="button"
                {...stylex.attrs(styles.reset)}
                onClick={() => resetProjectAppearance(props.projectKey)}
              >
                Reset to default icon
              </button>
            )}
          </div>
        )}
      </div>
    )
  },
})
