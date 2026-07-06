<script setup lang="ts">
import type { AssistantProvider, AssistantReasoning } from '~/shared/assistant'
import type { AssistantSkillSetting } from '~/shared/settings'
import { computed, ref, watch } from 'vue'
import AssistantSkillModal from '@/components/settings/AssistantSkillModal.vue'
import { useAssistantSettings } from '@/composables/useAssistantSettings'
import { formatSkillUpdatedAt, useAssistantSkills } from '@/composables/useAssistantSkills'
import {
  ASSISTANT_REASONING_LEVELS,
  getAssistantProviderLabel,
  getAssistantReasoningLabel,
  isAssistantProvider,
  isAssistantReasoning,
} from '~/shared/assistant'

const {
  settings,
  providers,
  providerAvailability,
  acliAvailability,
  isProviderAvailable,
  isLoadingProviders,
  availableModels,
  defaultSystemPrompt,
  setProvider,
  setModel,
  setReasoning,
  setSystemPrompt,
} = useAssistantSettings()

const feedback = ref<string | null>(null)

const { skills, addSkill, updateSkill, removeSkill } = useAssistantSkills()
const skillModalOpen = ref(false)
const editingSkill = ref<AssistantSkillSetting | null>(null)

function openSkillModal(skill: AssistantSkillSetting | null): void {
  editingSkill.value = skill
  skillModalOpen.value = true
}

async function saveSkill(draft: { name: string, body: string }): Promise<void> {
  try {
    if (editingSkill.value) {
      await updateSkill(editingSkill.value.id, draft)
    }
    else {
      await addSkill(draft)
    }
    skillModalOpen.value = false
  }
  catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to save skill.'
  }
}

async function deleteSkill(): Promise<void> {
  if (!editingSkill.value) {
    return
  }
  try {
    await removeSkill(editingSkill.value.id)
    skillModalOpen.value = false
  }
  catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to delete skill.'
  }
}

const promptDraft = ref(settings.value.systemPrompt)
const promptFeedback = ref<{ kind: 'success' | 'error', message: string } | null>(null)
const isSavingPrompt = ref(false)

// Keep the draft in sync with the persisted value (it loads asynchronously and may be
// updated elsewhere). The persisted prompt only changes on save, so this won't clobber edits.
watch(() => settings.value.systemPrompt, (value) => {
  promptDraft.value = value
})

const isPromptDirty = computed(() => promptDraft.value !== settings.value.systemPrompt)
const isPromptDefault = computed(() => promptDraft.value.trim() === defaultSystemPrompt.trim())

async function savePrompt(): Promise<void> {
  isSavingPrompt.value = true
  try {
    await setSystemPrompt(promptDraft.value)
    promptFeedback.value = { kind: 'success', message: 'Saved assistant prompt.' }
  }
  catch (error) {
    promptFeedback.value = { kind: 'error', message: error instanceof Error ? error.message : 'Failed to save assistant prompt.' }
  }
  finally {
    isSavingPrompt.value = false
  }
}

async function resetPrompt(): Promise<void> {
  promptDraft.value = defaultSystemPrompt
  isSavingPrompt.value = true
  try {
    await setSystemPrompt(defaultSystemPrompt)
    promptFeedback.value = { kind: 'success', message: 'Restored the default prompt.' }
  }
  catch (error) {
    promptFeedback.value = { kind: 'error', message: error instanceof Error ? error.message : 'Failed to reset assistant prompt.' }
  }
  finally {
    isSavingPrompt.value = false
  }
}

function getAvailabilityDetail(provider: AssistantProvider): string {
  return providerAvailability.value.find(entry => entry.provider === provider)?.detail
    ?? `${getAssistantProviderLabel(provider)} CLI detection pending.`
}

const isAcliAvailable = computed(() => acliAvailability.value?.available ?? false)
const acliAvailabilityDetail = computed(() => acliAvailability.value?.detail ?? 'Atlassian CLI detection pending.')
const acliInstallInstructions = computed(() => acliAvailability.value?.installInstructions ?? [])

async function handleProviderChange(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLSelectElement) || !isAssistantProvider(event.target.value)) {
    return
  }
  try {
    await setProvider(event.target.value)
    feedback.value = null
  }
  catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to save assistant provider.'
  }
}

async function handleModelChange(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLSelectElement)) {
    return
  }
  try {
    await setModel(event.target.value)
    feedback.value = null
  }
  catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to save assistant model.'
  }
}

async function handleReasoningChange(reasoning: AssistantReasoning): Promise<void> {
  if (!isAssistantReasoning(reasoning)) {
    return
  }
  try {
    await setReasoning(reasoning)
    feedback.value = null
  }
  catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to save reasoning level.'
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-5">
    <div>
      <h2 class="text-xl font-semibold text-slate-100">
        Assistant
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        The "Ask" chat on a ticket proxies to a local CLI. It can read and modify tickets through the bundled Jira skill.
      </p>
    </div>

    <div class="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div class="grid gap-0 divide-y divide-white/[0.06] md:grid-cols-2 md:divide-x md:divide-y-0">
        <label class="block p-4">
          <span class="mb-2 block text-xs font-medium text-slate-500">Provider</span>
          <select
            :value="settings.provider"
            name="assistant-provider"
            class="w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-white/[0.16] focus:bg-white/[0.06]"
            @change="handleProviderChange"
          >
            <option v-for="provider in providers" :key="provider" :value="provider">
              Ask {{ getAssistantProviderLabel(provider) }}
            </option>
          </select>
        </label>

        <label class="block p-4">
          <span class="mb-2 block text-xs font-medium text-slate-500">Model</span>
          <select
            :value="settings.model"
            name="assistant-model"
            class="w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-white/[0.16] focus:bg-white/[0.06]"
            @change="handleModelChange"
          >
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <span class="mb-2 block text-xs font-medium text-slate-500">Reasoning effort</span>
      <div class="inline-flex rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
        <button
          v-for="level in ASSISTANT_REASONING_LEVELS"
          :key="level"
          type="button"
          class="rounded px-3 py-1.5 text-xs font-medium transition"
          :class="settings.reasoning === level
            ? 'bg-white/[0.08] text-slate-100'
            : 'text-slate-500 hover:text-slate-300'"
          @click="handleReasoningChange(level)"
        >
          {{ getAssistantReasoningLabel(level) }}
        </button>
      </div>
      <p class="mt-2 text-[11px] text-slate-600">
        Higher effort spends more time reasoning before responding.
      </p>
    </div>

    <div class="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-medium text-slate-200">
            System prompt
          </h3>
          <p class="mt-0.5 text-xs text-slate-500">
            Behaviour and tone for both the home chat and the per-ticket chat. The current ticket and the acli reference are added automatically.
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isSavingPrompt || (isPromptDefault && !isPromptDirty)"
          @click="resetPrompt"
        >
          Reset to default
        </button>
      </div>
      <textarea
        v-model="promptDraft"
        rows="7"
        spellcheck="false"
        class="w-full resize-y rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-200 outline-none transition focus:border-white/[0.16] focus:bg-white/[0.06]"
      />
      <div class="mt-3 flex items-center justify-between gap-3">
        <p v-if="promptFeedback" class="text-xs" :class="promptFeedback.kind === 'error' ? 'text-rose-300' : 'text-emerald-300'">
          {{ promptFeedback.message }}
        </p>
        <span v-else />
        <button
          type="button"
          class="shrink-0 rounded-md bg-accent-indigo px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-600"
          :disabled="isSavingPrompt || !isPromptDirty"
          @click="savePrompt"
        >
          {{ isSavingPrompt ? 'Saving…' : 'Save prompt' }}
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-slate-200">
        Skills
      </h3>
      <p class="mt-0.5 text-xs text-slate-500">
        Reusable prompts you can attach to a chat message from the composer.
      </p>
      <div class="mt-3 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div class="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <span class="text-sm text-slate-300">{{ skills.length }} {{ skills.length === 1 ? 'skill' : 'skills' }}</span>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
            aria-label="Add skill"
            title="Add skill"
            @click="openSkillModal(null)"
          >
            <Icon name="lucide:plus" class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p v-if="skills.length === 0" class="px-4 py-4 text-xs text-slate-600">
          No skills yet. Add one to reuse a prompt in the assistant chat.
        </p>
        <button
          v-for="skill in skills"
          :key="skill.id"
          type="button"
          class="block w-full border-b border-white/[0.04] px-4 py-3 text-left transition last:border-b-0 hover:bg-white/[0.03]"
          @click="openSkillModal(skill)"
        >
          <span class="block text-sm text-slate-200">{{ skill.name }}</span>
          <span v-if="skill.updatedAt" class="mt-0.5 block text-xs text-slate-600">{{ formatSkillUpdatedAt(skill.updatedAt) }}</span>
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-medium text-slate-200">
            CLI availability
          </h3>
          <p class="mt-0.5 text-xs text-slate-500">
            The assistant uses the same login as your interactive CLI session.
          </p>
        </div>
        <span v-if="isLoadingProviders" class="text-xs text-slate-500">Checking...</span>
      </div>
      <div class="grid gap-2 md:grid-cols-2">
        <div
          v-for="provider in providers"
          :key="provider"
          class="rounded-md border px-3 py-2 text-xs"
          :class="isProviderAvailable(provider)
            ? 'border-white/[0.08] bg-white/[0.035] text-slate-300'
            : 'border-white/[0.06] bg-white/[0.02] text-slate-500'"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-slate-200">Ask {{ getAssistantProviderLabel(provider) }}</span>
            <span class="text-[10px] uppercase tracking-[0.16em]">{{ isProviderAvailable(provider) ? 'Available' : 'Unavailable' }}</span>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed opacity-80">
            {{ getAvailabilityDetail(provider) }}
          </p>
        </div>
      </div>
      <div
        class="mt-2 rounded-md border px-3 py-2 text-xs"
        :class="isAcliAvailable
          ? 'border-white/[0.08] bg-white/[0.035] text-slate-300'
          : 'border-amber-400/20 bg-amber-500/10 text-amber-100'"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="font-medium" :class="isAcliAvailable ? 'text-slate-200' : 'text-amber-100'">Atlassian CLI (acli)</span>
          <span class="text-[10px] uppercase tracking-[0.16em]">{{ isAcliAvailable ? 'Available' : 'Unavailable' }}</span>
        </div>
        <p class="mt-1 text-[11px] leading-relaxed opacity-80">
          {{ acliAvailabilityDetail }}
        </p>
        <div v-if="!isAcliAvailable && acliInstallInstructions.length" class="mt-2 space-y-1 text-[11px] leading-relaxed">
          <p>Install and authenticate with:</p>
          <ol class="list-decimal space-y-1 pl-4">
            <li v-for="instruction in acliInstallInstructions" :key="instruction">
              <a
                v-if="instruction.startsWith('https://')"
                :href="instruction"
                target="_blank"
                rel="noreferrer"
                class="underline decoration-amber-200/40 underline-offset-2 hover:text-amber-50"
              >
                Atlassian CLI install guide
              </a>
              <code v-else class="rounded bg-black/20 px-1 py-0.5">{{ instruction }}</code>
            </li>
          </ol>
        </div>
      </div>
      <p class="mt-3 text-[11px] text-slate-600">
        Jira actions require the <code>acli</code> command-line tool to be installed and authenticated.
      </p>
      <p v-if="feedback" class="mt-3 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
        {{ feedback }}
      </p>
    </div>

    <AssistantSkillModal
      v-if="skillModalOpen"
      :key="editingSkill?.id ?? 'new'"
      :skill="editingSkill"
      @save="saveSkill"
      @delete="deleteSkill"
      @close="skillModalOpen = false"
    />
  </section>
</template>
