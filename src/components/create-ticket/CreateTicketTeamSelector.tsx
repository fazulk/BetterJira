import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, ref } from 'vue'
import { colors } from '@/styles/tokens.stylex'

interface SpaceOption {
  key: string
  name: string
}

function getSelectValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLSelectElement ? target.value : ''
}

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: colors['--color-slate-500'] },
  select: {
    width: '100%',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    paddingInline: '0.625rem',
    paddingBlock: '0.375rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    color: colors['--color-slate-200'],
    outlineStyle: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: { 'default': 'pointer', ':disabled': 'not-allowed' },
    opacity: { 'default': 1, ':disabled': 0.6 },
  },
  helper: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  warning: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-amber-200'] },
})

export default defineComponent({
  name: 'CreateTicketTeamSelector',
  props: {
    effectiveSpaceKey: {
      type: String as PropType<string | null>,
      default: null,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    isSpaceLocked: {
      type: Boolean,
      required: true,
    },
    selectedSpaceName: {
      type: String,
      required: true,
    },
    spaces: {
      type: Array as PropType<SpaceOption[]>,
      required: true,
    },
  },
  emits: {
    'update:spaceKey': (spaceKey: string | null) => typeof spaceKey === 'string' || spaceKey === null,
  },
  setup(props, { emit, expose }) {
    const spaceSelectRef = ref<HTMLSelectElement | null>(null)

    function focus(): void {
      spaceSelectRef.value?.focus()
    }

    expose({ focus })

    return () => (
      <div {...stylex.attrs(styles.root)}>
        <label for="create-space" {...stylex.attrs(styles.label)}>Team</label>
        <select
          id="create-space"
          ref={spaceSelectRef}
          name="create-space"
          value={props.effectiveSpaceKey ?? ''}
          {...stylex.attrs(styles.select)}
          disabled={props.isCreatePending || props.isSpaceLocked || props.spaces.length === 0}
          onChange={event => emit('update:spaceKey', getSelectValue(event) || null)}
        >
          <option value="" disabled>
            {props.spaces.length === 0 ? 'No enabled spaces available' : 'Choose a space'}
          </option>
          {props.spaces.map(space => (
            <option key={space.key} value={space.key}>
              {space.name}
              {' '}
              (
              {space.key}
              )
            </option>
          ))}
        </select>
        {props.isSpaceLocked && (
          <p {...stylex.attrs(styles.helper)}>
            Fixed by parent:
            {' '}
            {props.selectedSpaceName}
            .
          </p>
        )}
        {!props.isSpaceLocked && props.spaces.length === 0 && (
          <p {...stylex.attrs(styles.warning)}>
            Enable at least one space in settings before creating a top-level issue.
          </p>
        )}
      </div>
    )
  },
})
