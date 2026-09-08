import type { HardcodedCreateFieldDefinition } from './types'

export type CreatePriorityTone = 'highest' | 'high' | 'medium' | 'low' | 'lowest' | 'fallback'
export type CreateAvatarTone = 'neutralStrong' | 'neutralMuted' | 'surface' | 'fallback'

export const priorityConfig: Record<string, { tone: CreatePriorityTone }> = {
  Highest: { tone: 'highest' },
  High: { tone: 'high' },
  Medium: { tone: 'medium' },
  Low: { tone: 'low' },
  Lowest: { tone: 'lowest' },
}

export const avatarTones: CreateAvatarTone[] = [
  'neutralStrong',
  'neutralMuted',
  'surface',
]

export const HARDCODED_CREATE_FIELDS: HardcodedCreateFieldDefinition[] = [
  { key: 'summary', label: 'Title', required: true, type: 'text', defaultValue: '' },
  { key: 'description', label: 'Description', required: false, type: 'textarea', defaultValue: '' },
  { key: 'priority', label: 'Priority', required: false, type: 'single-select', defaultValue: '' },
  { key: 'assignee', label: 'Assignee', required: false, type: 'single-select', defaultValue: '' },
  { key: 'duedate', label: 'Due Date', required: false, type: 'date', defaultValue: '' },
]
