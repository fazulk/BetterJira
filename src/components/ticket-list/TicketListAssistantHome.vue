<script lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { createAssistantChatState, useAssistantChat } from '@/composables/useAssistantChat'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { getAssistantProviderLabel } from '~/shared/assistant'

// Module scope (runs once, not per instance) so the conversation, draft, and any
// in-flight stream survive leaving this view. The CLI providers hold no session
// between turns, so this transcript is the whole chat session.
const homeChatState = createAssistantChatState()
const draft = ref('')
</script>

<script setup lang="ts">
// This landing page intentionally has no ticket context: it's the workspace-level
// "Ask Claude/Codex" entry reached from the BetterJira home button.
const noTicketKey = ref<string | null>(null)
const noTicketSummary = ref<string | null>(null)

const { settings, isProviderAvailable } = useAssistantSettings()
const {
  messages,
  isStreaming,
  statusText,
  errorText,
  send,
  stop,
  reset,
} = useAssistantChat({ ticketKey: noTicketKey, ticketSummary: noTicketSummary, state: homeChatState })

const scrollRef = ref<HTMLElement | null>(null)

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
  <div class="relative flex h-full min-h-0 flex-col">
    <div v-if="hasConversation" class="flex shrink-0 justify-end px-4 pt-3">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/[0.08]"
        @click="startNewChat"
      >
        <Icon name="lucide:plus" class="h-3.5 w-3.5" aria-hidden="true" />
        New chat
      </button>
    </div>

    <!-- Transcript (after the first message) -->
    <div v-if="hasConversation" ref="scrollRef" class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <div
          v-for="message in messages"
          :key="message.id"
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[13px] leading-relaxed"
            :class="message.role === 'user'
              ? 'bg-accent-indigo/90 text-white'
              : 'bg-white/[0.05] text-slate-200'"
          >
            {{ message.content || (message.pending ? '…' : '') }}
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
    </div>

    <!-- Composer: vertically centered while empty, pinned to the bottom once a conversation starts -->
    <div
      class="flex shrink-0 flex-col"
      :class="hasConversation ? 'pb-6 pt-2' : 'min-h-0 flex-1 justify-center'"
    >
      <div class="mx-auto w-full max-w-2xl px-4">
        <p v-if="!providerAvailable" class="mb-2 px-1 text-[11px] text-amber-300/80">
          {{ providerLabel }} CLI was not detected. Choose an available provider in Settings → Assistant.
        </p>

        <div class="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 focus-within:border-white/[0.16]">
          <textarea
            v-model="draft"
            rows="1"
            :placeholder="`Ask ${providerLabel}…`"
            class="max-h-40 min-h-[2rem] flex-1 resize-none bg-transparent text-[17px] text-slate-200 outline-none placeholder:text-slate-600"
            @keydown="handleKeydown"
          />
          <button
            v-if="isStreaming"
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-slate-200 transition hover:bg-white/[0.14]"
            aria-label="Stop"
            @click="stop"
          >
            <Icon name="lucide:square" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            v-else
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-indigo text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-600"
            :disabled="!draft.trim()"
            aria-label="Send"
            @click="submit"
          >
            <Icon name="lucide:arrow-up" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
