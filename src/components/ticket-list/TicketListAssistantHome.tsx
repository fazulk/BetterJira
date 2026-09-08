import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '#components'
import AssistantMarkdown from '@/components/AssistantMarkdown'
import AssistantSkillPicker from '@/components/AssistantSkillPicker'
import { createAssistantChatState, useAssistantChat } from '@/composables/useAssistantChat'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useAssistantSkills } from '@/composables/useAssistantSkills'
import { getAssistantProviderLabel } from '~/shared/assistant'

const homeChatState = createAssistantChatState()
const draft = ref('')
const selectedSkillIds = ref<string[]>([])

function getTextareaValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLTextAreaElement ? target.value : ''
}

export default defineComponent({
  name: 'TicketListAssistantHome',
  setup() {
    const noTicketKey = ref<string | null>(null)
    const noTicketSummary = ref<string | null>(null)

    const { settings, isProviderAvailable } = useAssistantSettings()
    const { skills } = useAssistantSkills()
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
    const textareaRef = ref<HTMLTextAreaElement | null>(null)

    async function resizeTextarea(): Promise<void> {
      await nextTick()
      const element = textareaRef.value
      if (element) {
        element.style.height = 'auto'
        element.style.height = `${element.scrollHeight}px`
      }
    }

    watch(draft, resizeTextarea)
    onMounted(resizeTextarea)

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

    return () => (
      <div class="relative flex h-full min-h-0 flex-col">
        {hasConversation.value && (
          <div class="flex shrink-0 justify-end px-4 pt-3">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/[0.08]"
              onClick={startNewChat}
            >
              <Icon name="lucide:plus" class="h-3.5 w-3.5" aria-hidden="true" />
              New chat
            </button>
          </div>
        )}

        {hasConversation.value && (
          <div ref={scrollRef} class="min-h-0 flex-1 overflow-y-auto">
            <div class="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
              {messages.value.map(message => (
                <div key={message.id} class={['flex', message.role === 'user' ? 'justify-end' : 'justify-start']}>
                  <div class={['max-w-[85%] break-words rounded-lg px-3 py-2 text-[13px] leading-relaxed', message.role === 'user' ? 'whitespace-pre-wrap bg-accent-indigo/90 text-white' : 'bg-white/[0.05] text-slate-200']}>
                    {message.role === 'assistant' && message.content
                      ? <AssistantMarkdown content={message.content} />
                      : (
                          <>
                            {(message.skills ?? []).map(skill => (
                              <span key={skill.name} class="mb-1 mr-1 inline-flex items-center gap-1 rounded bg-white/[0.14] px-1.5 py-0.5 text-[11px] text-white/90">
                                <Icon name="lucide:box" class="h-3 w-3" aria-hidden="true" />
                                {skill.name}
                              </span>
                            ))}
                            {message.content || (message.pending ? '…' : '')}
                          </>
                        )}
                  </div>
                </div>
              ))}

              {statusText.value && (
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-indigo" />
                  <span class="truncate">{statusText.value}</span>
                </div>
              )}

              {errorText.value && (
                <p class="rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {errorText.value}
                </p>
              )}
            </div>
          </div>
        )}

        <div class={['flex shrink-0 flex-col', hasConversation.value ? 'pb-6 pt-2' : 'min-h-0 flex-1 justify-center']}>
          <div class="mx-auto w-full max-w-2xl px-4">
            {!providerAvailable.value && (
              <p class="mb-2 px-1 text-[11px] text-amber-300/80">
                {providerLabel.value}
                {' '}
                CLI was not detected. Choose an available provider in Settings → Assistant.
              </p>
            )}

            <div class="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 focus-within:border-white/[0.16]">
              <AssistantSkillPicker
                modelValue={selectedSkillIds.value}
                onUpdate:modelValue={(value: string[]) => { selectedSkillIds.value = value }}
              />
              <div class="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={draft.value}
                  rows="1"
                  placeholder={`Ask ${providerLabel.value}…`}
                  class="max-h-40 min-h-[2rem] flex-1 resize-none bg-transparent text-[17px] text-slate-200 outline-none placeholder:text-slate-600"
                  onInput={(event) => { draft.value = getTextareaValue(event) }}
                  onKeydown={handleKeydown}
                />
                {isStreaming.value
                  ? (
                      <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-slate-200 transition hover:bg-white/[0.14]" aria-label="Stop" onClick={stop}>
                        <Icon name="lucide:square" class="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )
                  : (
                      <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-indigo text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-600" disabled={!canSubmit.value} aria-label="Send" onClick={() => { void submit() }}>
                        <Icon name="lucide:arrow-up" class="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
})
