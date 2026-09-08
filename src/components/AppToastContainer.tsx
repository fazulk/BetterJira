import * as stylex from '@stylexjs/stylex'
import { defineComponent, TransitionGroup } from 'vue'
import { useToast } from '@/composables/useToast'
import { notificationStyles as styles } from '@/styles/notifications'

export default defineComponent({
  name: 'AppToastContainer',
  setup() {
    const { removeToast, toasts } = useToast()
    async function copyToastMessage(message: string): Promise<void> {
      await navigator.clipboard.writeText(message)
    }
    return () => (
      <div {...stylex.attrs(styles.stack)}>
        <TransitionGroup enterActiveClass={stylex.attrs(styles.transition).class} leaveActiveClass={stylex.attrs(styles.transition).class} enterFromClass={stylex.attrs(styles.hidden).class} leaveToClass={stylex.attrs(styles.hidden).class}>
          {() => toasts.value.map(toast => (
            <div key={toast.id} {...stylex.attrs(styles.surface, styles.toast)}>
              <div {...stylex.attrs(styles.content)}>
                <div {...stylex.attrs(styles.dot, toast.kind === 'success' ? styles.successDot : styles.errorDot)} />
                <p {...stylex.attrs(styles.message, styles.toastMessage)}>{toast.message}</p>
                <div {...stylex.attrs(styles.actions)}>
                  {toast.kind === 'error' && (
                    <button
                      type="button"
                      {...stylex.attrs(styles.button)}
                      aria-label="Copy notification message"
                      onClick={() => copyToastMessage(toast.message)}
                    >
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    {...stylex.attrs(styles.button, styles.dismiss)}
                    aria-label="Dismiss notification"
                    onClick={() => removeToast(toast.id)}
                  >
                    <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </TransitionGroup>
      </div>
    )
  },
})
