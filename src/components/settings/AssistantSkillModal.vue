<script setup lang="ts">
import type { AssistantSkillSetting } from '~/shared/settings'
import { computed, ref } from 'vue'

const props = defineProps<{
  /** Skill being edited, or null when creating a new one. */
  skill: AssistantSkillSetting | null
}>()

const emit = defineEmits<{
  save: [draft: { name: string, body: string }]
  delete: []
  close: []
}>()

const name = ref(props.skill?.name ?? '')
const body = ref(props.skill?.body ?? '')
const menuOpen = ref(false)

const canSave = computed(() => name.value.trim().length > 0 && body.value.trim().length > 0)

function save(): void {
  if (!canSave.value) {
    return
  }
  emit('save', { name: name.value, body: body.value })
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @mousedown.self="emit('close')">
      <div class="flex w-full max-w-2xl flex-col rounded-xl border border-white/[0.1] bg-[#16171b] p-5 shadow-2xl shadow-black/50">
        <div class="mb-4 flex items-start justify-between gap-3">
          <input
            v-model="name"
            type="text"
            name="skill-name"
            placeholder="Skill name"
            class="min-w-0 flex-1 bg-transparent text-xl font-semibold text-slate-100 outline-none placeholder:text-slate-600"
          >
          <div v-if="props.skill" class="relative shrink-0">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
              aria-label="Skill options"
              @click="menuOpen = !menuOpen"
            >
              <Icon name="lucide:ellipsis" class="h-4 w-4" aria-hidden="true" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute right-0 top-8 z-10 w-36 rounded-md border border-white/[0.1] bg-[#1d1e23] py-1 shadow-xl shadow-black/40"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-300 transition hover:bg-white/[0.05]"
                @click="emit('delete')"
              >
                <Icon name="lucide:trash-2" class="h-3.5 w-3.5" aria-hidden="true" />
                Delete skill
              </button>
            </div>
          </div>
        </div>

        <textarea
          v-model="body"
          rows="12"
          name="skill-body"
          spellcheck="false"
          placeholder="Write the prompt this skill injects (markdown supported)…"
          class="w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16]"
        />

        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-white/[0.1] px-4 py-1.5 text-sm text-slate-300 transition hover:bg-white/[0.05]"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-full bg-accent-indigo px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSave"
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
