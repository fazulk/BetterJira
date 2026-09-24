import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { useSettingsPageContext } from '@/features/settings/settingsPageContext'
import { breakpoints, colors } from '@/styles/tokens.stylex'

interface StatusBadge {
  label: string
  icon: string
  spin?: boolean
  variant: 'connected' | 'checking' | 'error' | 'unconfigured'
}

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  section: { maxWidth: '48rem', marginInline: 'auto' },
  blockGap: { marginTop: '1.25rem' },
  title: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600, color: colors['--color-slate-100'] },
  copy: { marginTop: '0.25rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  card: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  minWidth: { minWidth: 0 },
  cardTitle: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  cardMeta: { marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  cardMetaStrong: { color: colors['--color-slate-300'] },
  badge: { display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: '0.375rem', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500 },
  badgeConnected: { borderColor: 'rgba(76, 183, 130, 0.25)', backgroundColor: 'rgba(76, 183, 130, 0.1)', color: colors['--color-accent-sage'] },
  badgeChecking: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: colors['--color-slate-400'] },
  badgeError: { borderColor: 'rgba(228, 93, 106, 0.25)', backgroundColor: 'rgba(228, 93, 106, 0.1)', color: colors['--color-accent-rose'] },
  badgeUnconfigured: { borderColor: 'rgba(215, 165, 67, 0.25)', backgroundColor: 'rgba(215, 165, 67, 0.1)', color: colors['--color-accent-amber'] },
  iconSm: { width: '0.875rem', height: '0.875rem' },
  iconXs: { width: '0.75rem', height: '0.75rem' },
  iconMuted: { flexShrink: 0, color: colors['--color-slate-500'] },
  spin: { animationName: { default: spin, [breakpoints.reducedMotion]: 'none' }, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  errorBanner: { display: 'flex', flexDirection: { default: 'column', [breakpoints.sm]: 'row' }, gap: '0.5rem', alignItems: { [breakpoints.sm]: 'flex-start' }, justifyContent: { [breakpoints.sm]: 'space-between' }, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(228, 93, 106, 0.05)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  errorTextRow: { display: 'flex', minWidth: 0, gap: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-accent-rose'] },
  errorTextIcon: { marginTop: '0.125rem', width: '0.875rem', height: '0.875rem', flexShrink: 0 },
  breakWords: { minWidth: 0, overflowWrap: 'break-word' },
  retryButton: { display: 'inline-flex', flexShrink: 0, alignItems: 'center', gap: '0.375rem', alignSelf: 'flex-start', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(228, 93, 106, 0.25)', paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-accent-rose'], backgroundColor: { 'default': null, ':hover': 'rgba(228, 93, 106, 0.1)' }, cursor: { 'default': null, ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.5 }, transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  body: { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' },
  grid: { display: 'grid', gap: '0.75rem', gridTemplateColumns: { [breakpoints.md]: 'repeat(2, minmax(0, 1fr))' } },
  label: { display: 'block' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'] },
  labelText: { display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-500'] },
  input: { 'width': '100%', 'borderRadius': '0.375rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.06)', ':focus': 'rgba(255, 255, 255, 0.16)' }, 'backgroundColor': { 'default': 'rgba(255, 255, 255, 0.04)', ':focus': 'rgba(255, 255, 255, 0.06)' }, 'paddingInline': '0.75rem', 'paddingBlock': '0.5rem', 'fontSize': '0.875rem', 'lineHeight': '1.25rem', 'color': colors['--color-slate-200'], 'outlineStyle': 'none', 'transitionProperty': 'border-color, background-color', 'transitionDuration': '150ms', 'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)', '::placeholder': { color: colors['--color-slate-500'] } },
  rightAligned: { display: 'flex', justifyContent: 'flex-end' },
  button: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)', ':disabled': 'rgba(255, 255, 255, 0.08)' }, backgroundColor: { 'default': 'rgba(255, 255, 255, 0.04)', ':hover': 'rgba(255, 255, 255, 0.06)', ':disabled': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'], cursor: { 'default': null, ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.5 }, transitionProperty: 'border-color, background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  tokenSection: { borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingTop: '1rem' },
  tokenHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' },
  savedPill: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(76, 183, 130, 0.25)', backgroundColor: 'rgba(76, 183, 130, 0.1)', paddingInline: '0.5rem', paddingBlock: '0.125rem', fontSize: 11, fontWeight: 500, color: colors['--color-accent-sage'] },
  tokenRow: { display: 'flex', flexDirection: { default: 'column', [breakpoints.md]: 'row' }, gap: '0.5rem', alignItems: { [breakpoints.md]: 'flex-start' } },
  tokenFields: { width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  storedToken: { display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-400'] },
  tokenDots: { letterSpacing: '0.2em', color: colors['--color-slate-500'] },
  hiddenLabel: { marginLeft: 'auto', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  externalLink: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  tokenButton: { width: { [breakpoints.md]: 'auto' } },
  feedback: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem' },
  feedbackSuccess: { borderColor: 'rgba(76, 183, 130, 0.25)', backgroundColor: 'rgba(76, 183, 130, 0.1)', color: colors['--color-accent-sage'] },
  feedbackError: { borderColor: 'rgba(228, 93, 106, 0.25)', backgroundColor: 'rgba(228, 93, 106, 0.1)', color: colors['--color-accent-rose'] },
})

export default defineComponent({
  name: 'SettingsWorkspaceSection',
  setup() {
    const {
      canSaveJiraConnectionDetails,
      isRecheckingJiraConnection,
      isSavingSpaceSettings,
      jiraApiToken,
      jiraBaseUrlDraft,
      jiraConnectedUserName,
      jiraConnectionErrorMessage,
      jiraConnectionStatus,
      jiraEmailDraft,
      jiraFeedback,
      jiraHasApiToken,
      jiraSavedBaseUrl,
      jiraSavedEmail,
      recheckJiraConnection,
      saveJiraApiToken,
      saveJiraConnectionDetails,
      openJiraLinksInApp,
      setOpenJiraLinksInApp,
    } = useSettingsPageContext()

    const linkPreferenceError = ref('')

    async function saveLinkPreference(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLInputElement))
        return
      linkPreferenceError.value = ''
      try {
        await setOpenJiraLinksInApp(event.target.checked)
      }
      catch (error) {
        linkPreferenceError.value = error instanceof Error ? error.message : 'Failed to save link preference.'
      }
    }

    const statusBadge = computed<StatusBadge>(() => {
      switch (jiraConnectionStatus.value) {
        case 'connected':
          return { label: 'Connected', icon: 'lucide:circle-check', variant: 'connected' }
        case 'checking':
          return { label: 'Checking…', icon: 'lucide:loader-circle', spin: true, variant: 'checking' }
        case 'error':
          return { label: 'Connection failed', icon: 'lucide:circle-alert', variant: 'error' }
        default:
          return { label: 'Not configured', icon: 'lucide:circle-dashed', variant: 'unconfigured' }
      }
    })

    function saveConnectionFromEnter(event: KeyboardEvent): void {
      if (event.key === 'Enter') {
        event.preventDefault()
        void saveJiraConnectionDetails()
      }
    }

    function saveTokenFromEnter(event: KeyboardEvent): void {
      if (event.key === 'Enter') {
        event.preventDefault()
        void saveJiraApiToken()
      }
    }

    return () => (
      <section {...stylex.attrs(styles.section)}>
        <div>
          <h2 {...stylex.attrs(styles.title)}>Workspace</h2>
          <p {...stylex.attrs(styles.copy)}>Manage your Jira connection and link behavior.</p>
        </div>

        <div {...stylex.attrs(styles.card, styles.blockGap)}>
          <div {...stylex.attrs(styles.cardHeader)}>
            <div {...stylex.attrs(styles.minWidth)}>
              <p {...stylex.attrs(styles.cardTitle)}>Jira connection</p>
              {jiraConnectionStatus.value === 'connected' && jiraConnectedUserName.value && (
                <p {...stylex.attrs(styles.cardMeta)}>
                  Signed in as
                  {' '}
                  <span {...stylex.attrs(styles.cardMetaStrong)}>{jiraConnectedUserName.value}</span>
                </p>
              )}
              {jiraConnectionStatus.value === 'unconfigured' && (
                <p {...stylex.attrs(styles.cardMeta)}>Add your URL, email, and API token to connect.</p>
              )}
              {jiraConnectionStatus.value !== 'connected' && jiraConnectionStatus.value !== 'unconfigured' && jiraSavedBaseUrl.value && (
                <p {...stylex.attrs(styles.cardMeta)}>
                  {jiraSavedBaseUrl.value}
                  {jiraSavedEmail.value && (
                    <span>
                      {' · '}
                      {jiraSavedEmail.value}
                    </span>
                  )}
                </p>
              )}
            </div>
            <span
              {...stylex.attrs(
                styles.badge,
                statusBadge.value.variant === 'connected' && styles.badgeConnected,
                statusBadge.value.variant === 'checking' && styles.badgeChecking,
                statusBadge.value.variant === 'error' && styles.badgeError,
                statusBadge.value.variant === 'unconfigured' && styles.badgeUnconfigured,
              )}
            >
              <Icon name={statusBadge.value.icon} {...stylex.attrs(styles.iconSm, statusBadge.value.spin && styles.spin)} aria-hidden="true" />
              {statusBadge.value.label}
            </span>
          </div>

          {jiraConnectionStatus.value === 'error' && (
            <div {...stylex.attrs(styles.errorBanner)}>
              <div {...stylex.attrs(styles.errorTextRow)}>
                <Icon name="lucide:triangle-alert" {...stylex.attrs(styles.errorTextIcon)} aria-hidden="true" />
                <p {...stylex.attrs(styles.breakWords)}>{jiraConnectionErrorMessage.value || 'Could not reach Jira. Check your connection details below.'}</p>
              </div>
              <button type="button" {...stylex.attrs(styles.retryButton)} disabled={isRecheckingJiraConnection.value} onClick={recheckJiraConnection}>
                <Icon name="lucide:refresh-cw" {...stylex.attrs(styles.iconXs, isRecheckingJiraConnection.value && styles.spin)} aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          <div {...stylex.attrs(styles.body)}>
            <div {...stylex.attrs(styles.grid)}>
              <label {...stylex.attrs(styles.label)}>
                <span {...stylex.attrs(styles.labelText)}>Jira URL</span>
                <input v-model={jiraBaseUrlDraft.value} type="url" name="jira-base-url" autocomplete="url" placeholder="https://example.atlassian.net" {...stylex.attrs(styles.input)} onKeydown={saveConnectionFromEnter} />
              </label>
              <label {...stylex.attrs(styles.label)}>
                <span {...stylex.attrs(styles.labelText)}>Atlassian email</span>
                <input v-model={jiraEmailDraft.value} type="email" name="jira-email" autocomplete="email" placeholder="you@example.com" {...stylex.attrs(styles.input)} onKeydown={saveConnectionFromEnter} />
              </label>
            </div>
            <div {...stylex.attrs(styles.rightAligned)}>
              <button type="button" {...stylex.attrs(styles.button)} disabled={!canSaveJiraConnectionDetails.value} onClick={saveJiraConnectionDetails}>Save connection</button>
            </div>

            <div {...stylex.attrs(styles.tokenSection)}>
              <div {...stylex.attrs(styles.tokenHeader)}>
                <span {...stylex.attrs(styles.labelText)}>API token</span>
                {jiraHasApiToken.value && (
                  <span {...stylex.attrs(styles.savedPill)}>
                    <Icon name="lucide:check" {...stylex.attrs(styles.iconXs)} aria-hidden="true" />
                    Saved
                  </span>
                )}
              </div>

              <div {...stylex.attrs(styles.tokenRow)}>
                <div {...stylex.attrs(styles.tokenFields)}>
                  {jiraHasApiToken.value && (
                    <div {...stylex.attrs(styles.storedToken)}>
                      <Icon name="lucide:key-round" {...stylex.attrs(styles.iconSm, styles.iconMuted)} aria-hidden="true" />
                      <span {...stylex.attrs(styles.tokenDots)}>••••••••••••</span>
                      <span {...stylex.attrs(styles.hiddenLabel)}>hidden</span>
                    </div>
                  )}
                  <input v-model={jiraApiToken.value} type="password" name="jira-api-token" autocomplete="new-password" placeholder={jiraHasApiToken.value ? 'Paste a new token to replace it' : 'Paste your Jira API token'} {...stylex.attrs(styles.input)} onKeydown={saveTokenFromEnter} />
                  <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" {...stylex.attrs(styles.externalLink)}>
                    <Icon name="lucide:external-link" {...stylex.attrs(styles.iconXs)} aria-hidden="true" />
                    Create a Jira API token
                  </a>
                </div>
                <button type="button" {...stylex.attrs(styles.button, styles.tokenButton)} disabled={isSavingSpaceSettings.value || !jiraApiToken.value.trim()} onClick={saveJiraApiToken}>
                  {jiraHasApiToken.value ? 'Replace token' : 'Save token'}
                </button>
              </div>
            </div>

            {jiraFeedback.value && (
              <p
                {...stylex.attrs(
                  styles.feedback,
                  jiraFeedback.value.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                )}
              >
                {jiraFeedback.value.message}
              </p>
            )}
          </div>
        </div>
        <div {...stylex.attrs(styles.card, styles.blockGap)}>
          <div {...stylex.attrs(styles.cardHeader)}>
            <p {...stylex.attrs(styles.cardTitle)}>Issue links</p>
          </div>
          <div {...stylex.attrs(styles.body)}>
            <label {...stylex.attrs(styles.checkboxLabel)}>
              <input
                type="checkbox"
                checked={openJiraLinksInApp.value}
                disabled={isSavingSpaceSettings.value}
                onChange={saveLinkPreference}
                aria-describedby="jira-link-behavior"
              />
              Open Jira issue links in Better Jira by default
            </label>
            <p id="jira-link-behavior" {...stylex.attrs(styles.copy)}>
              {openJiraLinksInApp.value
                ? 'Click an issue link to open it in Better Jira. Hold Ctrl to open the original Jira URL.'
                : 'Click an issue link to open the original Jira URL. Hold Ctrl to open it in Better Jira.'}
            </p>
            {linkPreferenceError.value && (
              <p role="alert" {...stylex.attrs(styles.feedback, styles.feedbackError)}>{linkPreferenceError.value}</p>
            )}
          </div>
        </div>
      </section>
    )
  },
})
