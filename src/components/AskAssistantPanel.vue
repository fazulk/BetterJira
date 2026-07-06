<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AssistantMarkdown from '@/components/AssistantMarkdown.vue'
import { useAssistantChat } from '@/composables/useAssistantChat'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { ticketQueryKey } from '@/composables/useJiraTicket'
import { localTicketQueryKey } from '@/composables/useLocalTicket'
import { getAssistantActionLabel, getAssistantProviderLabel } from '~/shared/assistant'
import { isLocalTicketKey } from '~/shared/localTickets'

const { settings, isProviderAvailable } = useAssistantSettings()
const queryClient = useQueryClient()
const {
  minimized,
  expanded,
  ticketKey,
  ticketSummary,
  chatState,
  draft,
  close,
} = useAssistantPanel()

// After a response fully lands, the assistant may have edited/transitioned/commented
// on the ticket via the CLI. Resync the pinned ticket in the background so the detail
// view reflects those changes (stale-while-refetch keeps the current data on screen).
function resyncPinnedTicket(): void {
  const key = ticketKey.value
  if (!key) {
    return
  }
  const queryKey = isLocalTicketKey(key) ? localTicketQueryKey(key) : ticketQueryKey(key)
  void queryClient.invalidateQueries({ queryKey })
}
const {
  messages,
  isStreaming,
  statusText,
  errorText,
  send,
  stop,
  reset,
} = useAssistantChat({ ticketKey, ticketSummary, state: chatState, onComplete: resyncPinnedTicket })

const scrollRef = ref<HTMLElement | null>(null)

const actionLabel = computed(() => getAssistantActionLabel(settings.value.provider))
const providerLabel = computed(() => getAssistantProviderLabel(settings.value.provider))
const providerAvailable = computed(() => isProviderAvailable(settings.value.provider))
const hasConversation = computed(() => messages.value.length > 0)

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const element = scrollRef.value
  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

watch(() => messages.value.map(message => message.content).join('|'), scrollToBottom)
watch(statusText, scrollToBottom)
onMounted(scrollToBottom)

function startNewChat(): void {
  reset()
  draft.value = ''
}

async function submit(): Promise<void> {
  const text = draft.value
  if (!text.trim() || isStreaming.value) {
    return
  }
  draft.value = ''
  await send(text)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void submit()
  }
}
</script>

<template>
  <div
    class="fixed bottom-4 right-4 z-40 flex flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#16171b] shadow-2xl shadow-black/50 transition-all"
    :class="[
      minimized ? 'h-12' : expanded ? 'h-[80vh]' : 'h-[32rem]',
      expanded ? 'w-[40rem] max-w-[calc(100vw-2rem)]' : 'w-[24rem] max-w-[calc(100vw-2rem)]',
    ]"
  >
    <!-- Header -->
    <div class="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3">
      <div class="flex min-w-0 items-center gap-2">
        <Icon name="lucide:sparkles" class="h-4 w-4 shrink-0 text-accent-indigo" aria-hidden="true" />
        <span class="truncate text-sm font-medium text-slate-100">{{ actionLabel }}</span>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <button
          v-if="!minimized && hasConversation"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
          aria-label="New chat"
          title="New chat"
          @click="startNewChat"
        >
          <Icon name="lucide:plus" class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
          :aria-label="minimized ? 'Restore' : 'Minimize'"
          @click="minimized = !minimized"
        >
          <Icon :name="minimized ? 'lucide:chevron-up' : 'lucide:minus'" class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          v-if="!minimized"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
          :aria-label="expanded ? 'Shrink' : 'Expand'"
          @click="expanded = !expanded"
        >
          <Icon :name="expanded ? 'lucide:shrink' : 'lucide:expand'" class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
          aria-label="Close"
          @click="close"
        >
          <Icon name="lucide:x" class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <template v-if="!minimized">
      <!-- Messages -->
      <div ref="scrollRef" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div v-if="!hasConversation" class="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <Icon name="lucide:sparkles" class="h-7 w-7 text-slate-600" aria-hidden="true" />
          <p class="text-sm text-slate-400">
            Ask {{ providerLabel }} about
            <span v-if="ticketKey" class="font-medium text-slate-200">{{ ticketKey }}</span>
            <span v-else>your Jira tickets</span>.
          </p>
          <p class="text-xs text-slate-600">
            It can read, edit, transition, and comment via the CLI.
          </p>
        </div>

        <div
          v-for="message in messages"
          :key="message.id"
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] break-words rounded-lg px-3 py-2 text-[13px] leading-relaxed"
            :class="message.role === 'user'
              ? 'whitespace-pre-wrap bg-accent-indigo/90 text-white'
              : 'bg-white/[0.05] text-slate-200'"
          >
            <AssistantMarkdown v-if="message.role === 'assistant' && message.content" :content="message.content" />
            <template v-else>
              {{ message.content || (message.pending ? '…' : '') }}
            </template>
          </div>
        </div>

        <div v-if="statusText" class="flex items-center gap-2 text-xs text-slate-500">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-indigo" />
          <span class="truncate">{{ statusText }}</span>
        </div>

        <p v-if="errorText" class="rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {{ errorText }}
        </p>
      </div>

      <!-- Composer -->
      <div class="shrink-0 border-t border-white/[0.06] p-3">
        <div
          v-if="ticketKey"
          class="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400"
        >
          <Icon name="lucide:ticket" class="h-3 w-3 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ ticketKey }}<span v-if="ticketSummary"> · {{ ticketSummary }}</span></span>
        </div>

        <p v-if="!providerAvailable" class="mb-2 text-[11px] text-amber-300/80">
          {{ providerLabel }} CLI was not detected. Choose an available provider in Settings → Assistant.
        </p>

        <div class="flex items-end gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 focus-within:border-white/[0.16]">
          <textarea
            v-model="draft"
            rows="1"
            :placeholder="`Ask ${providerLabel}…`"
            class="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-[13px] text-slate-200 outline-none placeholder:text-slate-600"
            @keydown="handleKeydown"
          />
          <button
            v-if="isStreaming"
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-slate-200 transition hover:bg-white/[0.14]"
            aria-label="Stop"
            @click="stop"
          >
            <Icon name="lucide:square" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            v-else
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-indigo text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-600"
            :disabled="!draft.trim()"
            aria-label="Send"
            @click="submit"
          >
            <Icon name="lucide:arrow-up" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
