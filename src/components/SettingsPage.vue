<script setup lang="ts">
import SettingsAboutSection from '@/components/settings/SettingsAboutSection.vue'
import SettingsAssistantSection from '@/components/settings/SettingsAssistantSection.vue'
import SettingsTeamSections from '@/components/settings/SettingsTeamSections.vue'
import SettingsWorkspaceSection from '@/components/settings/SettingsWorkspaceSection.vue'
import { provideSettingsPageContext } from '@/features/settings/settingsPageContext'
import { useSettingsPageState } from '@/features/settings/useSettingsPageState'

const emit = defineEmits<{
  close: []
}>()

const settingsState = useSettingsPageState()
provideSettingsPageContext(settingsState)

const {
  activeSettingsSection,
  filteredSettingsNavigationGroups,
  settingsSearchQuery,
} = settingsState
</script>

<template>
  <div class="flex h-full flex-col animate-fade-in bg-surface-0">
    <div class="z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-surface-0/95 px-4 backdrop-blur">
      <button
        class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100"
        @click="emit('close')"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 18l-6-6 6-6" />
        </svg>
        Back to app
      </button>
      <div class="text-xs font-medium text-slate-300">
        Settings
      </div>
      <div class="w-20" />
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside class="overflow-y-auto border-b border-white/[0.06] px-4 py-5 lg:border-b-0 lg:border-r lg:border-white/[0.06]">
        <div class="mb-5 px-2">
          <h1 class="text-lg font-semibold text-slate-100">
            Settings
          </h1>
          <p class="mt-1 text-xs text-slate-500">
            LifeMD workspace
          </p>
        </div>
        <label class="mb-4 block px-2">
          <span class="sr-only">Search settings</span>
          <input
            v-model="settingsSearchQuery"
            type="search"
            name="settings-search"
            placeholder="Search settings"
            class="w-full rounded-md border border-white/[0.06] bg-white/[0.035] px-2.5 py-1.5 text-[12px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-white/[0.05]"
          >
        </label>
        <nav class="space-y-5">
          <section v-for="group in filteredSettingsNavigationGroups" :key="group.label">
            <h2 class="mb-1.5 px-2.5 text-[11px] font-medium text-slate-600">
              {{ group.label }}
            </h2>
            <div class="space-y-0.5">
              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition"
                :class="activeSettingsSection === item.id
                  ? 'bg-white/[0.06] text-slate-100'
                  : 'text-slate-500 hover:bg-white/[0.035] hover:text-slate-300'"
                @click="activeSettingsSection = item.id"
              >
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="activeSettingsSection === item.id ? 'bg-accent-indigo' : 'bg-slate-700'" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[13px] font-medium">{{ item.label }}</span>
                  <span class="mt-0.5 block truncate text-[11px] text-slate-600">{{ item.description }}</span>
                </span>
              </button>
            </div>
          </section>
          <p
            v-if="!filteredSettingsNavigationGroups.length"
            class="px-2.5 py-2 text-[12px] text-slate-600"
          >
            No settings found.
          </p>
        </nav>
      </aside>

      <main class="min-w-0 overflow-y-auto px-5 py-8 lg:px-10">
        <SettingsAssistantSection v-show="activeSettingsSection === 'assistant'" />
        <SettingsWorkspaceSection v-show="activeSettingsSection === 'workspace'" />
        <SettingsAboutSection v-show="activeSettingsSection === 'about'" />
        <SettingsTeamSections />
      </main>
    </div>
  </div>
</template>
