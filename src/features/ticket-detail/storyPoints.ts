import type { JiraTicket } from '@/types/jira'

type StoryPointsTicket = Pick<JiraTicket, 'issueType' | 'storyPoints' | 'storyPointsEditable'>

/** Standard-level work (story/bug/task/feature). Epics, initiatives, and sub-tasks cannot set points in this workspace. */
export function issueTypeSupportsStoryPoints(issueType: string): boolean {
  const normalized = issueType.trim().toLowerCase()
  if (!normalized)
    return false
  if (normalized.includes('epic') || normalized.includes('initiative') || normalized.includes('sub'))
    return false
  return true
}

function isStoryPointsEditable(
  ticket: Pick<JiraTicket, 'issueType' | 'storyPointsEditable'>,
  isLocalTicket: boolean,
): boolean {
  if (isLocalTicket)
    return false
  if (ticket.storyPointsEditable === false)
    return false
  if (ticket.storyPointsEditable === true)
    return true
  return issueTypeSupportsStoryPoints(ticket.issueType)
}

export function shouldShowStoryPointsProperty(
  ticket: StoryPointsTicket,
  isLocalTicket: boolean,
): boolean {
  if (ticket.storyPoints !== undefined)
    return true
  return isStoryPointsEditable(ticket, isLocalTicket)
}

export function canEditStoryPointsProperty(
  ticket: Pick<JiraTicket, 'issueType' | 'storyPointsEditable'>,
  isLocalTicket: boolean,
): boolean {
  return isStoryPointsEditable(ticket, isLocalTicket)
}

export function parseStoryPointsDraft(value: string): number | null | 'invalid' {
  const trimmed = value.trim()
  if (!trimmed)
    return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0)
    return 'invalid'

  return parsed
}

export function formatStoryPointsLabel(points: number): string {
  return `${points} ${points === 1 ? 'story point' : 'story points'}`
}
