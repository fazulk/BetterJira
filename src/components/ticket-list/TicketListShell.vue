<script setup lang="ts">
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import AddSpaceModal from '../AddSpaceModal.vue'
import CreateTicketModal from '../CreateTicketModal.vue'
import Sidebar from '../Sidebar.vue'
import TicketDetail from '../TicketDetail.vue'
import TeamSettingsView from './TeamSettingsView.vue'
import TicketListAssistantHome from './TicketListAssistantHome.vue'
import TicketListCommandMenu from './TicketListCommandMenu.vue'
import TicketListInitiativesView from './TicketListInitiativesView.vue'
import TicketListIssueSections from './TicketListIssueSections.vue'
import TicketListProjectView from './TicketListProjectView.vue'
import TicketListSavedViewsView from './TicketListSavedViewsView.vue'
import TicketListSearchView from './TicketListSearchView.vue'
import TicketListSelectionBar from './TicketListSelectionBar.vue'
import TicketListToolbarArea from './TicketListToolbarArea.vue'

const {
  showInitialWorkspaceOverlay,
  effectiveSidebarWidth,
  tickets,
  selectedKey,
  sidebarCollapsed,
  refreshing,
  currentView,
  favoriteViewNavItems,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  openTicket,
  prefetchTicket,
  handleRefresh,
  handleViewChange,
  openSettings,
  openCommandMenu,
  handleFavoriteViewChange,
  setFavoriteViewIssueCountVisible,
  openAddSpaceModal,
  handleLeaveSpace,
  startSidebarResize,
  isTeamSettingsView,
  closeTicket,
  openChildCreate,
  currentTeamKey,
  initiativeRows,
  initiativeGridTemplate,
  isInitiativeRowFieldVisible,
  getProjectHealthClass,
  getProgressBarClass,
  getRelativeTimeLabel,
  isProjectDisplayView,
  projectSections,
  visibleProjectCount,
  projectGrouping,
  projectGridTemplate,
  isProjectRowFieldVisible,
  isProjectSectionCollapsed,
  toggleProjectSection,
  isViewsDirectory,
  displayedSavedViewRows,
  savedViewGridTemplate,
  isSavedViewRowFieldVisible,
  issueSections,
  visibleIssueCount,
  hiddenCompletedCount,
  completedRange,
  focusedIssueKey,
  checkedIssueKeySet,
  issueRowDisplayProps,
  shouldShowIssueSectionHeader,
  getDisplayedIssueRowKey,
  isIssueSectionCollapsed,
  listGrouping,
  getStatusCategoryForGroupLabel,
  toggleIssueSection,
  toggleCheckedIssue,
  commandQuery,
  commandMenuOpen,
  commandItems,
  commandActiveIndex,
  closeCommandMenu,
  handleCommandMenuKeydown,
  runCommandItem,
  checkedIssueCount,
  checkedIssues,
  openFirstCheckedIssue,
  copyCheckedIssueKeys,
  clearCheckedIssues,
  isCreateModalOpen,
  createIssueType,
  createParentKey,
  issueTypeLocked,
  parentLocked,
  closeCreateModal,
  handleTicketCreated,
  isAddSpaceModalOpen,
  closeAddSpaceModal,
} = useTicketListContext()
</script>

<template>
  <div class="linear-shell flex h-screen overflow-hidden" :aria-busy="showInitialWorkspaceOverlay">
    <div
      class="relative shrink-0 transition-[width] duration-200"
      :style="{ width: `${effectiveSidebarWidth}px` }"
    >
      <Sidebar
        :tickets="tickets"
        :selected-key="selectedKey"
        :collapsed="sidebarCollapsed"
        :refreshing="refreshing"
        :current-view="currentView"
        :favorite-views="favoriteViewNavItems"
        :can-go-back="canGoBack"
        :can-go-forward="canGoForward"
        @back="goBack"
        @forward="goForward"
        @select="openTicket"
        @prefetch="prefetchTicket"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
        @refresh="handleRefresh"
        @home="handleViewChange('assistant')"
        @settings="openSettings"
        @command="openCommandMenu"
        @view="handleViewChange"
        @favorite-view="handleFavoriteViewChange"
        @favorite-count-visibility="setFavoriteViewIssueCountVisible"
        @add-space="openAddSpaceModal"
        @leave-space="handleLeaveSpace"
      />
      <div
        v-if="!sidebarCollapsed"
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
        class="absolute top-0 -right-4 z-10 h-full w-4 cursor-col-resize touch-none bg-transparent focus:outline-none [cursor:col-resize]"
        aria-label="Resize sidebar"
        @pointerdown="startSidebarResize"
      />
    </div>
    <main class="min-w-0 flex-1 overflow-hidden p-2">
      <div
        class="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.055] bg-issue-detail-bg"
      >
        <TicketListToolbarArea v-if="!selectedKey && !isTeamSettingsView && currentView !== 'assistant'" />
        <div v-if="selectedKey" class="scrollbar-gutter-stable min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          <TicketDetail
            :ticket-key="selectedKey"
            mode="inline"
            @close="closeTicket"
            @select="openTicket"
            @navigate-view="handleViewChange"
            @create-child="openChildCreate"
          />
        </div>
        <TeamSettingsView v-else-if="isTeamSettingsView && currentTeamKey" :space-key="currentTeamKey" />
        <TicketListAssistantHome v-else-if="currentView === 'assistant'" />
        <TicketListSearchView v-else-if="currentView === 'search'" />
        <TicketListInitiativesView
          v-else-if="currentView === 'initiatives'"
          :rows="initiativeRows"
          :grid-template="initiativeGridTemplate"
          :is-field-visible="isInitiativeRowFieldVisible"
          :get-health-class="getProjectHealthClass"
          :get-progress-bar-class="getProgressBarClass"
          :get-relative-time-label="getRelativeTimeLabel"
          @open="openTicket"
        /><TicketListProjectView
          v-else-if="isProjectDisplayView"
          :sections="projectSections"
          :visible-count="visibleProjectCount"
          :grouping="projectGrouping"
          :grid-template="projectGridTemplate"
          :is-field-visible="isProjectRowFieldVisible"
          :is-section-collapsed="isProjectSectionCollapsed"
          :get-health-class="getProjectHealthClass"
          :get-progress-bar-class="getProgressBarClass"
          @toggle-section="toggleProjectSection"
          @prefetch="prefetchTicket"
          @open="openTicket"
        /><TicketListSavedViewsView
          v-else-if="isViewsDirectory"
          :rows="displayedSavedViewRows"
          :grid-template="savedViewGridTemplate"
          :is-field-visible="isSavedViewRowFieldVisible"
          :get-relative-time-label="getRelativeTimeLabel"
          @open="handleViewChange"
        />
        <TicketListIssueSections
          v-else
          class="min-h-0 flex-1 overflow-y-auto"
          :sections="issueSections"
          :visible-count="visibleIssueCount"
          :hidden-completed-count="hiddenCompletedCount"
          :completed-range="completedRange"
          :focused-issue-key="focusedIssueKey"
          :checked-issue-key-set="checkedIssueKeySet"
          :row-display-props="issueRowDisplayProps"
          :show-headers="shouldShowIssueSectionHeader()"
          :get-row-key="getDisplayedIssueRowKey"
          :is-collapsed="isIssueSectionCollapsed"
          :is-status-grouping="listGrouping === 'status'"
          :get-status-category-for-group-label="getStatusCategoryForGroupLabel"
          empty-title="No issues match this view"
          empty-description="Adjust filters or create a new issue."
          @show-completed="completedRange = 'all'"
          @toggle-section="toggleIssueSection"
          @select="openTicket"
          @prefetch="prefetchTicket"
          @toggle-check="toggleCheckedIssue"
        />
      </div>
    </main>
    <TicketListCommandMenu
      v-model:query="commandQuery"
      :open="commandMenuOpen"
      :items="commandItems"
      :active-index="commandActiveIndex"
      @close="closeCommandMenu"
      @keydown="handleCommandMenuKeydown"
      @activate="commandActiveIndex = $event"
      @run="runCommandItem"
    /><TicketListSelectionBar
      :count="checkedIssueCount"
      :can-create-child="checkedIssueCount === 1 && Boolean(checkedIssues[0])"
      @open="openFirstCheckedIssue"
      @copy="copyCheckedIssueKeys"
      @create-child="checkedIssues[0] ? openChildCreate(checkedIssues[0].key) : undefined"
      @clear="clearCheckedIssues"
    /><CreateTicketModal
      :open="isCreateModalOpen"
      :tickets="tickets"
      :initial-issue-type="createIssueType"
      :initial-parent-key="createParentKey"
      :issue-type-locked="issueTypeLocked"
      :parent-locked="parentLocked"
      @close="closeCreateModal"
      @created="handleTicketCreated"
    /><AddSpaceModal :open="isAddSpaceModalOpen" @close="closeAddSpaceModal" />
    <div
      v-if="showInitialWorkspaceOverlay"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8"
      aria-live="polite"
    >
      <div
        class="linear-panel flex w-full max-w-sm items-center gap-3 rounded-lg bg-[#121316] px-4 py-3 shadow-xl shadow-black/35"
      >
        <div
          class="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/[0.12] border-t-[#d7d8dc]"
        />
        <div class="min-w-0 text-left">
          <h2 class="text-[13px] font-medium text-[#f0f1f4]">
            Connecting to Jira
          </h2>
          <p class="mt-0.5 truncate text-[12px] text-[#8f9198]">
            Pulling latest issues and workspace settings.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
