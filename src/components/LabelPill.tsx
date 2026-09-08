import { computed, defineComponent } from 'vue'
import { useLabelColors } from '@/composables/useLabelColors'

export default defineComponent({
  name: 'LabelPill',
  props: {
    label: {
      type: String,
      required: true,
    },
    dense: {
      type: Boolean,
      default: false,
    },
    showDot: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const { getLabelColor, openLabelColorMenu } = useLabelColors()

    const labelColor = computed(() => getLabelColor(props.label))
    const dotStyle = computed(() => ({
      backgroundColor: labelColor.value,
    }))
    const sizeClass = computed(() => props.dense ? 'px-2 py-1 text-[11px]' : 'px-2 py-1.5 text-xs')

    function handleContextMenu(event: MouseEvent): void {
      openLabelColorMenu(props.label, event)
    }

    return () => (
      <span
        class={[
          'inline-flex max-w-full items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.025] font-medium leading-[1.25] text-slate-300 transition hover:bg-white/[0.04]',
          sizeClass.value,
        ]}
        title="Right-click to change label color"
        onContextmenu={handleContextMenu}
      >
        {props.showDot && <span class="h-2 w-2 shrink-0 rounded-full" style={dotStyle.value} />}
        <span class="truncate">{props.label}</span>
      </span>
    )
  },
})
