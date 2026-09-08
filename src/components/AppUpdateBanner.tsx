import * as stylex from '@stylexjs/stylex'
import { defineComponent, Transition } from 'vue'
import { useAppUpdate } from '@/composables/useAppUpdate'
import { notificationStyles as styles } from '@/styles/notifications'

export default defineComponent({
  name: 'AppUpdateBanner',
  setup() {
    const { applyUpdate, dismiss, update } = useAppUpdate()
    return () => (
      <Transition enterActiveClass={stylex.attrs(styles.transition).class} leaveActiveClass={stylex.attrs(styles.transition).class} enterFromClass={stylex.attrs(styles.hidden).class} leaveToClass={stylex.attrs(styles.hidden).class}>
        {() => update.value && (
          <div {...stylex.attrs(styles.surface, styles.update)}>
            <div {...stylex.attrs(styles.content)}>
              <div {...stylex.attrs(styles.dot, styles.updateDot)} />
              <p {...stylex.attrs(styles.message)}>
                BetterJira
                {update.value.version}
                {' '}
                is available
              </p>
              <div {...stylex.attrs(styles.actions)}>
                <button type="button" {...stylex.attrs(styles.button, styles.restart)} onClick={applyUpdate}>Restart to update</button>
                <button
                  type="button"
                  {...stylex.attrs(styles.button, styles.dismiss)}
                  aria-label="Dismiss update notification"
                  onClick={dismiss}
                >
                  <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </Transition>
    )
  },
})
