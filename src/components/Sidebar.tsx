import type { PropType } from 'vue'
import type { FavoriteViewNavItem } from '@/features/sidebar/useSidebarNavigation'
import type { JiraTicket } from '@/types/jira'
import { defineComponent, reactive, Teleport } from 'vue'
import { Icon } from '#components'
import StatusIcon from '@/components/StatusIcon'
import { useSidebarNavigation } from '@/features/sidebar/useSidebarNavigation'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'
import './Sidebar.css'

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

    function navButtonClass(active: boolean): string {
      return active
        ? 'bg-white/[0.08] text-[#f0f1f4]'
        : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'
    }

    return () => (
      <aside class="flex h-screen w-full flex-col overflow-hidden bg-[#090a0c] text-[13px] text-[#b9bbc3]">
        <div class="flex h-11 shrink-0 items-center gap-2 px-3">
          <button
            type="button"
            class={['flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[#e6e7ea] hover:bg-white/[0.05]', props.collapsed ? 'justify-center' : '']}
            onClick={() => emit('home')}
          >
            <img src="/favicon.svg" alt="" class="h-5 w-5 shrink-0 rounded" aria-hidden="true" />
            {!props.collapsed && <span class="truncate font-medium">BetterJira!</span>}
          </button>

          {!props.collapsed && (
            <>
              <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8f9198] transition enabled:hover:bg-white/[0.05] enabled:hover:text-[#e6e7ea] disabled:cursor-default disabled:opacity-30" title="Go back" disabled={!props.canGoBack} onClick={() => emit('back')}>
                <Icon name="lucide:chevron-left" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8f9198] transition enabled:hover:bg-white/[0.05] enabled:hover:text-[#e6e7ea] disabled:cursor-default disabled:opacity-30" title="Go forward" disabled={!props.canGoForward} onClick={() => emit('forward')}>
                <Icon name="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8f9198] hover:bg-white/[0.05] hover:text-[#e6e7ea]" title="Search workspace" onClick={() => emit('command')}>
                <Icon name="lucide:search" class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[#d7d8dc] hover:bg-white/[0.12] hover:text-[#f0f1f4]" title="Create issue" onClick={() => nav.selectView('create')}>
                <Icon name="lucide:square-pen" class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <nav class="space-y-5">
            <section class="space-y-0.5">
              {nav.primaryItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  class={[
                    'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition',
                    nav.isActiveView(item.id) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]',
                    props.collapsed ? 'justify-center' : '',
                  ]}
                  onClick={() => nav.selectView(item.id)}
                >
                  <Icon name={item.icon === 'inbox' ? 'lucide:inbox' : 'lucide:scan'} class="h-3.5 w-3.5 shrink-0 text-[#8f9198]" aria-hidden="true" />
                  {!props.collapsed && <span class="min-w-0 flex-1 truncate">{item.label}</span>}
                  {!props.collapsed && item.count !== undefined && item.count > 0 && <span class="text-[11px] text-[#6f727b]">{item.count}</span>}
                </button>
              ))}
            </section>

            {!props.collapsed && (
              <section>
                <button type="button" class="flex h-6 w-full items-center justify-between rounded-md px-2 text-left text-[12px] font-medium text-[#777a83] transition hover:bg-white/[0.045] hover:text-[#b9bbc3]" aria-expanded={nav.workspaceExpanded} onClick={nav.toggleWorkspace}>
                  <span>Workspace</span>
                  <Icon name="lucide:chevron-down" class={['h-3 w-3 transition-transform duration-200', nav.workspaceExpanded ? '' : '-rotate-90']} aria-hidden="true" />
                </button>
                <div class={['sidebar-collapse', nav.workspaceExpanded ? 'sidebar-collapse-open' : 'sidebar-collapse-closed']} inert={!nav.workspaceExpanded}>
                  <div class="sidebar-collapse-inner space-y-1 pt-1">
                    {nav.workspaceItems.map(item => (
                      <button key={item.id} type="button" class={['flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition', nav.isActiveView(item.id) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]']} onClick={() => nav.selectView(item.id)}>
                        <Icon name={item.icon === 'initiative' ? 'lucide:flag' : item.icon === 'project' ? 'lucide:box' : item.icon === 'view' ? 'lucide:layers' : 'lucide:circle-dashed'} class="h-3.5 w-3.5 shrink-0 text-[#8f9198]" aria-hidden="true" />
                        <span class="min-w-0 flex-1 truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {!props.collapsed && (
              <section>
                <button type="button" class="flex h-6 w-full items-center justify-between rounded-md px-2 text-left text-[12px] font-medium text-[#777a83] transition hover:bg-white/[0.045] hover:text-[#b9bbc3]" aria-expanded={nav.favoritesExpanded} onClick={nav.toggleFavorites}>
                  <span>Favorites</span>
                  <Icon name="lucide:chevron-down" class={['h-3 w-3 transition-transform duration-200', nav.favoritesExpanded ? '' : '-rotate-90']} aria-hidden="true" />
                </button>
                <div class={['sidebar-collapse', nav.favoritesExpanded ? 'sidebar-collapse-open' : 'sidebar-collapse-closed']} inert={!nav.favoritesExpanded}>
                  <div class="sidebar-collapse-inner space-y-1 pt-1">
                    {props.favoriteViews.map(favoriteView => (
                      <button
                        key={favoriteView.id}
                        type="button"
                        class={['flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition', nav.isActiveView(favoriteView.id) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]']}
                        onClick={() => emit('favoriteView', favoriteView.id)}
                        onContextmenu={event => nav.openFavoriteMenu(favoriteView, event)}
                      >
                        {favoriteView.icon
                          ? <Icon name={`lucide:${favoriteView.icon}`} class="h-3.5 w-3.5 shrink-0" style={favoriteView.color ? { color: favoriteView.color } : undefined} aria-hidden="true" />
                          : <span class="w-3.5 shrink-0 text-center text-[13px] leading-none text-[#d7a543]" aria-hidden="true">★</span>}
                        <span class="min-w-0 flex-1 truncate">{favoriteView.label}</span>
                        {favoriteView.showIssueCount && favoriteView.count !== undefined && <span class="text-[11px] text-[#6f727b]">{favoriteView.count}</span>}
                      </button>
                    ))}
                    {nav.pinnedTicketItems.map(ticket => (
                      <button
                        key={ticket.key}
                        type="button"
                        class={['flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition', props.selectedKey === ticket.key ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]']}
                        title={`${ticket.key}: ${ticket.status}`}
                        onMouseenter={() => emit('prefetch', ticket.key)}
                        onClick={() => emit('select', ticket.key)}
                      >
                        <span class="flex h-4 w-4 shrink-0 items-center justify-center">
                          {ticket.projectIcon
                            ? <Icon name={`lucide:${ticket.projectIcon}`} class="h-3.5 w-3.5" style={ticket.projectColor ? { color: ticket.projectColor } : undefined} aria-hidden="true" />
                            : <StatusIcon status={ticket.status} statusCategory={ticket.statusCategory} size={16} />}
                        </span>
                        <span class="min-w-0 flex-1 truncate">{ticket.summary}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {!props.collapsed && (
              <section class="space-y-1">
                <div class="flex h-6 items-center justify-between px-2 text-[12px] font-medium text-[#777a83]">
                  <span>Your teams</span>
                  <button type="button" class="flex h-5 w-5 items-center justify-center rounded text-[14px] text-[#777a83] transition hover:bg-white/[0.055] hover:text-[#f0f1f4]" aria-label="Add space" onClick={() => emit('addSpace')}>
                    ＋
                  </button>
                </div>

                {nav.teamItems.map(team => (
                  <div key={team.key}>
                    <div
                      class={['flex h-7 w-full items-center rounded-md text-[13px] text-[#c6c8ce] transition hover:bg-white/[0.045] hover:text-[#f0f1f4]', nav.viewNavigationIsActive && nav.isTeamViewForTeam(nav.currentViewId, team.key) ? 'bg-white/[0.055]' : '']}
                      onContextmenu={event => nav.openTeamMenu(team, event)}
                    >
                      <button type="button" class="flex h-full min-w-0 flex-1 items-center gap-1 rounded-l-md px-2 text-left" onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'settings'))}>
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center text-[14px] font-semibold" style={{ color: team.color }}>
                          {team.icon
                            ? <Icon name={`lucide:${team.icon}`} class="h-6 w-6" aria-hidden="true" />
                            : team.initial}
                        </span>
                        <span class="min-w-0 flex-1 truncate">{team.name}</span>
                      </button>
                      <button
                        type="button"
                        class="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6f727b] transition hover:bg-white/[0.06] hover:text-[#f0f1f4]"
                        aria-expanded={nav.isTeamExpanded(team.key)}
                        aria-label={`${nav.isTeamExpanded(team.key) ? 'Collapse' : 'Expand'} ${team.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          nav.toggleTeam(team.key)
                        }}
                      >
                        <Icon name="lucide:chevron-down" class={['h-3.5 w-3.5 transition-transform duration-200', nav.isTeamExpanded(team.key) ? '' : '-rotate-90']} aria-hidden="true" />
                      </button>
                    </div>

                    <div class={['sidebar-collapse ml-5', nav.isTeamExpanded(team.key) ? 'sidebar-collapse-open' : 'sidebar-collapse-closed']} inert={!nav.isTeamExpanded(team.key)}>
                      <div class="sidebar-collapse-inner space-y-0.5 pt-0.5">
                        <button type="button" class={['flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition', navButtonClass(nav.isActiveView(nav.getTeamViewId(team.key, 'triage')))]} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'triage'))}>
                          <span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current" aria-hidden="true">
                            <Icon name="lucide:arrow-left-right" class="h-2.5 w-2.5" />
                          </span>
                          <span class="flex-1 truncate">Triage</span>
                          {team.triageCount > 0 && <span>{team.triageCount}</span>}
                        </button>
                        <button type="button" class={['flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition', navButtonClass(nav.isTeamIssuesView(team.key))]} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'active'))}>
                          <Icon name="lucide:copy" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span class="flex-1 truncate">Issues</span>
                        </button>
                        {team.key !== LOCAL_SPACE_KEY && (
                          <div>
                            <div class={['flex h-6 w-full items-center rounded-md text-[12px] transition', nav.isTeamCyclesView(team.key) ? 'bg-white/[0.055] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]']}>
                              <button type="button" class="flex h-full min-w-0 flex-1 items-center gap-2 rounded-l-md px-2 text-left" onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'directory'))}>
                                <Icon name="lucide:circle-play" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span class="flex-1 truncate">Cycles</span>
                              </button>
                              <button
                                type="button"
                                class="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6f727b] transition hover:bg-white/[0.06] hover:text-[#f0f1f4]"
                                aria-expanded={nav.isCycleSectionExpanded(team.key)}
                                aria-label={`${nav.isCycleSectionExpanded(team.key) ? 'Collapse' : 'Expand'} cycles`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  nav.toggleCycleSection(team.key)
                                }}
                              >
                                <Icon name="lucide:chevron-down" class={['h-3 w-3 transition-transform duration-200', nav.isCycleSectionExpanded(team.key) ? '' : '-rotate-90']} aria-hidden="true" />
                              </button>
                            </div>
                            <div class={['sidebar-collapse ml-[1.125rem] border-l border-white/[0.08] pl-2', nav.isCycleSectionExpanded(team.key) ? 'sidebar-collapse-open' : 'sidebar-collapse-closed']} inert={!nav.isCycleSectionExpanded(team.key)}>
                              <div class="sidebar-collapse-inner pt-0.5">
                                <button type="button" class={['flex h-6 w-full items-center rounded-md px-2 text-left text-[12px] transition', nav.isCycleCurrentView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4] ring-1 ring-inset ring-[#5b6abf]/70' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]']} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'current'))}>Current</button>
                                <button type="button" class={['flex h-6 w-full items-center rounded-md px-2 text-left text-[12px] transition', nav.isCycleUpcomingView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4] ring-1 ring-inset ring-[#5b6abf]/70' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]']} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'upcoming'))}>Upcoming</button>
                                <button type="button" class={['flex h-6 w-full items-center rounded-md px-2 text-left text-[12px] transition', nav.isCyclePreviousView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4] ring-1 ring-inset ring-[#5b6abf]/70' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]']} onClick={() => nav.selectView(nav.getTeamCycleViewId(team.key, 'previous'))}>Previous</button>
                              </div>
                            </div>
                          </div>
                        )}
                        <button type="button" class={['flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition', navButtonClass(nav.isActiveView(nav.getTeamViewId(team.key, 'projects')))]} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'projects'))}>
                          <Icon name="lucide:box" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span class="flex-1 truncate">Projects</span>
                        </button>
                        <button type="button" class={['flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition', navButtonClass(nav.isTeamViewsView(team.key))]} onClick={() => nav.selectView(nav.getTeamViewId(team.key, 'views'))}>
                          <Icon name="lucide:layers" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span class="flex-1 truncate">Views</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </nav>
        </div>

        <div class="shrink-0 space-y-1 border-t border-white/[0.06] px-2 py-2">
          <button type="button" class={['flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-[#8f9198] transition hover:bg-white/[0.045] hover:text-[#e6e7ea]', props.collapsed ? 'justify-center' : '']} disabled={props.refreshing} onClick={() => emit('refresh')}>
            <span class={['w-4 text-center', { 'animate-spin': props.refreshing }]}>↻</span>
            {!props.collapsed && <span class="flex-1 truncate">{props.refreshing ? 'Syncing' : 'Sync Jira'}</span>}
          </button>
          <button type="button" class={['flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-[#8f9198] transition hover:bg-white/[0.045] hover:text-[#e6e7ea]', props.collapsed ? 'justify-center' : '']} onClick={() => emit('settings')}>
            <Icon name="lucide:settings" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!props.collapsed && <span class="flex-1 truncate">Settings</span>}
          </button>
          <button type="button" class={['flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-[#8f9198] transition hover:bg-white/[0.045] hover:text-[#e6e7ea]', props.collapsed ? 'justify-center' : '']} onClick={() => emit('toggleCollapse')}>
            <span class="w-4 text-center">{props.collapsed ? '›' : '‹'}</span>
            {!props.collapsed && <span class="flex-1 truncate">Collapse sidebar</span>}
          </button>
        </div>

        <Teleport to="body">
          {nav.teamMenuState.open && (
            <div
              ref={sidebarNavigation.teamMenuElement}
              class="fixed z-[100] w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#11131a]/95 p-1 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur"
              style={nav.teamMenuStyle}
              role="menu"
              onContextmenu={event => event.preventDefault()}
            >
              <div class="border-b border-white/[0.06] px-2 py-1.5">
                <p class="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{nav.teamMenuState.teamName}</p>
              </div>
              <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-rose-300 transition hover:bg-rose-500/[0.12] hover:text-rose-200" role="menuitem" onClick={nav.leaveCurrentTeam}>
                <Icon name="lucide:log-out" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Leave space</span>
              </button>
            </div>
          )}

          {nav.favoriteMenuState.open && (
            <div
              ref={sidebarNavigation.favoriteMenuElement}
              class="fixed z-[100] w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#11131a]/95 p-1 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur"
              style={nav.favoriteMenuStyle}
              role="menu"
              onContextmenu={event => event.preventDefault()}
            >
              <div class="border-b border-white/[0.06] px-2 py-1.5">
                <p class="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{nav.favoriteMenuState.viewLabel}</p>
              </div>
              <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06] hover:text-white" role="menuitem" onClick={() => nav.setFavoriteIssueCountVisibility(!nav.favoriteMenuState.showIssueCount)}>
                <Icon name={nav.favoriteMenuState.showIssueCount ? 'lucide:eye-off' : 'lucide:hash'} class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{nav.favoriteMenuState.showIssueCount ? 'Hide issue count' : 'Show issue count'}</span>
              </button>
            </div>
          )}
        </Teleport>
      </aside>
    )
  },
})
