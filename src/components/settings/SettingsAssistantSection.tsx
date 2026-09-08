import type { AssistantProvider, AssistantReasoning } from '~/shared/assistant'
import type { AssistantSkillSetting } from '~/shared/settings'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref, watch } from 'vue'
import { Icon } from '#components'
import AssistantSkillModal from '@/components/settings/AssistantSkillModal'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { formatSkillUpdatedAt, useAssistantSkills } from '@/composables/useAssistantSkills'
import { breakpoints, colors, typography } from '@/styles/tokens.stylex'
import {
  ASSISTANT_REASONING_LEVELS,
  getAssistantProviderLabel,
  getAssistantReasoningLabel,
  isAssistantProvider,
  isAssistantReasoning,
} from '~/shared/assistant'

const styles = stylex.create({
  section: { maxWidth: '48rem', marginInline: 'auto' },
  blockGap: { marginTop: '1.25rem' },
  title: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600, color: colors['--color-slate-100'] },
  copy: { marginTop: '0.25rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  card: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  cardPadded: { padding: '1rem' },
  splitGrid: { display: 'grid', gap: 0, gridTemplateColumns: { [breakpoints.md]: 'repeat(2, minmax(0, 1fr))' } },
  splitField: { display: 'block', padding: '1rem', borderBottomWidth: { default: 1, [breakpoints.md]: 0 }, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', borderRightWidth: { [breakpoints.md]: 1 }, borderRightStyle: { [breakpoints.md]: 'solid' }, borderRightColor: { [breakpoints.md]: 'rgba(255, 255, 255, 0.06)' } },
  splitFieldLast: { borderBottomWidth: 0, borderRightWidth: { [breakpoints.md]: 0 } },
  label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-500'] },
  select: { width: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.06)', ':focus': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: { 'default': 'rgba(255, 255, 255, 0.04)', ':focus': 'rgba(255, 255, 255, 0.06)' }, paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'], outlineStyle: 'none', transitionProperty: 'border-color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  segmented: { display: 'inline-flex', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.125rem' },
  segmentedButton: { borderRadius: '0.25rem', paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  segmentedActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: colors['--color-slate-100'] },
  hint: { marginTop: '0.5rem', fontSize: 11, color: colors['--color-slate-600'] },
  rowBetweenTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' },
  rowBetweenCenter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  subtitle: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  subcopy: { marginTop: '0.125rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  secondaryButton: { flexShrink: 0, borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.625rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-300'], backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, cursor: { 'default': null, ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.4 }, transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  textarea: { width: '100%', resize: 'vertical', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.06)', ':focus': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: { 'default': 'rgba(255, 255, 255, 0.04)', ':focus': 'rgba(255, 255, 255, 0.06)' }, paddingInline: '0.75rem', paddingBlock: '0.5rem', fontFamily: typography['--font-mono'], fontSize: 12, lineHeight: 1.625, color: colors['--color-slate-200'], outlineStyle: 'none', transitionProperty: 'border-color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  promptFooter: { marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  feedback: { fontSize: '0.75rem', lineHeight: '1rem' },
  feedbackError: { color: colors['--color-rose-300'] },
  feedbackSuccess: { color: colors['--color-emerald-300'] },
  feedbackNeutral: { color: colors['--color-slate-500'] },
  primaryButton: { flexShrink: 0, borderRadius: '0.375rem', backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)', ':disabled': 'rgba(255, 255, 255, 0.06)' }, paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: { 'default': colors['--color-white'], ':disabled': colors['--color-slate-600'] }, cursor: { 'default': null, ':disabled': 'not-allowed' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  skillCard: { marginTop: '0.75rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  skillHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  skillCount: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-300'] },
  iconButton: { display: 'flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  icon: { width: '1rem', height: '1rem' },
  empty: { paddingInline: '1rem', paddingBlock: '1rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  skillRow: { display: 'block', width: '100%', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.04)', paddingInline: '1rem', paddingBlock: '0.75rem', textAlign: 'left', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.03)' }, transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  lastSkillRow: { borderBottomWidth: 0 },
  skillName: { display: 'block', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'] },
  skillUpdated: { display: 'block', marginTop: '0.125rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  availabilityGrid: { display: 'grid', gap: '0.5rem', gridTemplateColumns: { [breakpoints.md]: 'repeat(2, minmax(0, 1fr))' } },
  availabilityCard: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem' },
  providerAvailable: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', color: colors['--color-slate-300'] },
  providerUnavailable: { borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: colors['--color-slate-500'] },
  availabilityHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  availabilityName: { fontWeight: 500, color: colors['--color-slate-200'] },
  availabilityState: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em' },
  availabilityDetail: { marginTop: '0.25rem', fontSize: 11, lineHeight: 1.625, opacity: 0.8 },
  acliCard: { marginTop: '0.5rem' },
  acliUnavailable: { borderColor: 'rgba(251, 191, 36, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: colors['--color-amber-100'] },
  amberName: { color: colors['--color-amber-100'] },
  install: { marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: 11, lineHeight: 1.625 },
  installList: { display: 'flex', flexDirection: 'column', gap: '0.25rem', listStyleType: 'decimal', paddingLeft: '1rem' },
  installLink: { color: { 'default': null, ':hover': colors['--color-amber-50'] }, textDecorationLine: 'underline', textDecorationColor: 'rgba(253, 230, 138, 0.4)', textUnderlineOffset: '2px' },
  code: { borderRadius: '0.25rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', paddingInline: '0.25rem', paddingBlock: '0.125rem' },
  jiraNote: { marginTop: '0.75rem', fontSize: 11, color: colors['--color-slate-600'] },
  errorBox: { marginTop: '0.75rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(251, 113, 133, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-200'] },
})

export default defineComponent({
  name: 'SettingsAssistantSection',
  setup() {
    const {
      settings,
      providers,
      providerAvailability,
      acliAvailability,
      isProviderAvailable,
      isLoadingProviders,
      availableModels,
      defaultSystemPrompt,
      setProvider,
      setModel,
      setReasoning,
      setSystemPrompt,
    } = useAssistantSettings()

    const feedback = ref<string | null>(null)
    const { skills, addSkill, updateSkill, removeSkill } = useAssistantSkills()
    const skillModalOpen = ref(false)
    const editingSkill = ref<AssistantSkillSetting | null>(null)

    function openSkillModal(skill: AssistantSkillSetting | null): void {
      editingSkill.value = skill
      skillModalOpen.value = true
    }

    async function saveSkill(draft: { name: string, body: string }): Promise<void> {
      try {
        if (editingSkill.value) {
          await updateSkill(editingSkill.value.id, draft)
        }
        else {
          await addSkill(draft)
        }
        skillModalOpen.value = false
      }
      catch (error) {
        feedback.value = error instanceof Error ? error.message : 'Failed to save skill.'
      }
    }

    async function deleteSkill(): Promise<void> {
      if (!editingSkill.value) {
        return
      }
      try {
        await removeSkill(editingSkill.value.id)
        skillModalOpen.value = false
      }
      catch (error) {
        feedback.value = error instanceof Error ? error.message : 'Failed to delete skill.'
      }
    }

    const promptDraft = ref(settings.value.systemPrompt)
    const promptFeedback = ref<{ kind: 'success' | 'error', message: string } | null>(null)
    const isSavingPrompt = ref(false)

    watch(() => settings.value.systemPrompt, (value) => {
      promptDraft.value = value
    })

    const isPromptDirty = computed(() => promptDraft.value !== settings.value.systemPrompt)
    const isPromptDefault = computed(() => promptDraft.value.trim() === defaultSystemPrompt.trim())

    async function savePrompt(): Promise<void> {
      isSavingPrompt.value = true
      try {
        await setSystemPrompt(promptDraft.value)
        promptFeedback.value = { kind: 'success', message: 'Saved assistant prompt.' }
      }
      catch (error) {
        promptFeedback.value = { kind: 'error', message: error instanceof Error ? error.message : 'Failed to save assistant prompt.' }
      }
      finally {
        isSavingPrompt.value = false
      }
    }

    async function resetPrompt(): Promise<void> {
      promptDraft.value = defaultSystemPrompt
      isSavingPrompt.value = true
      try {
        await setSystemPrompt(defaultSystemPrompt)
        promptFeedback.value = { kind: 'success', message: 'Restored the default prompt.' }
      }
      catch (error) {
        promptFeedback.value = { kind: 'error', message: error instanceof Error ? error.message : 'Failed to reset assistant prompt.' }
      }
      finally {
        isSavingPrompt.value = false
      }
    }

    function getAvailabilityDetail(provider: AssistantProvider): string {
      return providerAvailability.value.find(entry => entry.provider === provider)?.detail
        ?? `${getAssistantProviderLabel(provider)} CLI detection pending.`
    }

    const isAcliAvailable = computed(() => acliAvailability.value?.available ?? false)
    const acliAvailabilityDetail = computed(() => acliAvailability.value?.detail ?? 'Atlassian CLI detection pending.')
    const acliInstallInstructions = computed(() => acliAvailability.value?.installInstructions ?? [])

    async function handleProviderChange(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLSelectElement) || !isAssistantProvider(event.target.value)) {
        return
      }
      try {
        await setProvider(event.target.value)
        feedback.value = null
      }
      catch (error) {
        feedback.value = error instanceof Error ? error.message : 'Failed to save assistant provider.'
      }
    }

    async function handleModelChange(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLSelectElement)) {
        return
      }
      try {
        await setModel(event.target.value)
        feedback.value = null
      }
      catch (error) {
        feedback.value = error instanceof Error ? error.message : 'Failed to save assistant model.'
      }
    }

    async function handleReasoningChange(reasoning: AssistantReasoning): Promise<void> {
      if (!isAssistantReasoning(reasoning)) {
        return
      }
      try {
        await setReasoning(reasoning)
        feedback.value = null
      }
      catch (error) {
        feedback.value = error instanceof Error ? error.message : 'Failed to save reasoning level.'
      }
    }

    return () => (
      <section {...stylex.attrs(styles.section)}>
        <div>
          <h2 {...stylex.attrs(styles.title)}>Assistant</h2>
          <p {...stylex.attrs(styles.copy)}>
            The "Ask" chat on a ticket proxies to a local CLI. It can read and modify tickets through the bundled Jira skill.
          </p>
        </div>

        <div {...stylex.attrs(styles.card, styles.blockGap)}>
          <div {...stylex.attrs(styles.splitGrid)}>
            <label {...stylex.attrs(styles.splitField)}>
              <span {...stylex.attrs(styles.label)}>Provider</span>
              <select value={settings.value.provider} name="assistant-provider" {...stylex.attrs(styles.select)} onChange={handleProviderChange}>
                {providers.map(provider => (
                  <option key={provider} value={provider}>{`Ask ${getAssistantProviderLabel(provider)}`}</option>
                ))}
              </select>
            </label>

            <label {...stylex.attrs(styles.splitField, styles.splitFieldLast)}>
              <span {...stylex.attrs(styles.label)}>Model</span>
              <select value={settings.value.model} name="assistant-model" {...stylex.attrs(styles.select)} onChange={handleModelChange}>
                {availableModels.value.map(model => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div {...stylex.attrs(styles.card, styles.cardPadded, styles.blockGap)}>
          <span {...stylex.attrs(styles.label)}>Reasoning effort</span>
          <div {...stylex.attrs(styles.segmented)}>
            {ASSISTANT_REASONING_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                {...stylex.attrs(styles.segmentedButton, settings.value.reasoning === level && styles.segmentedActive)}
                onClick={() => { void handleReasoningChange(level) }}
              >
                {getAssistantReasoningLabel(level)}
              </button>
            ))}
          </div>
          <p {...stylex.attrs(styles.hint)}>Higher effort spends more time reasoning before responding.</p>
        </div>

        <div {...stylex.attrs(styles.card, styles.cardPadded, styles.blockGap)}>
          <div {...stylex.attrs(styles.rowBetweenTop)}>
            <div>
              <h3 {...stylex.attrs(styles.subtitle)}>System prompt</h3>
              <p {...stylex.attrs(styles.subcopy)}>
                Behaviour and tone for both the home chat and the per-ticket chat. The current ticket and the acli reference are added automatically.
              </p>
            </div>
            <button type="button" {...stylex.attrs(styles.secondaryButton)} disabled={isSavingPrompt.value || (isPromptDefault.value && !isPromptDirty.value)} onClick={resetPrompt}>
              Reset to default
            </button>
          </div>
          <textarea
            v-model={promptDraft.value}
            rows="7"
            spellcheck={false}
            {...stylex.attrs(styles.textarea)}
          />
          <div {...stylex.attrs(styles.promptFooter)}>
            {promptFeedback.value
              ? <p {...stylex.attrs(styles.feedback, promptFeedback.value.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess)}>{promptFeedback.value.message}</p>
              : <span />}
            <button type="button" {...stylex.attrs(styles.primaryButton)} disabled={isSavingPrompt.value || !isPromptDirty.value} onClick={savePrompt}>
              {isSavingPrompt.value ? 'Saving…' : 'Save prompt'}
            </button>
          </div>
        </div>

        <div {...stylex.attrs(styles.blockGap)}>
          <h3 {...stylex.attrs(styles.subtitle)}>Skills</h3>
          <p {...stylex.attrs(styles.subcopy)}>Reusable prompts you can attach to a chat message from the composer.</p>
          <div {...stylex.attrs(styles.skillCard)}>
            <div {...stylex.attrs(styles.skillHeader)}>
              <span {...stylex.attrs(styles.skillCount)}>
                {skills.value.length}
                {' '}
                {skills.value.length === 1 ? 'skill' : 'skills'}
              </span>
              <button type="button" {...stylex.attrs(styles.iconButton)} aria-label="Add skill" title="Add skill" onClick={() => openSkillModal(null)}>
                <Icon name="lucide:plus" {...stylex.attrs(styles.icon)} aria-hidden="true" />
              </button>
            </div>
            {skills.value.length === 0 && (
              <p {...stylex.attrs(styles.empty)}>No skills yet. Add one to reuse a prompt in the assistant chat.</p>
            )}
            {skills.value.map((skill, index) => (
              <button key={skill.id} type="button" {...stylex.attrs(styles.skillRow, index === skills.value.length - 1 && styles.lastSkillRow)} onClick={() => openSkillModal(skill)}>
                <span {...stylex.attrs(styles.skillName)}>{skill.name}</span>
                {skill.updatedAt && <span {...stylex.attrs(styles.skillUpdated)}>{formatSkillUpdatedAt(skill.updatedAt)}</span>}
              </button>
            ))}
          </div>
        </div>

        <div {...stylex.attrs(styles.card, styles.cardPadded, styles.blockGap)}>
          <div {...stylex.attrs(styles.rowBetweenCenter)}>
            <div>
              <h3 {...stylex.attrs(styles.subtitle)}>CLI availability</h3>
              <p {...stylex.attrs(styles.subcopy)}>The assistant uses the same login as your interactive CLI session.</p>
            </div>
            {isLoadingProviders.value && <span {...stylex.attrs(styles.feedback, styles.feedbackNeutral)}>Checking...</span>}
          </div>
          <div {...stylex.attrs(styles.availabilityGrid, styles.blockGap)}>
            {providers.map(provider => (
              <div
                key={provider}
                {...stylex.attrs(styles.availabilityCard, isProviderAvailable(provider) ? styles.providerAvailable : styles.providerUnavailable)}
              >
                <div {...stylex.attrs(styles.availabilityHeader)}>
                  <span {...stylex.attrs(styles.availabilityName)}>{`Ask ${getAssistantProviderLabel(provider)}`}</span>
                  <span {...stylex.attrs(styles.availabilityState)}>{isProviderAvailable(provider) ? 'Available' : 'Unavailable'}</span>
                </div>
                <p {...stylex.attrs(styles.availabilityDetail)}>{getAvailabilityDetail(provider)}</p>
              </div>
            ))}
          </div>
          <div
            {...stylex.attrs(
              styles.availabilityCard,
              styles.acliCard,
              isAcliAvailable.value ? styles.providerAvailable : styles.acliUnavailable,
            )}
          >
            <div {...stylex.attrs(styles.availabilityHeader)}>
              <span {...stylex.attrs(styles.availabilityName, !isAcliAvailable.value && styles.amberName)}>Atlassian CLI (acli)</span>
              <span {...stylex.attrs(styles.availabilityState)}>{isAcliAvailable.value ? 'Available' : 'Unavailable'}</span>
            </div>
            <p {...stylex.attrs(styles.availabilityDetail)}>{acliAvailabilityDetail.value}</p>
            {!isAcliAvailable.value && acliInstallInstructions.value.length > 0 && (
              <div {...stylex.attrs(styles.install)}>
                <p>Install and authenticate with:</p>
                <ol {...stylex.attrs(styles.installList)}>
                  {acliInstallInstructions.value.map(instruction => (
                    <li key={instruction}>
                      {instruction.startsWith('https://')
                        ? (
                            <a href={instruction} target="_blank" rel="noreferrer" {...stylex.attrs(styles.installLink)}>
                              Atlassian CLI install guide
                            </a>
                          )
                        : <code {...stylex.attrs(styles.code)}>{instruction}</code>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <p {...stylex.attrs(styles.jiraNote)}>
            Jira actions require the
            {' '}
            <code>acli</code>
            {' '}
            command-line tool to be installed and authenticated.
          </p>
          {feedback.value && <p {...stylex.attrs(styles.errorBox)}>{feedback.value}</p>}
        </div>

        {skillModalOpen.value && (
          <AssistantSkillModal
            key={editingSkill.value?.id ?? 'new'}
            skill={editingSkill.value}
            onSave={saveSkill}
            onDelete={deleteSkill}
            onClose={() => { skillModalOpen.value = false }}
          />
        )}
      </section>
    )
  },
})
