import type { PropType } from 'vue'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CreateTicketNotices',
  props: {
    attachmentNotice: {
      type: String as PropType<string | null>,
      default: null,
    },
    submitError: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props) {
    return () => (
      <>
        {props.submitError && (
          <div class="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {props.submitError}
          </div>
        )}
        {props.attachmentNotice && (
          <div class="rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-xs text-slate-500">
            {props.attachmentNotice}
          </div>
        )}
      </>
    )
  },
})
