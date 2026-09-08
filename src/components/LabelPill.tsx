import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent } from 'vue'
import { useLabelColors } from '@/composables/useLabelColors'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: {
    display: 'inline-flex',
    maxWidth: '100%',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: '0.75rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: { 'default': 'rgba(255, 255, 255, 0.025)', ':hover': 'rgba(255, 255, 255, 0.04)' },
    fontWeight: 500,
    lineHeight: 1.25,
    color: colors['--color-slate-300'],
    transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    paddingInline: '0.5rem',
    paddingBlock: '0.375rem',
    fontSize: '0.75rem',
  },
  dense: { paddingBlock: '0.25rem', fontSize: 11 },
  dot: (color: string) => ({ width: '0.5rem', height: '0.5rem', flexShrink: 0, borderRadius: '9999px', backgroundColor: { default: color } }),
  text: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
})

export default defineComponent({
  name: 'LabelPill',
  props: {
    xstyle: { type: [Object, Array] as PropType<StyleXStyles> },
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

    function handleContextMenu(event: MouseEvent): void {
      openLabelColorMenu(props.label, event)
    }

    return () => (
      <span
        {...stylex.attrs(styles.root, props.dense && styles.dense, props.xstyle)}
        title="Right-click to change label color"
        onContextmenu={handleContextMenu}
      >
        {props.showDot && <span data-label-dot {...stylex.attrs(styles.dot(labelColor.value))} />}
        <span {...stylex.attrs(styles.text)}>{props.label}</span>
      </span>
    )
  },
})
