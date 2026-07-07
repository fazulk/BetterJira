import type { ComputedRef, Ref } from 'vue'
import type {
  ProjectClosedRange,
  ProjectGroupingFieldId,
  ProjectOrderingFieldId,
  ProjectRow,
  ProjectRowFieldId,
  ProjectSection,
  ViewFilterClause,
} from './types'
import type { CustomViewDisplay } from '~/shared/settings'
import { computed } from 'vue'
import {
  compareOptionalDates,
  getPriorityRank,
  getProjectGroupingLabel,
  getProjectGroupingRank,
  getProjectHealthRank,
  getTimeValue,
} from './helpers'
import {
  normalizeProjectClosedRange,
  normalizeProjectGroupingFieldId,
  normalizeProjectOrderingFieldId,
  normalizeProjectRowFields,
} from './viewDisplay'

interface UseProjectSectionsDeps {
  projectRows: ComputedRef<ProjectRow[]>
  currentTeamKey: ComputedRef<string | null>
  currentTeamSection: ComputedRef<string | null>
  currentView: Ref<string>
  projectGrouping: Ref<ProjectGroupingFieldId>
  projectOrdering: Ref<ProjectOrderingFieldId>
  projectClosedRange: Ref<ProjectClosedRange>
  collapsedProjectSectionIds: Ref<string[]>
  visibleProjectRowFields: Ref<ProjectRowFieldId[]>
  currentViewFilters: Ref<ViewFilterClause[]>
  applyViewFiltersToProjects: (projects: ProjectRow[]) => ProjectRow[]
  applyProjectClosedRange: (projects: ProjectRow[]) => ProjectRow[]
  getDefaultDisplayForView: (viewId: string) => CustomViewDisplay
  persistViewStateForView: (viewId: string, filters: ViewFilterClause[], display: CustomViewDisplay) => void
  captureDisplay: () => CustomViewDisplay
}

export function useProjectSections(deps: UseProjectSectionsDeps) {
  const baseDisplayedProjectRows = computed(() => {
    const key = deps.currentTeamKey.value
    if (deps.currentTeamSection.value !== 'projects' || !key) {
      return deps.projectRows.value
    }
    return deps.projectRows.value.filter(project => project.spaceKey === key)
  })
  const displayedProjectRows = computed(() =>
    sortProjectsByOrdering(
      deps.applyProjectClosedRange(deps.applyViewFiltersToProjects(baseDisplayedProjectRows.value)),
    ),
  )
  const projectSections = computed<ProjectSection[]>(() => {
    if (deps.projectGrouping.value === 'none') {
      return [
        {
          id: 'all',
          label:
            displayedProjectRows.value.length === 1
              ? '1 project'
              : `${displayedProjectRows.value.length} projects`,
          projects: displayedProjectRows.value,
        },
      ]
    }
    return groupProjects(displayedProjectRows.value, deps.projectGrouping.value)
  })
  const visibleProjectCount = computed(() =>
    projectSections.value.reduce((count, section) => count + section.projects.length, 0),
  )

  function sortProjectsByOrdering(projects: ProjectRow[]): ProjectRow[] {
    if (deps.projectOrdering.value === 'manual') {
      return projects
    }
    return [...projects].sort((left, right) => compareProjects(left, right, deps.projectOrdering.value))
  }
  function compareProjects(
    left: ProjectRow,
    right: ProjectRow,
    ordering: ProjectOrderingFieldId,
  ): number {
    if (ordering === 'name')
      return left.name.localeCompare(right.name)
    if (ordering === 'health')
      return getProjectHealthRank(left.health) - getProjectHealthRank(right.health)
    if (ordering === 'priority')
      return getPriorityRank(left.priority) - getPriorityRank(right.priority)
    if (ordering === 'lead')
      return left.lead.localeCompare(right.lead)
    if (ordering === 'targetDate')
      return compareOptionalDates(left.targetDateValue, right.targetDateValue)
    if (ordering === 'updated')
      return getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt)
    if (ordering === 'progress')
      return right.progress - left.progress
    return 0
  }
  function groupProjects(
    projects: ProjectRow[],
    grouping: ProjectGroupingFieldId,
  ): ProjectSection[] {
    const groups = new Map<string, ProjectRow[]>()
    for (const project of projects) {
      const label = getProjectGroupingLabel(project, grouping)
      groups.set(label, [...(groups.get(label) ?? []), project])
    }
    return [...groups.entries()]
      .map(([label, groupProjects]) => ({
        id: `${grouping}:${label}`,
        label,
        projects: groupProjects,
      }))
      .sort(
        (left, right) =>
          getProjectGroupingRank(left.label, grouping)
          - getProjectGroupingRank(right.label, grouping) || left.label.localeCompare(right.label),
      )
  }
  function resetProjectDisplayOptions() {
    const defaults = deps.getDefaultDisplayForView(deps.currentView.value)
    deps.projectGrouping.value = normalizeProjectGroupingFieldId(defaults.projectGrouping)
    deps.projectOrdering.value = normalizeProjectOrderingFieldId(defaults.projectOrdering)
    deps.projectClosedRange.value = normalizeProjectClosedRange(defaults.projectClosedRange)
    deps.collapsedProjectSectionIds.value = [...defaults.collapsedProjectSectionIds]
    deps.visibleProjectRowFields.value = normalizeProjectRowFields(defaults.visibleProjectRowFields)
    deps.persistViewStateForView(deps.currentView.value, deps.currentViewFilters.value, deps.captureDisplay())
  }
  function getProjectSectionCollapseId(section: ProjectSection): string {
    return `${deps.currentView.value}:${deps.projectGrouping.value}:${section.id}`
  }
  function isProjectSectionCollapsed(section: ProjectSection): boolean {
    if (deps.projectGrouping.value === 'none')
      return false
    return deps.collapsedProjectSectionIds.value.includes(getProjectSectionCollapseId(section))
  }
  function toggleProjectSection(section: ProjectSection): void {
    const sectionId = getProjectSectionCollapseId(section)
    deps.collapsedProjectSectionIds.value = isProjectSectionCollapsed(section)
      ? deps.collapsedProjectSectionIds.value.filter(id => id !== sectionId)
      : [...deps.collapsedProjectSectionIds.value, sectionId]
  }

  return {
    baseDisplayedProjectRows,
    displayedProjectRows,
    projectSections,
    visibleProjectCount,
    sortProjectsByOrdering,
    compareProjects,
    groupProjects,
    resetProjectDisplayOptions,
    getProjectSectionCollapseId,
    isProjectSectionCollapsed,
    toggleProjectSection,
  }
}
