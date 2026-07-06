<script setup lang="ts">
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'

const {
  filterMenuOpen,
  selectedTicket,
  filterFieldSearchQuery,
  visibleFilterMenuEntries,
  activeFilterEntryId,
  toggleFilterClause,
  isFilterClauseSelected,
  isIssueDisplayView,
  completedRange,
  issueVisibilityRangeOptions,
  showSubIssues,
  showBacklogIssues,
  isProjectDisplayView,
  projectClosedRange,
  projectClosedRangeOptions,
  hasModifiedFilterOptions,
  clearCurrentViewFilters,
  dateFilterFields,
  activeDateFilterId,
  activeDateFilterOptions,
  projectPropertyFilterFields,
  activeProjectPropertyFilterId,
  activeFilterOptions,
  filterSearchQuery,
  activeFilterEntry,
  activeValueFilterFieldId,
} = useTicketListContext()
</script>

<template>
  <div
    v-if="filterMenuOpen && !selectedTicket"
    data-ticket-list-menu="filters"
    class="absolute right-10 top-10 z-30 flex max-h-[35rem] w-[34rem] overflow-hidden rounded-lg border border-white/[0.08] bg-[#15161a] shadow-xl shadow-black/40"
  >
    <div class="flex w-[15rem] shrink-0 flex-col border-r border-white/[0.06] py-1.5">
      <div class="px-2 pb-1">
        <input
          v-model="filterFieldSearchQuery"
          type="text"
          name="linear-filter-field-search"
          class="h-8 w-full rounded-md border border-white/[0.06] bg-black/20 px-2 text-[12px] text-[#d7d8dc] outline-none placeholder:text-[#6f727b] focus:border-white/[0.14]"
          placeholder="Add Filter..."
        >
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <button
          v-for="entry in visibleFilterMenuEntries"
          :key="entry.id"
          type="button"
          class="flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] transition"
          :class="
            activeFilterEntryId === entry.id
              ? 'bg-white/[0.08] text-[#f0f1f4]'
              : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]'
          "
          @mouseenter="activeFilterEntryId = entry.id"
          @focus="activeFilterEntryId = entry.id"
          @click="
            entry.id === 'shared'
              ? toggleFilterClause('shared', 'shared', 'Shared')
              : (activeFilterEntryId = entry.id)
          "
        >
          <span
            v-if="entry.id === 'shared'"
            class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition"
            :class="
              isFilterClauseSelected('shared', 'shared')
                ? 'border-[#4dbb83] bg-[#4dbb83] text-[#0d0e10]'
                : 'border-white/[0.18] text-transparent'
            "
          >✓</span>
          <span v-else class="w-4 shrink-0 text-center text-[#8f9198]">{{ entry.icon }}</span>
          <span class="min-w-0 flex-1 truncate">{{ entry.label }}</span>
          <span v-if="entry.hasSubmenu" class="text-[11px] text-[#777a83]">›</span>
        </button>
        <div
          v-if="visibleFilterMenuEntries.length === 0"
          class="px-3 py-8 text-center text-[12px] text-[#777a83]"
        >
          No matching filters
        </div>
      </div>

      <div v-if="isIssueDisplayView" class="border-t border-white/[0.06] px-3 py-2">
        <p class="mb-2 text-[12px] font-medium text-[#d7d8dc]">
          Issue inclusion
        </p>
        <label class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1.5">
          <span class="text-[12px] text-[#aeb0b7]">Completed issues</span>
          <select
            v-model="completedRange"
            name="filter-completed-issues-range"
            class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
          >
            <option
              v-for="option in issueVisibilityRangeOptions"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 rounded-md py-1.5 text-left transition hover:bg-white/[0.025]"
          role="switch"
          :aria-checked="showSubIssues"
          @click="showSubIssues = !showSubIssues"
        >
          <span class="text-[12px] text-[#aeb0b7]">Show sub-issues</span>
          <span
            class="flex h-4 w-7 items-center rounded-full border p-0.5 transition"
            :class="
              showSubIssues
                ? 'border-white/[0.14] bg-white/[0.08]'
                : 'border-white/[0.08] bg-white/[0.03]'
            "
          >
            <span
              class="h-2.5 w-2.5 rounded-full bg-[#f0f1f4] transition"
              :class="showSubIssues ? 'translate-x-3' : 'translate-x-0'"
            />
          </span>
        </button>

        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 rounded-md py-1.5 text-left transition hover:bg-white/[0.025]"
          role="switch"
          :aria-checked="showBacklogIssues"
          @click="showBacklogIssues = !showBacklogIssues"
        >
          <span class="text-[12px] text-[#aeb0b7]">Show backlog</span>
          <span
            class="flex h-4 w-7 items-center rounded-full border p-0.5 transition"
            :class="
              showBacklogIssues
                ? 'border-white/[0.14] bg-white/[0.08]'
                : 'border-white/[0.08] bg-white/[0.03]'
            "
          >
            <span
              class="h-2.5 w-2.5 rounded-full bg-[#f0f1f4] transition"
              :class="showBacklogIssues ? 'translate-x-3' : 'translate-x-0'"
            />
          </span>
        </button>
      </div>

      <div v-else-if="isProjectDisplayView" class="border-t border-white/[0.06] px-3 py-2">
        <p class="mb-2 text-[12px] font-medium text-[#d7d8dc]">
          Project inclusion
        </p>
        <label class="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1.5">
          <span class="text-[12px] text-[#aeb0b7]">Completed projects</span>
          <select
            v-model="projectClosedRange"
            name="filter-completed-projects-range"
            class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
          >
            <option v-for="option in projectClosedRangeOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="min-w-0 flex-1 py-1.5">
      <div
        class="mb-1 flex h-8 items-center justify-between gap-3 border-b border-white/[0.06] px-3 pb-1"
      >
        <span class="text-[12px] font-medium text-[#d7d8dc]">Filters</span>
        <button
          type="button"
          class="rounded px-1.5 py-1 text-[12px] text-[#aeb0b7] hover:bg-white/[0.05] hover:text-[#f0f1f4] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!hasModifiedFilterOptions"
          @click="clearCurrentViewFilters"
        >
          Reset
        </button>
      </div>

      <template v-if="activeFilterEntryId === 'dates'">
        <div class="border-b border-white/[0.06] px-2 pb-1">
          <button
            v-for="field in dateFilterFields"
            :key="field.id"
            type="button"
            class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]"
            :class="
              activeDateFilterId === field.id
                ? 'bg-white/[0.08] text-[#f0f1f4]'
                : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]'
            "
            @mouseenter="activeDateFilterId = field.id"
            @click="activeDateFilterId = field.id"
          >
            <span class="w-4 text-center text-[#8f9198]">{{ field.icon }}</span>
            <span class="flex-1 truncate">{{ field.label }}</span>
            <span class="text-[11px] text-[#777a83]">›</span>
          </button>
        </div>
        <div class="px-2 pt-1">
          <button
            v-for="option in activeDateFilterOptions"
            :key="option.value"
            type="button"
            role="checkbox"
            :aria-checked="isFilterClauseSelected(activeDateFilterId, option.value)"
            class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
            :class="
              isFilterClauseSelected(activeDateFilterId, option.value)
                ? 'bg-white/[0.08] text-[#f0f1f4]'
                : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]'
            "
            @click="toggleFilterClause(activeDateFilterId, option.value, option.label)"
          >
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition"
              :class="
                isFilterClauseSelected(activeDateFilterId, option.value)
                  ? 'border-[#4dbb83] bg-[#4dbb83] text-[#0d0e10]'
                  : 'border-white/[0.18] text-transparent'
              "
            >✓</span>
            <span class="w-4 text-center text-[#8f9198]">◷</span>
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            <span class="text-[11px] text-[#6f727b]">{{ option.count }}</span>
          </button>
        </div>
      </template>

      <template v-else-if="activeFilterEntryId === 'projectProperties'">
        <div class="border-b border-white/[0.06] px-2 pb-1">
          <button
            v-for="field in projectPropertyFilterFields"
            :key="field.id"
            type="button"
            class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]"
            :class="
              activeProjectPropertyFilterId === field.id
                ? 'bg-white/[0.08] text-[#f0f1f4]'
                : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]'
            "
            @mouseenter="activeProjectPropertyFilterId = field.id"
            @click="activeProjectPropertyFilterId = field.id"
          >
            <span class="w-4 text-center text-[#8f9198]">{{ field.icon }}</span>
            <span class="flex-1 truncate">{{ field.label }}</span>
            <span class="text-[11px] text-[#777a83]">›</span>
          </button>
        </div>
        <div class="px-2 pt-1">
          <button
            v-for="option in activeFilterOptions"
            :key="option.value"
            type="button"
            role="checkbox"
            :aria-checked="isFilterClauseSelected(activeProjectPropertyFilterId, option.value)"
            class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
            :class="
              isFilterClauseSelected(activeProjectPropertyFilterId, option.value)
                ? 'bg-white/[0.08] text-[#f0f1f4]'
                : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]'
            "
            @click="toggleFilterClause(activeProjectPropertyFilterId, option.value, option.label)"
          >
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition"
              :class="
                isFilterClauseSelected(activeProjectPropertyFilterId, option.value)
                  ? 'border-[#4dbb83] bg-[#4dbb83] text-[#0d0e10]'
                  : 'border-white/[0.18] text-transparent'
              "
            >✓</span>
            <span class="w-4 text-center text-[#8f9198]">{{ option.icon }}</span>
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            <span class="text-[11px] text-[#6f727b]">{{ option.count }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="px-2 pb-1">
          <input
            v-model="filterSearchQuery"
            type="text"
            name="linear-filter-search"
            class="h-8 w-full rounded-md border border-white/[0.06] bg-black/20 px-2 text-[12px] text-[#d7d8dc] outline-none placeholder:text-[#6f727b] focus:border-white/[0.14]"
            :placeholder="`Filter ${activeFilterEntry.label.toLowerCase()}...`"
          >
        </div>
        <div class="max-h-[30rem] overflow-y-auto px-2">
          <button
            v-for="option in activeFilterOptions"
            :key="option.value"
            type="button"
            role="checkbox"
            :aria-checked="isFilterClauseSelected(activeValueFilterFieldId, option.value)"
            class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition"
            :class="
              isFilterClauseSelected(activeValueFilterFieldId, option.value)
                ? 'bg-white/[0.08] text-[#f0f1f4]'
                : 'text-[#b9bbc3] hover:bg-white/[0.045] hover:text-[#f0f1f4]'
            "
            @click="toggleFilterClause(activeValueFilterFieldId, option.value, option.label)"
          >
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition"
              :class="
                isFilterClauseSelected(activeValueFilterFieldId, option.value)
                  ? 'border-[#4dbb83] bg-[#4dbb83] text-[#0d0e10]'
                  : 'border-white/[0.18] text-transparent'
              "
            >✓</span>
            <span class="w-4 shrink-0 text-center text-[#8f9198]">{{ option.icon }}</span>
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            <span class="text-[11px] text-[#6f727b]">{{ option.count }}</span>
          </button>
          <div
            v-if="activeFilterOptions.length === 0"
            class="px-3 py-8 text-center text-[12px] text-[#777a83]"
          >
            No matching options
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
