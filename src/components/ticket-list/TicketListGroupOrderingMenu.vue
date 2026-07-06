<script setup lang="ts">
import StatusIcon from '@/components/StatusIcon.vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'

const {
  groupOrderingOpen,
  closeGroupOrdering,
  resetCurrentIssueGroupOrdering,
  issueGroupOrderingRows,
  startIssueGroupDrag,
  dropIssueGroup,
  finishIssueGroupDrag,
  listGrouping,
  getStatusCategoryForGroupLabel,
  getIssueGroupMarkerClass,
  toggleIssueGroupVisibility,
} = useTicketListContext()
</script>

<template>
  <div v-if="groupOrderingOpen" class="overflow-hidden">
    <div class="flex h-11 items-center justify-between border-b border-white/[0.06] px-3">
      <button
        type="button"
        class="flex h-7 min-w-0 items-center gap-2 rounded-md pr-2 text-[13px] text-[#aeb0b7] hover:text-[#f0f1f4]"
        @click="closeGroupOrdering"
      >
        <span class="text-[16px] leading-none">‹</span>
        <span>Group ordering</span>
      </button>
      <button
        type="button"
        class="rounded px-1.5 py-1 text-[12px] text-[#aeb0b7] hover:bg-white/[0.05] hover:text-[#f0f1f4]"
        @click="resetCurrentIssueGroupOrdering"
      >
        Reset
      </button>
    </div>

    <div class="max-h-[22rem] overflow-y-auto py-2">
      <div v-if="issueGroupOrderingRows.length" class="space-y-0.5">
        <div
          v-for="row in issueGroupOrderingRows"
          :key="row.id"
          class="group flex h-8 items-center gap-2 px-3 text-[13px] transition"
          :class="row.visible ? 'text-[#d7d8dc]' : 'text-[#777a83]'"
          draggable="true"
          @dragstart="startIssueGroupDrag(row.id)"
          @dragover.prevent
          @drop="dropIssueGroup(row.id)"
          @dragend="finishIssueGroupDrag"
        >
          <span class="cursor-grab text-[14px] text-[#555861] active:cursor-grabbing">⁝⁝</span>
          <StatusIcon
            v-if="listGrouping === 'status'"
            :status="row.label"
            :status-category="getStatusCategoryForGroupLabel(row.label)"
            :size="16"
          />
          <span
            v-else
            class="h-3.5 w-3.5 shrink-0 rounded-full border"
            :class="getIssueGroupMarkerClass(row.label)"
          />
          <span class="min-w-0 flex-1 truncate">{{ row.label }}</span>
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-md text-[#aeb0b7] hover:bg-white/[0.06] hover:text-[#f0f1f4]"
            :aria-label="row.visible ? `Hide ${row.label}` : `Show ${row.label}`"
            @click="toggleIssueGroupVisibility(row.id)"
          >
            <svg
              v-if="row.visible"
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
                d="M1.75 8s2.25-4 6.25-4 6.25 4 6.25 4-2.25 4-6.25 4-6.25-4-6.25-4Z"
              />
              <circle cx="8" cy="8" r="1.75" />
            </svg>
            <svg
              v-else
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
                d="M2.5 2.5l11 11M6.2 6.2A2 2 0 0 0 8 10a2 2 0 0 0 1.8-1.1M4.7 4.9C2.8 6.1 1.75 8 1.75 8s2.25 4 6.25 4c1.1 0 2.05-.3 2.85-.72M7.2 4.04A6.7 6.7 0 0 1 8 4c4 0 6.25 4 6.25 4a9.02 9.02 0 0 1-1.55 1.88"
              />
            </svg>
          </button>
        </div>
      </div>
      <div v-else class="px-3 py-8 text-center text-[12px] text-[#777a83]">
        No groups to order
      </div>
    </div>
  </div>
</template>
