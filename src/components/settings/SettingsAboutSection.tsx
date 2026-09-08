import type { AppUpdateCheckResult } from '~/shared/appUpdate'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { version } from '../../../package.json'

const repoUrl = 'https://github.com/fazulk/better-jira'

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  section: { maxWidth: '48rem', marginInline: 'auto' },
  stackGap: { marginTop: '1.25rem' },
  title: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600, color: colors['--color-slate-100'] },
  metaRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '0.75rem', rowGap: '0.25rem', marginTop: '0.25rem' },
  version: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  checkButton: { display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-300'], backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, cursor: { 'default': null, ':disabled': 'default' }, opacity: { 'default': 1, ':disabled': 0.6 }, transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  icon: { width: '0.75rem', height: '0.75rem' },
  iconMd: { width: '0.875rem', height: '0.875rem' },
  spin: { animationName: { default: spin, [breakpoints.reducedMotion]: 'none' }, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  status: { fontSize: '0.75rem', lineHeight: '1rem' },
  statusError: { color: colors['--color-rose-400'] },
  statusNeutral: { color: colors['--color-slate-400'] },
  card: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' },
  cardTitle: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  cardCopy: { marginTop: '0.125rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  repoButton: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-200'], backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  links: { marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem', fontSize: '0.75rem', lineHeight: '1rem' },
  link: { display: 'block', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, textDecorationLine: 'underline', textDecorationColor: 'rgba(255, 255, 255, 0.2)', textUnderlineOffset: '2px', transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})

export default defineComponent({
  name: 'SettingsAboutSection',
  setup() {
    const isDesktop = !!window.desktop
    const checking = ref(false)
    const checkResult = ref<AppUpdateCheckResult | null>(null)

    async function checkForUpdates(): Promise<void> {
      if (checking.value) {
        return
      }
      checking.value = true
      checkResult.value = null
      try {
        checkResult.value = await window.desktop!.checkForUpdates()
      }
      catch (err) {
        checkResult.value = { status: 'error', message: err instanceof Error ? err.message : String(err) }
      }
      finally {
        checking.value = false
      }
    }

    return () => (
      <section {...stylex.attrs(styles.section)}>
        <div>
          <h2 {...stylex.attrs(styles.title)}>About</h2>
          <div {...stylex.attrs(styles.metaRow)}>
            <p {...stylex.attrs(styles.version)}>
              Better Jira · v
              {version}
            </p>
            {isDesktop && (
              <button type="button" disabled={checking.value} {...stylex.attrs(styles.checkButton)} onClick={checkForUpdates}>
                <Icon name="lucide:refresh-cw" {...stylex.attrs(styles.icon, checking.value && styles.spin)} aria-hidden="true" />
                {checking.value ? 'Checking…' : 'Check for updates'}
              </button>
            )}
            {checkResult.value && (
              <p {...stylex.attrs(styles.status, checkResult.value.status === 'error' ? styles.statusError : styles.statusNeutral)}>
                {checkResult.value.status === 'up-to-date' && 'You\'re on the latest version.'}
                {checkResult.value.status === 'update-available' && `v${checkResult.value.version} is downloading — you'll be prompted to restart when it's ready.`}
                {checkResult.value.status === 'error' && `Update check failed: ${checkResult.value.message}`}
              </p>
            )}
          </div>
        </div>

        <div {...stylex.attrs(styles.card, styles.stackGap)}>
          <div {...stylex.attrs(styles.cardHeader)}>
            <div>
              <h3 {...stylex.attrs(styles.cardTitle)}>Open source</h3>
              <p {...stylex.attrs(styles.cardCopy)}>
                Better Jira is open source. Found a bug or have an idea? Issues and pull requests are very welcome.
              </p>
            </div>
            <a href={repoUrl} target="_blank" rel="noreferrer" {...stylex.attrs(styles.repoButton)}>
              <Icon name="lucide:github" {...stylex.attrs(styles.iconMd)} aria-hidden="true" />
              View on GitHub
            </a>
          </div>
          <div {...stylex.attrs(styles.links)}>
            <a href={`${repoUrl}/issues`} target="_blank" rel="noreferrer" {...stylex.attrs(styles.link)}>
              Report an issue
            </a>
            <a href={`${repoUrl}/pulls`} target="_blank" rel="noreferrer" {...stylex.attrs(styles.link)}>
              Open pull requests
            </a>
          </div>
        </div>
      </section>
    )
  },
})
