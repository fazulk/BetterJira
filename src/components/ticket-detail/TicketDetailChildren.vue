<script setup lang="ts">
import type { JiraTicket } from '@/types/jira'
import StatusIcon from '@/components/StatusIcon.vue'

defineProps<{
  actionLabel: string
  childTickets: JiraTicket[]
  emptyLabel: string
  sectionLabel: string
  ticketKey: string
}>()

const emit = defineEmits<{
  create: [key: string]
  prefetch: [key: string]
  select: [key: string]
}>()
</script>

<template>
  <section class="mb-8">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-xs font-medium text-slate-400">
        {{ sectionLabel }}
      </h2>
      <button
        type="button"
        class="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
        @click="emit('create', ticketKey)"
      >
        {{ actionLabel }}
      </button>
    </div>
    <div v-if="childTickets.length" class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
      <button
        v-for="child in childTickets"
        :key="child.key"
        class="group flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 text-left last:border-b-0 hover:bg-white/[0.035]"
        @click="emit('select', child.key)"
        @mouseenter="emit('prefetch', child.key)"
      >
        <StatusIcon :status="child.status" :status-category="child.statusCategory" :size="16" />
        <span class="w-20 shrink-0 text-xs text-slate-500">{{ child.key }}</span>
        <span class="min-w-0 flex-1 truncate text-sm text-slate-300 group-hover:text-slate-100">{{ child.summary }}</span>
        <span class="w-14 shrink-0 text-right text-xs text-slate-500">
          {{ child.storyPoints !== undefined ? `${child.storyPoints} pts` : '–' }}
        </span>
        <span class="hidden shrink-0 text-xs text-slate-600 md:inline">{{ child.status }}</span>
      </button>
    </div>
    <div
      v-else
      class="flex min-h-12 w-full items-center rounded-lg border border-dashed border-white/[0.08] px-3 py-2 text-sm text-slate-600"
    >
      <span>{{ emptyLabel }}</span>
    </div>
  </section>
</template>
