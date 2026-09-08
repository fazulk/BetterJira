<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AssistantMarkdown from '@/components/AssistantMarkdown.vue'
import AssistantSkillPicker from '@/components/AssistantSkillPicker.vue'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { useAssistantChat } from '@/composables/useAssistantChat'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useAssistantSkills } from '@/composables/useAssistantSkills'
import { getAssistantActionLabel, getAssistantProviderLabel, getAssistantReasoningLabel } from '~/shared/assistant'
import { isLocalTicketKey } from '~/shared/localTickets'

const { settings, availableModels, isProviderAvailable } = useAssistantSettings()
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

const { skills } = useAssistantSkills()
const selectedSkillIds = ref<string[]>([])

const actionLabel = computed(() => getAssistantActionLabel(settings.value.provider))
const providerLabel = computed(() => getAssistantProviderLabel(settings.value.provider))
const modelLabel = computed(() => availableModels.value.find(model => model.id === settings.value.model)?.label ?? settings.value.model)
const reasoningLabel = computed(() => `${getAssistantReasoningLabel(settings.value.reasoning)} reasoning`)
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
  selectedSkillIds.value = []
}

const canSubmit = computed(() => draft.value.trim().length > 0 || selectedSkillIds.value.length > 0)

async function submit(): Promise<void> {
  const text = draft.value
  if (!canSubmit.value || isStreaming.value) {
    return
  }
  const attachedSkills = skills.value
    .filter(skill => selectedSkillIds.value.includes(skill.id))
    .map(skill => ({ name: skill.name, body: skill.body }))
  draft.value = ''
  selectedSkillIds.value = []
  await send(text, attachedSkills)
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
      minimized ? 'h-12' : expanded ? 'h-[80vh] max-h-[calc(100dvh-2rem)]' : 'h-[32rem] max-h-[calc(100dvh-2rem)]',
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
      <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/[0.06] px-3 py-2 text-[11px] text-slate-400">
        <span class="flex min-w-0 items-center gap-1.5" :title="`Model: ${modelLabel}`">
          <Icon name="lucide:cpu" class="h-3 w-3 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ modelLabel }}</span>
        </span>
        <span class="flex items-center gap-1.5">
          <Icon name="lucide:brain" class="h-3 w-3 shrink-0" aria-hidden="true" />
          {{ reasoningLabel }}
        </span>
      </div>

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
            class="break-words rounded-lg px-3 py-2 text-[13px] leading-relaxed"
            :class="message.role === 'user'
              ? 'max-w-[85%] whitespace-pre-wrap bg-accent-indigo/90 text-white'
              : 'min-w-0 max-w-full text-slate-200'"
          >
            <AssistantMarkdown v-if="message.role === 'assistant' && message.content" :content="message.content" />
            <template v-else-if="message.role === 'user'">
              <span
                v-for="skill in message.skills ?? []"
                :key="skill.name"
                class="mb-1 mr-1 inline-flex items-center gap-1 rounded bg-white/[0.14] px-1.5 py-0.5 text-[11px] text-white/90"
              >
                <Icon name="lucide:box" class="h-3 w-3" aria-hidden="true" />{{ skill.name }}
              </span>
              {{ message.content }}
            </template>
            <div
              v-if="message.role === 'assistant' && message.pending && isStreaming"
              role="status"
              class="flex items-center gap-2.5 py-1 text-xs text-slate-400"
              :class="message.content ? 'mt-3' : ''"
            >
              <span class="flex h-5 shrink-0 items-center gap-1 text-accent-indigo" aria-hidden="true">
                <span v-for="dot in 3" :key="dot" class="assistant-thinking-dot h-1.5 w-1.5 rounded-full bg-current" :style="{ animationDelay: `${(dot - 1) * 160}ms` }" />
              </span>
              <span class="min-w-0 break-words">{{ statusText || (message.content ? 'Responding…' : `${providerLabel} is thinking…`) }}</span>
            </div>
          </div>
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

        <div class="space-y-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 focus-within:border-white/[0.16]">
          <AssistantSkillPicker v-model="selectedSkillIds" />
          <div class="flex items-end gap-2">
            <textarea
              v-model="draft"
              rows="1"
              aria-label="Message the assistant"
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
              :disabled="!canSubmit"
              aria-label="Send"
              @click="submit"
            >
              <Icon name="lucide:arrow-up" class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.assistant-thinking-dot {
  animation: assistant-thinking 1.2s ease-in-out infinite;
}

@keyframes assistant-thinking {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-thinking-dot {
    animation: none;
  }
}
</style>
