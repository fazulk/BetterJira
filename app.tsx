import { useQueryClient } from '@tanstack/vue-query'
import { computed, defineComponent, onMounted, watchEffect } from 'vue'
import { NuxtPage } from '#components'
import AppToastContainer from '@/components/AppToastContainer'
import AppUpdateBanner from '@/components/AppUpdateBanner'
import AskAssistantPanel from '@/components/AskAssistantPanel'
import JiraSetupModal from '@/components/JiraSetupModal'
import LabelColorMenu from '@/components/LabelColorMenu'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { initAppUpdateListener } from '@/composables/useAppUpdate'
import { configureAssistantSessions } from '@/composables/useAssistantSessions'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useJiraBackgroundSync } from '@/composables/useJiraBackgroundSync'
import { isLocalTicketKey } from '~/shared/localTickets'

export default defineComponent({
  name: 'App',
  setup() {
    const { settings } = useAssistantSettings()
    const queryClient = useQueryClient()
    watchEffect(() => configureAssistantSessions(settings.value, (context) => {
      if (context.kind === 'ticket')
        void queryClient.invalidateQueries({ queryKey: context.local ? localTicketQueryKey(context.key) : ticketQueryKey(context.key) })
      if (context.kind === 'view') {
        for (const item of context.items) {
          void queryClient.invalidateQueries({ queryKey: isLocalTicketKey(item.key) ? localTicketQueryKey(item.key) : ticketQueryKey(item.key) })
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    }))
    const { hasJiraCredentialsConfigured, isLoading } = useJiraBackgroundSync()
    const showJiraSetupModal = computed(() => !isLoading.value && !hasJiraCredentialsConfigured.value)
    onMounted(() => {
      initAppUpdateListener()
    })
    return () => (
      <>
        <NuxtPage />
        <AskAssistantPanel />
        <JiraSetupModal open={showJiraSetupModal.value} />
        <LabelColorMenu />
        <AppToastContainer />
        <AppUpdateBanner />
      </>
    )
  },
})
