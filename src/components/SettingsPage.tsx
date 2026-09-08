import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import SettingsAboutSection from '@/components/settings/SettingsAboutSection'
import SettingsAssistantSection from '@/components/settings/SettingsAssistantSection'
import SettingsTeamSections from '@/components/settings/SettingsTeamSections'
import SettingsWorkspaceSection from '@/components/settings/SettingsWorkspaceSection'
import { provideSettingsPageContext } from '@/features/settings/settingsPageContext'
import { useSettingsPageState } from '@/features/settings/useSettingsPageState'
import { uiStyles } from '@/styles/shared'
import { breakpoints, colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { display: 'flex', height: '100%', flexDirection: 'column', backgroundColor: colors['--color-surface-0'] },
  topBar: { zIndex: 20, display: 'flex', height: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(8, 9, 10, 0.95)', paddingInline: '1rem', backdropFilter: 'blur(8px)' },
  backButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.625rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-100'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.04)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  backIcon: { width: '0.875rem', height: '0.875rem' },
  title: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-300'] },
  headerSpacer: { width: '5rem' },
  layout: { display: 'grid', minHeight: 0, flexGrow: '1', flexShrink: '1', flexBasis: '0%', gridTemplateColumns: { default: '1fr', [breakpoints.lg]: '18rem minmax(0, 1fr)' } },
  sidebar: { overflowY: 'auto', borderBottomWidth: { default: 1, [breakpoints.lg]: 0 }, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', borderRightWidth: { [breakpoints.lg]: 1 }, borderRightStyle: { [breakpoints.lg]: 'solid' }, borderRightColor: { [breakpoints.lg]: 'rgba(255, 255, 255, 0.06)' }, paddingInline: '1rem', paddingBlock: '1.25rem' },
  sidebarHeader: { marginBottom: '1.25rem', paddingInline: '0.5rem' },
  sidebarTitle: { fontSize: '1.125rem', lineHeight: '1.75rem', fontWeight: 600, color: colors['--color-slate-100'] },
  sidebarSubtitle: { marginTop: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  searchLabel: { display: 'block', marginBottom: '1rem', paddingInline: '0.5rem' },
  srOnly: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 },
  searchInput: { 'width': '100%', 'borderRadius': '0.375rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.06)', ':focus': 'rgba(255, 255, 255, 0.16)' }, 'backgroundColor': { 'default': 'rgba(255, 255, 255, 0.035)', ':focus': 'rgba(255, 255, 255, 0.05)' }, 'paddingInline': '0.625rem', 'paddingBlock': '0.375rem', 'fontSize': 12, 'color': colors['--color-slate-200'], 'outlineStyle': 'none', 'transitionProperty': 'border-color, background-color', 'transitionDuration': '150ms', 'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)', '::placeholder': { color: colors['--color-slate-600'] } },
  nav: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  navGroupHeading: { marginBottom: '0.375rem', paddingInline: '0.625rem', fontSize: 11, fontWeight: 500, color: colors['--color-slate-600'] },
  navItems: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  navButton: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.625rem', paddingBlock: '0.375rem', textAlign: 'left', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.035)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  navButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: colors['--color-slate-100'] },
  navDot: { width: '0.375rem', height: '0.375rem', flexShrink: 0, borderRadius: '9999px', backgroundColor: colors['--color-slate-700'] },
  navDotActive: { backgroundColor: colors['--color-accent-indigo'] },
  navText: { minWidth: 0, flexGrow: '1', flexShrink: '1', flexBasis: '0%' },
  navLabel: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500 },
  navDescription: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.125rem', fontSize: 11, color: colors['--color-slate-600'] },
  emptyResults: { paddingInline: '0.625rem', paddingBlock: '0.5rem', fontSize: 12, color: colors['--color-slate-600'] },
  main: { minWidth: 0, overflowY: 'auto', paddingInline: { default: '1.25rem', [breakpoints.lg]: '2.5rem' }, paddingBlock: '2rem' },
})

export default defineComponent({
  name: 'SettingsPage',
  emits: {
    close: () => true,
  },
  setup(_props, { emit }) {
    const settingsState = useSettingsPageState()
    provideSettingsPageContext(settingsState)

    const {
      activeSettingsSection,
      filteredSettingsNavigationGroups,
      settingsSearchQuery,
    } = settingsState

    return () => (
      <div {...stylex.attrs(styles.root, uiStyles.fadeIn)}>
        <div {...stylex.attrs(styles.topBar)}>
          <button {...stylex.attrs(styles.backButton)} onClick={() => emit('close')}>
            <svg {...stylex.attrs(styles.backIcon)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 18l-6-6 6-6" />
            </svg>
            Back to app
          </button>
          <div {...stylex.attrs(styles.title)}>Settings</div>
          <div {...stylex.attrs(styles.headerSpacer)} />
        </div>

        <div {...stylex.attrs(styles.layout)}>
          <aside {...stylex.attrs(styles.sidebar)}>
            <div {...stylex.attrs(styles.sidebarHeader)}>
              <h1 {...stylex.attrs(styles.sidebarTitle)}>Settings</h1>
              <p {...stylex.attrs(styles.sidebarSubtitle)}>LifeMD workspace</p>
            </div>
            <label {...stylex.attrs(styles.searchLabel)}>
              <span {...stylex.attrs(styles.srOnly)}>Search settings</span>
              <input
                v-model={settingsSearchQuery.value}
                type="search"
                name="settings-search"
                placeholder="Search settings"
                {...stylex.attrs(styles.searchInput)}
              />
            </label>
            <nav {...stylex.attrs(styles.nav)}>
              {filteredSettingsNavigationGroups.value.map(group => (
                <section key={group.label}>
                  <h2 {...stylex.attrs(styles.navGroupHeading)}>{group.label}</h2>
                  <div {...stylex.attrs(styles.navItems)}>
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        {...stylex.attrs(styles.navButton, activeSettingsSection.value === item.id && styles.navButtonActive)}
                        onClick={() => { activeSettingsSection.value = item.id }}
                      >
                        <span {...stylex.attrs(styles.navDot, activeSettingsSection.value === item.id && styles.navDotActive)} />
                        <span {...stylex.attrs(styles.navText)}>
                          <span {...stylex.attrs(styles.navLabel)}>{item.label}</span>
                          <span {...stylex.attrs(styles.navDescription)}>{item.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {!filteredSettingsNavigationGroups.value.length && (
                <p {...stylex.attrs(styles.emptyResults)}>No settings found.</p>
              )}
            </nav>
          </aside>

          <main {...stylex.attrs(styles.main)}>
            <SettingsAssistantSection v-show={activeSettingsSection.value === 'assistant'} />
            <SettingsWorkspaceSection v-show={activeSettingsSection.value === 'workspace'} />
            <SettingsAboutSection v-show={activeSettingsSection.value === 'about'} />
            <SettingsTeamSections />
          </main>
        </div>
      </div>
    )
  },
})
