import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  notice: {
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    paddingInline: '1rem',
    paddingBlock: '0.75rem',
  },
  submitError: {
    borderColor: 'rgba(244, 63, 94, 0.2)',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    color: colors['--color-rose-200'],
  },
  attachmentNotice: {
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    color: colors['--color-slate-500'],
  },
})

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
          <div {...stylex.attrs(styles.notice, styles.submitError)}>
            {props.submitError}
          </div>
        )}
        {props.attachmentNotice && (
          <div {...stylex.attrs(styles.notice, styles.attachmentNotice)}>
            {props.attachmentNotice}
          </div>
        )}
      </>
    )
  },
})
