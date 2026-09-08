import { computed, defineComponent, onMounted } from 'vue'
import { NuxtPage } from '#components'
import AppToastContainer from '@/components/AppToastContainer'
import AppUpdateBanner from '@/components/AppUpdateBanner'
import AskAssistantPanel from '@/components/AskAssistantPanel'
import JiraSetupModal from '@/components/JiraSetupModal'
import LabelColorMenu from '@/components/LabelColorMenu'
import { initAppUpdateListener } from '@/composables/useAppUpdate'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useJiraBackgroundSync } from '@/composables/useJiraBackgroundSync'

export default defineComponent({
  name: 'App',
  setup() {
    const assistantPanel = useAssistantPanel()
    const { hasJiraCredentialsConfigured, isLoading } = useJiraBackgroundSync()
    const showJiraSetupModal = computed(() => !isLoading.value && !hasJiraCredentialsConfigured.value)
    onMounted(() => {
      initAppUpdateListener()
    })
    return () => (
      <>
        <NuxtPage />
        {assistantPanel.isOpen.value && <AskAssistantPanel />}
        <JiraSetupModal open={showJiraSetupModal.value} />
        <LabelColorMenu />
        <AppToastContainer />
        <AppUpdateBanner />
      </>
    )
  },
})
