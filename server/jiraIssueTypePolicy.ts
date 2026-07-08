import type { JiraCreateIssueType, JiraCreateIssueTypeOption } from './jiraTypes'

export function isCreateIssueType(value: string): value is JiraCreateIssueType {
  return value.trim().length > 0
}

export function normalizeIssueType(value: string): string {
  return value.trim().toLowerCase()
}

export function matchesIssueType(value: string | undefined, expected: JiraCreateIssueType): boolean {
  return normalizeIssueType(value ?? '') === expected.toLowerCase()
}

function getAllowedChildIssueTypesForParent(parentIssueType: string): string[] {
  const normalizedParentIssueType = normalizeIssueType(parentIssueType)

  if (normalizedParentIssueType.includes('sub')) {
    return []
  }

  if (normalizedParentIssueType.includes('initiative')) {
    return ['Epic']
  }

  if (normalizedParentIssueType.includes('epic')) {
    return ['Task', 'Bug', 'Story', 'Feature']
  }

  if (normalizedParentIssueType.includes('feature')) {
    return ['Task', 'Bug', 'Story']
  }

  // Standard-level parents (story/task/bug sit at hierarchy level 0) can only
  // have subtask children — Jira rejects anything else with
  // "Given parent work item does not belong to appropriate hierarchy".
  if (
    normalizedParentIssueType.includes('story')
    || normalizedParentIssueType.includes('task')
    || normalizedParentIssueType.includes('bug')
  ) {
    return ['Subtask', 'Sub-task']
  }

  return []
}

export function isAllowedChildIssueTypeForParent(parentIssueType: string, childIssueType: string): boolean {
  const allowedChildIssueTypes = getAllowedChildIssueTypesForParent(parentIssueType)
  return allowedChildIssueTypes.some(candidate => matchesIssueType(childIssueType, candidate))
}

export function isAvailableChildIssueTypeForParent(
  parentIssueType: string,
  childIssueType: JiraCreateIssueTypeOption,
  issueTypeOptions: JiraCreateIssueTypeOption[],
): boolean {
  const parentIssueTypeOption = issueTypeOptions.find(candidate => matchesIssueType(candidate.name, parentIssueType))
  if (!parentIssueTypeOption) {
    return isAllowedChildIssueTypeForParent(parentIssueType, childIssueType.name)
  }

  if (parentIssueTypeOption.hierarchyLevel < 0) {
    return false
  }

  if (parentIssueTypeOption.hierarchyLevel === 0) {
    return childIssueType.subtask
  }

  return !childIssueType.subtask && childIssueType.hierarchyLevel === parentIssueTypeOption.hierarchyLevel - 1
}

/**
 * Filters a single project's creatable issue types down to those Jira accepts
 * as children of the given parent issue type. `issueTypeOptions` must be the
 * options of the parent's own project — that is the hierarchy Jira validates
 * against.
 */
export function getAvailableChildIssueTypeOptions(
  parentIssueType: string,
  issueTypeOptions: JiraCreateIssueTypeOption[],
): JiraCreateIssueTypeOption[] {
  return issueTypeOptions.filter(issueType => (
    issueType.parentSupported
    && isAvailableChildIssueTypeForParent(parentIssueType, issueType, issueTypeOptions)
  ))
}
