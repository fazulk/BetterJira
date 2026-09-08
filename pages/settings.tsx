import { defineComponent } from 'vue'
import SettingsPage from '@/components/SettingsPage.vue'

definePageMeta({ key: 'settings' })

export default defineComponent({
  name: 'SettingsRoute',
  setup() {
    function closeSettings(): void {
      void navigateTo('/')
    }
    return () => (
      <main class="h-screen overflow-hidden">
        <SettingsPage onClose={closeSettings} />
      </main>
    )
  },
})
