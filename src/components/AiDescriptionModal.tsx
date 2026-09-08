import type { PropType } from 'vue'
import type { JiraAdfDocument } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, onBeforeUnmount, ref, Teleport, Transition, watch } from 'vue'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor'
import { useAiSettings } from '@/composables/useAiSettings'
import { useGenerateAiDescription } from '@/composables/useGenerateAiDescription'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { getProviderLabel } from '~/shared/ai'
import { coerceDescriptionToAdf } from '~/shared/jiraAdf'

interface DescriptionEditorExpose {
  focusEditor: () => void
}

const styles = stylex.create({
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingInline: '1rem',
    paddingBlock: '2rem',
    backdropFilter: 'blur(4px)',
  },
  dialog: {
    display: 'flex',
    width: '100%',
    maxWidth: '56rem',
    maxHeight: 'calc(100vh - 4rem)',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors['--color-surface-0'],
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
  },
  header: { display: 'flex', minHeight: '3rem', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem' },
  titleTrail: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  glyph: { display: 'inline-flex', width: '1.25rem', height: '1.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', fontSize: 11, color: colors['--color-slate-400'] },
  dividerText: { color: colors['--color-slate-700'] },
  ticketKey: { fontWeight: 500, color: colors['--color-slate-300'] },
  iconButton: {
    display: 'inline-flex',
    width: '1.75rem',
    height: '1.75rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.375rem',
    borderWidth: 0,
    color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] },
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.05)' },
    transitionProperty: 'color, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: { 'default': 'pointer', ':disabled': 'not-allowed' },
    opacity: { 'default': 1, ':disabled': 0.5 },
  },
  closeIcon: { width: '0.875rem', height: '0.875rem' },
  contentGrid: { display: 'grid', minWidth: 0, minHeight: '360px', flex: '1', gridTemplateColumns: { default: '1fr', [breakpoints.lg]: 'minmax(0,1fr) 20rem' }, overflow: 'hidden' },
  editorPane: { display: 'flex', minWidth: 0, minHeight: 0, flex: '1', flexDirection: 'column', overflow: 'hidden', borderBottomWidth: { default: 1, [breakpoints.lg]: 0 }, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem', borderRightWidth: { [breakpoints.lg]: 1 }, borderRightStyle: { [breakpoints.lg]: 'solid' }, borderRightColor: { [breakpoints.lg]: 'rgba(255, 255, 255, 0.06)' } },
  editorHeading: { minWidth: 0, marginBottom: '0.75rem' },
  ticketTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, fontWeight: 500, color: colors['--color-slate-100'], margin: 0 },
  subtitle: { marginTop: '0.125rem', fontSize: 12, color: colors['--color-slate-600'], marginBottom: 0 },
  editorFrame: { minHeight: 0, flex: '1', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  sidePane: { display: 'flex', minWidth: 0, flexDirection: 'column', overflowY: 'auto', paddingInline: '1rem', paddingBlock: '0.75rem' },
  settingsCard: { marginBottom: '1rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  settingsRow: { display: 'grid', gridTemplateColumns: '5.5rem minmax(0,1fr)', alignItems: 'center', gap: '0.75rem', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  settingsLabel: { fontSize: 12, color: colors['--color-slate-600'] },
  settingsValue: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: colors['--color-slate-300'] },
  instructionLabel: { marginBottom: '0.5rem', fontSize: 12, fontWeight: 500, color: colors['--color-slate-400'] },
  textarea: {
    'minHeight': '112px',
    'width': '100%',
    'resize': 'vertical',
    'borderRadius': '0.375rem',
    'borderWidth': 1,
    'borderStyle': 'solid',
    'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    'backgroundColor': { 'default': 'rgba(255, 255, 255, 0.025)', ':focus': 'rgba(255, 255, 255, 0.04)' },
    'paddingInline': '0.75rem',
    'paddingBlock': '0.5rem',
    'fontSize': 13,
    'lineHeight': '1.25rem',
    'color': colors['--color-slate-300'],
    'outlineStyle': 'none',
    'transitionProperty': 'border-color, background-color',
    'transitionDuration': '150ms',
    'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '::placeholder': { color: colors['--color-slate-600'] },
  },
  error: { marginTop: '0.75rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: 1.625, color: colors['--color-rose-200'] },
  generateButton: {
    marginTop: '0.75rem',
    display: 'inline-flex',
    height: '2rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: { 'default': 'rgba(255, 255, 255, 0.04)', ':hover': 'rgba(255, 255, 255, 0.07)' },
    paddingInline: '0.75rem',
    fontSize: 13,
    fontWeight: 500,
    color: colors['--color-slate-200'],
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: { 'default': 'pointer', ':disabled': 'not-allowed' },
    opacity: { 'default': 1, ':disabled': 0.5 },
  },
  footer: { display: 'flex', minHeight: '3rem', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem' },
  footerHint: { fontSize: 11, color: colors['--color-slate-600'] },
  footerActions: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  cancelButton: { display: 'inline-flex', height: '1.75rem', alignItems: 'center', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.625rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.5 } },
  applyButton: { display: 'inline-flex', height: '1.75rem', alignItems: 'center', borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)' }, paddingInline: '0.625rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-white'], transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
})

export default defineComponent({
  name: 'AiDescriptionModal',
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    currentDescription: {
      type: String,
      required: true,
    },
    currentDescriptionAdf: {
      type: Object as PropType<JiraAdfDocument | null>,
      default: undefined,
    },
    ticketKey: {
      type: String,
      required: true,
    },
    ticketTitle: {
      type: String,
      required: true,
    },
    isSaving: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    close: () => true,
    confirm: (descriptionAdf: JiraAdfDocument | null) => descriptionAdf === null || typeof descriptionAdf === 'object',
  },
  setup(props, { emit }) {
    const proposedDescription = ref<JiraAdfDocument | null>(null)
    const proposedDescriptionEditorRef = ref<DescriptionEditorExpose | null>(null)
    const promptText = ref('')
    const generationError = ref<string | null>(null)
    const { settings: aiSettings } = useAiSettings()
    const generateMutation = useGenerateAiDescription()

    const isProcessing = computed(() => generateMutation.isPending.value)
    const canGenerate = computed(() => promptText.value.trim().length > 0 && !isProcessing.value)

    watch(() => props.open, (isOpen: boolean) => {
      if (isOpen) {
        document.addEventListener('keydown', handleModalKeydown, true)
        proposedDescription.value = coerceDescriptionToAdf(props.currentDescription, props.currentDescriptionAdf ?? undefined)
        promptText.value = ''
        generationError.value = null
        nextTick(() => {
          proposedDescriptionEditorRef.value?.focusEditor()
        })
        return
      }

      document.removeEventListener('keydown', handleModalKeydown, true)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleModalKeydown, true)
    })

    function closeModal(): void {
      if (props.isSaving)
        return
      emit('close')
    }

    function handleModalKeydown(event: KeyboardEvent): void {
      if (!props.open || event.key !== 'Escape')
        return
      event.preventDefault()
      closeModal()
    }

    function handleBackdropClick(event: MouseEvent): void {
      if (event.target === event.currentTarget)
        closeModal()
    }

    function confirmChanges(): void {
      emit('confirm', proposedDescription.value)
    }

    async function generateDescription(): Promise<void> {
      if (!canGenerate.value)
        return

      generationError.value = null

      try {
        const response = await generateMutation.mutateAsync({
          key: props.ticketKey,
          input: {
            instruction: promptText.value.trim(),
            currentDescriptionAdf: proposedDescription.value,
            provider: aiSettings.value.provider,
            model: aiSettings.value.model,
          },
        })

        proposedDescription.value = response.descriptionAdf
      }
      catch (error: unknown) {
        generationError.value = error instanceof Error ? error.message : 'Failed to generate description.'
      }
    }

    return () => (
      <Teleport to="body">
        <Transition name="fade">
          {props.open && (
            <div {...stylex.attrs(styles.backdrop)} onClick={handleBackdropClick}>
              <div {...stylex.attrs(styles.dialog)}>
                <div {...stylex.attrs(styles.header)}>
                  <div {...stylex.attrs(styles.titleTrail)}>
                    <span {...stylex.attrs(styles.glyph)}>*</span>
                    <span>Improve description</span>
                    <span {...stylex.attrs(styles.dividerText)}>/</span>
                    <span {...stylex.attrs(styles.ticketKey)}>{props.ticketKey}</span>
                  </div>
                  <button
                    type="button"
                    {...stylex.attrs(styles.iconButton)}
                    disabled={props.isSaving}
                    aria-label="Close"
                    onClick={closeModal}
                  >
                    <svg {...stylex.attrs(styles.closeIcon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
                    </svg>
                  </button>
                </div>

                <div {...stylex.attrs(styles.contentGrid)}>
                  <div {...stylex.attrs(styles.editorPane)}>
                    <div {...stylex.attrs(styles.editorHeading)}>
                      <h2 {...stylex.attrs(styles.ticketTitle)}>{props.ticketTitle || props.ticketKey}</h2>
                      <p {...stylex.attrs(styles.subtitle)}>Proposed description</p>
                    </div>
                    <div {...stylex.attrs(styles.editorFrame)}>
                      <JiraDescriptionEditor
                        ref={proposedDescriptionEditorRef}
                        modelValue={proposedDescription.value}
                        placeholder="The proposed description will appear here..."
                        {...{ 'onUpdate:modelValue': (value: JiraAdfDocument | null) => (proposedDescription.value = value) }}
                      />
                    </div>
                  </div>

                  <aside {...stylex.attrs(styles.sidePane)}>
                    <div {...stylex.attrs(styles.settingsCard)}>
                      <div {...stylex.attrs(styles.settingsRow, styles.settingsRowBorder)}>
                        <span {...stylex.attrs(styles.settingsLabel)}>Provider</span>
                        <span {...stylex.attrs(styles.settingsValue)}>{getProviderLabel(aiSettings.value.provider)}</span>
                      </div>
                      <div {...stylex.attrs(styles.settingsRow)}>
                        <span {...stylex.attrs(styles.settingsLabel)}>Model</span>
                        <span {...stylex.attrs(styles.settingsValue)}>{aiSettings.value.model}</span>
                      </div>
                    </div>

                    <label for="ai-description-instruction" {...stylex.attrs(styles.instructionLabel)}>Instruction</label>
                    <textarea
                      id="ai-description-instruction"
                      v-model={promptText.value}
                      {...stylex.attrs(styles.textarea)}
                      placeholder="Describe how the description should change..."
                    />

                    {generationError.value && (
                      <p {...stylex.attrs(styles.error)}>
                        {generationError.value}
                      </p>
                    )}

                    <button
                      type="button"
                      {...stylex.attrs(styles.generateButton)}
                      disabled={!canGenerate.value}
                      onClick={() => void generateDescription()}
                    >
                      {isProcessing.value ? 'Generating...' : 'Generate'}
                    </button>
                  </aside>
                </div>

                <div {...stylex.attrs(styles.footer)}>
                  <div {...stylex.attrs(styles.footerHint)}>Edit the proposed description before applying it.</div>
                  <div {...stylex.attrs(styles.footerActions)}>
                    <button type="button" {...stylex.attrs(styles.cancelButton)} disabled={props.isSaving} onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="button" {...stylex.attrs(styles.applyButton)} disabled={props.isSaving} onClick={confirmChanges}>
                      {props.isSaving ? 'Saving...' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Transition>
      </Teleport>
    )
  },
})
