<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AskAssistantPanel from '@/components/AskAssistantPanel.vue'
import { initAppUpdateListener } from '@/composables/useAppUpdate'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useJiraBackgroundSync } from '@/composables/useJiraBackgroundSync'

const assistantPanel = useAssistantPanel()
const { hasJiraCredentialsConfigured, isLoading } = useJiraBackgroundSync()

const showJiraSetupModal = computed(() => !isLoading.value && !hasJiraCredentialsConfigured.value)

onMounted(() => {
  initAppUpdateListener()
})
</script>

<template>
  <NuxtPage />
  <AskAssistantPanel v-if="assistantPanel.isOpen.value" />
  <JiraSetupModal :open="showJiraSetupModal" />
  <LabelColorMenu />
  <AppToastContainer />
  <AppUpdateBanner />
</template>
