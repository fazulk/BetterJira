import type { AssistantSkillSetting } from '~/shared/settings'
import { computed } from 'vue'
import { useSpaceSettings } from '@/composables/useSpaceSettings'

export interface AssistantSkillDraft {
  name: string
  body: string
}

function createSkillId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** CRUD over the user-defined assistant skills stored in app settings. */
export function useAssistantSkills() {
  const { settings, setAssistantSkills } = useSpaceSettings()

  const skills = computed<AssistantSkillSetting[]>(() =>
    [...settings.value.assistantSkills].sort((left, right) => right.updatedAt - left.updatedAt),
  )

  async function addSkill(draft: AssistantSkillDraft): Promise<void> {
    await setAssistantSkills([
      ...settings.value.assistantSkills,
      {
        id: createSkillId(),
        name: draft.name.trim(),
        body: draft.body,
        updatedAt: Date.now(),
      },
    ])
  }

  async function updateSkill(skillId: string, draft: AssistantSkillDraft): Promise<void> {
    await setAssistantSkills(settings.value.assistantSkills.map(skill => (
      skill.id === skillId
        ? { ...skill, name: draft.name.trim(), body: draft.body, updatedAt: Date.now() }
        : skill
    )))
  }

  async function removeSkill(skillId: string): Promise<void> {
    await setAssistantSkills(settings.value.assistantSkills.filter(skill => skill.id !== skillId))
  }

  return {
    skills,
    addSkill,
    updateSkill,
    removeSkill,
  }
}

export function formatSkillUpdatedAt(updatedAt: number): string {
  if (!updatedAt) {
    return ''
  }
  const elapsedMs = Date.now() - updatedAt
  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) {
    return 'Updated just now'
  }
  if (minutes < 60) {
    return `Updated ${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `Updated ${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `Updated ${days}d ago`
}
