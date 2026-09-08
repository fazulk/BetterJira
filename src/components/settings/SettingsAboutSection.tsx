import type { AppUpdateCheckResult } from '~/shared/appUpdate'
import { defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { version } from '../../../package.json'

const repoUrl = 'https://github.com/fazulk/better-jira'

export default defineComponent({
  name: 'SettingsAboutSection',
  setup() {
    const isDesktop = !!window.desktop
    const checking = ref(false)
    const checkResult = ref<AppUpdateCheckResult | null>(null)

    async function checkForUpdates(): Promise<void> {
      if (checking.value) {
        return
      }
      checking.value = true
      checkResult.value = null
      try {
        checkResult.value = await window.desktop!.checkForUpdates()
      }
      catch (err) {
        checkResult.value = { status: 'error', message: err instanceof Error ? err.message : String(err) }
      }
      finally {
        checking.value = false
      }
    }

    return () => (
      <section class="mx-auto max-w-3xl space-y-5">
        <div>
          <h2 class="text-xl font-semibold text-slate-100">About</h2>
          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p class="text-sm text-slate-500">
              Better Jira · v
              {version}
            </p>
            {isDesktop && (
              <button type="button" disabled={checking.value} class="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-60" onClick={checkForUpdates}>
                <Icon name="lucide:refresh-cw" class={['h-3 w-3', checking.value && 'animate-spin']} aria-hidden="true" />
                {checking.value ? 'Checking…' : 'Check for updates'}
              </button>
            )}
            {checkResult.value && (
              <p class={['text-xs', checkResult.value.status === 'error' ? 'text-rose-400' : 'text-slate-400']}>
                {checkResult.value.status === 'up-to-date' && 'You\'re on the latest version.'}
                {checkResult.value.status === 'update-available' && `v${checkResult.value.version} is downloading — you'll be prompted to restart when it's ready.`}
                {checkResult.value.status === 'error' && `Update check failed: ${checkResult.value.message}`}
              </p>
            )}
          </div>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-medium text-slate-200">Open source</h3>
              <p class="mt-0.5 text-xs text-slate-500">
                Better Jira is open source. Found a bug or have an idea? Issues and pull requests are very welcome.
              </p>
            </div>
            <a href={repoUrl} target="_blank" rel="noreferrer" class="flex shrink-0 items-center gap-2 rounded-md border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.05]">
              <Icon name="lucide:github" class="h-3.5 w-3.5" aria-hidden="true" />
              View on GitHub
            </a>
          </div>
          <div class="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-xs">
            <a href={`${repoUrl}/issues`} target="_blank" rel="noreferrer" class="block text-slate-400 underline decoration-white/20 underline-offset-2 transition hover:text-slate-200">
              Report an issue
            </a>
            <a href={`${repoUrl}/pulls`} target="_blank" rel="noreferrer" class="block text-slate-400 underline decoration-white/20 underline-offset-2 transition hover:text-slate-200">
              Open pull requests
            </a>
          </div>
        </div>
      </section>
    )
  },
})
