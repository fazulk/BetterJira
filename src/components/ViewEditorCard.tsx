import type { PropType } from 'vue'
import type { ActiveFilterChip } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '#components'
import SpaceIconPicker from './SpaceIconPicker'

const styles = stylex.create({
  root: { position: 'relative', marginInline: '0.375rem', marginBottom: '0.375rem', flexShrink: 0, borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.035)' },
  header: { display: 'flex', minHeight: '6.25rem', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', paddingInline: '0.75rem', paddingBlock: '0.75rem' },
  mainGroup: { display: 'flex', minWidth: 0, flex: '1', alignItems: 'flex-start', gap: '0.75rem' },
  iconButton: (backgroundColor: string) => ({ marginTop: '0.125rem', display: 'flex', height: '2rem', width: '2rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { default: backgroundColor }, color: 'white', filter: { ':hover': 'brightness(1.1)' }, transitionProperty: 'filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }),
  mainIcon: { height: '1.25rem', width: '1.25rem' },
  picker: { position: 'absolute', left: '0.75rem', top: '3rem', zIndex: 50 },
  fields: { minWidth: 0, flex: '1' },
  nameInput: { 'height': '1.75rem', 'width': '100%', 'backgroundColor': 'transparent', 'fontSize': 15, 'fontWeight': 500, 'color': '#f0f1f4', 'outlineStyle': 'none', '::placeholder': { color: '#71737c' } },
  descriptionInput: { 'marginTop': '0.5rem', 'height': '1.5rem', 'width': '100%', 'backgroundColor': 'transparent', 'fontSize': 13, 'color': '#aeb0b7', 'outlineStyle': 'none', '::placeholder': { color: '#5f626b' } },
  actions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.5rem' },
  ghostButton: { borderRadius: '0.375rem', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 12, color: { 'default': '#d7d8dc', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  saveButton: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.06)', ':hover': 'rgba(255, 255, 255, 0.1)' }, paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: 12, color: '#f0f1f4', cursor: { ':disabled': 'not-allowed' }, opacity: { ':disabled': 0.4 } },
  footer: { display: 'flex', minHeight: '3rem', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  chips: { display: 'flex', minWidth: 0, flex: '1', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' },
  chip: { display: 'inline-flex', height: '1.75rem', maxWidth: '18rem', alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.045)', paddingInline: '0.5rem', fontSize: 12, color: '#d7d8dc' },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipOperator: { color: '#777a83' },
  chipValue: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f0f1f4' },
  removeChipButton: { marginLeft: '0.125rem', display: 'flex', height: '1rem', width: '1rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', color: { 'default': '#777a83', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.08)' } },
  iconActions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.5rem' },
  roundIconButton: { display: 'flex', height: '2rem', width: '2rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.045)', ':hover': 'rgba(255, 255, 255, 0.08)' }, color: { 'default': '#8f9198', ':hover': '#f0f1f4' } },
  icon: { height: '1rem', width: '1rem' },
})

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
      <div ref={rootElement} {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header)}>
          <div {...stylex.attrs(styles.mainGroup)}>
            <button
              type="button"
              {...stylex.attrs(styles.iconButton(props.color))}
              title="Change icon and color"
              onClick={toggleIconPicker}
            >
              <Icon name={`lucide:${props.icon}`} {...stylex.attrs(styles.mainIcon)} aria-hidden="true" />
            </button>

            {iconPickerOpen.value && (
              <div {...stylex.attrs(styles.picker)}>
                <SpaceIconPicker
                  icon={props.icon}
                  color={props.color}
                  onUpdate:icon={value => emit('update:icon', value)}
                  onUpdate:color={value => emit('update:color', value)}
                />
              </div>
            )}

            <div {...stylex.attrs(styles.fields)}>
              <input
                value={props.name}
                type="text"
                {...stylex.attrs(styles.nameInput)}
                placeholder="All issues"
                onInput={event => emit('update:name', getInputValue(event))}
              />
              <input
                value={props.description}
                type="text"
                {...stylex.attrs(styles.descriptionInput)}
                placeholder="Description (optional)"
                onInput={event => emit('update:description', getInputValue(event))}
              />
            </div>
          </div>

          <div {...stylex.attrs(styles.actions)}>
            <button type="button" {...stylex.attrs(styles.ghostButton)} onClick={() => emit('cancel')}>
              Cancel
            </button>
            <button
              type="button"
              {...stylex.attrs(styles.saveButton)}
              disabled={props.saveDisabled}
              onClick={() => emit('save')}
            >
              Save
            </button>
          </div>
        </div>

        <div {...stylex.attrs(styles.footer)}>
          <div {...stylex.attrs(styles.chips)}>
            {displayedFilterChips.value.map(filter => (
              <span key={filter.id} {...stylex.attrs(styles.chip)}>
                <span {...stylex.attrs(styles.truncate)}>{filter.fieldLabel}</span>
                <span {...stylex.attrs(styles.chipOperator)}>is</span>
                <span {...stylex.attrs(styles.chipValue)}>{filter.valueLabel}</span>
                <button
                  type="button"
                  {...stylex.attrs(styles.removeChipButton)}
                  aria-label={`Remove ${filter.fieldLabel} filter`}
                  onClick={() => emit('removeFilter', filter)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div {...stylex.attrs(styles.iconActions)}>
            <button type="button" {...stylex.attrs(styles.roundIconButton)} title="Filter" onClick={() => emit('openFilters')}>
              <Icon name="lucide:list-filter" {...stylex.attrs(styles.icon)} aria-hidden="true" />
            </button>
            <button type="button" {...stylex.attrs(styles.roundIconButton)} title="Settings" onClick={() => emit('openSettings')}>
              <Icon name="lucide:sliders-horizontal" {...stylex.attrs(styles.icon)} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    )
  },
})
