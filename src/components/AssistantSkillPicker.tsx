import type { AssistantSkillSetting } from '~/shared/settings'
import * as stylex from '@stylexjs/stylex'
import { onClickOutside } from '@vueuse/core'
import { computed, defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { useAssistantSkills } from '@/composables/useAssistantSkills'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { position: 'relative' },
  selectedList: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' },
  pickerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    borderRadius: '0.375rem',
    paddingInline: '0.375rem',
    paddingBlock: '0.25rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-300'] },
    backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' },
    transitionProperty: 'color, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  pickerIcon: { width: '0.875rem', height: '0.875rem' },
  chevron: { width: '0.75rem', height: '0.75rem' },
  skillButton: { display: 'inline-flex', maxWidth: '12rem', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.1)', ':hover': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingInline: '0.375rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-300'], transitionProperty: 'border-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  skillIcon: { width: '0.75rem', height: '0.75rem', flexShrink: 0, color: colors['--color-slate-500'] },
  skillName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeIcon: { width: '0.75rem', height: '0.75rem', flexShrink: 0, color: { default: colors['--color-slate-600'], [stylex.when.ancestor(':hover')]: colors['--color-slate-300'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  menu: { position: 'absolute', bottom: '100%', left: 0, zIndex: 10, marginBottom: '0.375rem', maxHeight: '13rem', width: '14rem', overflowY: 'auto', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: '#1d1e23', paddingBlock: '0.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' },
  menuOption: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingInline: '0.75rem', paddingBlock: '0.375rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-300'], backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  checkIcon: { width: '0.875rem', height: '0.875rem', flexShrink: 0, color: colors['--color-accent-indigo'] },
})

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
      <div ref={rootRef} {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.selectedList)}>
          <button
            type="button"
            {...stylex.attrs(styles.pickerButton)}
            onClick={() => {
              open.value = !open.value
            }}
          >
            <Icon name="lucide:box" {...stylex.attrs(styles.pickerIcon)} aria-hidden="true" />
            Skills
            <Icon name="lucide:chevron-down" {...stylex.attrs(styles.chevron)} aria-hidden="true" />
          </button>
          {selectedSkills.value.map(skill => (
            <button
              key={skill.id}
              type="button"
              {...stylex.attrs(styles.skillButton, stylex.defaultMarker())}
              title={`Remove ${skill.name}`}
              onClick={() => toggleSkill(skill.id)}
            >
              <Icon name="lucide:box" {...stylex.attrs(styles.skillIcon)} aria-hidden="true" />
              <span {...stylex.attrs(styles.skillName)}>{skill.name}</span>
              <Icon name="lucide:x" {...stylex.attrs(styles.removeIcon)} aria-hidden="true" />
            </button>
          ))}
        </div>

        {open.value && (
          <div {...stylex.attrs(styles.menu)}>
            {skills.value.map(skill => (
              <button
                key={skill.id}
                type="button"
                {...stylex.attrs(styles.menuOption)}
                onClick={() => toggleSkill(skill.id)}
              >
                <span {...stylex.attrs(styles.skillName)}>{skill.name}</span>
                {props.modelValue.includes(skill.id) && (
                  <Icon name="lucide:check" {...stylex.attrs(styles.checkIcon)} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  },
})
