import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '#components'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import SpaceIconPicker from '../SpaceIconPicker'

export default defineComponent({
  name: 'TeamSettingsView',
  props: {
    spaceKey: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { spaces, updateSpaceAppearance } = useSpaceSettings()

    const space = computed(() => spaces.value.find(entry => entry.key === props.spaceKey) ?? null)
    const appearance = computed(() =>
      space.value
        ? resolveSpaceAppearance(space.value)
        : resolveSpaceAppearance({ key: props.spaceKey, name: props.spaceKey }),
    )
    const teamName = computed(() => space.value?.name?.trim() || props.spaceKey)

    const pickerOpen = ref(false)
    const rootElement = ref<HTMLElement | null>(null)

    function togglePicker(): void {
      pickerOpen.value = !pickerOpen.value
    }

    function closePicker(): void {
      pickerOpen.value = false
    }

    async function handleIconChange(icon: string): Promise<void> {
      await updateSpaceAppearance(props.spaceKey, { icon })
    }

    async function handleColorChange(color: string): Promise<void> {
      await updateSpaceAppearance(props.spaceKey, { color })
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!pickerOpen.value) {
        return
      }

      const target = event.target
      if (target instanceof Node && rootElement.value?.contains(target)) {
        return
      }

      closePicker()
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        closePicker()
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
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-3xl px-8 py-10">
          <div ref={rootElement} class="relative flex items-center gap-4">
            <button
              type="button"
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white transition hover:brightness-110"
              style={{ backgroundColor: appearance.value.color }}
              aria-label={`Change icon and color for ${teamName.value}`}
              onClick={togglePicker}
            >
              {appearance.value.icon
                ? <Icon name={`lucide:${appearance.value.icon}`} class="text-[32px] leading-none" aria-hidden="true" />
                : <span class="text-[28px] font-semibold leading-none">{appearance.value.initial}</span>}
            </button>

            <h1 class="min-w-0 truncate text-[28px] font-semibold text-[#f0f1f4]">
              {teamName.value}
            </h1>

            {pickerOpen.value && (
              <div class="absolute left-0 top-16 z-50">
                <SpaceIconPicker
                  icon={appearance.value.icon}
                  color={appearance.value.color}
                  onUpdate:icon={handleIconChange}
                  onUpdate:color={handleColorChange}
                />
              </div>
            )}
          </div>

          <p class="mt-4 text-[15px] text-[#6f727b]">Add a description...</p>
        </div>
      </div>
    )
  },
})
