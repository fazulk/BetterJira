import { defineComponent, TransitionGroup } from 'vue'
import { useToast } from '@/composables/useToast'
import './AppToastContainer.css'

export default defineComponent({
  name: 'AppToastContainer',
  setup() {
    const { removeToast, toasts } = useToast()
    async function copyToastMessage(message: string): Promise<void> {
      await navigator.clipboard.writeText(message)
    }
    return () => (
      <div class="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-2">
        <TransitionGroup name="toast">
          {() => toasts.value.map(toast => (
            <div key={toast.id} class="pointer-events-auto overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1/95 text-slate-200 shadow-xl shadow-black/35 backdrop-blur">
              <div class="flex min-w-0 items-center gap-3 px-3.5 py-2.5">
                <div class={['h-1.5 w-1.5 shrink-0 rounded-full', toast.kind === 'success' ? 'bg-slate-400' : 'bg-rose-300/90']} />
                <p class="min-w-0 flex-1 text-[13px] leading-5 text-slate-300">{toast.message}</p>
                <div class="flex shrink-0 items-center gap-1">
                  {toast.kind === 'error' && (
                    <button
                      type="button"
                      class="h-6 rounded-md px-2 text-[12px] text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                      aria-label="Copy notification message"
                      onClick={() => copyToastMessage(toast.message)}
                    >
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                    aria-label="Dismiss notification"
                    onClick={() => removeToast(toast.id)}
                  >
                    <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                      <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </TransitionGroup>
      </div>
    )
  },
})
