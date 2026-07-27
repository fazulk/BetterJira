<script setup lang="ts">
import type { ProjectRow, ProjectRowFieldId, ProjectSection } from '@/features/ticket-list/types'
import { useProjectAppearances } from '@/composables/useProjectAppearances'

defineProps<{
  sections: ProjectSection[]
  visibleCount: number
  grouping: string
  gridTemplate: string
  isFieldVisible: (field: ProjectRowFieldId) => boolean
  isSectionCollapsed: (section: ProjectSection) => boolean
  getHealthClass: (health: ProjectRow['health']) => string
  getProgressBarClass: (health: ProjectRow['health']) => string
}>()

const emit = defineEmits<{
  toggleSection: [section: ProjectSection]
  prefetch: [key: string]
  open: [key: string]
}>()

const { getProjectAppearance } = useProjectAppearances()
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto">
    <div
      class="grid border-b border-white/[0.06] px-4 py-2 text-[12px] text-[#777a83]"
      :style="{ gridTemplateColumns: gridTemplate }"
    >
      <span>Name</span>
      <span v-if="isFieldVisible('health')">Health</span>
      <span v-if="isFieldVisible('priority')">Priority</span>
      <span v-if="isFieldVisible('lead')">Lead</span>
      <span v-if="isFieldVisible('targetDate')">Target date</span>
      <span v-if="isFieldVisible('issues')">Issues</span>
      <span v-if="isFieldVisible('status')">Status</span>
    </div>

    <div v-if="visibleCount > 0">
      <section v-for="section in sections" :key="section.id">
        <div
          v-if="grouping !== 'none'"
          class="flex h-8 items-center gap-2 border-b border-white/[0.06] bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-[#d7d8dc]"
            :aria-expanded="!isSectionCollapsed(section)"
            @click="emit('toggleSection', section)"
          >
            <Icon
              name="lucide:chevron-down"
              class="h-3 w-3 shrink-0 text-[#777a83] transition-transform"
              :class="isSectionCollapsed(section) ? '-rotate-90' : ''"
              aria-hidden="true"
            />
            <span class="truncate">{{ section.label }}</span>
            <span class="text-[#6f727b]">{{ section.projects.length }}</span>
          </button>
        </div>

        <template v-if="!isSectionCollapsed(section)">
          <button
            v-for="project in section.projects"
            :key="project.key"
            type="button"
            class="linear-row grid min-h-12 w-full items-center gap-0 px-4 py-2 text-left"
            :style="{ gridTemplateColumns: gridTemplate }"
            @mouseenter="emit('prefetch', project.key)"
            @click="emit('open', project.key)"
          >
            <span class="min-w-0 pr-4">
              <span class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#e6e7ea]">
                <Icon
                  :name="`lucide:${getProjectAppearance(project.key).icon}`"
                  class="h-3.5 w-3.5 shrink-0"
                  :style="{ color: getProjectAppearance(project.key).color }"
                  aria-hidden="true"
                />
                <span class="truncate">{{ project.name }}</span>
              </span>
              <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{{ project.key }} · {{ project.spaceName }}</span>
            </span>

            <span v-if="isFieldVisible('health')">
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                :class="getHealthClass(project.health)"
              >
                {{ project.health }}
              </span>
            </span>

            <span v-if="isFieldVisible('priority')" class="truncate text-[12px] text-[#aeb0b7]">{{
              project.priority
            }}</span>
            <span v-if="isFieldVisible('lead')" class="truncate pr-4 text-[12px] text-[#aeb0b7]">{{
              project.lead
            }}</span>
            <span v-if="isFieldVisible('targetDate')" class="truncate text-[12px] text-[#8f9198]">{{
              project.targetDate
            }}</span>

            <span v-if="isFieldVisible('issues')" class="pr-5">
              <span class="flex items-center justify-between gap-2 text-[11px] text-[#8f9198]">
                <span>{{ project.completedCount }}/{{ project.issueCount }}</span>
                <span>{{ project.progress }}%</span>
              </span>
              <span class="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  class="block h-full rounded-full"
                  :class="getProgressBarClass(project.health)"
                  :style="{ width: `${project.progress}%` }"
                />
              </span>
            </span>

            <span v-if="isFieldVisible('status')" class="truncate text-[12px] text-[#aeb0b7]">{{
              project.status
            }}</span>
          </button>
        </template>
      </section>
    </div>

    <div v-else class="flex h-full min-h-80 items-center justify-center px-6 text-center">
      <div class="max-w-sm">
        <p class="text-[13px] font-medium text-[#d7d8dc]">
          No projects found
        </p>
        <p class="mt-1 text-[12px] text-[#777a83]">
          Projects will appear here when enabled teams have project-level work.
        </p>
      </div>
    </div>
  </div>
</template>
