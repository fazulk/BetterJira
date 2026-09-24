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
import { useAssistantContextRefresh } from '@/composables/useAssistantContextRefresh'
import { configureAssistantSessions } from '@/composables/useAssistantSessions'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useJiraBackgroundSync } from '@/composables/useJiraBackgroundSync'
import { useJiraIssueLinks } from '@/composables/useJiraIssueLinks'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { isLocalTicketKey } from '~/shared/localTickets'

export default defineComponent({
  name: 'App',
  setup() {
    const route = useRoute()
    const { jiraConnection, settings: appSettings } = useSpaceSettings()
    useJiraIssueLinks({
      baseUrl: () => jiraConnection.value.baseUrl,
      openInApp: () => appSettings.value.openJiraLinksInApp,
      openTicket: key => void navigateTo({ path: `/${key}`, query: { view: route.query.view } }),
    })
    const { settings } = useAssistantSettings()
    const queryClient = useQueryClient()
    const { refresh: refreshAssistantContext } = useAssistantContextRefresh()
    watchEffect(() => configureAssistantSessions(settings.value, (context) => {
      if (context.kind === 'ticket')
        void queryClient.invalidateQueries({ queryKey: context.local ? localTicketQueryKey(context.key) : ticketQueryKey(context.key) })
      if (context.kind === 'view') {
        for (const item of context.items) {
          void queryClient.invalidateQueries({ queryKey: isLocalTicketKey(item.key) ? localTicketQueryKey(item.key) : ticketQueryKey(item.key) })
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    }, refreshAssistantContext))
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
