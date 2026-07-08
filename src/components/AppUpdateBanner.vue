<script setup lang="ts">
import { computed } from 'vue'
import { useAppUpdate } from '@/composables/useAppUpdate'

const { applyUpdate, dismiss, update } = useAppUpdate()

const actionLabel = computed(() =>
  update.value?.kind === 'ready' ? 'Restart to update' : 'Download from GitHub',
)
</script>

<template>
  <Transition name="update-banner">
    <div
      v-if="update"
      class="fixed bottom-4 left-4 z-[90] overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1/95 text-slate-200 shadow-xl shadow-black/35 backdrop-blur"
    >
      <div class="flex min-w-0 items-center gap-3 px-3.5 py-2.5">
        <div class="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300/90" />
        <p class="min-w-0 text-[13px] leading-5 text-slate-300">
          BetterJira {{ update.version }} is available
        </p>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="h-6 rounded-md px-2 text-[12px] text-sky-300/90 transition hover:bg-white/[0.05] hover:text-sky-200"
            @click="applyUpdate"
          >
            {{ actionLabel }}
          </button>
          <button
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
            aria-label="Dismiss update notification"
            @click="dismiss"
          >
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-banner-enter-active,
.update-banner-leave-active {
  transition: all 180ms ease;
}

.update-banner-enter-from,
.update-banner-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
