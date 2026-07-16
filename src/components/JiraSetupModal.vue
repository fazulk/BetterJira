<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { fetchJiraCurrentUser } from '@/api/jira'
import { jiraCurrentUserQueryKey } from '@/composables/useJiraCurrentUser'
import { useSpaceSettings } from '@/composables/useSpaceSettings'

const props = defineProps<{
  open: boolean
}>()

type JiraSetupStep = 'form' | 'connecting' | 'success'

const queryClient = useQueryClient()
const { jiraConnection, isSaving, updateJiraCredentials } = useSpaceSettings()

const baseUrl = ref('')
const email = ref('')
const apiToken = ref('')
const errorMessage = ref<string | null>(null)
const connectedDisplayName = ref('')
const setupStep = ref<JiraSetupStep>('form')
const isVisible = ref(props.open)

function resetSetupForm(): void {
  baseUrl.value = jiraConnection.value.baseUrl
  email.value = jiraConnection.value.email
  apiToken.value = ''
  errorMessage.value = null
  connectedDisplayName.value = ''
  setupStep.value = 'form'
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    isVisible.value = true
    resetSetupForm()
    return
  }

  if (setupStep.value === 'form') {
    isVisible.value = false
  }
}, { immediate: true })

const canSubmit = computed(() => (
  baseUrl.value.trim().length > 0
  && email.value.trim().length > 0
  && apiToken.value.trim().length > 0
  && !isSaving.value
  && setupStep.value === 'form'
))

async function saveCredentials(): Promise<void> {
  if (!canSubmit.value) {
    return
  }

  errorMessage.value = null
  connectedDisplayName.value = ''
  setupStep.value = 'connecting'

  try {
    await updateJiraCredentials({
      baseUrl: baseUrl.value.trim(),
      email: email.value.trim(),
      apiToken: apiToken.value.trim(),
    })

    const currentUser = await queryClient.fetchQuery({
      queryKey: jiraCurrentUserQueryKey,
      queryFn: fetchJiraCurrentUser,
    })

    connectedDisplayName.value = currentUser.displayName.trim()
    apiToken.value = ''
    setupStep.value = 'success'
  }
  catch (error) {
    setupStep.value = 'form'
    isVisible.value = true
    errorMessage.value = error instanceof Error ? error.message : 'Failed to connect to Jira.'
  }
}

async function continueToSettings(): Promise<void> {
  isVisible.value = false
  setupStep.value = 'form'
  errorMessage.value = null
  connectedDisplayName.value = ''
  await navigateTo('/settings')
}
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
  >
    <div class="animate-slide-up flex max-h-[calc(100vh-4rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-surface-0 shadow-xl shadow-black/40">
      <template v-if="setupStep === 'form'">
        <div class="flex min-h-12 items-center justify-between gap-4 border-b border-white/[0.06] px-4">
          <div class="flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.08] text-[11px] text-slate-400">B</span>
            <span>Workspace setup</span>
            <span class="text-slate-700">/</span>
            <span class="font-medium text-slate-300">Jira</span>
          </div>
        </div>

        <div class="border-b border-white/[0.06] px-4 py-3">
          <h2 class="text-[15px] font-semibold text-slate-100">
            Connect workspace to Jira
          </h2>
          <p class="mt-1 max-w-lg text-[12px] leading-5 text-slate-500">
            Store local credentials, verify the Atlassian account, then choose the spaces that should load in the sidebar.
          </p>
        </div>

        <form class="min-h-0 flex-1 overflow-y-auto px-4 py-3" @submit.prevent="saveCredentials">
          <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
            <label class="grid gap-2 border-b border-white/[0.05] px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
              <span class="text-[12px] text-slate-500">Jira base URL</span>
              <input
                v-model="baseUrl"
                type="url"
                autocomplete="url"
                placeholder="https://your-team.atlassian.net"
                class="w-full rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-white/[0.04]"
              >
            </label>

            <label class="grid gap-2 border-b border-white/[0.05] px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
              <span class="text-[12px] text-slate-500">Atlassian email</span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="you@company.com"
                class="w-full rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-white/[0.04]"
              >
            </label>

            <label class="grid gap-2 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <span class="pt-2 text-[12px] text-slate-500">API token</span>
              <div class="min-w-0 space-y-2">
                <input
                  v-model="apiToken"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Paste an Atlassian API token"
                  class="w-full rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-white/[0.04]"
                >
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex text-[12px] text-slate-400 transition hover:text-slate-200"
                >
                  Create an Atlassian API token
                </a>
              </div>
            </label>
          </div>

          <p v-if="errorMessage" class="mt-4 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[13px] leading-5 text-rose-200">
            {{ errorMessage }}
          </p>

          <div class="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <p class="text-[11px] leading-4 text-slate-600">
              Credentials are stored locally in .data/settings.json.
            </p>
            <button
              type="submit"
              :disabled="!canSubmit"
              class="inline-flex h-8 shrink-0 items-center rounded-md bg-accent-indigo px-3 text-[13px] font-medium text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSaving ? 'Saving...' : 'Connect Jira' }}
            </button>
          </div>
        </form>
      </template>

      <div
        v-else-if="setupStep === 'connecting'"
        class="px-4 py-6"
        aria-live="polite"
      >
        <div class="mx-auto mb-5 flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.025]">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
        </div>

        <div class="space-y-2 text-center">
          <h2 class="text-[15px] font-semibold text-slate-100">
            Connecting to Jira
          </h2>
          <p class="mx-auto max-w-sm text-[12px] leading-5 text-slate-500">
            Saving your credentials and checking the workspace connection before you continue.
          </p>
        </div>
      </div>

      <div
        v-else
        class="px-4 py-6"
        aria-live="polite"
      >
        <div class="mx-auto mb-5 flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.035] text-slate-200">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div class="space-y-2 text-center">
          <h2 class="text-[15px] font-semibold text-slate-100">
            Jira is connected
          </h2>
          <p class="mx-auto max-w-md text-[12px] leading-5 text-slate-400">
            <span v-if="connectedDisplayName">{{ connectedDisplayName }} is signed in.</span>
            Add the spaces you want to load next, then continue into the workspace.
          </p>
          <p class="mx-auto max-w-md text-[12px] leading-5 text-slate-600">
            Open Settings and enable the spaces you want to see in the sidebar.
          </p>
        </div>

        <div class="mt-6 flex items-center justify-center">
          <button
            type="button"
            class="inline-flex h-8 items-center rounded-md bg-accent-indigo px-3 text-[13px] font-medium text-white transition hover:bg-accent-indigo/90"
            @click="continueToSettings"
          >
            Continue to Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
