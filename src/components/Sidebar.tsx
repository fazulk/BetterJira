import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType } from 'vue'
import type { FavoriteViewNavItem } from '@/features/sidebar/useSidebarNavigation'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, reactive, Teleport } from 'vue'
import { Icon } from '#components'
import StatusIcon from '@/components/StatusIcon'
import { useSidebarNavigation } from '@/features/sidebar/useSidebarNavigation'
import { colors } from '@/styles/tokens.stylex'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  root: { display: 'flex', height: '100vh', width: '100%', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#090a0c', fontSize: 13, color: '#b9bbc3' },
  header: { display: 'flex', height: '2.75rem', flexShrink: 0, alignItems: 'center', gap: '0.5rem', paddingInline: '0.75rem' },
  homeButton: { display: 'flex', minWidth: 0, flex: '1', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.375rem', paddingBlock: '0.25rem', textAlign: 'left', color: '#e6e7ea', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  centered: { justifyContent: 'center' },
  favicon: { height: '1.25rem', width: '1.25rem', flexShrink: 0, borderRadius: '0.25rem' },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  label: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  medium: { fontWeight: 500 },
  headerButton: { display: 'flex', height: '1.75rem', width: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': '#8f9198', ':enabled:hover': '#e6e7ea' }, backgroundColor: { 'default': null, ':enabled:hover': 'rgba(255, 255, 255, 0.05)' }, cursor: { ':disabled': 'default' }, opacity: { ':disabled': 0.3 }, transitionProperty: 'background-color, color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  plainHeaderButton: { color: { 'default': '#8f9198', ':hover': '#e6e7ea' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  createButton: { display: 'flex', height: '1.75rem', width: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.12)' }, color: { 'default': '#d7d8dc', ':hover': '#f0f1f4' } },
  iconMd: { height: '1rem', width: '1rem' },
  iconSm: { height: '0.875rem', width: '0.875rem' },
  scroll: { flex: '1', overflowY: 'auto', paddingInline: '0.5rem', paddingBottom: '0.75rem' },
  nav: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  compactSection: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  teamSection: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  navButton: { display: 'flex', height: '1.75rem', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.5rem', textAlign: 'left', fontSize: 13, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  navActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#f0f1f4' },
  navInactive: { color: { 'default': '#a9abb3', ':hover': '#e6e7ea' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' } },
  navMutedInactive: { color: { 'default': '#8f9198', ':hover': '#d7d8dc' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' } },
  navSubButton: { height: '1.5rem', fontSize: 12 },
  navIcon: { height: '0.875rem', width: '0.875rem', flexShrink: 0 },
  mutedIcon: { color: '#8f9198' },
  triageIconWrap: { display: 'flex', height: '0.875rem', width: '0.875rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'currentColor' },
  triageIcon: { height: '0.625rem', width: '0.625rem' },
  cycleRow: { paddingInline: 0, gap: 0 },
  cycleMainButton: { gap: '0.5rem' },
  cycleParentActive: { backgroundColor: 'rgba(255, 255, 255, 0.055)', color: '#f0f1f4' },
  nestedItems: { paddingTop: '0.125rem' },
  count: { fontSize: 11, color: '#6f727b' },
  sectionToggle: { display: 'flex', height: '1.5rem', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.375rem', paddingInline: '0.5rem', textAlign: 'left', fontSize: 12, fontWeight: 500, color: { 'default': '#777a83', ':hover': '#b9bbc3' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  chevron: { height: '0.75rem', width: '0.75rem', transitionProperty: 'transform', transitionDuration: '200ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  chevronMd: { height: '0.875rem', width: '0.875rem' },
  collapsedChevron: { transform: 'rotate(-90deg)' },
  collapse: { display: 'grid', gridTemplateRows: '0fr', opacity: 0, transitionProperty: { 'default': 'grid-template-rows, opacity', '@media (prefers-reduced-motion: reduce)': 'none' }, transitionDuration: '220ms, 180ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1), ease' },
  collapseOpen: { gridTemplateRows: '1fr', opacity: 1 },
  collapseClosed: { pointerEvents: 'none' },
  collapseInner: { minHeight: 0, overflow: 'hidden', transform: { 'default': 'translateY(-4px)', '@media (prefers-reduced-motion: reduce)': 'none' }, transitionProperty: { 'default': 'transform', '@media (prefers-reduced-motion: reduce)': 'none' }, transitionDuration: '220ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  collapseInnerOpen: { transform: 'translateY(0)' },
  favoriteIcon: (color: string) => ({ height: '0.875rem', width: '0.875rem', flexShrink: 0, color }),
  starIcon: { width: '0.875rem', flexShrink: 0, textAlign: 'center', fontSize: 13, lineHeight: 1, color: '#d7a543' },
  ticketIconWrap: { display: 'flex', height: '1rem', width: '1rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { display: 'flex', height: '1.5rem', alignItems: 'center', justifyContent: 'space-between', paddingInline: '0.5rem', fontSize: 12, fontWeight: 500, color: '#777a83' },
  addSpaceButton: { display: 'flex', height: '1.25rem', width: '1.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', fontSize: 14, color: { 'default': '#777a83', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.055)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  teamRow: { display: 'flex', height: '1.75rem', width: '100%', alignItems: 'center', borderRadius: '0.375rem', fontSize: 13, color: { 'default': '#c6c8ce', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  teamRowActive: { backgroundColor: 'rgba(255, 255, 255, 0.055)' },
  teamMainButton: { display: 'flex', height: '100%', minWidth: 0, flex: '1', alignItems: 'center', gap: '0.25rem', borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem', paddingInline: '0.5rem', textAlign: 'left' },
  teamAvatar: (color: string) => ({ display: 'flex', height: '1.5rem', width: '1.5rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color }),
  teamIcon: { height: '1.5rem', width: '1.5rem' },
  expandButton: { marginRight: '0.25rem', display: 'flex', height: '1.25rem', width: '1.25rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', color: { 'default': '#6f727b', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  teamNested: { marginLeft: '1.25rem' },
  cycleNested: { marginLeft: '1.125rem', borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: 'rgba(255, 255, 255, 0.08)', paddingLeft: '0.5rem' },
  cycleActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#f0f1f4', boxShadow: 'inset 0 0 0 1px rgba(91, 106, 191, 0.7)' },
  footer: { flexShrink: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.5rem', paddingBlock: '0.5rem' },
  footerStack: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  footerButton: { display: 'flex', height: '1.75rem', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.5rem', textAlign: 'left', fontSize: 12, color: { 'default': '#8f9198', ':hover': '#e6e7ea' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  syncIcon: { width: '1rem', textAlign: 'center' },
  spinning: { animationName: spin, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  menu: (top: string, left: string) => ({ position: 'fixed', top, left, zIndex: 100, width: '11rem', overflow: 'hidden', borderRadius: '0.75rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(17, 19, 26, 0.95)', padding: '0.25rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'], boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.4)', backdropFilter: 'blur(8px)' }),
  menuHeader: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.5rem', paddingBlock: '0.375rem' },
  menuTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: colors['--color-slate-500'] },
  dangerMenuItem: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', paddingInline: '0.5rem', paddingBlock: '0.5rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-rose-300'], ':hover': colors['--color-rose-200'] }, backgroundColor: { 'default': null, ':hover': 'rgba(244, 63, 94, 0.12)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  menuItem: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', paddingInline: '0.5rem', paddingBlock: '0.5rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-200'], ':hover': colors['--color-white'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})

export default defineComponent({
  name: 'Sidebar',
  props: {
    tickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    selectedKey: {
      type: [String, null] as PropType<string | null>,
      required: true,
    },
    collapsed: {
      type: Boolean,
      required: true,
    },
    refreshing: {
      type: Boolean,
      required: true,
    },
    currentView: {
      type: String,
      required: true,
    },
    favoriteViews: {
      type: Array as PropType<FavoriteViewNavItem[]>,
      required: true,
    },
    canGoBack: {
      type: Boolean,
      required: true,
    },
    canGoForward: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    'select': (key: string) => typeof key === 'string',
    'prefetch': (key: string) => typeof key === 'string',
    'toggleCollapse': () => true,
    'refresh': () => true,
    'home': () => true,
    'settings': () => true,
    'command': () => true,
    'view': (viewId: string) => typeof viewId === 'string',
    'favoriteView': (viewId: string) => typeof viewId === 'string',
    'favorite-count-visibility': (viewId: string, visible: boolean) => typeof viewId === 'string' && typeof visible === 'boolean',
    'addSpace': () => true,
    'leave-space': (spaceKey: string) => typeof spaceKey === 'string',
    'back': () => true,
    'forward': () => true,
  },
  setup(props, { emit }) {
    const sidebarNavigation = useSidebarNavigation(props, emit)
    const nav = reactive(sidebarNavigation)

    function navButtonStyles(active: boolean): StyleXStyles {
      return active
        ? styles.navActive
        : styles.navMutedInactive
    }

    return () => (
      <aside {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header)}>
          <button
            type="button"
            {...stylex.attrs(styles.homeButton, props.collapsed ? styles.centered : null)}
            onClick={() => emit('home')}
          >
            <img src="/favicon.svg" alt="" {...stylex.attrs(styles.favicon)} aria-hidden="true" />
            {!props.collapsed && <span {...stylex.attrs(styles.truncate, styles.medium)}>BetterJira!</span>}
          </button>

          {!props.collapsed && (
            <>
              <button type="button" {...stylex.attrs(styles.headerButton)} title="Go back" disabled={!props.canGoBack} onClick={() => emit('back')}>
                <Icon name="lucide:chevron-left" {...stylex.attrs(styles.iconMd)} aria-hidden="true" />
              </button>
              <button type="button" {...stylex.attrs(styles.headerButton)} title="Go forward" disabled={!props.canGoForward} onClick={() => emit('forward')}>
                <Icon name="lucide:chevron-right" {...stylex.attrs(styles.iconMd)} aria-hidden="true" />
              </button>
              <button type="button" {...stylex.attrs(styles.headerButton, styles.plainHeaderButton)} title="Search workspace" onClick={() => emit('command')}>
                <Icon name="lucide:search" {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
              </button>
              <button type="button" {...stylex.attrs(styles.createButton)} title="Create issue" onClick={() => nav.selectView('create')}>
                <Icon name="lucide:square-pen" {...stylex.attrs(styles.iconSm)} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div {...stylex.attrs(styles.scroll)}>
          <nav {...stylex.attrs(styles.nav)}>
            <section {...stylex.attrs(styles.compactSection)}>
              {nav.primaryItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  {...stylex.attrs(styles.navButton, nav.isActiveView(item.id) ? styles.navActive : styles.navInactive, props.collapsed ? styles.centered : null)}
                  onClick={() => nav.selectView(item.id)}
                >
                  <Icon name={item.icon === 'inbox' ? 'lucide:inbox' : 'lucide:scan'} {...stylex.attrs(styles.navIcon, styles.mutedIcon)} aria-hidden="true" />
                  {!props.collapsed && <span {...stylex.attrs(styles.label)}>{item.label}</span>}
                  {!props.collapsed && item.count !== undefined && item.count > 0 && <span {...stylex.attrs(styles.count)}>{item.count}</span>}
                </button>
              ))}
            </section>

            {!props.collapsed && (
              <section>
                <button type="button" {...stylex.attrs(styles.sectionToggle)} aria-expanded={nav.workspaceExpanded} onClick={nav.toggleWorkspace}>
                  <span>Workspace</span>
                  <Icon name="lucide:chevron-down" {...stylex.attrs(styles.chevron, nav.workspaceExpanded ? null : styles.collapsedChevron)} aria-hidden="true" />
                </button>
                <div {...stylex.attrs(styles.collapse, nav.workspaceExpanded ? styles.collapseOpen : styles.collapseClosed)} inert={!nav.workspaceExpanded}>
                  <div {...stylex.attrs(styles.collapseInner, nav.workspaceExpanded ? styles.collapseInnerOpen : null, styles.footerStack)}>
                    {nav.workspaceItems.map(item => (
                      <button key={item.id} type="button" {...stylex.attrs(styles.navButton, nav.isActiveView(item.id) ? styles.navActive : styles.navInactive)} onClick={() => nav.selectView(item.id)}>
                        <Icon name={item.icon === 'initiative' ? 'lucide:flag' : item.icon === 'project' ? 'lucide:box' : item.icon === 'view' ? 'lucide:layers' : 'lucide:circle-dashed'} {...stylex.attrs(styles.navIcon, styles.mutedIcon)} aria-hidden="true" />
                        <span {...stylex.attrs(styles.label)}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {!props.collapsed && (
              <section>
                <button type="button" {...stylex.attrs(styles.sectionToggle)} aria-expanded={nav.favoritesExpanded} onClick={nav.toggleFavorites}>
                  <span>Favorites</span>
                  <Icon name="lucide:chevron-down" {...stylex.attrs(styles.chevron, nav.favoritesExpanded ? null : styles.collapsedChevron)} aria-hidden="true" />
                </button>
                <div {...stylex.attrs(styles.collapse, nav.favoritesExpanded ? styles.collapseOpen : styles.collapseClosed)} inert={!nav.favoritesExpanded}>
                  <div {...stylex.attrs(styles.collapseInner, nav.favoritesExpanded ? styles.collapseInnerOpen : null, styles.footerStack)}>
                    {props.favoriteViews.map(favoriteView => (
                      <button
                        key={favoriteView.id}
                        type="button"
                        {...stylex.attrs(styles.navButton, nav.isActiveView(favoriteView.id) ? styles.navActive : styles.navInactive)}
                        onClick={() => emit('favoriteView', favoriteView.id)}
                        onContextmenu={event => nav.openFavoriteMenu(favoriteView, event)}
                      >
                        {favoriteView.icon
                          ? <Icon name={`lucide:${favoriteView.icon}`} {...stylex.attrs(styles.favoriteIcon(favoriteView.color ?? 'currentColor'))} aria-hidden="true" />
                          : <span {...stylex.attrs(styles.starIcon)} aria-hidden="true">★</span>}
                        <span {...stylex.attrs(styles.label)}>{favoriteView.label}</span>
                        {favoriteView.showIssueCount && favoriteView.count !== undefined && <span {...stylex.attrs(styles.count)}>{favoriteView.count}</span>}
                      </button>
                    ))}
                    {nav.pinnedTicketItems.map(ticket => (
                      <button
                        key={ticket.key}
                        type="button"
                        {...stylex.attrs(styles.navButton, props.selectedKey === ticket.key ? styles.navActive : styles.navInactive)}
                        title={`${ticket.key}: ${ticket.status}`}
                        onMouseenter={() => emit('prefetch', ticket.key)}
                        onClick={() => emit('select', ticket.key)}
                      >
                        <span {...stylex.attrs(styles.ticketIconWrap)}>
                          {ticket.projectIcon
                            ? <Icon name={`lucide:${ticket.projectIcon}`} {...stylex.attrs(styles.favoriteIcon(ticket.projectColor ?? 'currentColor'))} aria-hidden="true" />
                            : <StatusIcon status={ticket.status} statusCategory={ticket.statusCategory} size={16} />}
                        </span>
                        <span {...stylex.attrs(styles.label)}>{ticket.summary}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {!props.collapsed && (
              <section {...stylex.attrs(styles.teamSection)}>
                <div {...stylex.attrs(styles.sectionHeader)}>
                  <span>Your teams</span>
                  <button type="button" {...stylex.attrs(styles.addSpaceButton)} aria-label="Add space" onClick={() => emit('addSpace')}>
                    ＋
                  </button>
                </div>

                {nav.teamItems.map(team => (
                  <div key={team.key}>
                    <div
                      {...stylex.attrs(styles.teamRow, nav.viewNavigationIsActive && nav.isTeamViewForTeam(nav.currentViewId, team.key) ? styles.teamRowActive : null)}
                      onContextmenu={event => nav.openTeamMenu(team, event)}
                    >
                      <button type="button" {...stylex.attrs(styles.teamMainButton)} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'settings'))}>
                        <span {...stylex.attrs(styles.teamAvatar(team.color))}>
                          {team.icon
                            ? <Icon name={`lucide:${team.icon}`} {...stylex.attrs(styles.teamIcon)} aria-hidden="true" />
                            : team.initial}
                        </span>
                        <span {...stylex.attrs(styles.label)}>{team.name}</span>
                      </button>
                      <button
                        type="button"
                        {...stylex.attrs(styles.expandButton)}
                        aria-expanded={nav.isTeamExpanded(team.key)}
                        aria-label={`${nav.isTeamExpanded(team.key) ? 'Collapse' : 'Expand'} ${team.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          nav.toggleTeam(team.key)
                        }}
                      >
                        <Icon name="lucide:chevron-down" {...stylex.attrs(styles.chevron, styles.chevronMd, nav.isTeamExpanded(team.key) ? null : styles.collapsedChevron)} aria-hidden="true" />
                      </button>
                    </div>

                    <div {...stylex.attrs(styles.collapse, styles.teamNested, nav.isTeamExpanded(team.key) ? styles.collapseOpen : styles.collapseClosed)} inert={!nav.isTeamExpanded(team.key)}>
                      <div {...stylex.attrs(styles.collapseInner, nav.isTeamExpanded(team.key) ? styles.collapseInnerOpen : null, styles.compactSection, styles.nestedItems)}>
                        <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, navButtonStyles(nav.isActiveView(nav.getTeamViewId(team.key, 'triage'))))} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'triage'))}>
                          <span {...stylex.attrs(styles.triageIconWrap)} aria-hidden="true">
                            <Icon name="lucide:arrow-left-right" {...stylex.attrs(styles.triageIcon)} />
                          </span>
                          <span {...stylex.attrs(styles.label)}>Triage</span>
                          {team.triageCount > 0 && <span>{team.triageCount}</span>}
                        </button>
                        <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, navButtonStyles(nav.isTeamIssuesView(team.key)))} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'active'))}>
                          <Icon name="lucide:copy" {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
                          <span {...stylex.attrs(styles.label)}>Issues</span>
                        </button>
                        {team.key !== LOCAL_SPACE_KEY && (
                          <div>
                            <div {...stylex.attrs(styles.navButton, styles.navSubButton, styles.cycleRow, nav.isTeamCyclesView(team.key) ? styles.cycleParentActive : styles.navMutedInactive)}>
                              <button type="button" {...stylex.attrs(styles.teamMainButton, styles.cycleMainButton)} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'directory'))}>
                                <Icon name="lucide:circle-play" {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
                                <span {...stylex.attrs(styles.label)}>Cycles</span>
                              </button>
                              <button
                                type="button"
                                {...stylex.attrs(styles.expandButton)}
                                aria-expanded={nav.isCycleSectionExpanded(team.key)}
                                aria-label={`${nav.isCycleSectionExpanded(team.key) ? 'Collapse' : 'Expand'} cycles`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  nav.toggleCycleSection(team.key)
                                }}
                              >
                                <Icon name="lucide:chevron-down" {...stylex.attrs(styles.chevron, nav.isCycleSectionExpanded(team.key) ? null : styles.collapsedChevron)} aria-hidden="true" />
                              </button>
                            </div>
                            <div {...stylex.attrs(styles.collapse, styles.cycleNested, nav.isCycleSectionExpanded(team.key) ? styles.collapseOpen : styles.collapseClosed)} inert={!nav.isCycleSectionExpanded(team.key)}>
                              <div {...stylex.attrs(styles.collapseInner, nav.isCycleSectionExpanded(team.key) ? styles.collapseInnerOpen : null, styles.nestedItems)}>
                                <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, nav.isCycleCurrentView(team.key) ? styles.cycleActive : styles.navMutedInactive)} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'current'))}>Current</button>
                                <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, nav.isCycleUpcomingView(team.key) ? styles.cycleActive : styles.navMutedInactive)} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'upcoming'))}>Upcoming</button>
                                <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, nav.isCyclePreviousView(team.key) ? styles.cycleActive : styles.navMutedInactive)} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'previous'))}>Previous</button>
                              </div>
                            </div>
                          </div>
                        )}
                        <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, navButtonStyles(nav.isActiveView(nav.getTeamViewId(team.key, 'projects'))))} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'projects'))}>
                          <Icon name="lucide:box" {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
                          <span {...stylex.attrs(styles.label)}>Projects</span>
                        </button>
                        <button type="button" {...stylex.attrs(styles.navButton, styles.navSubButton, navButtonStyles(nav.isTeamViewsView(team.key)))} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'views'))}>
                          <Icon name="lucide:layers" {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
                          <span {...stylex.attrs(styles.label)}>Views</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </nav>
        </div>

        <div {...stylex.attrs(styles.footer, styles.footerStack)}>
          <button type="button" {...stylex.attrs(styles.footerButton, props.collapsed ? styles.centered : null)} disabled={props.refreshing} onClick={() => emit('refresh')}>
            <span {...stylex.attrs(styles.syncIcon, props.refreshing ? styles.spinning : null)}>↻</span>
            {!props.collapsed && <span {...stylex.attrs(styles.label)}>{props.refreshing ? 'Syncing' : 'Sync Jira'}</span>}
          </button>
          <button type="button" {...stylex.attrs(styles.footerButton, props.collapsed ? styles.centered : null)} onClick={() => emit('settings')}>
            <Icon name="lucide:settings" {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
            {!props.collapsed && <span {...stylex.attrs(styles.label)}>Settings</span>}
          </button>
          <button type="button" {...stylex.attrs(styles.footerButton, props.collapsed ? styles.centered : null)} onClick={() => emit('toggleCollapse')}>
            <span {...stylex.attrs(styles.syncIcon)}>{props.collapsed ? '›' : '‹'}</span>
            {!props.collapsed && <span {...stylex.attrs(styles.label)}>Collapse sidebar</span>}
          </button>
        </div>

        <Teleport to="body">
          {nav.teamMenuState.open && (
            <div
              ref={sidebarNavigation.teamMenuElement}
              {...stylex.attrs(styles.menu(nav.teamMenuStyle.top, nav.teamMenuStyle.left))}
              role="menu"
              onContextmenu={event => event.preventDefault()}
            >
              <div {...stylex.attrs(styles.menuHeader)}>
                <p {...stylex.attrs(styles.menuTitle)}>{nav.teamMenuState.teamName}</p>
              </div>
              <button type="button" {...stylex.attrs(styles.dangerMenuItem)} role="menuitem" onClick={nav.leaveCurrentTeam}>
                <Icon name="lucide:log-out" {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
                <span>Leave space</span>
              </button>
            </div>
          )}

          {nav.favoriteMenuState.open && (
            <div
              ref={sidebarNavigation.favoriteMenuElement}
              {...stylex.attrs(styles.menu(nav.favoriteMenuStyle.top, nav.favoriteMenuStyle.left))}
              role="menu"
              onContextmenu={event => event.preventDefault()}
            >
              <div {...stylex.attrs(styles.menuHeader)}>
                <p {...stylex.attrs(styles.menuTitle)}>{nav.favoriteMenuState.viewLabel}</p>
              </div>
              <button type="button" {...stylex.attrs(styles.menuItem)} role="menuitem" onClick={() => nav.setFavoriteIssueCountVisibility(!nav.favoriteMenuState.showIssueCount)}>
                <Icon name={nav.favoriteMenuState.showIssueCount ? 'lucide:eye-off' : 'lucide:hash'} {...stylex.attrs(styles.navIcon)} aria-hidden="true" />
                <span>{nav.favoriteMenuState.showIssueCount ? 'Hide issue count' : 'Show issue count'}</span>
              </button>
            </div>
          )}
        </Teleport>
      </aside>
    )
  },
})
