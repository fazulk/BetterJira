<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsPageContext } from '@/features/settings/settingsPageContext'

const {
  canSaveJiraConnectionDetails,
  isRecheckingJiraConnection,
  isSavingSpaceSettings,
  jiraApiToken,
  jiraBaseUrlDraft,
  jiraConnectedUserName,
  jiraConnectionErrorMessage,
  jiraConnectionStatus,
  jiraEmailDraft,
  jiraFeedback,
  jiraHasApiToken,
  jiraSavedBaseUrl,
  jiraSavedEmail,
  recheckJiraConnection,
  saveJiraApiToken,
  saveJiraConnectionDetails,
} = useSettingsPageContext()

interface StatusBadge {
  label: string
  icon: string
  spin?: boolean
  classes: string
}

const statusBadge = computed<StatusBadge>(() => {
  switch (jiraConnectionStatus.value) {
    case 'connected':
      return { label: 'Connected', icon: 'lucide:circle-check', classes: 'border-accent-sage/25 bg-accent-sage/10 text-accent-sage' }
    case 'checking':
      return { label: 'Checking…', icon: 'lucide:loader-circle', spin: true, classes: 'border-white/[0.08] bg-white/[0.04] text-slate-400' }
    case 'error':
      return { label: 'Connection failed', icon: 'lucide:circle-alert', classes: 'border-accent-rose/25 bg-accent-rose/10 text-accent-rose' }
    default:
      return { label: 'Not configured', icon: 'lucide:circle-dashed', classes: 'border-accent-amber/25 bg-accent-amber/10 text-accent-amber' }
  }
})

const inputClass = 'w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-white/[0.16] focus:bg-white/[0.06]'
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/[0.14] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.04]'
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-5">
    <div>
      <h2 class="text-xl font-semibold text-slate-100">
        Workspace
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        Manage your Jira connection details.
      </p>
    </div>

    <div class="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <!-- Status header -->
      <div class="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-200">
            Jira connection
          </p>
          <p
            v-if="jiraConnectionStatus === 'connected' && jiraConnectedUserName"
            class="mt-0.5 truncate text-xs text-slate-500"
          >
            Signed in as <span class="text-slate-300">{{ jiraConnectedUserName }}</span>
          </p>
          <p
            v-else-if="jiraConnectionStatus === 'unconfigured'"
            class="mt-0.5 truncate text-xs text-slate-500"
          >
            Add your URL, email, and API token to connect.
          </p>
          <p
            v-else-if="jiraSavedBaseUrl"
            class="mt-0.5 truncate text-xs text-slate-500"
          >
            {{ jiraSavedBaseUrl }}<span v-if="jiraSavedEmail"> · {{ jiraSavedEmail }}</span>
          </p>
        </div>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
          :class="statusBadge.classes"
        >
          <Icon
            :name="statusBadge.icon"
            class="h-3.5 w-3.5"
            :class="{ 'animate-spin': statusBadge.spin }"
            aria-hidden="true"
          />
          {{ statusBadge.label }}
        </span>
      </div>

      <!-- Broken connection detail -->
      <div
        v-if="jiraConnectionStatus === 'error'"
        class="flex flex-col gap-2 border-b border-white/[0.06] bg-accent-rose/5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="flex min-w-0 gap-2 text-xs text-accent-rose">
          <Icon name="lucide:triangle-alert" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p class="min-w-0 break-words">
            {{ jiraConnectionErrorMessage || 'Could not reach Jira. Check your connection details below.' }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-accent-rose/25 px-2.5 py-1 text-xs font-medium text-accent-rose transition hover:bg-accent-rose/10 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isRecheckingJiraConnection"
          @click="recheckJiraConnection"
        >
          <Icon
            name="lucide:refresh-cw"
            class="h-3 w-3"
            :class="{ 'animate-spin': isRecheckingJiraConnection }"
            aria-hidden="true"
          />
          Retry
        </button>
      </div>

      <div class="space-y-4 p-4">
        <!-- Connection details -->
        <div class="grid gap-3 md:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-500">Jira URL</span>
            <input
              v-model="jiraBaseUrlDraft"
              type="url"
              name="jira-base-url"
              autocomplete="url"
              placeholder="https://example.atlassian.net"
              :class="inputClass"
              @keydown.enter.prevent="saveJiraConnectionDetails"
            >
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-slate-500">Atlassian email</span>
            <input
              v-model="jiraEmailDraft"
              type="email"
              name="jira-email"
              autocomplete="email"
              placeholder="you@example.com"
              :class="inputClass"
              @keydown.enter.prevent="saveJiraConnectionDetails"
            >
          </label>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            :class="buttonClass"
            :disabled="!canSaveJiraConnectionDetails"
            @click="saveJiraConnectionDetails"
          >
            Save connection
          </button>
        </div>

        <!-- API token -->
        <div class="border-t border-white/[0.06] pt-4">
          <div class="mb-1.5 flex items-center gap-2">
            <span class="text-xs font-medium text-slate-500">API token</span>
            <span
              v-if="jiraHasApiToken"
              class="inline-flex items-center gap-1 rounded-full border border-accent-sage/25 bg-accent-sage/10 px-2 py-0.5 text-[11px] font-medium text-accent-sage"
            >
              <Icon name="lucide:check" class="h-3 w-3" aria-hidden="true" />
              Saved
            </span>
          </div>

          <div class="flex flex-col gap-2 md:flex-row md:items-start">
            <div class="w-full space-y-2">
              <!-- Masked indicator that a token is already stored -->
              <div
                v-if="jiraHasApiToken"
                class="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-slate-400"
              >
                <Icon name="lucide:key-round" class="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span class="tracking-[0.2em] text-slate-500">••••••••••••</span>
                <span class="ml-auto text-xs text-slate-600">hidden</span>
              </div>
              <input
                v-model="jiraApiToken"
                type="password"
                name="jira-api-token"
                autocomplete="new-password"
                :placeholder="jiraHasApiToken ? 'Paste a new token to replace it' : 'Paste your Jira API token'"
                :class="inputClass"
                @keydown.enter.prevent="saveJiraApiToken"
              >
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-200"
              >
                <Icon name="lucide:external-link" class="h-3 w-3" aria-hidden="true" />
                Create a Jira API token
              </a>
            </div>
            <button
              type="button"
              :class="buttonClass"
              class="md:w-auto"
              :disabled="isSavingSpaceSettings || !jiraApiToken.trim()"
              @click="saveJiraApiToken"
            >
              {{ jiraHasApiToken ? 'Replace token' : 'Save token' }}
            </button>
          </div>
        </div>

        <p
          v-if="jiraFeedback"
          class="rounded-md px-3 py-2 text-xs"
          :class="jiraFeedback.kind === 'success'
            ? 'border border-accent-sage/25 bg-accent-sage/10 text-accent-sage'
            : 'border border-accent-rose/25 bg-accent-rose/10 text-accent-rose'"
        >
          {{ jiraFeedback.message }}
        </p>
      </div>
    </div>
  </section>
</template>
