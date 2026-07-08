<script setup lang="ts">
defineProps<{
  isCreatePending: boolean
  selectedSpaceName: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
    <div class="flex min-w-0 items-center gap-2">
      <span class="truncate rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-300">
        {{ selectedSpaceName }}
      </span>
    </div>
    <button
      type="button"
      class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm text-slate-500 transition hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-slate-200"
      :disabled="isCreatePending"
      aria-label="Close"
      @click="emit('close')"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
      </svg>
    </button>
  </div>
</template>
