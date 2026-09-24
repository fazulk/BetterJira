import * as stylex from '@stylexjs/stylex'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, defineComponent, ref, watch } from 'vue'
import { fetchJiraCurrentUser } from '@/api/jira'
import { jiraCurrentUserQueryKey } from '@/composables/useJiraCurrentUser'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { uiStyles } from '@/styles/shared'
import { breakpoints, colors } from '@/styles/tokens.stylex'

type JiraSetupStep = 'form' | 'connecting' | 'success'

declare function navigateTo(path: string): Promise<void>

const spin = stylex.keyframes({
  to: { transform: 'rotate(360deg)' },
})

const styles = stylex.create({
  backdrop: { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingInline: '1rem', paddingBlock: '2rem', backdropFilter: 'blur(4px)' },
  modal: { display: 'flex', maxHeight: 'calc(100vh - 4rem)', width: '100%', maxWidth: '36rem', flexDirection: 'column', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: colors['--color-surface-0'], boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' },
  topBar: { display: 'flex', minHeight: '3rem', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem' },
  breadcrumb: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  badge: { display: 'inline-flex', width: '1.25rem', height: '1.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', fontSize: 11, color: colors['--color-slate-400'] },
  separator: { color: colors['--color-slate-700'] },
  breadcrumbActive: { fontWeight: 500, color: colors['--color-slate-300'] },
  intro: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  title: { fontSize: 15, fontWeight: 600, color: colors['--color-slate-100'] },
  description: { marginTop: '0.25rem', maxWidth: '32rem', fontSize: 12, lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  form: { minHeight: 0, flexGrow: '1', flexShrink: '1', flexBasis: '0%', overflowY: 'auto', paddingInline: '1rem', paddingBlock: '0.75rem' },
  fieldGroup: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  fieldRow: { display: 'grid', gap: '0.5rem', paddingInline: '0.75rem', paddingBlock: '0.75rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.05)', gridTemplateColumns: { [breakpoints.sm]: '9rem minmax(0, 1fr)' }, alignItems: { [breakpoints.sm]: 'center' } },
  lastFieldRow: { borderBottomWidth: 0, alignItems: { [breakpoints.sm]: 'start' } },
  label: { fontSize: 12, color: colors['--color-slate-500'] },
  tokenLabel: { paddingTop: '0.5rem' },
  stacked: { minWidth: 0 },
  link: { display: 'inline-flex', marginTop: '0.5rem', fontSize: 12, color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  input: { 'width': '100%', 'borderRadius': '0.375rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' }, 'backgroundColor': { 'default': 'rgba(255, 255, 255, 0.025)', ':focus': 'rgba(255, 255, 255, 0.04)' }, 'paddingInline': '0.75rem', 'paddingBlock': '0.5rem', 'fontSize': 13, 'color': colors['--color-slate-100'], 'outlineStyle': 'none', 'transitionProperty': 'border-color, background-color', 'transitionDuration': '150ms', 'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)', '::placeholder': { color: colors['--color-slate-600'] } },
  error: { marginTop: '1rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: 13, lineHeight: '1.25rem', color: colors['--color-rose-200'] },
  footer: { marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingTop: '1rem' },
  storageNote: { fontSize: 11, lineHeight: '1rem', color: colors['--color-slate-600'] },
  primaryButton: { display: 'inline-flex', height: '2rem', flexShrink: 0, alignItems: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)' }, paddingInline: '0.75rem', fontSize: 13, fontWeight: 500, color: colors['--color-white'], cursor: { 'default': null, ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.5 }, transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  statePane: { paddingInline: '1rem', paddingBlock: '1.5rem' },
  stateIconBox: { display: 'flex', width: '2.25rem', height: '2.25rem', alignItems: 'center', justifyContent: 'center', marginInline: 'auto', marginBottom: '1.25rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)' },
  successIconBox: { backgroundColor: 'rgba(255, 255, 255, 0.035)', color: colors['--color-slate-200'] },
  spinner: { width: '1rem', height: '1rem', borderRadius: '9999px', borderWidth: 2, borderStyle: 'solid', borderColor: colors['--color-slate-600'], borderTopColor: colors['--color-slate-200'], animationName: { default: spin, [breakpoints.reducedMotion]: 'none' }, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  checkIcon: { width: '1rem', height: '1rem' },
  stateText: { textAlign: 'center' },
  stateHeading: { fontSize: 15, fontWeight: 600, color: colors['--color-slate-100'] },
  stateCopy: { maxWidth: '24rem', marginInline: 'auto', marginTop: '0.5rem', fontSize: 12, lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  stateCopyWide: { maxWidth: '28rem', color: colors['--color-slate-400'] },
  stateHint: { maxWidth: '28rem', marginInline: 'auto', marginTop: '0.5rem', fontSize: 12, lineHeight: '1.25rem', color: colors['--color-slate-600'] },
  successActions: { marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
})

export default defineComponent({
  name: 'JiraSetupModal',
  props: {
    open: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const queryClient = useQueryClient()
    const { jiraConnection, isSaving, updateJiraCredentials } = useSpaceSettings()

    const baseUrl = ref('')
    const email = ref('')
    const apiToken = ref('')
    const errorMessage = ref<string | null>(null)
    const connectedDisplayName = ref('')
    const setupStep = ref<JiraSetupStep>('form')
    const isVisible = ref(props.open)

    function resetSetupForm(): void {
      baseUrl.value = jiraConnection.value.baseUrl
      email.value = jiraConnection.value.email
      apiToken.value = ''
      errorMessage.value = null
      connectedDisplayName.value = ''
      setupStep.value = 'form'
    }

    watch(() => props.open, (isOpen) => {
      if (isOpen) {
        isVisible.value = true
        resetSetupForm()
        return
      }

      if (setupStep.value === 'form') {
        isVisible.value = false
      }
    }, { immediate: true })

    const canSubmit = computed(() => (
      baseUrl.value.trim().length > 0
      && email.value.trim().length > 0
      && apiToken.value.trim().length > 0
      && !isSaving.value
      && setupStep.value === 'form'
    ))

    async function saveCredentials(): Promise<void> {
      if (!canSubmit.value) {
        return
      }

      errorMessage.value = null
      connectedDisplayName.value = ''
      setupStep.value = 'connecting'

      try {
        await updateJiraCredentials({
          baseUrl: baseUrl.value.trim(),
          email: email.value.trim(),
          apiToken: apiToken.value.trim(),
        })

        const currentUser = await queryClient.fetchQuery({
          queryKey: jiraCurrentUserQueryKey,
          queryFn: fetchJiraCurrentUser,
        })

        connectedDisplayName.value = currentUser.displayName.trim()
        apiToken.value = ''
        setupStep.value = 'success'
      }
      catch (error) {
        setupStep.value = 'form'
        isVisible.value = true
        errorMessage.value = error instanceof Error ? error.message : 'Failed to connect to Jira.'
      }
    }

    async function continueToSettings(): Promise<void> {
      isVisible.value = false
      setupStep.value = 'form'
      errorMessage.value = null
      connectedDisplayName.value = ''
      await navigateTo('/settings')
    }

    function handleSubmit(event: Event): void {
      event.preventDefault()
      void saveCredentials()
    }

    return () => isVisible.value && (
      <div {...stylex.attrs(styles.backdrop)}>
        <div {...stylex.attrs(styles.modal, uiStyles.slideUp)}>
          {setupStep.value === 'form' && (
            <>
              <div {...stylex.attrs(styles.topBar)}>
                <div {...stylex.attrs(styles.breadcrumb)}>
                  <span {...stylex.attrs(styles.badge)}>B</span>
                  <span>Workspace setup</span>
                  <span {...stylex.attrs(styles.separator)}>/</span>
                  <span {...stylex.attrs(styles.breadcrumbActive)}>Jira</span>
                </div>
              </div>

              <div {...stylex.attrs(styles.intro)}>
                <h2 {...stylex.attrs(styles.title)}>Connect workspace to Jira</h2>
                <p {...stylex.attrs(styles.description)}>
                  Store local credentials, verify the Atlassian account, then choose the spaces that should load in the sidebar.
                </p>
              </div>

              <form {...stylex.attrs(styles.form)} onSubmit={handleSubmit}>
                <div {...stylex.attrs(styles.fieldGroup)}>
                  <label {...stylex.attrs(styles.fieldRow)}>
                    <span {...stylex.attrs(styles.label)}>Jira base URL</span>
                    <input v-model={baseUrl.value} type="url" autocomplete="url" placeholder="https://your-team.atlassian.net" {...stylex.attrs(styles.input)} />
                  </label>

                  <label {...stylex.attrs(styles.fieldRow)}>
                    <span {...stylex.attrs(styles.label)}>Atlassian email</span>
                    <input v-model={email.value} type="email" autocomplete="email" placeholder="you@company.com" {...stylex.attrs(styles.input)} />
                  </label>

                  <label {...stylex.attrs(styles.fieldRow, styles.lastFieldRow)}>
                    <span {...stylex.attrs(styles.label, styles.tokenLabel)}>API token</span>
                    <div {...stylex.attrs(styles.stacked)}>
                      <input v-model={apiToken.value} type="password" autocomplete="new-password" placeholder="Paste an Atlassian API token" {...stylex.attrs(styles.input)} />
                      <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" {...stylex.attrs(styles.link)}>
                        Create an Atlassian API token
                      </a>
                    </div>
                  </label>
                </div>

                {errorMessage.value && (
                  <p {...stylex.attrs(styles.error)}>
                    {errorMessage.value}
                  </p>
                )}

                <div {...stylex.attrs(styles.footer)}>
                  <p {...stylex.attrs(styles.storageNote)}>The API token is stored separately in a local credentials.json file.</p>
                  <button type="submit" disabled={!canSubmit.value} {...stylex.attrs(styles.primaryButton)}>
                    {isSaving.value ? 'Saving...' : 'Connect Jira'}
                  </button>
                </div>
              </form>
            </>
          )}

          {setupStep.value === 'connecting' && (
            <div {...stylex.attrs(styles.statePane)} aria-live="polite">
              <div {...stylex.attrs(styles.stateIconBox)}>
                <div {...stylex.attrs(styles.spinner)} />
              </div>

              <div {...stylex.attrs(styles.stateText)}>
                <h2 {...stylex.attrs(styles.stateHeading)}>Connecting to Jira</h2>
                <p {...stylex.attrs(styles.stateCopy)}>
                  Saving your credentials and checking the workspace connection before you continue.
                </p>
              </div>
            </div>
          )}

          {setupStep.value === 'success' && (
            <div {...stylex.attrs(styles.statePane)} aria-live="polite">
              <div {...stylex.attrs(styles.stateIconBox, styles.successIconBox)}>
                <svg {...stylex.attrs(styles.checkIcon)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div {...stylex.attrs(styles.stateText)}>
                <h2 {...stylex.attrs(styles.stateHeading)}>Jira is connected</h2>
                <p {...stylex.attrs(styles.stateCopy, styles.stateCopyWide)}>
                  {connectedDisplayName.value && (
                    <span>
                      {connectedDisplayName.value}
                      {' '}
                      is signed in.
                    </span>
                  )}
                  {' '}
                  Add the spaces you want to load next, then continue into the workspace.
                </p>
                <p {...stylex.attrs(styles.stateHint)}>
                  Open Settings and enable the spaces you want to see in the sidebar.
                </p>
              </div>

              <div {...stylex.attrs(styles.successActions)}>
                <button type="button" {...stylex.attrs(styles.primaryButton)} onClick={continueToSettings}>
                  Continue to Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  },
})
