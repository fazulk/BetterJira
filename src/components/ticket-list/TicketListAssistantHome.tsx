import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '#components'
import AssistantMarkdown from '@/components/AssistantMarkdown'
import AssistantSkillPicker from '@/components/AssistantSkillPicker'
import { createAssistantChatState, useAssistantChat } from '@/composables/useAssistantChat'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useAssistantSkills } from '@/composables/useAssistantSkills'
import { colors } from '@/styles/tokens.stylex'
import { getAssistantProviderLabel } from '~/shared/assistant'

const homeChatState = createAssistantChatState()
const draft = ref('')
const selectedSkillIds = ref<string[]>([])

const styles = stylex.create({
  root: { position: 'relative', display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column' },
  newChatRow: { display: 'flex', flexShrink: 0, justifyContent: 'flex-end', paddingInline: '1rem', paddingTop: '0.75rem' },
  newChatButton: { display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.03)', ':hover': 'rgba(255, 255, 255, 0.08)' }, paddingInline: '0.625rem', paddingBlock: '0.375rem', fontSize: 12, color: colors['--color-slate-300'], transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  smallIcon: { width: '0.875rem', height: '0.875rem' },
  scroll: { minHeight: 0, flex: '1', overflowY: 'auto' },
  messages: { marginInline: 'auto', width: '100%', maxWidth: '48rem', paddingInline: '1rem', paddingBlock: '2rem' },
  messageSpacer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  messageRow: { display: 'flex' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', overflowWrap: 'break-word', borderRadius: '0.5rem', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: 13, lineHeight: 1.625 },
  userBubble: { whiteSpace: 'pre-wrap', backgroundColor: 'rgba(111, 115, 255, 0.9)', color: colors['--color-white'] },
  assistantBubble: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: colors['--color-slate-200'] },
  skillPill: { marginBottom: '0.25rem', marginRight: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.25rem', backgroundColor: 'rgba(255, 255, 255, 0.14)', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' },
  skillIcon: { width: '0.75rem', height: '0.75rem' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  pulseDot: { height: '0.375rem', width: '0.375rem', borderRadius: '9999px', backgroundColor: colors['--color-accent-indigo'], animationName: stylex.keyframes({ '50%': { opacity: 0.5 } }), animationDuration: '2s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)', animationIterationCount: 'infinite' },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  error: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(251, 113, 133, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-200'] },
  composerSection: { display: 'flex', flexShrink: 0, flexDirection: 'column' },
  composerWithConversation: { paddingBottom: '1.5rem', paddingTop: '0.5rem' },
  composerEmpty: { minHeight: 0, flex: '1', justifyContent: 'center' },
  composerWidth: { marginInline: 'auto', width: '100%', maxWidth: '42rem', paddingInline: '1rem' },
  providerWarning: { marginBottom: '0.5rem', paddingInline: '0.25rem', fontSize: 11, color: 'rgba(252, 211, 77, 0.8)' },
  composerBox: { borderRadius: '0.75rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus-within': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.875rem', paddingBlock: '0.75rem' },
  skillPickerGap: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  inputRow: { display: 'flex', alignItems: 'flex-end', gap: '0.5rem' },
  textarea: { 'maxHeight': '10rem', 'minHeight': '2rem', 'flex': '1', 'resize': 'none', 'backgroundColor': 'transparent', 'fontSize': 17, 'color': colors['--color-slate-200'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  iconButton: { display: 'flex', height: '2rem', width: '2rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  stopButton: { backgroundColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' }, color: colors['--color-slate-200'] },
  sendButton: { backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)', ':disabled': 'rgba(255, 255, 255, 0.06)' }, color: { 'default': colors['--color-white'], ':disabled': colors['--color-slate-600'] }, cursor: { ':disabled': 'not-allowed' } },
  sendIcon: { width: '1rem', height: '1rem' },
})

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
      <div {...stylex.attrs(styles.root)}>
        {hasConversation.value && (
          <div {...stylex.attrs(styles.newChatRow)}>
            <button
              type="button"
              {...stylex.attrs(styles.newChatButton)}
              onClick={startNewChat}
            >
              <Icon name="lucide:plus" {...stylex.attrs(styles.smallIcon)} aria-hidden="true" />
              New chat
            </button>
          </div>
        )}

        {hasConversation.value && (
          <div ref={scrollRef} {...stylex.attrs(styles.scroll)}>
            <div {...stylex.attrs(styles.messages, styles.messageSpacer)}>
              {messages.value.map(message => (
                <div key={message.id} {...stylex.attrs(styles.messageRow, message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant)}>
                  <div {...stylex.attrs(styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble)}>
                    {message.role === 'assistant' && message.content
                      ? <AssistantMarkdown content={message.content} />
                      : (
                          <>
                            {(message.skills ?? []).map(skill => (
                              <span key={skill.name} {...stylex.attrs(styles.skillPill)}>
                                <Icon name="lucide:box" {...stylex.attrs(styles.skillIcon)} aria-hidden="true" />
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
                <div {...stylex.attrs(styles.statusRow)}>
                  <span {...stylex.attrs(styles.pulseDot)} />
                  <span {...stylex.attrs(styles.truncate)}>{statusText.value}</span>
                </div>
              )}

              {errorText.value && (
                <p {...stylex.attrs(styles.error)}>
                  {errorText.value}
                </p>
              )}
            </div>
          </div>
        )}

        <div {...stylex.attrs(styles.composerSection, hasConversation.value ? styles.composerWithConversation : styles.composerEmpty)}>
          <div {...stylex.attrs(styles.composerWidth)}>
            {!providerAvailable.value && (
              <p {...stylex.attrs(styles.providerWarning)}>
                {providerLabel.value}
                {' '}
                CLI was not detected. Choose an available provider in Settings → Assistant.
              </p>
            )}

            <div {...stylex.attrs(styles.composerBox, styles.skillPickerGap)}>
              <AssistantSkillPicker
                modelValue={selectedSkillIds.value}
                onUpdate:modelValue={(value: string[]) => { selectedSkillIds.value = value }}
              />
              <div {...stylex.attrs(styles.inputRow)}>
                <textarea
                  ref={textareaRef}
                  v-model={draft.value}
                  rows="1"
                  placeholder={`Ask ${providerLabel.value}…`}
                  {...stylex.attrs(styles.textarea)}
                  onKeydown={handleKeydown}
                />
                {isStreaming.value
                  ? (
                      <button type="button" {...stylex.attrs(styles.iconButton, styles.stopButton)} aria-label="Stop" onClick={stop}>
                        <Icon name="lucide:square" {...stylex.attrs(styles.smallIcon)} aria-hidden="true" />
                      </button>
                    )
                  : (
                      <button type="button" {...stylex.attrs(styles.iconButton, styles.sendButton)} disabled={!canSubmit.value} aria-label="Send" onClick={() => { void submit() }}>
                        <Icon name="lucide:arrow-up" {...stylex.attrs(styles.sendIcon)} aria-hidden="true" />
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
