import type { AssistantSkillSetting } from './settingsTypes'

function normalizeTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAssistantSkillSetting(value: unknown): AssistantSkillSetting | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const recordValue: Record<string, unknown> = value
  const id = normalizeTrimmedString(recordValue.id)
  const name = normalizeTrimmedString(recordValue.name)
  const body = typeof recordValue.body === 'string' ? recordValue.body : ''

  if (!id || !name || !body.trim()) {
    return null
  }

  return {
    id,
    name,
    body,
    updatedAt: typeof recordValue.updatedAt === 'number' && Number.isFinite(recordValue.updatedAt)
      ? recordValue.updatedAt
      : 0,
  }
}

export function normalizeAssistantSkillSettings(value: unknown): AssistantSkillSetting[] {
  if (!Array.isArray(value)) {
    return []
  }

  const skillsById = new Map<string, AssistantSkillSetting>()

  for (const entry of value) {
    const skill = normalizeAssistantSkillSetting(entry)
    if (skill && !skillsById.has(skill.id)) {
      skillsById.set(skill.id, skill)
    }
  }

  return [...skillsById.values()]
}

export function reconcileAssistantSkills(skills: AssistantSkillSetting[]): AssistantSkillSetting[] {
  return normalizeAssistantSkillSettings(skills)
}
