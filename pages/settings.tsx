import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import SettingsPage from '@/components/SettingsPage'

const styles = stylex.create({ root: { height: 'calc(100dvh - 44px)', overflow: 'hidden' } })

export default defineComponent({
  name: 'SettingsRoute',
  setup() {
    definePageMeta({ key: 'settings' })

    function closeSettings(): void {
      void navigateTo('/')
    }
    return () => (
      <main {...stylex.attrs(styles.root)}>
        <SettingsPage onClose={closeSettings} />
      </main>
    )
  },
})
