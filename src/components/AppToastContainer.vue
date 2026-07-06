<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { removeToast, toasts } = useToast()

async function copyToastMessage(message: string): Promise<void> {
  await navigator.clipboard.writeText(message)
}
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1/95 text-slate-200 shadow-xl shadow-black/35 backdrop-blur"
      >
        <div class="flex min-w-0 items-center gap-3 px-3.5 py-2.5">
          <div
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            :class="toast.kind === 'success' ? 'bg-slate-400' : 'bg-rose-300/90'"
          />
          <p class="min-w-0 flex-1 text-[13px] leading-5 text-slate-300">
            {{ toast.message }}
          </p>
          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="toast.kind === 'error'"
              type="button"
              class="h-6 rounded-md px-2 text-[12px] text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
              aria-label="Copy notification message"
              @click="copyToastMessage(toast.message)"
            >
              Copy
            </button>
            <button
              type="button"
              class="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
              aria-label="Dismiss notification"
              @click="removeToast(toast.id)"
            >
              <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
