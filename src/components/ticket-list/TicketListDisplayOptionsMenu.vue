<script setup lang="ts">
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import TicketListGroupOrderingMenu from './TicketListGroupOrderingMenu.vue'

const {
  displayOptionsOpen,
  selectedTicket,
  groupOrderingOpen,
  isIssueDisplayView,
  openGroupOrdering,
  listGrouping,
  issueGroupingOptions,
  listOrderingDirection,
  toggleOrderingDirection,
  listOrdering,
  issueOrderingOptions,
  issueRowFieldOptions,
  isIssueRowFieldVisible,
  visibleIssueRowFields,
  toggleIssueRowField,
  resetIssueDisplayOptions,
  isProjectDisplayView,
  projectGrouping,
  projectGroupingOptions,
  projectOrdering,
  projectOrderingOptions,
  visibleProjectRowFields,
  projectRowFieldOptions,
  isProjectRowFieldVisible,
  toggleProjectRowField,
  resetProjectDisplayOptions,
  isInitiativeDisplayView,
  visibleInitiativeRowFields,
  initiativeRowFieldOptions,
  isInitiativeRowFieldVisible,
  toggleInitiativeRowField,
  isViewsDirectory,
  visibleSavedViewRowFields,
  savedViewRowFieldOptions,
  isSavedViewRowFieldVisible,
  toggleSavedViewRowField,
} = useTicketListContext()
</script>

<template>
  <div
    v-if="displayOptionsOpen && !selectedTicket"
    data-ticket-list-menu="display-options"
    class="absolute right-0 top-10 z-20 w-[22rem] overflow-hidden rounded-lg border border-white/[0.08] bg-surface-2 shadow-xl shadow-black/35"
  >
    <TicketListGroupOrderingMenu v-if="groupOrderingOpen" />

    <div v-if="!groupOrderingOpen" class="space-y-0.5 p-2">
      <div class="rounded-md px-2 py-1.5">
        <div class="grid grid-cols-2 gap-1 rounded-md bg-black/20 p-0.5">
          <button
            type="button"
            class="rounded bg-white/[0.08] px-2 py-1 text-[12px] text-[#f0f1f4]"
          >
            List
          </button>
          <button type="button" class="rounded px-2 py-1 text-[12px] text-[#777a83]" disabled>
            Board
          </button>
        </div>
      </div>

      <template v-if="isIssueDisplayView">
        <label
          class="grid grid-cols-[7.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.025]"
        >
          <span class="text-[12px] text-[#8f9198]">Grouping</span>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-[#aeb0b7] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
            aria-label="Group ordering"
            title="Group ordering"
            @click.prevent="openGroupOrdering"
          >
            <svg
              class="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 12V4m0 0L2.75 6.25M5 4l2.25 2.25M11 4v8m0 0 2.25-2.25M11 12 8.75 9.75"
              />
            </svg>
          </button>
          <select
            v-model="listGrouping"
            name="issue-grouping"
            class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
          >
            <option v-for="option in issueGroupingOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label
          class="grid grid-cols-[7.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.025]"
        >
          <span class="text-[12px] text-[#8f9198]">Ordering</span>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-[#aeb0b7] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
            :aria-label="listOrderingDirection === 'asc' ? 'Order ascending' : 'Order descending'"
            :title="listOrderingDirection === 'asc' ? 'Order ascending' : 'Order descending'"
            @click.prevent="toggleOrderingDirection"
          >
            <svg
              class="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                v-if="listOrderingDirection === 'asc'"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.75 12V4m0 0L2.5 6.25M4.75 4 7 6.25M9 5h4.5M9 8h3.5M9 11h2"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.75 4v8m0 0L7 9.75M4.75 12 2.5 9.75M9 5h2M9 8h3.5M9 11h4.5"
              />
            </svg>
          </button>
          <select
            v-model="listOrdering"
            name="issue-ordering"
            class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
          >
            <option v-for="option in issueOrderingOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
      </template>
    </div>

    <div v-if="!groupOrderingOpen && isIssueDisplayView" class="border-t border-white/[0.06] p-3">
      <p class="mb-2 text-[12px] font-medium text-[#d7d8dc]">
        List options
      </p>
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-[12px] text-[#8f9198]">Display properties</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="field in issueRowFieldOptions"
          :key="field.id"
          type="button"
          class="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition"
          :class="
            isIssueRowFieldVisible(field.id)
              ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]'
              : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]'
          "
          :disabled="visibleIssueRowFields.length === 1 && isIssueRowFieldVisible(field.id)"
          :aria-pressed="isIssueRowFieldVisible(field.id)"
          @click="toggleIssueRowField(field.id)"
        >
          <span>{{ field.label }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="!groupOrderingOpen && isIssueDisplayView"
      class="flex items-center justify-end gap-4 border-t border-white/[0.06] px-3 py-2"
    >
      <button
        type="button"
        class="rounded px-1.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.05] hover:text-[#f0f1f4]"
        @click="resetIssueDisplayOptions"
      >
        Reset
      </button>
    </div>

    <div
      v-else-if="!groupOrderingOpen && isProjectDisplayView"
      class="border-t border-white/[0.06] p-3"
    >
      <div class="space-y-2 pb-3">
        <label class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1">
          <span class="text-[12px] text-[#8f9198]">Grouping</span>
          <select
            v-model="projectGrouping"
            name="project-grouping"
            class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
          >
            <option v-for="option in projectGroupingOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1">
          <span class="text-[12px] text-[#8f9198]">Ordering</span>
          <select
            v-model="projectOrdering"
            name="project-ordering"
            class="w-full rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-[12px] text-[#d7d8dc] outline-none focus:border-white/[0.16]"
          >
            <option v-for="option in projectOrderingOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-[12px] text-[#8f9198]">Visible properties</span>
        <span class="text-[11px] text-[#6f727b]">{{ visibleProjectRowFields.length }} shown</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="field in projectRowFieldOptions"
          :key="field.id"
          type="button"
          class="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition"
          :class="
            isProjectRowFieldVisible(field.id)
              ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]'
              : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]'
          "
          :disabled="visibleProjectRowFields.length === 1 && isProjectRowFieldVisible(field.id)"
          @click="toggleProjectRowField(field.id)"
        >
          <span
            class="flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]"
            :class="
              isProjectRowFieldVisible(field.id)
                ? 'border-white/[0.18] text-slate-200'
                : 'border-white/[0.1] text-transparent'
            "
          >
            ✓
          </span>
          <span>{{ field.label }}</span>
        </button>
      </div>
      <div class="mt-3 flex items-center justify-end border-t border-white/[0.06] pt-2">
        <button
          type="button"
          class="rounded px-1.5 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.05] hover:text-[#f0f1f4]"
          @click="resetProjectDisplayOptions"
        >
          Reset
        </button>
      </div>
    </div>

    <div
      v-else-if="!groupOrderingOpen && isInitiativeDisplayView"
      class="border-t border-white/[0.06] p-3"
    >
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-[12px] text-[#8f9198]">Visible properties</span>
        <span class="text-[11px] text-[#6f727b]">{{ visibleInitiativeRowFields.length }} shown</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="field in initiativeRowFieldOptions"
          :key="field.id"
          type="button"
          class="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition"
          :class="
            isInitiativeRowFieldVisible(field.id)
              ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]'
              : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]'
          "
          :disabled="
            visibleInitiativeRowFields.length === 1 && isInitiativeRowFieldVisible(field.id)
          "
          @click="toggleInitiativeRowField(field.id)"
        >
          <span
            class="flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]"
            :class="
              isInitiativeRowFieldVisible(field.id)
                ? 'border-white/[0.18] text-slate-200'
                : 'border-white/[0.1] text-transparent'
            "
          >
            ✓
          </span>
          <span>{{ field.label }}</span>
        </button>
      </div>
    </div>

    <div
      v-else-if="!groupOrderingOpen && isViewsDirectory"
      class="border-t border-white/[0.06] p-3"
    >
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-[12px] text-[#8f9198]">Visible properties</span>
        <span class="text-[11px] text-[#6f727b]">{{ visibleSavedViewRowFields.length }} shown</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="field in savedViewRowFieldOptions"
          :key="field.id"
          type="button"
          class="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition"
          :class="
            isSavedViewRowFieldVisible(field.id)
              ? 'border-white/[0.12] bg-white/[0.06] text-[#f0f1f4]'
              : 'border-white/[0.06] bg-white/[0.025] text-[#8f9198] hover:bg-white/[0.04] hover:text-[#d7d8dc]'
          "
          :disabled="visibleSavedViewRowFields.length === 1 && isSavedViewRowFieldVisible(field.id)"
          @click="toggleSavedViewRowField(field.id)"
        >
          <span
            class="flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]"
            :class="
              isSavedViewRowFieldVisible(field.id)
                ? 'border-white/[0.18] text-slate-200'
                : 'border-white/[0.1] text-transparent'
            "
          >
            ✓
          </span>
          <span>{{ field.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
