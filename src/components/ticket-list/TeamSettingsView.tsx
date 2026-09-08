import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '#components'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import SpaceIconPicker from '../SpaceIconPicker'

const styles = stylex.create({
  root: { minHeight: 0, flex: '1', overflowY: 'auto' },
  content: { marginInline: 'auto', width: '100%', maxWidth: '48rem', paddingInline: '2rem', paddingBlock: '2.5rem' },
  header: { position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' },
  iconButton: (backgroundColor: string) => ({ display: 'flex', height: '3.5rem', width: '3.5rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', backgroundColor: { default: backgroundColor }, color: 'white', filter: { ':hover': 'brightness(1.1)' }, transitionProperty: 'filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }),
  icon: { fontSize: '32px', lineHeight: 1 },
  initial: { fontSize: 28, fontWeight: 600, lineHeight: 1 },
  title: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 28, fontWeight: 600, color: '#f0f1f4' },
  picker: { position: 'absolute', left: 0, top: '4rem', zIndex: 50 },
  description: { marginTop: '1rem', fontSize: 15, color: '#6f727b' },
})

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
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.content)}>
          <div ref={rootElement} {...stylex.attrs(styles.header)}>
            <button
              type="button"
              {...stylex.attrs(styles.iconButton(appearance.value.color))}
              aria-label={`Change icon and color for ${teamName.value}`}
              onClick={togglePicker}
            >
              {appearance.value.icon
                ? <Icon name={`lucide:${appearance.value.icon}`} {...stylex.attrs(styles.icon)} aria-hidden="true" />
                : <span {...stylex.attrs(styles.initial)}>{appearance.value.initial}</span>}
            </button>

            <h1 {...stylex.attrs(styles.title)}>
              {teamName.value}
            </h1>

            {pickerOpen.value && (
              <div {...stylex.attrs(styles.picker)}>
                <SpaceIconPicker
                  icon={appearance.value.icon}
                  color={appearance.value.color}
                  onUpdate:icon={handleIconChange}
                  onUpdate:color={handleColorChange}
                />
              </div>
            )}
          </div>

          <p {...stylex.attrs(styles.description)}>Add a description...</p>
        </div>
      </div>
    )
  },
})
