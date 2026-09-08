import type { AssistantSkillSetting } from '~/shared/settings'
import { onClickOutside } from '@vueuse/core'
import { computed, defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { useAssistantSkills } from '@/composables/useAssistantSkills'

export default defineComponent({
  name: 'AssistantSkillPicker',
  props: {
    modelValue: {
      type: Array<string>,
      required: true,
    },
  },
  emits: {
    'update:modelValue': (value: string[]) => Array.isArray(value) && value.every(item => typeof item === 'string'),
  },
  setup(props, { emit }) {
    const { skills } = useAssistantSkills()
    const open = ref(false)
    const rootRef = ref<HTMLElement | null>(null)

    onClickOutside(rootRef, () => {
      open.value = false
    })

    const selectedSkills = computed<AssistantSkillSetting[]>(() =>
      skills.value.filter(skill => props.modelValue.includes(skill.id)),
    )

    function toggleSkill(skillId: string): void {
      emit('update:modelValue', props.modelValue.includes(skillId)
        ? props.modelValue.filter(id => id !== skillId)
        : [...props.modelValue, skillId])
    }

    return () => skills.value.length > 0 && (
      <div ref={rootRef} class="relative">
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"
            onClick={() => {
              open.value = !open.value
            }}
          >
            <Icon name="lucide:box" class="h-3.5 w-3.5" aria-hidden="true" />
            Skills
            <Icon name="lucide:chevron-down" class="h-3 w-3" aria-hidden="true" />
          </button>
          {selectedSkills.value.map(skill => (
            <button
              key={skill.id}
              type="button"
              class="group inline-flex max-w-[12rem] items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.05] px-1.5 py-1 text-xs text-slate-300 transition hover:border-white/[0.16]"
              title={`Remove ${skill.name}`}
              onClick={() => toggleSkill(skill.id)}
            >
              <Icon name="lucide:box" class="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
              <span class="truncate">{skill.name}</span>
              <Icon name="lucide:x" class="h-3 w-3 shrink-0 text-slate-600 transition group-hover:text-slate-300" aria-hidden="true" />
            </button>
          ))}
        </div>

        {open.value && (
          <div class="absolute bottom-full left-0 z-10 mb-1.5 max-h-52 w-56 overflow-y-auto rounded-md border border-white/[0.1] bg-[#1d1e23] py-1 shadow-xl shadow-black/40">
            {skills.value.map(skill => (
              <button
                key={skill.id}
                type="button"
                class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:bg-white/[0.05]"
                onClick={() => toggleSkill(skill.id)}
              >
                <span class="truncate">{skill.name}</span>
                {props.modelValue.includes(skill.id) && (
                  <Icon name="lucide:check" class="h-3.5 w-3.5 shrink-0 text-accent-indigo" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  },
})
