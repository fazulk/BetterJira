import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import SettingsPage from '@/components/SettingsPage'

definePageMeta({ key: 'settings' })

const styles = stylex.create({ root: { height: '100vh', overflow: 'hidden' } })

export default defineComponent({
  name: 'SettingsRoute',
  setup() {
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
