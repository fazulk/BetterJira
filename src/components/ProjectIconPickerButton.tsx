import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '#components'
import SpaceIconPicker from '@/components/SpaceIconPicker'
import { useProjectAppearances } from '@/composables/useProjectAppearances'
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from '~/shared/settings'

export default defineComponent({
  name: 'ProjectIconPickerButton',
  props: { projectKey: { type: String, required: true } },
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
      <div ref={rootElement} class="relative shrink-0">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md text-white transition hover:brightness-110"
          style={{ backgroundColor: appearance.value.color }}
          title="Change project icon and color"
          aria-label="Change project icon and color"
          aria-expanded={pickerOpen.value}
          onClick={togglePicker}
        >
          <Icon name={`lucide:${appearance.value.icon}`} class="h-5 w-5" aria-hidden="true" />
        </button>
        {pickerOpen.value && (
          <div class="absolute left-0 top-11 z-50">
            <SpaceIconPicker
              icon={appearance.value.icon}
              color={appearance.value.color}
              onUpdate:icon={icon => setProjectAppearance(props.projectKey, { icon })}
              onUpdate:color={color => setProjectAppearance(props.projectKey, { color })}
            />
            {!isDefaultAppearance.value && (
              <button
                type="button"
                class="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#16181d] px-3 py-2 text-left text-[12px] text-[#aeb0b7] shadow-2xl shadow-black/50 transition hover:bg-white/[0.06] hover:text-[#f0f1f4]"
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
