import type { JiraCreateIssueType } from '@/types/jira'
import { getLinearIssueSubtype } from '@/types/jira'

export function getAllowedIssueTypesForParent(parentIssueType: string | null): JiraCreateIssueType[] {
  if (!parentIssueType) {
    return ['Story', 'Task', 'Bug', 'Feature']
  }

  const normalizedParentIssueType = parentIssueType.toLowerCase()
  if (normalizedParentIssueType.includes('initiative')) {
    return ['Epic']
  }

  if (normalizedParentIssueType.includes('epic')) {
    return ['Story', 'Task', 'Bug', 'Feature']
  }

  if (normalizedParentIssueType.includes('feature')) {
    return ['Task', 'Bug', 'Story']
  }

  if (normalizedParentIssueType.includes('story')) {
    return ['Story', 'Task', 'Bug']
  }

  if (normalizedParentIssueType.includes('task') || normalizedParentIssueType.includes('bug')) {
    return ['Task']
  }

  return []
}

export function getDefaultIssueType(
  parentIssueType: string | null,
  preferredIssueType?: JiraCreateIssueType,
): JiraCreateIssueType {
  const options = getAllowedIssueTypesForParent(parentIssueType)
  if (preferredIssueType && options.includes(preferredIssueType)) {
    return preferredIssueType
  }

  return options[0] ?? ''
}

export function canIssueTypeUseParent(childIssueType: string, parentIssueType: string): boolean {
  const normalizedChildIssueType = childIssueType.toLowerCase()
  const normalizedParentIssueType = parentIssueType.toLowerCase()

  if (normalizedChildIssueType.includes('epic')) {
    return normalizedParentIssueType.includes('initiative')
  }

  if (normalizedChildIssueType.includes('feature')) {
    return normalizedParentIssueType.includes('epic')
  }

  if (normalizedChildIssueType.includes('story') || normalizedChildIssueType.includes('bug')) {
    return normalizedParentIssueType.includes('epic') || normalizedParentIssueType.includes('story') || normalizedParentIssueType.includes('feature')
  }

  if (normalizedChildIssueType.includes('task')) {
    return (
      normalizedParentIssueType.includes('epic')
      || normalizedParentIssueType.includes('story')
      || normalizedParentIssueType.includes('feature')
      || normalizedParentIssueType.includes('task')
      || normalizedParentIssueType.includes('bug')
    )
  }

  return false
}

export function getCreateIssueTypeLabel(issueType: JiraCreateIssueType): string {
  return issueType.toLowerCase().includes('sub') ? issueType : getLinearIssueSubtype(issueType)
}
