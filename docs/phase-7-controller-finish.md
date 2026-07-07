# Phase 7 — Finish the ticket-list controller decomposition

> **Status (2026-07-07): executed, target not reached — superseded by
> `docs/phase-8-controller-spillover.md`.** WP-1 through WP-7 landed in
> commit `ecd82f2` (controller 2,691 → 1,714 lines; gate green: eslint
> clean, typecheck 0, 227 tests). Extracted: `useIssueGrouping` (392),
> `useFavoriteViews` (295), `useTicketNavigation` (275), `useViewEditor`
> (277), `useCustomViewDirectory` (214), `useTicketVisibility` (113), plus
> `getDisplayedIssueRowKey`/`sortTicketsByActivity` into `helpers.ts`.
> WP-7 rewrote `handleGlobalKeydown` as a guard chain + match/run table.
> Two regressions caught and fixed in the reviewer pass (editor tab-click
> routing, search-escape vs selected-ticket ordering). **Not done:** the
> WP-1/WP-2 tests, the WP-8 final sweep, and the WP-9 spillover — all
> carried into Phase 8. Accepted deltas are recorded in
> `docs/refactor-plan.md`.

Status of the input: `src/features/ticket-list/useTicketListController.ts` is
2,691 lines after Phase 6 (started at 4,701). Everything left is orchestration
plus seven coherent feature clusters. This document is a complete, ordered
work plan to take the controller to a <1,000-line orchestration shell. Each
work package (WP) is independently shippable and gate-verified.

Line numbers below reference the controller at commit `74d9fa8` and drift as
WPs land — always re-locate by symbol name, never by raw line.

## Ground rules (unchanged from Phase 6, non-negotiable)

1. **Single writer.** Every WP rewrites the controller. No parallel agents may
   touch `useTicketListController.ts`. Run WPs strictly in order.
2. **No `any`. No `as` casts except `as const`.**
3. **Behavior-preserving.** Bodies move verbatim modulo `x.value` →
   parameter/ctx substitutions. Any intentional delta must be recorded in
   `docs/refactor-plan.md` under accepted deltas.
4. **The gate**, after every WP, in this order:
   ```
   bunx eslint . --fix        # then confirm clean
   bun run typecheck          # MUST re-run after eslint --fix (fixes have broken narrowing before)
   bunx vitest run            # 227+ tests, all green
   ```
5. **Commit per WP** with a `refactor(ticket-list): …` message describing the
   boundary, deps count, and controller line delta.
6. **Reviewer pass** (subagent or manual) after WP-2, WP-4, and WP-6 — diff
   moved bodies against pre-move (`git show <sha>~1:…`), verify adapter
   bindings, and check the two recurring hazard classes below.

## Recurring hazards (both bit us in Phase 6 — check every WP)

- **Watch/watchEffect registration order.** Moving a `watch` into a composable
  moves its registration point to the composable call site. If another
  watcher/watchEffect on the same reactive source now registers on the other
  side of it, initial-load behavior can change (see fix `4fd0c5d`). Rule: place
  the composable call at (or before) the original registration point of its
  earliest watcher, and grep for other watchers of the same sources.
- **Function-declaration hoisting.** Controller `function f()` declarations are
  hoisted; replacing them with destructured `const` bindings is not. Place
  composable calls before the first *setup-time* consumer, and expect
  `ts/no-use-before-define` to flag lazy (computed/closure) consumers too —
  move the call site up rather than suppressing.

Composable conventions established in Phase 6 — follow them:

- Deps go in a single typed `deps` object; derive types from existing
  composables via `ReturnType<typeof useX>['field']` instead of duplicating.
- Controller destructures returns under the **original names** so downstream
  code and the giant `return {}` object stay untouched.
- Composables may register their own `onMounted`/`onBeforeUnmount` (same
  component instance); preserve capture-phase flags (`true`) on document
  listeners exactly.
- Prefer injecting a couple of functions over importing controller state;
  prefer moving a whole private helper if it is pure and single-cluster.

---

## WP-1: `useIssueGrouping` — sections, sorting, group ordering (~400 lines)

The biggest remaining cluster. Owns how tickets become grouped/sorted visible
sections.

**Moves** (locate by name):
- `groupTickets` (1291), `compareIssueGroupEntries` (1310),
  `getStatusCategoryForGroupLabel` (1334), `compareStatusGroupLabels` (1337),
  `getIssueGroupingLabels` (1344), `getIssueGroupingRank` (1361),
  `sortTickets` (1368, 87 lines), `sortTicketsByActivity` (1789)
- `baseIssueSections` (797), `issueSections` (826),
  `issueGroupOrderingRows` (829), `visibleIssueCount` (837),
  `hiddenCompletedCount` (840)
- Group-order actions: `setCurrentIssueGroupOrder` (1827),
  `getCurrentHiddenIssueGroupIds` (1833), `setCurrentHiddenIssueGroupIds`
  (1836), `isIssueGroupHidden` (1842), `toggleIssueGroupVisibility` (1845),
  `resetCurrentIssueGroupOrdering` (1853), `startIssueGroupDrag` (1858),
  `finishIssueGroupDrag` (1861), `dropIssueGroup` (1864),
  `toggleOrderingDirection` (1881), `draggedIssueGroupId` ref (243)
- Section collapse: `getIssueSectionCollapseId` (2276),
  `isIssueSectionCollapsed` (2279), `shouldShowIssueSectionHeader` (2284),
  `toggleIssueSection` (2287), `getExpandedSectionTickets` (2293),
  `getFlatVisibleTickets` (2310)

**Deps** (inject): `searchedTickets`, display-state refs from
`useViewStatePersistence` (`listGrouping`, `listOrdering`, direction refs,
`issueGroupOrders`, `hiddenIssueGroupIds`, `collapsedIssueSectionIds`),
`currentView`, plus whatever `sortTickets`/`getIssueGroupingLabels` actually
close over — chase the closures and report. Note `sortTickets` is also a dep
of `useCommandMenu` (passed at its call site) and `searchedProjectRows` — the
composable must return it.

**Watch out:** `useIssueSelection` takes `issueSections`,
`collapsedIssueSectionIds`, and `getFlatVisibleTickets` as deps — this WP's
composable must be called **before** `useIssueSelection` in the controller,
and its watcher-free design (it should contain no watches) keeps ordering
safe. Also `getDisplayedIssueRowKey` (1487) is used by both selection and
grouping — decide one home (suggest: `helpers.ts` if pure) and inject.

**Tests:** `tests/issue-grouping.test.ts` — `sortTickets` per ordering field
and direction, `groupTickets` per grouping field, group-order override and
hidden-group behavior, status-group label comparison, section collapse-id
grammar (`${view}:${grouping}:${sectionId}`).

## WP-2: `useTicketVisibility` — current-view scoping predicates (~110 lines)

Small but load-bearing; extracting it first would force WP-1 to inject it, so
it ships after WP-1 and WP-1 temporarily injects the controller functions.

**Moves:** `filterTicketsForCurrentView` (1455),
`filterTicketsForCurrentViewWithoutCompletedRange` (1460),
`isTicketInCurrentTeamSection` (1470), `isCompletedIssueVisible` (1482),
`hideSubIssuesWithVisibleParents` (1490), `isSubIssueVisible` (1499),
`isBacklogIssueVisible` (1504), `isDateVisibleInRange` (1509),
`ticketMatchesQuery` (1528).

**Deps:** `currentTeamKey`, `currentTeamSection`, visibility-range refs
(`completedRange`, `showSubIssuesRange`, `showTriageIssuesRange`) — all
already destructured composable returns.

**Tests:** date-range windows in `isDateVisibleInRange` (each
`IssueVisibilityRange` value), sub-issue hiding with visible parents, query
matching fields.

## WP-3: `useCustomViews` feature module — directory, stats, labels (~190 lines)

Distinct from the existing `src/composables/useCustomViews.ts` (persistence
CRUD). This is the ticket-list-side derivation. Suggest
`src/features/ticket-list/useCustomViewDirectory.ts`.

**Moves:** `customViewTabs` (545), `customViewBelongsInFavoriteViewsDirectory`
(1077), `customViewBelongsInCurrentViewsDirectory` (1091),
`getCustomViewTeamKey` (1103), `customViewToSavedViewRow` (1106),
`getCustomViewStats` (1122), `getIssueTicketsForCustomView` (1145),
`getProjectRowsForCustomView` (1155), `hasKnownFilterFieldId` (1162),
`deriveViewLabel` (1167, 36 lines), plus `savedViewRows` (886) and
`baseDisplayedSavedViewRows`/`displayedSavedViewRows` if their only remaining
deps are in this module.

**Deps:** `customViews`/`getCustomView`, `contextKeyForCurrentView`,
`currentTeamKey`, ticket/project sources (`issueTickets`, `projectRows`),
filter application (`applyViewFiltersToSavedViews` adapter or engine
functions directly with `currentViewFilters`).

## WP-4: `useFavoriteViews` (~360 lines)

**Moves:** `currentViewIsFavoritable` (895), `favoriteViewNavItems` (896),
`getFavoriteViewCount` (912, 34 lines), `getFavoriteViewFilterContext` (946),
`getFavoriteViewFilterClauses` (968), `getFavoriteViewBaseId` (976),
`getFavoriteViewTeamKey` (981), `getFavoriteViewTeamSection` (985),
`isFavoriteProjectView` (990), `isFavoriteTeamSettingsView` (994),
`getFavoriteViewIssueTickets` (998), the five `favorite*Matches*` predicates
(1007–1056), `getFavoriteViewProjectRows` (1057),
`favoriteProjectMatchesClosedRange` (1064), `getFavoriteViewSavedViewRows`
(1071), `getCurrentFavoriteViewFilters` (1203), `toViewFilterClauses` (1212),
`restoreFavoriteViewFilters` (1221), `toggleCurrentViewFavorite` (1231,
60 lines), and the `watchEffect`/`watch` at 1256/1267 **after checking what
they observe** (registration-order hazard: identify their reactive sources
and any sibling watchers before moving).

**Deps:** favorites persistence composable (find where `favoriteViews`
comes from), `currentView`, `currentViewFilters`, engine matchers, WP-2
visibility predicates, WP-3 directory helpers. This WP is why WP-2/WP-3 land
first — otherwise its deps object balloons.

**Note:** the `favorite*Matches*` family duplicates WP-2 predicates in
spirit (sub-issue/backlog/completed/date-range variants parameterized by a
display snapshot instead of current view state). After the move, evaluate
merging each pair into one function taking an explicit display snapshot —
record as accepted delta only if observable behavior is identical.

## WP-5: `useViewEditor` (~260 lines)

**Moves:** editor refs `viewEditorMode`/`viewEditorDraft`/
`viewEditorPreviousViewId`/`viewEditorPreviousDisplay` (253–256),
`copyCustomView` (305), `saveCustomViewAndRemoveOverride` (312),
`removeCustomViewAndOverride` (328), `generateCustomViewId` (1966),
`startCreateView` (1969), `startEditView` (1993), `finishViewEditor` (2011),
`saveViewEditor` (2017), `cancelViewEditor` (2037),
`discardViewEditorAndSwitch` (2050), `activateCustomView` (2057),
`updateViewEditorName/Description/Icon/Color` (2073–2096),
`openViewEditorFilters`/`openViewEditorSettings` (2097–2103).

**Hard constraint:** `viewEditorDraft` is a dep of `useViewStatePersistence`
(passed as a `Ref` at its call site, controller line ~258). The editor
composable must therefore be **split-initialized or called before**
`useViewStatePersistence` — cleanest: `useViewEditor` owns the refs and is
called first; it takes a *lazy* handle for the persistence functions it needs
(`applyDisplay`, `resolveDisplayForView`, `withViewDisplaySyncSuppressed`,
`captureDisplay`) via a small setter or getter-function deps, since those
exist only after `useViewStatePersistence` runs. Alternative: keep the refs
in the controller and move only the functions. Choose whichever avoids
circular init; document the choice in the commit message.

**Also moves:** `customViewContextMenu` ref (257) +
`closeCustomViewContextMenu` (2112), `handleViewTabContextMenu` (2118),
`editContextCustomView` (2130), `deleteContextCustomView` (2137) — the
context menu is editor-adjacent; note `handleDocumentPointerDown` (2253)
reads it (inject or return a `closeOnOutsidePointer` hook).

## WP-6: `useTicketNavigation` — open/close, view change, search, modals (~220 lines)

**Moves:**
- History: `canGoBack`/`canGoForward` (211–212), `syncNavigationHistoryState`
  (213), `goBack`/`goForward` (218–227), the `popstate` listener from
  `onMounted`/`onBeforeUnmount`.
- Tickets: `prefetchTicket` (1933), `openTicket` (1946), `closeTicket` (1952),
  `openRelativeVisibleTicket` (2313), `openFirstCheckedIssue` (1957).
- Views: `handleViewChange` (2167), `handleFavoriteViewChange` (2192),
  `handleViewTabClick` (2104), `closeSearchView` (2162),
  `focusSearchInputWhenReady` (2155), `lastNonSearchView` ref (242),
  `openSettings` (1963).
- Modals: create-modal refs (231–236) + `openGlobalCreate` (2208),
  `openChildCreate` (2215), `closeCreateModal` (2222), `handleTicketCreated`
  (2225), add-space modal (232, 2196–2205) — either same composable or a tiny
  `useTicketListModals`; judgment call on deps overlap.

**Watch out:** `openTicket`/`handleViewChange` are deps of `useCommandMenu`
(hoisted function declarations today — they are referenced at the
`useCommandMenu({...})` call site near line 1255, *before* their
definitions). Once they become composable returns they must be initialized
before that call site: move the `useCommandMenu` call down or land this WP's
composable call above it. This is the WP most likely to fight
`no-use-before-define` — plan call-site order first: sketch the final
top-of-controller initialization sequence before editing.

## WP-7: shrink `handleGlobalKeydown` in place (~130 lines, no extraction)

Phase 6 established extraction is wrong for the dispatcher. Instead:
- Replace repeated `event.key === 'Escape'` search-view branches with one
  early guard (audit noted a duplicated search-escape branch and an
  unreachable enter-guard — find and delete).
- Convert the flat if-chain into a table of
  `{ match(event): boolean, run(): void }` entries where it reduces lines;
  keep bail-out conditions (`isEditableTarget`, goto-mode) as guards on top.
- After WP-1..6, most branch bodies are one-line calls into composables; the
  function should land near ~80 lines.

## WP-8: final sweep

- Dead-export scan over every file this phase touched (same method as 6.8:
  for each `export`, grep repo-wide excluding the defining file; demote
  internal-only exports).
- `wc -l` audit: controller target <1,000; no new module >750.
- Confirm `docs/refactor-plan.md` accepted-deltas section covers anything
  non-verbatim (expected: favorite-predicate merges from WP-4, if taken).
- Full gate + reviewer pass over the whole phase diff
  (`git diff <phase-start-sha>..HEAD`).

## Expected arithmetic

| WP | Cluster | ~Lines out |
|----|---------|-----------|
| 1 | grouping/sorting/sections | 400 |
| 2 | visibility predicates | 110 |
| 3 | custom-view directory | 190 |
| 4 | favorites | 360 |
| 5 | view editor + context menu | 260 |
| 6 | navigation + modals | 220 |
| 7 | keyboard shrink | 130 |

2,691 − ~1,670 + destructuring/adapter overhead (~15% of moved volume comes
back as call sites and deps plumbing) ⇒ **controller lands at roughly
900–1,100 lines**. If it stalls above 1,000, the remaining bulk will be the
filter-menu UI state cluster (`activeFilterChips` at 623 through
`saveCurrentViewChangesToThisView` at 1777, ~350 lines) — that is the
designated WP-9 spillover, same recipe: `useFilterMenu`, deps on engine
adapters + `useViewStatePersistence`.
