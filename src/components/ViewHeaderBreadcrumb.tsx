import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { Icon } from '#components'

const styles = stylex.create({
  root: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.375rem', fontSize: 14, fontWeight: 400, color: '#f0f1f4' },
  iconContainer: { display: 'flex', width: '1.125rem', height: '1.125rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 400 },
  icon: { width: '1.125rem', height: '1.125rem' },
  iconColor: (color: string) => ({ color }),
})

export default defineComponent({
  name: 'ViewHeaderBreadcrumb',
  props: {
    xstyle: { type: [Object, Array] as PropType<StyleXStyles> },
    icon: {
      type: String as PropType<string | null>,
      default: null,
    },
    iconColor: {
      type: String as PropType<string | null>,
      default: null,
    },
    fallback: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props, { slots }) {
    return () => (
      <span {...stylex.attrs(styles.root, props.xstyle)}>
        {(props.icon || props.fallback) && (
          <span
            {...stylex.attrs(styles.iconContainer, props.iconColor ? styles.iconColor(props.iconColor) : null)}
          >
            {props.icon
              ? <Icon name={`lucide:${props.icon}`} {...stylex.attrs(styles.icon)} aria-hidden="true" />
              : props.fallback}
          </span>
        )}
        {slots.default?.()}
      </span>
    )
  },
})
