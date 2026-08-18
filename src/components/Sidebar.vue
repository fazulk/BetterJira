<script setup lang="ts">
import type { FavoriteViewNavItem } from '@/features/sidebar/useSidebarNavigation'
import type { JiraTicket } from '@/types/jira'
import StatusIcon from '@/components/StatusIcon.vue'
import { useSidebarNavigation } from '@/features/sidebar/useSidebarNavigation'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

const props = defineProps<{
  tickets: JiraTicket[]
  selectedKey: string | null
  collapsed: boolean
  refreshing: boolean
  currentView: string
  favoriteViews: FavoriteViewNavItem[]
  canGoBack: boolean
  canGoForward: boolean
}>()

const emit = defineEmits<{
  'select': [key: string]
  'prefetch': [key: string]
  'toggleCollapse': []
  'refresh': []
  'home': []
  'settings': []
  'command': []
  'view': [viewId: string]
  'favoriteView': [viewId: string]
  'favorite-count-visibility': [viewId: string, visible: boolean]
  'addSpace': []
  'leave-space': [spaceKey: string]
  'back': []
  'forward': []
}>()

const {
  currentViewId,
  favoriteMenuElement,
  favoriteMenuState,
  favoriteMenuStyle,
  favoritesExpanded,
  getTeamCycleViewId,
  getTeamViewId,
  isActiveView,
  isCycleCurrentView,
  isCycleUpcomingView,
  isCyclePreviousView,
  isCycleSectionExpanded,
  isTeamExpanded,
  isTeamViewForTeam,
  isTeamIssuesView,
  isTeamViewsView,
  isTeamCyclesView,
  leaveCurrentTeam,
  openFavoriteMenu,
  openTeamMenu,
  pinnedTicketItems,
  primaryItems,
  selectView,
  teamItems,
  teamMenuElement,
  teamMenuState,
  teamMenuStyle,
  setFavoriteIssueCountVisibility,
  toggleFavorites,
  toggleTeam,
  toggleCycleSection,
  toggleWorkspace,
  viewNavigationIsActive,
  workspaceExpanded,
  workspaceItems,
} = useSidebarNavigation(props, emit)
</script>

<template>
  <aside class="flex h-screen w-full flex-col overflow-hidden bg-[#090a0c] text-[13px] text-[#b9bbc3]">
    <div class="flex h-11 shrink-0 items-center gap-2 px-3">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[#e6e7ea] hover:bg-white/[0.05]"
        :class="collapsed ? 'justify-center' : ''"
        @click="emit('home')"
      >
        <img src="/favicon.svg" alt="" class="h-5 w-5 shrink-0 rounded" aria-hidden="true">
        <span v-if="!collapsed" class="truncate font-medium">BetterJira!</span>
      </button>

      <button
        v-if="!collapsed"
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8f9198] transition enabled:hover:bg-white/[0.05] enabled:hover:text-[#e6e7ea] disabled:cursor-default disabled:opacity-30"
        title="Go back"
        :disabled="!canGoBack"
        @click="emit('back')"
      >
        <Icon name="lucide:chevron-left" class="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        v-if="!collapsed"
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8f9198] transition enabled:hover:bg-white/[0.05] enabled:hover:text-[#e6e7ea] disabled:cursor-default disabled:opacity-30"
        title="Go forward"
        :disabled="!canGoForward"
        @click="emit('forward')"
      >
        <Icon name="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        v-if="!collapsed"
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8f9198] hover:bg-white/[0.05] hover:text-[#e6e7ea]"
        title="Search workspace"
        @click="emit('command')"
      >
        <Icon name="lucide:search" class="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <button
        v-if="!collapsed"
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[#d7d8dc] hover:bg-white/[0.12] hover:text-[#f0f1f4]"
        title="Create issue"
        @click="selectView('create')"
      >
        <Icon name="lucide:square-pen" class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-2 pb-3">
      <nav class="space-y-5">
        <section class="space-y-0.5">
          <button
            v-for="item in primaryItems"
            :key="item.id"
            type="button"
            class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
            :class="[
              isActiveView(item.id) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]',
              collapsed ? 'justify-center' : '',
            ]"
            @click="selectView(item.id)"
          >
            <Icon
              :name="item.icon === 'inbox' ? 'lucide:inbox' : 'lucide:scan'"
              class="h-3.5 w-3.5 shrink-0 text-[#8f9198]"
              aria-hidden="true"
            />
            <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span v-if="!collapsed && item.count !== undefined && item.count > 0" class="text-[11px] text-[#6f727b]">{{ item.count }}</span>
          </button>
        </section>

        <section v-if="!collapsed" class="space-y-1">
          <button
            type="button"
            class="flex h-6 w-full items-center justify-between rounded-md px-2 text-left text-[12px] font-medium text-[#777a83] transition hover:bg-white/[0.045] hover:text-[#b9bbc3]"
            :aria-expanded="workspaceExpanded"
            @click="toggleWorkspace"
          >
            <span>Workspace</span>
            <Icon
              name="lucide:chevron-down"
              class="h-3 w-3 transition-transform"
              :class="workspaceExpanded ? '' : '-rotate-90'"
              aria-hidden="true"
            />
          </button>
          <template v-if="workspaceExpanded">
            <button
              v-for="item in workspaceItems"
              :key="item.id"
              type="button"
              class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
              :class="isActiveView(item.id) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]'"
              @click="selectView(item.id)"
            >
              <Icon
                :name="item.icon === 'initiative' ? 'lucide:flag' : item.icon === 'project' ? 'lucide:box' : item.icon === 'view' ? 'lucide:layers' : 'lucide:circle-dashed'"
                class="h-3.5 w-3.5 shrink-0 text-[#8f9198]"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            </button>
          </template>
        </section>

        <section v-if="!collapsed" class="space-y-1">
          <button
            type="button"
            class="flex h-6 w-full items-center justify-between rounded-md px-2 text-left text-[12px] font-medium text-[#777a83] transition hover:bg-white/[0.045] hover:text-[#b9bbc3]"
            :aria-expanded="favoritesExpanded"
            @click="toggleFavorites"
          >
            <span>Favorites</span>
            <Icon
              name="lucide:chevron-down"
              class="h-3 w-3 transition-transform"
              :class="favoritesExpanded ? '' : '-rotate-90'"
              aria-hidden="true"
            />
          </button>
          <template v-if="favoritesExpanded">
            <button
              v-for="favoriteView in favoriteViews"
              :key="favoriteView.id"
              type="button"
              class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
              :class="isActiveView(favoriteView.id) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]'"
              @click="emit('favoriteView', favoriteView.id)"
              @contextmenu="openFavoriteMenu(favoriteView, $event)"
            >
              <Icon
                v-if="favoriteView.icon"
                :name="`lucide:${favoriteView.icon}`"
                class="h-3.5 w-3.5 shrink-0"
                :style="favoriteView.color ? { color: favoriteView.color } : undefined"
                aria-hidden="true"
              />
              <span v-else class="w-3.5 shrink-0 text-center text-[13px] leading-none text-[#d7a543]" aria-hidden="true">★</span>
              <span class="min-w-0 flex-1 truncate">{{ favoriteView.label }}</span>
              <span v-if="favoriteView.showIssueCount && favoriteView.count !== undefined" class="text-[11px] text-[#6f727b]">{{ favoriteView.count }}</span>
            </button>
            <button
              v-for="ticket in pinnedTicketItems"
              :key="ticket.key"
              type="button"
              class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
              :class="selectedKey === ticket.key ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#a9abb3] hover:bg-white/[0.045] hover:text-[#e6e7ea]'"
              :title="`${ticket.key}: ${ticket.status}`"
              @mouseenter="emit('prefetch', ticket.key)"
              @click="emit('select', ticket.key)"
            >
              <span class="flex h-4 w-4 shrink-0 items-center justify-center">
                <Icon
                  v-if="ticket.projectIcon"
                  :name="`lucide:${ticket.projectIcon}`"
                  class="h-3.5 w-3.5"
                  :style="ticket.projectColor ? { color: ticket.projectColor } : undefined"
                  aria-hidden="true"
                />
                <StatusIcon v-else :status="ticket.status" :status-category="ticket.statusCategory" :size="16" />
              </span>
              <span class="min-w-0 flex-1 truncate">{{ ticket.summary }}</span>
            </button>
          </template>
        </section>

        <section v-if="!collapsed" class="space-y-1">
          <div class="flex h-6 items-center justify-between px-2 text-[12px] font-medium text-[#777a83]">
            <span>Your teams</span>
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded text-[14px] text-[#777a83] transition hover:bg-white/[0.055] hover:text-[#f0f1f4]"
              aria-label="Add space"
              @click="emit('addSpace')"
            >
              ＋
            </button>
          </div>

          <div v-for="team in teamItems" :key="team.key" class="space-y-0.5">
            <div
              class="flex h-7 w-full items-center rounded-md text-[13px] text-[#c6c8ce] transition hover:bg-white/[0.045] hover:text-[#f0f1f4]"
              :class="viewNavigationIsActive && isTeamViewForTeam(currentViewId, team.key) ? 'bg-white/[0.055]' : ''"
              @contextmenu="openTeamMenu(team, $event)"
            >
              <button
                type="button"
                class="flex h-full min-w-0 flex-1 items-center gap-1 rounded-l-md px-2 text-left"
                @click="selectView(getTeamViewId(team.key, 'settings'))"
              >
                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center text-[14px] font-semibold"
                  :style="{ color: team.color }"
                >
                  <Icon v-if="team.icon" :name="`lucide:${team.icon}`" class="h-6 w-6" aria-hidden="true" />
                  <template v-else>{{ team.initial }}</template>
                </span>
                <span class="min-w-0 flex-1 truncate">{{ team.name }}</span>
              </button>
              <button
                type="button"
                class="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6f727b] transition hover:bg-white/[0.06] hover:text-[#f0f1f4]"
                :aria-expanded="isTeamExpanded(team.key)"
                :aria-label="`${isTeamExpanded(team.key) ? 'Collapse' : 'Expand'} ${team.name}`"
                @click.stop="toggleTeam(team.key)"
              >
                <Icon
                  name="lucide:chevron-down"
                  class="h-3.5 w-3.5 transition-transform"
                  :class="isTeamExpanded(team.key) ? '' : '-rotate-90'"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div v-if="isTeamExpanded(team.key)" class="ml-5 space-y-0.5">
              <button
                type="button"
                class="flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition"
                :class="isActiveView(getTeamViewId(team.key, 'triage')) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                @click="selectView(getTeamViewId(team.key, 'triage'))"
              >
                <span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current" aria-hidden="true">
                  <Icon name="lucide:arrow-left-right" class="h-2.5 w-2.5" />
                </span>
                <span class="flex-1 truncate">Triage</span>
                <span v-if="team.triageCount > 0">{{ team.triageCount }}</span>
              </button>
              <button
                type="button"
                class="flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition"
                :class="isTeamIssuesView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                @click="selectView(getTeamViewId(team.key, 'active'))"
              >
                <Icon name="lucide:copy" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span class="flex-1 truncate">Issues</span>
              </button>
              <div v-if="team.key !== LOCAL_SPACE_KEY" class="space-y-0.5">
                <div class="flex h-6 w-full items-center rounded-md text-[12px] transition" :class="isTeamCyclesView(team.key) ? 'bg-white/[0.055] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'">
                  <button
                    type="button"
                    class="flex h-full min-w-0 flex-1 items-center gap-2 rounded-l-md px-2 text-left"
                    @click="selectView(getTeamCycleViewId(team.key, 'directory'))"
                  >
                    <Icon name="lucide:circle-play" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span class="flex-1 truncate">Cycles</span>
                  </button>
                  <button
                    type="button"
                    class="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#6f727b] transition hover:bg-white/[0.06] hover:text-[#f0f1f4]"
                    :aria-expanded="isCycleSectionExpanded(team.key)"
                    :aria-label="`${isCycleSectionExpanded(team.key) ? 'Collapse' : 'Expand'} cycles`"
                    @click.stop="toggleCycleSection(team.key)"
                  >
                    <Icon
                      name="lucide:chevron-down"
                      class="h-3 w-3 transition-transform"
                      :class="isCycleSectionExpanded(team.key) ? '' : '-rotate-90'"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div v-if="isCycleSectionExpanded(team.key)" class="ml-[1.125rem] border-l border-white/[0.08] pl-2">
                  <button
                    type="button"
                    class="flex h-6 w-full items-center rounded-md px-2 text-left text-[12px] transition"
                    :class="isCycleCurrentView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4] ring-1 ring-inset ring-[#5b6abf]/70' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                    @click="selectView(getTeamCycleViewId(team.key, 'current'))"
                  >
                    Current
                  </button>
                  <button
                    type="button"
                    class="flex h-6 w-full items-center rounded-md px-2 text-left text-[12px] transition"
                    :class="isCycleUpcomingView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4] ring-1 ring-inset ring-[#5b6abf]/70' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                    @click="selectView(getTeamCycleViewId(team.key, 'upcoming'))"
                  >
                    Upcoming
                  </button>
                  <button
                    type="button"
                    class="flex h-6 w-full items-center rounded-md px-2 text-left text-[12px] transition"
                    :class="isCyclePreviousView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4] ring-1 ring-inset ring-[#5b6abf]/70' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                    @click="selectView(getTeamCycleViewId(team.key, 'previous'))"
                  >
                    Previous
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition"
                :class="isActiveView(getTeamViewId(team.key, 'projects')) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                @click="selectView(getTeamViewId(team.key, 'projects'))"
              >
                <Icon name="lucide:box" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span class="flex-1 truncate">Projects</span>
              </button>
              <button
                type="button"
                class="flex h-6 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] transition"
                :class="isTeamViewsView(team.key) ? 'bg-white/[0.08] text-[#f0f1f4]' : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'"
                @click="selectView(getTeamViewId(team.key, 'views'))"
              >
                <Icon name="lucide:layers" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span class="flex-1 truncate">Views</span>
              </button>
            </div>
          </div>
        </section>
      </nav>
    </div>

    <div class="shrink-0 space-y-1 border-t border-white/[0.06] px-2 py-2">
      <button
        type="button"
        class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-[#8f9198] transition hover:bg-white/[0.045] hover:text-[#e6e7ea]"
        :class="collapsed ? 'justify-center' : ''"
        :disabled="refreshing"
        @click="emit('refresh')"
      >
        <span class="w-4 text-center" :class="{ 'animate-spin': refreshing }">↻</span>
        <span v-if="!collapsed" class="flex-1 truncate">{{ refreshing ? 'Syncing' : 'Sync Jira' }}</span>
      </button>
      <button
        type="button"
        class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-[#8f9198] transition hover:bg-white/[0.045] hover:text-[#e6e7ea]"
        :class="collapsed ? 'justify-center' : ''"
        @click="emit('settings')"
      >
        <Icon name="lucide:settings" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span v-if="!collapsed" class="flex-1 truncate">Settings</span>
      </button>
      <button
        type="button"
        class="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-[#8f9198] transition hover:bg-white/[0.045] hover:text-[#e6e7ea]"
        :class="collapsed ? 'justify-center' : ''"
        @click="emit('toggleCollapse')"
      >
        <span class="w-4 text-center">{{ collapsed ? '›' : '‹' }}</span>
        <span v-if="!collapsed" class="flex-1 truncate">Collapse sidebar</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="teamMenuState.open"
        ref="teamMenuElement"
        class="fixed z-[100] w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#11131a]/95 p-1 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur"
        :style="teamMenuStyle"
        role="menu"
        @contextmenu.prevent
      >
        <div class="border-b border-white/[0.06] px-2 py-1.5">
          <p class="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {{ teamMenuState.teamName }}
          </p>
        </div>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-rose-300 transition hover:bg-rose-500/[0.12] hover:text-rose-200"
          role="menuitem"
          @click="leaveCurrentTeam"
        >
          <Icon name="lucide:log-out" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Leave space</span>
        </button>
      </div>

      <div
        v-if="favoriteMenuState.open"
        ref="favoriteMenuElement"
        class="fixed z-[100] w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#11131a]/95 p-1 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur"
        :style="favoriteMenuStyle"
        role="menu"
        @contextmenu.prevent
      >
        <div class="border-b border-white/[0.06] px-2 py-1.5">
          <p class="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {{ favoriteMenuState.viewLabel }}
          </p>
        </div>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
          role="menuitem"
          @click="setFavoriteIssueCountVisibility(!favoriteMenuState.showIssueCount)"
        >
          <Icon :name="favoriteMenuState.showIssueCount ? 'lucide:eye-off' : 'lucide:hash'" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{{ favoriteMenuState.showIssueCount ? 'Hide issue count' : 'Show issue count' }}</span>
        </button>
      </div>
    </Teleport>
  </aside>
</template>
