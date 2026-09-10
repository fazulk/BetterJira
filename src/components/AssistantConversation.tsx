import type { PropType } from 'vue'
import type { AssistantConversation } from '@/composables/useAssistantSessions'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '#components'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { useAssistantSkills } from '@/composables/useAssistantSkills'
import { getAssistantProviderLabel, getAssistantReasoningLabel } from '~/shared/assistant'
import { dotDelays, dynamicStyles, styles } from './assistantConversation.stylex'
import AssistantMarkdown from './AssistantMarkdown'
import AssistantSkillPicker from './AssistantSkillPicker'

export default defineComponent({
  name: 'AssistantConversation',
  props: { conversation: { type: Object as PropType<AssistantConversation>, required: true }, fullscreen: Boolean },
  emits: ['minimize', 'expand', 'close', 'submit'],
  setup(props, { emit }) {
    const { settings, availableModels, isProviderAvailable } = useAssistantSettings()
    const { skills } = useAssistantSkills()
    const textarea = ref<HTMLTextAreaElement | null>(null)
    const scroll = ref<HTMLElement | null>(null)
    const now = ref(Date.now())
    const copied = ref<number | null>(null)
    const copyError = ref('')
    let timer: ReturnType<typeof setInterval> | undefined
    onMounted(() => {
      textarea.value?.focus()
      if (scroll.value)
        scroll.value.scrollTop = scroll.value.scrollHeight
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    })
    onUnmounted(() => clearInterval(timer))
    const provider = computed(() => getAssistantProviderLabel(settings.value.provider))
    const model = computed(() => availableModels.value.find(model => model.id === settings.value.model)?.label ?? settings.value.model)
    watch(() => props.conversation.chat.messages.value.map(message => message.content).join(''), async () => {
      const element = scroll.value
      const nearBottom = !element || element.scrollHeight - element.scrollTop - element.clientHeight < 100
      await nextTick()
      if (element && nearBottom)
        element.scrollTop = element.scrollHeight
    })
    async function submit() {
      const conversation = props.conversation
      if (conversation.chat.isStreaming.value)
        return
      const text = conversation.draft.value
      const attached = skills.value.filter(skill => conversation.selectedSkillIds.value.includes(skill.id)).map(({ name, body }) => ({ name, body }))
      if (!text.trim() && !attached.length)
        return
      emit('submit', conversation)
      conversation.draft.value = ''
      conversation.selectedSkillIds.value = []
      await conversation.chat.send(text, attached)
    }
    async function copy(id: number, content: string) {
      try {
        await navigator.clipboard.writeText(content)
        copied.value = id
        copyError.value = ''
      }
      catch { copyError.value = 'Could not copy response.' }
    }
    return () => {
      const conversation = props.conversation
      const chat = conversation.chat
      return (
        <section
          {...stylex.attrs(styles.column)}
          aria-label="Agent conversation"
          onKeydown={(event: KeyboardEvent) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              emit('minimize')
            }
          }}
        >
          <header {...stylex.attrs(styles.header)}>
            <span {...stylex.attrs(styles.headerText)} title={conversation.title.value}>{conversation.title.value}</span>
            <div {...stylex.attrs(styles.headerActions)}>
              <button {...stylex.attrs(styles.copy)} onClick={() => emit('minimize')} aria-label={props.fullscreen ? 'Move to toolbar' : 'Minimize'}>{props.fullscreen ? 'Move to toolbar' : '−'}</button>
              {!props.fullscreen && <button {...stylex.attrs(styles.iconButton)} aria-label="Expand" onClick={() => emit('expand')}><Icon name="lucide:expand" {...stylex.attrs(styles.icon)} aria-hidden="true" /></button>}
              {!props.fullscreen && <button {...stylex.attrs(styles.iconButton)} aria-label="Close conversation" onClick={() => emit('close')}><Icon name="lucide:x" {...stylex.attrs(styles.icon)} aria-hidden="true" /></button>}
            </div>
          </header>
          <div ref={scroll} {...stylex.attrs(styles.messages)}>
            <div {...stylex.attrs(props.fullscreen && styles.wide)}>
              {!chat.messages.value.length && (
                <div {...stylex.attrs(styles.emptyState)}>
                  <Icon name="lucide:sparkles" {...stylex.attrs(styles.emptyIcon)} />
                  <p>What would you like to work on?</p>
                </div>
              )}
              {chat.messages.value.map(message => (
                <div key={message.id} {...stylex.attrs(styles.messageListItem, message.role === 'user' ? styles.messageUserAlign : styles.messageAssistantAlign)}>
                  <div {...stylex.attrs(styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble)}>
                    {message.role === 'assistant'
                      ? <AssistantMarkdown content={message.content} />
                      : (
                          <>
                            {message.skills?.map(skill => <span key={skill.name} {...stylex.attrs(styles.skillTag)}>{skill.name}</span>)}
                            {message.content}
                          </>
                        )}
                    {message.pending && (
                      <div role="status" {...stylex.attrs(styles.pending)}>
                        <span {...stylex.attrs(styles.pendingDots)}>{dotDelays.map(delay => <span key={delay} {...stylex.attrs(styles.pendingDot, dynamicStyles.animationDelay(delay))} />)}</span>
                        {chat.statusText.value || `${provider.value} is working…`}
                      </div>
                    )}
                    {message.role === 'assistant' && (
                      <details {...stylex.attrs(styles.copy)}>
                        <summary>
                          {message.pending ? 'Working' : 'Worked'}
                          {' '}
                          for
                          {' '}
                          {Math.max(0, Math.round(((message.finishedAt ?? now.value) - message.createdAt) / 1000))}
                          s ·
                          {' '}
                          {message.model}
                          {' '}
                          ·
                          {' '}
                          {message.reasoning}
                        </summary>
                        {message.updates?.map((update, index) => <p key={index}>{update}</p>)}
                      </details>
                    )}
                    <time {...stylex.attrs(styles.timestamp)} datetime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                    {message.role === 'assistant' && message.content && <button {...stylex.attrs(styles.copy)} onClick={() => copy(message.id, message.content)}>{copied.value === message.id ? 'Copied' : 'Copy response'}</button>}
                  </div>
                </div>
              ))}
              {(chat.errorText.value || copyError.value) && <p role="alert" {...stylex.attrs(styles.error)}>{chat.errorText.value || copyError.value}</p>}
            </div>
          </div>
          <div {...stylex.attrs(styles.composerShell, props.fullscreen && styles.wide)}>
            <div {...stylex.attrs(styles.ticketPill)} title={JSON.stringify(conversation.context, null, 2)}>
              Context:
              {conversation.context.label}
              {conversation.context.kind === 'ticket' && conversation.context.local ? ' · Local' : ''}
              {conversation.context.kind === 'view' ? ` · ${conversation.context.totalCount} items${conversation.context.truncated ? ' · snapshot limited to 50' : ''}` : ''}
            </div>
            {!isProviderAvailable(settings.value.provider) && (
              <p {...stylex.attrs(styles.warning)}>
                {provider.value}
                {' '}
                CLI was not detected. Choose an available provider in Settings → Assistant.
              </p>
            )}
            <div {...stylex.attrs(styles.inputBox)}>
              <AssistantSkillPicker modelValue={conversation.selectedSkillIds.value} onUpdate:modelValue={(ids: string[]) => { conversation.selectedSkillIds.value = ids }} />
              <div {...stylex.attrs(styles.composerRow)}>
                <textarea
                  ref={textarea}
                  value={conversation.draft.value}
                  rows="3"
                  aria-label="Message the assistant"
                  placeholder="Ask Agent…"
                  {...stylex.attrs(styles.textarea)}
                  onInput={(event) => { conversation.draft.value = (event.target as HTMLTextAreaElement).value }}
                  onKeydown={(event: KeyboardEvent) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                      event.preventDefault()
                      void submit()
                    }
                  }}
                />
                {chat.isStreaming.value
                  ? <button {...stylex.attrs(styles.stopButton)} aria-label="Stop" onClick={chat.stop}><Icon name="lucide:square" {...stylex.attrs(styles.icon)} aria-hidden="true" /></button>
                  : <button {...stylex.attrs(styles.sendButton)} aria-label="Send" disabled={!conversation.draft.value.trim() && !conversation.selectedSkillIds.value.length} onClick={submit}><Icon name="lucide:arrow-up" {...stylex.attrs(styles.icon)} aria-hidden="true" /></button>}
              </div>
              <div {...stylex.attrs(styles.copy)}>
                {model.value}
                {' '}
                ·
                {' '}
                {getAssistantReasoningLabel(settings.value.reasoning)}
                {' '}
                reasoning
              </div>
            </div>
          </div>
        </section>
      )
    }
  },
})
