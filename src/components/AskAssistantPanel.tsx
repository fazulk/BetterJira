import * as stylex from '@stylexjs/stylex'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '#components'
import AssistantMarkdown from '@/components/AssistantMarkdown'
import AssistantSkillPicker from '@/components/AssistantSkillPicker'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { useAssistantChat } from '@/composables/useAssistantChat'
import { useAssistantPanel } from '@/composables/useAssistantPanel'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useAssistantSkills } from '@/composables/useAssistantSkills'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { getAssistantActionLabel, getAssistantProviderLabel, getAssistantReasoningLabel } from '~/shared/assistant'
import { isLocalTicketKey } from '~/shared/localTickets'

const thinking = stylex.keyframes({
  '0%': { opacity: 0.35, transform: 'translateY(0)' },
  '30%': { opacity: 1, transform: 'translateY(-3px)' },
  '60%': { opacity: 0.35, transform: 'translateY(0)' },
  '100%': { opacity: 0.35, transform: 'translateY(0)' },
})

const styles = stylex.create({
  root: {
    position: 'fixed',
    right: '1rem',
    bottom: '1rem',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '0.75rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#16171b',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    transitionProperty: 'all',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  minimized: { height: '3rem' },
  normalHeight: { height: '32rem', maxHeight: 'calc(100dvh - 2rem)' },
  expandedHeight: { height: '80vh', maxHeight: 'calc(100dvh - 2rem)' },
  normalWidth: { width: '24rem', maxWidth: 'calc(100vw - 2rem)' },
  expandedWidth: { width: '40rem', maxWidth: 'calc(100vw - 2rem)' },
  header: { display: 'flex', height: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem' },
  headerTitle: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem' },
  headerIcon: { width: '1rem', height: '1rem', flexShrink: 0, color: colors['--color-accent-indigo'] },
  headerText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-100'] },
  headerActions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.125rem' },
  iconButton: { display: 'flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  iconSm: { width: '1rem', height: '1rem' },
  meta: { display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', columnGap: '0.75rem', rowGap: '0.25rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: 11, color: colors['--color-slate-400'] },
  metaItem: { display: 'flex', alignItems: 'center', gap: '0.375rem' },
  metaItemShrink: { minWidth: 0 },
  metaIcon: { width: '0.75rem', height: '0.75rem', flexShrink: 0 },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  messages: { minHeight: 0, flexGrow: '1', flexShrink: '1', flexBasis: '0%', overflowY: 'auto', paddingInline: '0.75rem', paddingBlock: '1rem' },
  emptyState: { display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingInline: '1rem', textAlign: 'center' },
  emptyIcon: { width: '1.75rem', height: '1.75rem', color: colors['--color-slate-600'] },
  emptyText: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-400'] },
  emptyStrong: { fontWeight: 500, color: colors['--color-slate-200'] },
  emptyHint: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  messageListItem: { display: 'flex', marginTop: '1rem' },
  firstMessage: { marginTop: 0 },
  messageUserAlign: { justifyContent: 'flex-end' },
  messageAssistantAlign: { justifyContent: 'flex-start' },
  bubble: { overflowWrap: 'break-word', borderRadius: '0.5rem', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: 13, lineHeight: 1.625 },
  userBubble: { maxWidth: '85%', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(111, 115, 255, 0.9)', color: colors['--color-white'] },
  assistantBubble: { minWidth: 0, maxWidth: '100%', color: colors['--color-slate-200'] },
  skillTag: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem', marginBottom: '0.25rem', borderRadius: '0.25rem', backgroundColor: 'rgba(255, 255, 255, 0.14)', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' },
  skillTagIcon: { width: '0.75rem', height: '0.75rem' },
  pending: { display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-400'] },
  pendingWithContent: { marginTop: '0.75rem' },
  pendingDots: { display: 'flex', height: '1.25rem', flexShrink: 0, alignItems: 'center', gap: '0.25rem', color: colors['--color-accent-indigo'] },
  pendingDot: { width: '0.375rem', height: '0.375rem', borderRadius: '9999px', backgroundColor: 'currentColor', animationName: { default: thinking, [breakpoints.reducedMotion]: 'none' }, animationDuration: '1.2s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' },
  pendingStatus: { minWidth: 0, overflowWrap: 'break-word' },
  error: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(251, 113, 133, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-200'] },
  composerShell: { flexShrink: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', padding: '0.75rem' },
  ticketPill: { display: 'inline-flex', maxWidth: '100%', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, color: colors['--color-slate-400'] },
  ticketIcon: { width: '0.75rem', height: '0.75rem', flexShrink: 0 },
  warning: { marginBottom: '0.5rem', fontSize: 11, color: 'rgba(252, 211, 77, 0.8)' },
  inputBox: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.625rem', paddingBlock: '0.5rem' },
  inputBoxFocused: { borderColor: 'rgba(255, 255, 255, 0.16)' },
  composerRow: { display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginTop: '0.375rem' },
  textarea: { 'maxHeight': '8rem', 'minHeight': '1.5rem', 'flexGrow': '1', 'flexShrink': '1', 'flexBasis': '0%', 'resize': 'none', 'borderWidth': 0, 'backgroundColor': 'transparent', 'fontSize': 13, 'color': colors['--color-slate-200'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  sendButton: { display: 'flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)', ':disabled': 'rgba(255, 255, 255, 0.06)' }, color: { 'default': colors['--color-white'], ':disabled': colors['--color-slate-600'] }, cursor: { 'default': null, ':disabled': 'not-allowed' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  stopButton: { display: 'flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' }, color: colors['--color-slate-200'], transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  stopIcon: { width: '0.875rem', height: '0.875rem' },
})

const dotDelays = ['0ms', '160ms', '320ms']

const dynamicStyles = stylex.create({
  animationDelay: (delay: string) => ({ animationDelay: delay }),
})

export default defineComponent({
  name: 'AskAssistantPanel',
  setup() {
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
    const inputBoxFocused = ref(false)

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

    return () => (
      <div
        {...stylex.attrs(
          styles.root,
          minimized.value ? styles.minimized : expanded.value ? styles.expandedHeight : styles.normalHeight,
          expanded.value ? styles.expandedWidth : styles.normalWidth,
        )}
      >
        <div {...stylex.attrs(styles.header)}>
          <div {...stylex.attrs(styles.headerTitle)}>
            <Icon name="lucide:sparkles" {...stylex.attrs(styles.headerIcon)} aria-hidden="true" />
            <span {...stylex.attrs(styles.headerText)}>{actionLabel.value}</span>
          </div>
          <div {...stylex.attrs(styles.headerActions)}>
            {!minimized.value && hasConversation.value && (
              <button type="button" {...stylex.attrs(styles.iconButton)} aria-label="New chat" title="New chat" onClick={startNewChat}>
                <Icon name="lucide:plus" {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              {...stylex.attrs(styles.iconButton)}
              aria-label={minimized.value ? 'Restore' : 'Minimize'}
              onClick={() => {
                minimized.value = !minimized.value
              }}
            >
              <Icon name={minimized.value ? 'lucide:chevron-up' : 'lucide:minus'} {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
            </button>
            {!minimized.value && (
              <button
                type="button"
                {...stylex.attrs(styles.iconButton)}
                aria-label={expanded.value ? 'Shrink' : 'Expand'}
                onClick={() => {
                  expanded.value = !expanded.value
                }}
              >
                <Icon name={expanded.value ? 'lucide:shrink' : 'lucide:expand'} {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
              </button>
            )}
            <button type="button" {...stylex.attrs(styles.iconButton)} aria-label="Close" onClick={close}>
              <Icon name="lucide:x" {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
            </button>
          </div>
        </div>

        {!minimized.value && (
          <>
            <div {...stylex.attrs(styles.meta)}>
              <span {...stylex.attrs(styles.metaItem, styles.metaItemShrink)} title={`Model: ${modelLabel.value}`}>
                <Icon name="lucide:cpu" {...stylex.attrs(styles.metaIcon)} aria-hidden="true" />
                <span {...stylex.attrs(styles.truncate)}>{modelLabel.value}</span>
              </span>
              <span {...stylex.attrs(styles.metaItem)}>
                <Icon name="lucide:brain" {...stylex.attrs(styles.metaIcon)} aria-hidden="true" />
                {reasoningLabel.value}
              </span>
            </div>

            <div ref={scrollRef} {...stylex.attrs(styles.messages)}>
              {!hasConversation.value && (
                <div {...stylex.attrs(styles.emptyState)}>
                  <Icon name="lucide:sparkles" {...stylex.attrs(styles.emptyIcon)} aria-hidden="true" />
                  <p {...stylex.attrs(styles.emptyText)}>
                    Ask
                    {' '}
                    {providerLabel.value}
                    {' '}
                    about
                    {' '}
                    {ticketKey.value
                      ? <span {...stylex.attrs(styles.emptyStrong)}>{ticketKey.value}</span>
                      : <span>your Jira tickets</span>}
                    .
                  </p>
                  <p {...stylex.attrs(styles.emptyHint)}>It can read, edit, transition, and comment via the CLI.</p>
                </div>
              )}

              {messages.value.map((message, index) => (
                <div
                  key={message.id}
                  {...stylex.attrs(
                    styles.messageListItem,
                    index === 0 && styles.firstMessage,
                    message.role === 'user' ? styles.messageUserAlign : styles.messageAssistantAlign,
                  )}
                >
                  <div
                    {...stylex.attrs(
                      styles.bubble,
                      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                    )}
                  >
                    {message.role === 'assistant' && message.content && <AssistantMarkdown content={message.content} />}
                    {message.role === 'user' && (
                      <>
                        {(message.skills ?? []).map(skill => (
                          <span key={skill.name} {...stylex.attrs(styles.skillTag)}>
                            <Icon name="lucide:box" {...stylex.attrs(styles.skillTagIcon)} aria-hidden="true" />
                            {skill.name}
                          </span>
                        ))}
                        {message.content}
                      </>
                    )}
                    {message.role === 'assistant' && message.pending && isStreaming.value && (
                      <div role="status" {...stylex.attrs(styles.pending, message.content ? styles.pendingWithContent : null)}>
                        <span {...stylex.attrs(styles.pendingDots)} aria-hidden="true">
                          {dotDelays.map(delay => (
                            <span key={delay} {...stylex.attrs(styles.pendingDot, dynamicStyles.animationDelay(delay))} />
                          ))}
                        </span>
                        <span {...stylex.attrs(styles.pendingStatus)}>{statusText.value || (message.content ? 'Responding…' : `${providerLabel.value} is thinking…`)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {errorText.value && <p {...stylex.attrs(styles.error)}>{errorText.value}</p>}
            </div>

            <div {...stylex.attrs(styles.composerShell)}>
              {ticketKey.value && (
                <div {...stylex.attrs(styles.ticketPill)}>
                  <Icon name="lucide:ticket" {...stylex.attrs(styles.ticketIcon)} aria-hidden="true" />
                  <span {...stylex.attrs(styles.truncate)}>
                    {ticketKey.value}
                    {ticketSummary.value && (
                      <span>
                        {' · '}
                        {ticketSummary.value}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {!providerAvailable.value && (
                <p {...stylex.attrs(styles.warning)}>
                  {providerLabel.value}
                  {' '}
                  CLI was not detected. Choose an available provider in Settings → Assistant.
                </p>
              )}

              <div
                {...stylex.attrs(styles.inputBox, inputBoxFocused.value && styles.inputBoxFocused)}
                onFocusin={() => { inputBoxFocused.value = true }}
                onFocusout={() => { inputBoxFocused.value = false }}
              >
                <AssistantSkillPicker modelValue={selectedSkillIds.value} onUpdate:modelValue={(value) => { selectedSkillIds.value = value }} />
                <div {...stylex.attrs(styles.composerRow)}>
                  <textarea
                    v-model={draft.value}
                    rows="1"
                    aria-label="Message the assistant"
                    placeholder={`Ask ${providerLabel.value}…`}
                    {...stylex.attrs(styles.textarea)}
                    onKeydown={handleKeydown}
                  />
                  {isStreaming.value
                    ? (
                        <button type="button" {...stylex.attrs(styles.stopButton)} aria-label="Stop" onClick={stop}>
                          <Icon name="lucide:square" {...stylex.attrs(styles.stopIcon)} aria-hidden="true" />
                        </button>
                      )
                    : (
                        <button type="button" {...stylex.attrs(styles.sendButton)} disabled={!canSubmit.value} aria-label="Send" onClick={submit}>
                          <Icon name="lucide:arrow-up" {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
                        </button>
                      )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  },
})
