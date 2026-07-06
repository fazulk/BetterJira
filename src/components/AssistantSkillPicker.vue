<script setup lang="ts">
import type { AssistantSkillSetting } from '~/shared/settings'
import { onClickOutside } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useAssistantSkills } from '@/composables/useAssistantSkills'

const selectedIds = defineModel<string[]>({ required: true })

const { skills } = useAssistantSkills()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
onClickOutside(rootRef, () => {
  open.value = false
})

const selectedSkills = computed<AssistantSkillSetting[]>(() =>
  skills.value.filter(skill => selectedIds.value.includes(skill.id)),
)

function toggleSkill(skillId: string): void {
  selectedIds.value = selectedIds.value.includes(skillId)
    ? selectedIds.value.filter(id => id !== skillId)
    : [...selectedIds.value, skillId]
}
</script>

<template>
  <div v-if="skills.length > 0" ref="rootRef" class="relative">
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"
        @click="open = !open"
      >
        <Icon name="lucide:box" class="h-3.5 w-3.5" aria-hidden="true" />
        Skills
        <Icon name="lucide:chevron-down" class="h-3 w-3" aria-hidden="true" />
      </button>
      <button
        v-for="skill in selectedSkills"
        :key="skill.id"
        type="button"
        class="group inline-flex max-w-[12rem] items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.05] px-1.5 py-1 text-xs text-slate-300 transition hover:border-white/[0.16]"
        :title="`Remove ${skill.name}`"
        @click="toggleSkill(skill.id)"
      >
        <Icon name="lucide:box" class="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
        <span class="truncate">{{ skill.name }}</span>
        <Icon name="lucide:x" class="h-3 w-3 shrink-0 text-slate-600 transition group-hover:text-slate-300" aria-hidden="true" />
      </button>
    </div>

    <div
      v-if="open"
      class="absolute bottom-full left-0 z-10 mb-1.5 max-h-52 w-56 overflow-y-auto rounded-md border border-white/[0.1] bg-[#1d1e23] py-1 shadow-xl shadow-black/40"
    >
      <button
        v-for="skill in skills"
        :key="skill.id"
        type="button"
        class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:bg-white/[0.05]"
        @click="toggleSkill(skill.id)"
      >
        <span class="truncate">{{ skill.name }}</span>
        <Icon
          v-if="selectedIds.includes(skill.id)"
          name="lucide:check"
          class="h-3.5 w-3.5 shrink-0 text-accent-indigo"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>
