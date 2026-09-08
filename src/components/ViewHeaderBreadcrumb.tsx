import type { PropType } from 'vue'
import { defineComponent } from 'vue'
import { Icon } from '#components'

export default defineComponent({
  name: 'ViewHeaderBreadcrumb',
  props: {
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
      <span class="flex min-w-0 items-center gap-1.5 text-[14px] font-normal text-[#f0f1f4]">
        {(props.icon || props.fallback) && (
          <span
            class="flex h-4.5 w-4.5 shrink-0 items-center justify-center text-[13px] font-normal"
            style={props.iconColor ? { color: props.iconColor } : undefined}
          >
            {props.icon
              ? <Icon name={`lucide:${props.icon}`} class="h-4.5 w-4.5" aria-hidden="true" />
              : props.fallback}
          </span>
        )}
        {slots.default?.()}
      </span>
    )
  },
})
