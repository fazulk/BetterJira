<script setup lang="ts">
import type { IssueRowDisplayProps, IssueSection } from '@/features/ticket-list/types'
import type { JiraTicket } from '@/types/jira'
import IssueRow from '@/components/IssueRow.vue'
import StatusIcon from '@/components/StatusIcon.vue'
import { useProjectAppearances } from '@/composables/useProjectAppearances'

defineProps<{
  sections: IssueSection[]
  visibleCount: number
  hiddenCompletedCount: number
  completedRange: string
  focusedIssueKey: string | null
  checkedIssueKeySet: Set<string>
  rowDisplayProps: IssueRowDisplayProps
  emptyTitle: string
  emptyDescription: string
  showHeaders: boolean
  getRowKey: (ticket: JiraTicket) => string
  isCollapsed: (section: IssueSection) => boolean
  isStatusGrouping?: boolean
  getStatusCategoryForGroupLabel?: (label: string) => string
}>()

const emit = defineEmits<{
  showCompleted: []
  toggleSection: [section: IssueSection]
  select: [key: string]
  prefetch: [key: string]
  toggleCheck: [key: string]
}>()

const { getTicketProjectAppearance } = useProjectAppearances()
</script>

<template>
  <div class="min-w-0 overflow-y-auto">
    <!-- <div
      v-if="hiddenCompletedCount > 0 && completedRange !== 'all'"
      class="flex h-9 items-center justify-end border-b border-white/[0.06] px-4 text-[12px] text-[#777a83]"
    >
      <button type="button" class="hover:text-[#d7d8dc]" @click="emit('showCompleted')">
        {{ hiddenCompletedCount }} completed hidden by filter options
      </button>
    </div> -->

    <div v-if="sections.length && visibleCount > 0">
      <section v-for="section in sections" :key="section.id">
        <div
          v-if="showHeaders"
          class="flex h-8 items-center gap-2 border-b border-white/[0.06] bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[#d7d8dc]"
            :aria-expanded="!isCollapsed(section)"
            @click="emit('toggleSection', section)"
          >
            <Icon
              name="lucide:chevron-down"
              class="h-3 w-3 shrink-0 text-[#777a83] transition-transform"
              :class="isCollapsed(section) ? '-rotate-90' : ''"
              aria-hidden="true"
            />
            <StatusIcon
              v-if="isStatusGrouping && getStatusCategoryForGroupLabel"
              :status="section.label"
              :status-category="getStatusCategoryForGroupLabel(section.label)"
              :size="16"
            />
            <span class="truncate">{{ section.label }}</span>
            <span class="text-[#6f727b]">{{ section.tickets.length }}</span>
          </button>
        </div>
        <template v-if="!isCollapsed(section)">
          <IssueRow
            v-for="ticket in section.tickets"
            :key="getRowKey(ticket)"
            :ticket="ticket"
            :selected="focusedIssueKey === getRowKey(ticket)"
            :checked="checkedIssueKeySet.has(getRowKey(ticket))"
            :project-appearance="getTicketProjectAppearance(ticket)"
            v-bind="rowDisplayProps"
            @select="emit('select', $event)"
            @prefetch="emit('prefetch', $event)"
            @toggle-check="emit('toggleCheck', $event)"
          />
        </template>
      </section>
    </div>

    <div v-else class="flex h-full min-h-80 items-center justify-center px-6 text-center">
      <div class="max-w-sm">
        <p class="text-[13px] font-medium text-[#d7d8dc]">
          {{ emptyTitle }}
        </p>
        <p class="mt-1 text-[12px] text-[#777a83]">
          {{ emptyDescription }}
        </p>
      </div>
    </div>
  </div>
</template>
