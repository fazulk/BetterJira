# Phase 8 — Controller spillover: filter menu, project sections, search, view context

Status of the input: `src/features/ticket-list/useTicketListController.ts` is
**1,714 lines** after Phase 7 (commit `ecd82f2`; started Phase 7 at 2,691).
Phase 7 extracted grouping, visibility, custom-view directory, favorites, the
view editor, and navigation, but stalled above the <1,000-line target. What
remains is orchestration plus four coherent clusters — the filter
menu/application stack (~340 lines, the designated WP-9 spillover from
Phase 7), the project display pipeline (~110), the search pipeline (~70), and
the view-identity computeds (~180) — plus fixed overhead (imports ~130,
return object ~185, keyboard dispatcher ~135).

Line numbers below reference the controller at commit `ecd82f2` and drift as
WPs land — always re-locate by symbol name, never by raw line.

## Ground rules (unchanged from Phases 6–7, non-negotiable)

1. **Single writer.** Every WP rewrites the controller. No parallel agents may
   touch `useTicketListController.ts`. Run WPs strictly in order.
2. **No `any`. No `as` casts except `as const`.**
3. **Behavior-preserving.** Bodies move verbatim modulo `x.value` →
   parameter/ctx substitutions. Any intentional delta must be recorded in
   `docs/refactor-plan.md` under accepted deltas.
4. **The gate**, after every WP, in this order:
   ```
   bunx eslint . --fix        # then confirm clean
   bun run typecheck          # MUST re-run after eslint --fix
   bunx vitest run            # 227+ tests, all green
   ```
5. **Commit per WP** with a `refactor(ticket-list): …` message describing the
   boundary, deps count, and controller line delta.
6. **Reviewer pass** (subagent or manual) after WP-9b and WP-13 — diff moved
   bodies against pre-move, verify adapter bindings, and check the two
   recurring hazard classes (watch registration order, function-declaration
   hoisting — see the Phase 7 doc for the full description).

## Composable initialization order (plan this before editing)

Phase 7's biggest friction was `no-use-before-define` fights caused by
composable calls landing after their consumers. The filter functions
(`applyViewFiltersTo*`, `ticketMatchesFilter`, `projectMatchesFilter`) are
hoisted function declarations today, consumed by `useCustomViewDirectory`
(~487) and `useFavoriteViews` (~806) *above* their definitions (~1064+).
Converting them to composable returns forces this final order:

```
useViewStatePersistence        (existing, ~219)
useTicketVisibility            (existing, ~402)
useViewFilters                 (WP-9a — before directory & favorites)
useProjectSections             (WP-10 — before filter menu; needs applyViewFiltersToProjects)
useCustomViewDirectory         (existing — needs matchers from WP-9a)
scopedTickets + useTicketSearch (WP-11 — before grouping; needs WP-9a)
useFilterMenu                  (WP-9b — needs WP-9a/WP-10/directory rows + scopedTickets)
useIssueGrouping               (existing — needs searchedTickets from WP-11)
useFavoriteViews               (existing)
useIssueSelection              (existing)
useViewEditor                  (existing — needs openFilterMenu from WP-9b)
useTicketNavigation            (existing)
useCommandMenu                 (existing)
```

Two known cross-references to resolve with a controller-level shim (not a
lazy-handle abstraction):

- `saveCurrentViewFilters` (WP-9b cluster) calls `startCreateView` (editor,
  initialized later). Keep `saveCurrentViewFilters` in the controller as a
  3-line wrapper; everything else moves.
- `watch(selectedKey, …)` (~849) calls `closeFilterMenu` — it stays in the
  controller and WP-9b's return must be destructured before it. It currently
  registers after the directory/grouping composables; verify no watcher on
  `selectedKey` changes relative order (hazard class 1).

---

## WP-0: characterization tests (carried over from Phase 7, do this first)

Phase 7 shipped without the planned tests. Lock behavior before moving more
code:

- `tests/issue-grouping.test.ts` — `sortTickets` per ordering field and
  direction, `groupTickets` per grouping field, group-order override and
  hidden-group behavior, status-group label comparison, section collapse-id
  grammar (`${view}:${grouping}:${sectionId}`). The composable takes a typed
  deps object of refs — construct it directly with `ref()`/`computed()`.
- `tests/ticket-visibility.test.ts` — date-range windows in
  `isDateVisibleInRange` (each `IssueVisibilityRange` value), sub-issue
  hiding with visible parents, query matching fields.

## WP-9a: `useViewFilters` — filter application + clause CRUD (~170 lines)

The engine-adapter half of the filter cluster. Must land before WP-9b and be
called before `useCustomViewDirectory`.

**Moves** (locate by name):
- `getTicketFilterContext` (1064), `applyViewFiltersToTickets`,
  `ticketMatchesFilter`, `applyViewFiltersToProjects`,
  `projectMatchesFilter`, `applyProjectClosedRange`,
  `applyViewFiltersToInitiatives`, `applyViewFiltersToSavedViews`
- Clause CRUD: `setActiveCustomViewFilters`, `getFilterClause`,
  `isFilterClauseSelected`, `toggleFilterClause` (1161),
  `removeFilterClause`, `clearCurrentViewFilters` (1203)

**Deps:** `currentViewFilters`, `currentView`, `viewEditorDraft`,
`persistViewStateForView`, `captureDisplay`, `getDefaultDisplayForView`,
`applyDisplay`, `withViewDisplaySyncSuppressed`, `removeViewOverride`,
`projectClosedRange`, ticket-row context fns (`currentUserName`,
`getProjectKey`, `getTicketProject`, `getTicketInitiativeIds`,
`getProjectTeamFilterEntries`), visibility's `isDateVisibleInRange`.

**Watch out:** `ticketMatchesFilter`/`projectMatchesFilter` are deps of
`useCustomViewDirectory` and `useFavoriteViews` — today via hoisting. After
this WP they are composable returns; the `useViewFilters` call must sit above
the `useCustomViewDirectory` call. `clearCurrentViewFilters` mutates
`viewEditorDraft` directly — it needs the ref, not a getter.

## WP-9b: `useFilterMenu` — menu UI state, chips, options (~230 lines)

**Moves:**
- Refs: `filterMenuOpen` (207), `activeFilterEntryId`, `activeDateFilterId`,
  `activeProjectPropertyFilterId`, `filterFieldSearchQuery`,
  `filterSearchQuery` (207–213), `normalizedFilterSearch`,
  `normalizedFilterFieldSearch`
- Computeds: `activeFilterChips` (564, 55 lines), `hasModifiedFilterOptions`
  (619), `hasModifiedDisplayOptions`, `visibleFilterMenuEntries`,
  `activeFilterEntry`, `activeValueFilterFieldId` (645), `filterableTickets`
  (654), `activeFilterOptions`, `activeDateFilterOptions`, and the
  `watch(visibleFilterMenuEntries, …)` at 665
- Functions: `getActiveFilterContext` (1009), `getFilterOptions` (1018),
  `getIssueFilterOptions`, `getProjectFilterOptions`,
  `getInitiativeFilterOptions`, `getSavedViewFilterOptions`,
  `getIssueVisibilityRangeLabel`, `getProjectClosedRangeLabel`,
  `getDateFilterOptions` (1056), `removeActiveFilterChip` (1183),
  `openFilterMenu`, `closeFilterMenu`, `toggleFilterMenu`,
  `saveCurrentViewChangesToThisView` (1242)

**Stays in controller:** `saveCurrentViewFilters` (3-line shim to
`startCreateView`, see ordering section).

**Deps:** WP-9a returns, WP-10's `baseDisplayedProjectRows`,
`baseInitiativeRows`, directory's `baseDisplayedSavedViewRows`,
`scopedTickets`, `filterTicketsForCurrentView`, display-range refs,
`getDefaultDisplayForView`, `captureDisplay`, `saveCustomViewAndRemoveOverride`
+ `copyCustomView` (editor — but only used by
`saveCurrentViewChangesToThisView`; if that creates a cycle, keep it in the
controller next to `saveCurrentViewFilters` and note it), `getCustomView`,
`closeCustomViewContextMenu` (used by `openFilterMenu`? — verify: it is
`openFilterMenu` that calls `closeCustomViewContextMenu`; inject it).

**Watch out (hazard class 1):** the moved
`watch(visibleFilterMenuEntries, …)` re-registers at the composable call
site. Grep for other watchers of `activeFilterEntryId` and
`visibleFilterMenuEntries` sources before moving. Also
`displayOptionsOpen`/`groupOrderingOpen` and the menu open/close helpers
(`closeDisplayOptions` 1338, `toggleDisplayOptions` 1342, `openCommandMenu`
1330, `handleDocumentPointerDown` 1350) are entangled with the filter menu —
judgment call: fold them into this composable as a "menus" cluster (~60 more
lines out) or leave them; folding is preferred if the deps object stays sane.

## WP-10: `useProjectSections` — project display pipeline (~110 lines)

**Moves:** `baseDisplayedProjectRows` (775), `displayedProjectRows`,
`projectSections` (787), `visibleProjectCount`, `sortProjectsByOrdering`,
`compareProjects` (1100), `groupProjects` (1121),
`getProjectSectionCollapseId`, `isProjectSectionCollapsed`,
`toggleProjectSection`, `resetProjectDisplayOptions` (1266).

`compareProjects` and `groupProjects` are pure — move them to `helpers.ts`
instead if that keeps the composable smaller; they have no reactive deps.

**Deps:** `projectRows`, `currentTeamKey`, `currentTeamSection`,
`currentView`, `projectGrouping`, `projectOrdering`, `projectClosedRange`,
`collapsedProjectSectionIds`, `visibleProjectRowFields`,
`applyViewFiltersToProjects` + `applyProjectClosedRange` (WP-9a),
persistence fns for the reset.

**Ordering:** must be called before WP-9b (its `baseDisplayedProjectRows`
feeds filter options) and after the view-identity computeds
(`currentTeamKey`/`currentTeamSection`).

## WP-11: `useTicketSearch` — search pipeline (~70 lines)

**Moves:** `issueSearch` ref (197), `normalizedIssueSearch` (559),
`baseSearchedTickets` (671), `searchedTickets`, `searchedProjectRows` (685),
`searchedInitiativeRows` (703), `searchTabs` (716).

**Deps:** `currentView`, `scopedTickets`, `issueTickets`, `projectRows`,
`filterTicketsForCurrentView`, `ticketMatchesQuery`,
`hideSubIssuesWithVisibleParents`, `showSubIssues`, WP-9a apply-filters fns,
and `initiativeRows` — note `searchedInitiativeRows` currently carries an
`eslint-disable ts/no-use-before-define` because `initiativeRows` is declared
later. Inject it as a getter (`getInitiativeRows: () => initiativeRows.value`)
or move the `initiativeRows` computed above the call site; either resolves
the suppression — delete the disable comment.

**Ordering:** `searchedTickets` is a dep of `useIssueGrouping` — this
composable must be called before it. `scopedTickets` (546) must be above the
call site.

## WP-12: grid templates → `helpers.ts` (~45 lines)

`buildGridTemplate` (1281), `getProjectGridTemplate`,
`getInitiativeGridTemplate`, `getSavedViewGridTemplate` are pure given an
`isVisible` callback. Move them to `helpers.ts` as exported functions taking
`(isVisible)`; the controller keeps its three one-line computeds. No hazards.

## WP-13: `useViewContext` — view identity (~180 lines, contingent)

**Run the `wc -l` audit after WP-12 first.** Only execute this WP if the
controller is still meaningfully above 1,000.

**Moves:** `getContextKeyForViewId` (357), `activeCustomView`,
`activeBaseViewId`, `activeCustomViewContextKey`, `contextKeyForCurrentView`,
`supportsCustomViews`, `currentTeamKey`, `currentTeamName`,
`currentTeamSection`, `currentTeamAppearance`, `currentTeamSectionLabel`
(422), `isViewsDirectory`, `activeViewsDirectoryTab`, `isProjectDisplayView`,
`isInitiativeDisplayView`, `isTeamSettingsView`, `isIssueDisplayView`,
`currentTeamTickets`, `isMyIssuesView`, `viewTitle` (468), `scopedTickets`
(546).

**Watch out:** `viewTabs` (513) depends on `customViewTabs` from
`useCustomViewDirectory`, which itself depends on `contextKeyForCurrentView`
from this cluster — a genuine cycle. Leave `viewTabs` in the controller (it
is the composition point) rather than threading a lazy handle. This
composable must be called very early (right after `useViewStatePersistence`);
everything downstream reads these computeds.

## WP-14: Phase 7 debt cleanup + final sweep

Carried-over items discovered during Phase 7, then the standard sweep:

1. **Delete vestigial `handleFavoriteViewChange`** from
   `useTicketNavigation.ts` — the controller defines its own wrapper
   (restore filters + navigate); the composable's copy is dead code.
2. **Revisit the editor's inline nav shims.** `useViewEditor` initializes
   before `useTicketNavigation` and receives `closeTicketForEditor` /
   `handleViewChangeForEditor` reimplementations. They are behaviorally
   equivalent today only because editor flows never pass
   `command`/`create`/`search` ids and `finishViewEditor` runs before the one
   `handleViewChange` call. Either reorder initialization so the editor can
   take the real functions, or document the invariant next to the shims.
   Prefer reorder if WP-9b/WP-13 already forced call-site movement.
3. **Tighten `handleGlobalKeydown`** in place: the match/run table landed at
   ~135 lines vs the ~80 target; the `x`/`enter` matchers evaluate their
   fallback key twice (once in `match`, once in `run`) — acceptable, but see
   if the guard can be hoisted. If after everything the controller is still
   >1,000, extracting `useTicketListKeyboard` is now viable (its deps are
   almost all composable returns post-Phase 7/8) — this is the designated
   stretch move, reversing the Phase 6 decision *only* under that condition.
4. **Dead-export scan** over every file Phases 7–8 touched (for each
   `export`, grep repo-wide excluding the defining file; demote
   internal-only exports).
5. **`wc -l` audit:** controller target <1,000; no new module >750.
6. **Accepted-deltas check:** `docs/refactor-plan.md` must cover everything
   non-verbatim from both phases (Phase 7 deltas are recorded there already).
7. Full gate + reviewer pass over the whole phase diff
   (`git diff ecd82f2..HEAD`).

## Expected arithmetic (honest version)

Phase 7 observed that only ~60% of gross moved lines come out net (deps
objects + destructuring return to the controller). Applying that ratio:

| WP  | Cluster                    | ~Gross out | ~Net out |
|-----|----------------------------|-----------|----------|
| 9a  | filter application + CRUD  | 170       | 120      |
| 9b  | filter menu UI (+ menus)   | 230–290   | 150–190  |
| 10  | project sections           | 110       | 75       |
| 11  | search pipeline            | 70        | 45       |
| 12  | grid templates (pure move) | 45        | 40       |
| 13  | view context (contingent)  | 180       | 120      |
| 14  | dead code + import shrink  | —         | 30–60    |

1,714 − (net 580–650) ⇒ **controller lands at roughly 1,060–1,130**, or
~960–1,030 with the WP-14 keyboard stretch. The <1,000 target is reachable
but requires either WP-13 + the keyboard extraction or WP-13 + aggressive
menu folding in WP-9b. If it stalls in the 1,000–1,100 band with all WPs
exhausted, stop, record the number and the residual composition (imports +
return object + keyboard + orchestration are ~450 lines of irreducible
shell), and renegotiate the target in `docs/refactor-plan.md` rather than
inventing abstractions to hit a number.
