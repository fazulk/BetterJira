import type { PropType } from 'vue'
import { defineComponent, ref } from 'vue'

interface SpaceOption {
  key: string
  name: string
}

function getSelectValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLSelectElement ? target.value : ''
}

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
      <div class="space-y-1.5">
        <label for="create-space" class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Team</label>
        <select
          id="create-space"
          ref={spaceSelectRef}
          name="create-space"
          value={props.effectiveSpaceKey ?? ''}
          class="w-full rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 text-xs text-slate-200 outline-none transition focus:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
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
          <p class="text-xs text-slate-500">
            Fixed by parent:
            {' '}
            {props.selectedSpaceName}
            .
          </p>
        )}
        {!props.isSpaceLocked && props.spaces.length === 0 && (
          <p class="text-xs text-amber-200">
            Enable at least one space in settings before creating a top-level issue.
          </p>
        )}
      </div>
    )
  },
})
