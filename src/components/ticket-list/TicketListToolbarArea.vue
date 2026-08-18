<script setup lang="ts">
import { ref } from 'vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import ViewEditorCard from '../ViewEditorCard.vue'
import ViewHeaderBreadcrumb from '../ViewHeaderBreadcrumb.vue'
import TicketListDisplayOptionsMenu from './TicketListDisplayOptionsMenu.vue'
import TicketListFilterMenu from './TicketListFilterMenu.vue'

const {
  selectedTicket,
  currentTeamAppearance,
  currentTeamName,
  currentTeamSectionLabel,
  viewTitle,
  currentView,
  initiativeRows,
  isViewsDirectory,
  displayedSavedViewRows,
  currentTeamKey,
  isCycleWorkingView,
  visibleIssueCount,
  currentViewIsFavoritable,
  isFavoriteView,
  toggleCurrentViewFavorite,
  refreshing,
  handleRefresh,
  hasModifiedFilterOptions,
  filterMenuOpen,
  toggleFilterMenu,
  displayOptionsOpen,
  toggleDisplayOptions,
  viewTabs,
  supportsCustomViews,
  handleViewTabClick,
  handleViewTabContextMenu,
  viewEditorMode,
  startCreateView,
  hasModifiedDisplayOptions,
  customViewContextMenu,
  editContextCustomView,
  deleteContextCustomView,
  viewEditorDraft,
  activeFilterChips,
  updateViewEditorName,
  updateViewEditorDescription,
  updateViewEditorIcon,
  updateViewEditorColor,
  openViewEditorFilters,
  openViewEditorSettings,
  removeActiveFilterChip,
  saveViewEditor,
  cancelViewEditor,
  openFilterMenu,
  activeViewIsCustomView,
  saveCurrentViewChangesToThisView,
  saveCurrentViewFilters,
  clearCurrentViewFilters,
} = useTicketListContext()

const saveMenuOpen = ref(false)

function toggleSaveMenu(): void {
  saveMenuOpen.value = !saveMenuOpen.value
}

function saveChangesToThisView(): void {
  saveCurrentViewChangesToThisView()
  saveMenuOpen.value = false
}

function createNewViewFromChanges(): void {
  saveCurrentViewFilters()
  saveMenuOpen.value = false
}

function clearCurrentViewChanges(): void {
  clearCurrentViewFilters()
  saveMenuOpen.value = false
}
</script>

<template>
  <header
    v-if="!selectedTicket"
    class="flex min-h-12 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-2"
  >
    <div class="min-w-0">
      <div class="flex min-w-0 items-center gap-2">
        <h1 class="min-w-0 truncate">
          <ViewHeaderBreadcrumb
            v-if="currentTeamAppearance"
            :icon="currentTeamAppearance.icon"
            :icon-color="currentTeamAppearance.color"
            :fallback="currentTeamAppearance.initial"
          >
            <span class="min-w-0 truncate">{{ currentTeamName }}</span>
            <span v-if="currentTeamSectionLabel" class="shrink-0 text-[#6f727b]">›</span>
            <span v-if="currentTeamSectionLabel" class="shrink-0 px-1 py-0.5">{{ currentTeamSectionLabel }}</span>
          </ViewHeaderBreadcrumb>
          <span v-else class="truncate text-[20px] font-semibold text-[#f0f1f4]">
            {{ viewTitle }}
          </span>
        </h1>
        <span v-if="currentView === 'initiatives'" class="shrink-0 text-[12px] text-[#777a83]">
          {{ initiativeRows.length }}
          {{ initiativeRows.length === 1 ? 'initiative' : 'initiatives' }}
        </span>
        <span v-else-if="isViewsDirectory" class="shrink-0 text-[12px] text-[#777a83]">
          {{ displayedSavedViewRows.length }}
          {{ displayedSavedViewRows.length === 1 ? 'view' : 'views' }}
        </span>
        <span
          v-else-if="currentView !== 'search' && !currentTeamKey"
          class="shrink-0 text-[12px] text-[#777a83]"
        >
          {{ visibleIssueCount }} {{ visibleIssueCount === 1 ? 'issue' : 'issues' }}
        </span>
        <button
          v-if="currentViewIsFavoritable"
          type="button"
          class="ml-1 flex h-6 w-6 shrink-0 self-center items-center justify-center rounded-md text-[#8f9198] transition hover:bg-white/[0.04] hover:text-[#f0f1f4]"
          :class="isFavoriteView(currentView) ? 'text-[#d7a543] hover:text-[#d7a543]' : ''"
          :aria-pressed="isFavoriteView(currentView)"
          :title="
            isFavoriteView(currentView) ? 'Remove view from favorites' : 'Add view to favorites'
          "
          @click="toggleCurrentViewFavorite"
        >
          <span class="text-[14px] leading-none">★</span>
        </button>
      </div>
    </div>

    <div class="relative z-20 flex shrink-0 items-center gap-1.5">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-md text-[#8f9198] transition hover:bg-white/[0.04] hover:text-[#f0f1f4] disabled:opacity-50"
          :disabled="refreshing"
          title="Refresh"
          @click="handleRefresh"
        >
          <Icon
            name="lucide:refresh-cw"
            class="h-4 w-4"
            :class="{ 'animate-spin': refreshing }"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="absolute top-12 right-0 flex items-center gap-1.5">
        <button
          v-if="false && !selectedTicket"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-md border text-[#8f9198] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
          :class="
            hasModifiedFilterOptions || filterMenuOpen
              ? 'border-white/[0.14] bg-white/[0.075] text-[#f0f1f4]'
              : 'border-white/[0.08] bg-white/[0.035]'
          "
          title="Filter"
          @click="toggleFilterMenu"
        >
          <Icon name="lucide:list-filter" class="h-4 w-4" aria-hidden="true" />
        </button>

        <TicketListFilterMenu v-if="filterMenuOpen && !selectedTicket" />

        <button
          v-if="false && !selectedTicket"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.035] text-[#8f9198] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
          title="Display options"
          @click="toggleDisplayOptions"
        >
          <Icon name="lucide:sliders-horizontal" class="h-4 w-4" aria-hidden="true" />
        </button>

        <TicketListDisplayOptionsMenu
          v-if="displayOptionsOpen && !selectedTicket"
        />
      </div>
    </div>
  </header>

  <div
    v-if="!selectedTicket && (viewTabs.length || supportsCustomViews || isCycleWorkingView)"
    class="flex h-10 shrink-0 items-center justify-between gap-3 px-3"
  >
    <div class="flex min-w-0 items-center gap-1">
      <button
        v-for="tab in viewTabs"
        :key="tab.id"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition"
        :class="[
          currentView === tab.id
            ? 'bg-white/[0.08] text-[#f0f1f4]'
            : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]',
          tab.draft ? 'border border-dashed border-white/[0.16]' : '',
        ]"
        @click="handleViewTabClick(tab)"
        @contextmenu.prevent="handleViewTabContextMenu(tab, $event)"
      >
        <Icon
          v-if="tab.custom"
          :name="`lucide:${tab.icon || 'layers'}`"
          class="h-3.5 w-3.5"
          :style="tab.color ? { color: tab.color } : undefined"
          aria-hidden="true"
        />
        <span>{{ tab.label }}</span>
        <Icon
          v-if="tab.draft"
          name="lucide:square-pen"
          class="h-3 w-3 text-[#777a83]"
          aria-hidden="true"
        />
      </button>

      <button
        v-if="supportsCustomViews"
        type="button"
        class="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-[#6f727b] transition hover:bg-white/[0.045] hover:text-[#d7d8dc] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="viewEditorMode !== null"
        title="Create view"
        @click="startCreateView"
      >
        <span class="relative h-3.5 w-3.5" aria-hidden="true">
          <Icon name="lucide:layers" class="h-3.5 w-3.5" />
          <span
            class="absolute -right-1 -bottom-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#0d0e10] text-[9px] font-medium leading-none text-current"
          >+</span>
        </span>
      </button>
    </div>

    <div class="flex shrink-0 items-center gap-1.5">
      <button
        data-ticket-list-menu="filters"
        type="button"
        class="relative flex h-8 w-8 items-center justify-center rounded-full border text-[#8f9198] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
        :class="
          hasModifiedFilterOptions || filterMenuOpen
            ? 'border-white/[0.14] bg-white/[0.075] text-[#f0f1f4]'
            : 'border-white/[0.08] bg-white/[0.035]'
        "
        title="Filter"
        @click="toggleFilterMenu"
      >
        <Icon name="lucide:list-filter" class="h-4 w-4" aria-hidden="true" />
        <span
          v-if="hasModifiedFilterOptions"
          class="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#4dbb83] ring-2 ring-[#0d0e10]"
          aria-hidden="true"
        />
      </button>

      <button
        data-ticket-list-menu="display-options"
        type="button"
        class="relative flex h-8 w-8 items-center justify-center rounded-full border text-[#8f9198] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
        :class="
          hasModifiedDisplayOptions || displayOptionsOpen
            ? 'border-white/[0.14] bg-white/[0.075] text-[#f0f1f4]'
            : 'border-white/[0.08] bg-white/[0.035]'
        "
        title="Display options"
        @click="toggleDisplayOptions"
      >
        <Icon name="lucide:sliders-horizontal" class="h-4 w-4" aria-hidden="true" />
        <span
          v-if="hasModifiedDisplayOptions"
          class="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#4dbb83] ring-2 ring-[#0d0e10]"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>

  <div
    v-if="customViewContextMenu.open"
    data-ticket-list-menu="custom-view-context"
    class="fixed z-50 w-36 overflow-hidden rounded-lg border border-white/[0.08] bg-[#15161a] py-1 shadow-xl shadow-black/40"
    :style="{ left: `${customViewContextMenu.x}px`, top: `${customViewContextMenu.y}px` }"
  >
    <button
      type="button"
      class="flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] text-[#d7d8dc] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
      @click="editContextCustomView"
    >
      <Icon name="lucide:square-pen" class="h-3.5 w-3.5 text-[#8f9198]" aria-hidden="true" />
      <span>Edit</span>
    </button>
    <button
      type="button"
      class="flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] text-[#e06c75] hover:bg-[#e06c75]/10 hover:text-[#ff8a93]"
      @click="deleteContextCustomView"
    >
      <Icon name="lucide:trash-2" class="h-3.5 w-3.5" aria-hidden="true" />
      <span>Delete</span>
    </button>
  </div>

  <ViewEditorCard
    v-if="!selectedTicket && viewEditorDraft"
    :name="viewEditorDraft.name"
    :description="viewEditorDraft.description"
    :icon="viewEditorDraft.icon"
    :color="viewEditorDraft.color"
    :save-disabled="viewEditorDraft.name.trim().length === 0"
    :active-filter-chips="activeFilterChips"
    @update:name="updateViewEditorName"
    @update:description="updateViewEditorDescription"
    @update:icon="updateViewEditorIcon"
    @update:color="updateViewEditorColor"
    @open-filters="openViewEditorFilters"
    @open-settings="openViewEditorSettings"
    @remove-filter="removeActiveFilterChip"
    @save="saveViewEditor"
    @cancel="cancelViewEditor"
  />

  <div
    v-if="!selectedTicket && hasModifiedFilterOptions"
    class="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.015] px-4 py-2"
  >
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      <span
        v-for="filter in activeFilterChips"
        :key="filter.id"
        class="inline-flex h-7 max-w-[18rem] items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.045] px-2 text-[12px] text-[#d7d8dc]"
      >
        <span class="truncate">{{ filter.fieldLabel }}</span>
        <span class="text-[#777a83]">is</span>
        <span class="truncate text-[#f0f1f4]">{{ filter.valueLabel }}</span>
        <button
          type="button"
          class="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-[#777a83] hover:bg-white/[0.08] hover:text-[#f0f1f4]"
          :aria-label="`Remove ${filter.fieldLabel} filter`"
          @click="removeActiveFilterChip(filter)"
        >
          ×
        </button>
      </span>

      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md text-[#8f9198] hover:bg-white/[0.05] hover:text-[#f0f1f4]"
        title="Add filter"
        @click="openFilterMenu"
      >
        +
      </button>
    </div>

    <div v-if="!viewEditorMode" class="relative flex shrink-0 items-center gap-2">
      <button
        type="button"
        class="rounded-md px-2 py-1 text-[12px] text-[#aeb0b7] hover:bg-white/[0.05] hover:text-[#f0f1f4]"
        @click="clearCurrentViewChanges"
      >
        Clear
      </button>
      <button
        v-if="!activeViewIsCustomView"
        type="button"
        class="rounded-md border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.07] hover:text-[#f0f1f4]"
        @click="createNewViewFromChanges"
      >
        Save
      </button>
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.07] hover:text-[#f0f1f4]"
        :aria-expanded="saveMenuOpen"
        @click="toggleSaveMenu"
      >
        <span>Save</span>
        <Icon name="lucide:chevron-down" class="h-3 w-3" aria-hidden="true" />
      </button>
      <div
        v-if="saveMenuOpen"
        class="absolute top-8 right-0 z-30 w-48 overflow-hidden rounded-lg border border-white/[0.08] bg-[#18191d] py-1 shadow-2xl shadow-black/40"
      >
        <button
          type="button"
          class="flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] text-[#d7d8dc] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
          @click="saveChangesToThisView"
        >
          <Icon name="lucide:layers" class="h-3.5 w-3.5 text-[#8f9198]" aria-hidden="true" />
          <span>Save to this view</span>
        </button>
        <button
          type="button"
          class="flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] text-[#d7d8dc] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
          @click="createNewViewFromChanges"
        >
          <Icon name="lucide:copy-plus" class="h-3.5 w-3.5 text-[#8f9198]" aria-hidden="true" />
          <span>Create new view…</span>
        </button>
      </div>
    </div>
  </div>
</template>
