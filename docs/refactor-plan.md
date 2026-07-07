# Codebase Health Refactor Plan

Source: thermo-nuclear code quality audit of `main` @ `c3d4435` (2026-07-06).
Every task is behavior-preserving unless marked **[bug fix]**. Each task is
individually committable. Each phase ends with a green gate: `bun run lint` +
`bun run typecheck` (+ `bun run test` once Phase 3 lands).

Decisions (confirmed 2026-07-06):

- Dead inbox feature: **delete** (git history preserves it)
- No-op display toggles (`listSubGrouping`, `showEmptyGroups`): **delete**
- Test runner: **Vitest**

Execution order is as numbered. Phases 4 and 5 are independent of each other
and may be parallelized. Phase 3 (tests) deliberately precedes the risky
refactors in Phases 4 and 6.

## Delegation strategy (subagents)

Parallel worker subagents are used where tasks touch **disjoint file sets**;
everything else stays sequential under the orchestrating agent. Rules:

1. **Disjoint files or no fan-out.** A task is delegated in parallel only if
   its file set does not overlap any concurrently running task. When overlap
   is unavoidable, tasks run sequentially.
2. **`useTicketListController.ts` is single-writer, always.** No parallel
   fan-out ever includes it alongside another task that edits it.
3. **Every worker runs the gate** (`lint` + `typecheck` + `test` once
   available) before reporting done; the orchestrator re-runs the gate on the
   merged tree and reviews each diff before committing.
4. **Reviewer subagent pass at the end of each phase** (focused on behavior
   preservation), before the phase commit is finalized.
5. Use git worktrees for fan-outs only if a partition turns out not to be
   cleanly disjoint; otherwise same-tree parallel edits on disjoint files.

Per-phase delegation summary:

| Phase | Mode |
|---|---|
| 1 | 1.1–1.2 sequential (17 importers move first), then **fan out 1.3 / 1.4 / 1.5+1.6 / 1.7 to 4 parallel workers** (disjoint: shared-settings vs ADF vs server vs app) |
| 2 | Sequential (2.2–2.5 all orbit the controller); 2.2 component conversions may fan out per-component *after* 2.1, since they don't edit the controller |
| 3 | 3.1 sequential, then **fan out 3.2 / 3.3 / 3.4 to 3 parallel workers** (independent test files, no prod code changes) |
| 4 | Sequential chain (4.1 → 4.2 → 4.3 → 4.4); 4.5 parallel-safe alongside 4.3/4.4 |
| 5 | **Runs in parallel with Phase 4** (client mutation files vs API/server files are disjoint). Within it: 5.1 (client) parallel to 5.2–5.4 (server, sequential chain) |
| 6 | Strictly sequential, single agent — every task rewrites the controller. Reviewer pass after each extraction (6.2, 6.3, 6.4, 6.5), not just at phase end |

---

## Phase 1 — Typecheck gate

The server/shared/app layers currently fail `tsc`/`vue-tsc` (~172 errors:
app 72, server 56, shared 44). Nothing runs typechecking today; lint is the
only gate.

- **1.1** Add `typecheck` script to `package.json`:
  `vue-tsc -p .nuxt/tsconfig.app.json --noEmit` +
  `tsc -p .nuxt/tsconfig.server.json --noEmit` +
  `tsc -p .nuxt/tsconfig.shared.json --noEmit`
- **1.2** Create `shared/typeGuards.ts`; move `isRecord` there from
  `shared/jiraAdfTypes.ts` (17 server importers); delete the duplicate in
  `server/apiRouteUtils.ts:20`.
- **1.3** Replace the invalid idiom
  `const recordValue: Record<string, unknown> = value` (TS2322) with
  `isRecord` narrowing. ~22 sites: `shared/settingsApp.ts`,
  `settingsConnections.ts`, `settingsNormalizers.ts`, `settingsViews.ts`,
  `settingsSidebar.ts`, `settingsAssistant.ts`, `settingsSpaces.ts`,
  `settingsSkills.ts`, `shared/assistant.ts:202`, `server/settings.ts` (×3),
  `server/ai/assistant.ts:154,157,160`.
- **1.4** Fix ADF strictness: `shared/jiraAdfBuild.ts` indexed-access errors
  (×12, lines 93–197); `shared/jiraAdfTypes.ts:51` accesses `.version` on a
  type that lacks it, inside its own guard.
- **1.5** Fix server nullability: `server/apiGeneralHandlers.ts` (×9,
  `QueryValue` → `getStringQueryValue` mismatch),
  `server/jiraAttachments.ts:76`, `server/apiRemoteTicketHandlers.ts:64`.
- **1.6** Remove server `as` casts (AGENTS.md violation):
  `server/localTickets.ts:30,80` (use `isRecord`),
  `server/jiraDevStatus.ts:45-46` (use a `Set<string>` + narrowing helper).
- **1.7** Triage + fix the 72 app-side errors; remove client `as` casts:
  `src/components/SpaceIconPicker.vue:68` (`instanceof` narrowing),
  `useTicketListController.ts:212` (`history.state` → `unknown` + narrowing),
  the `queryKey as ReturnType<...>` pattern in `useJiraTicket.ts`,
  `useLocalTicket.ts`, `useAssignableUsers.ts`, `useTransitions.ts` (close
  over the ref instead), SSE casts in `useJiraTickets.ts:325,340,350,361`
  (`instanceof MessageEvent` + validated parse), `src/api/jira.ts:45`
  (follow the compliant pattern in `src/api/assistant.ts:8-24`).
- **1.8** Gate: `lint` + `typecheck` clean.

Delegation: 1.1–1.2 first (sequential — 1.2 moves `isRecord`, which 1.3 and
1.6 depend on). Then four parallel workers: W1 = 1.3 (shared settings +
assistant + server/settings), W2 = 1.4 (ADF files), W3 = 1.5 + 1.6 (server
handlers/attachments/localTickets/devStatus), W4 = 1.7 (app side). File sets
are disjoint. Orchestrator merges, runs 1.8, reviews diffs.

## Phase 2 — Ticket-list consumer contract + dead-code purge (~600 LOC deleted)

- **2.1** Add typed `src/features/ticket-list/ticketListContext.ts`
  (InjectionKey pattern, mirror `src/features/settings/settingsPageContext.ts`);
  `TicketList.vue` provides the controller.
- **2.2** Convert the 7 `props: ['controller']` + `{ ...props.controller }`
  components to `<script setup>` + inject with explicit member access:
  `TicketListShell.vue`, `TicketListToolbarArea.vue`,
  `TicketListFilterMenu.vue`, `TicketListDisplayOptionsMenu.vue`,
  `TicketListGroupOrderingMenu.vue`, `TicketListInboxView.vue` (until 2.3),
  `TicketListSearchView.vue`.
- **2.3** Delete the dead inbox feature (~350 LOC): `TicketListInboxView.vue`,
  controller inbox state/computeds/actions (306–308, 1176–1215, 3525–3608),
  keydown branch (4124–4155), Shell/Toolbar template branches, and the two
  redirect hacks (watchEffect 666–674 keeps redirecting legacy persisted
  values; `handleViewChange` 3829–3831 rewrite goes away).
- **2.4** Prune the ~239 unused controller return keys; stop re-exporting
  ~45 pure helpers through the controller — consumers import from
  `helpers.ts` / `viewDisplay.ts` / `filterDisplay.ts` / `options.ts`
  directly.
- **2.5** Delete misc dead code: `getLegacyImplicitViewDisplay`
  (`viewDisplay.ts:52`), `filterFieldIds` set (controller 323–344),
  `isViewsDirectory` alias (637–647), `removeFilterClause` identical
  branches (3014–3022), `getDefaultFiltersForView` dead conditional
  (394–413), and the no-op `listSubGrouping` / `showEmptyGroups` toggles
  (menu bindings + persistence).
- **2.6 [bug fix]** `normalizeFilterFieldId` (`filterDisplay.ts:4-29`) omits
  `'team'` although the type includes it and the UI can create team clauses —
  persisted team filters silently drop on round-trip. Add it.

## Phase 3 — Test infrastructure + characterization tests

Lands before Phases 4 and 6 so risky refactors run against locked-in behavior.

- **3.1** Set up Vitest + `test` script (happy-dom or jsdom env for
  composable tests; node env for pure modules).
- **3.2** Characterization tests for ticket cache-merge behavior: list merge,
  parent-summary propagation, detail-cache apply — written against the
  *current* canonical copy (`mergeLocalTicketList`, `useLocalTickets.ts:3`).
- **3.3** Characterization tests for filter matching/option-building,
  `viewId` string semantics (`team:<key>:<section>` grammar), and sort
  ordering — locks Phase 6 extractions.
- **3.4** Tests for settings normalizers round-trip and ADF guards — locks
  Phase 1 changes in place.

Delegation: 3.1 sequential, then 3.2 / 3.3 / 3.4 fan out to three parallel
workers — pure test additions in independent files, zero production-code
edits, so conflicts are impossible. Orchestrator verifies the suite runs
green as a whole.

## Phase 4 — Mutation consolidation (~592 → ~170 LOC)

- **4.1 [bug fix]** Extract one shared `mergeTicketList` +
  `applyTicketUpdateToCaches`; delete the 9 clones. Two clones
  (`useUpdateTicketTeam.ts:7-16`, `useUpdateTicketWatching.ts:32-43`) had
  silently dropped parent-summary propagation — unification restores it.
- **4.2** Central `src/composables/queryKeys.ts`; eliminate literal drift:
  hardcoded `['ticket', key]` in `useJiraTickets.ts:284,318`, private
  `TICKETS_QUERY_KEY` re-declaration in `useSpaceSettings.ts:23`, duplicate
  `['priorities']` registrations.
- **4.3** Build `useTicketFieldMutation` factory: `mutationFn`, optional
  `optimisticPatch(vars)` (absent ⇒ onSuccess-only, matching current local
  variants), local/remote detail-key resolution via `isLocalTicketKey`,
  optional `onSettledExtra` (status transitions invalidation).
- **4.4** Migrate the 6 field families (title/status/priority/assignee/
  description/labels) to unified composables; delete the 12 old files;
  simplify the 6 consumers that hand-roll dual-mutation dispatch
  (`TicketDetailHeader.vue`, `TicketDetailDescription.vue`,
  `TicketDetailSidebar.vue`, `useTicketDetailStatusEditor.ts`,
  `useTicketDetailPropertyEditors.ts`, `useSidebarNavigation.ts`).
- **4.5** Dedupe priorities: collapse the 3 export aliases in
  `src/api/jira.ts:280-282` to one; merge `usePriorities` /
  `useCreatePriorities` (same query key, same fn).

Delegation: 4.1 → 4.2 → 4.3 → 4.4 is a dependency chain — one worker (or the
orchestrator), sequential. 4.5 is disjoint and may run in parallel with
4.3/4.4. The whole phase may run concurrently with Phase 5 (disjoint file
sets: composables vs API/server), coordinated by the orchestrator.

## Phase 5 — API layer + server error taxonomy

Independent of Phase 4; may run in parallel with it.

- **5.1** `apiFetch<T>` helper in `src/api`; migrate ~34 call sites across
  `jira.ts` / `localTickets.ts` / `settings.ts`. Always use
  `readErrorMessage`-quality errors; consistent `encodeURIComponent` on path
  segments. (Encoding unification is observable only for keys with reserved
  characters — Jira keys are `[A-Z]+-\d+`; noted, accepted.)
- **5.2** Server error taxonomy: `JiraApiError { status }` thrown from
  `jiraFetch`; `ValidationError` → 400 mapped in the single top-level catch
  (`server/api/[...path].ts`); delete per-route try/catch in
  `apiLocalTicketHandlers.ts` and the 3× copy-pasted message-sniffing
  (`jira.ts:329`, `jiraCreateIssue.ts:151`, `jiraProjects.ts:207`); fix
  `apiRemoteTicketHandlers.ts:73-75` collapsing all attachment failures
  into 404.
- **5.3** Shared body-parser helpers in `apiRouteUtils.ts` (`parseTitleBody`,
  `parseLabelsBody`, `parseDescriptionBody`, …); dedupe local/remote handler
  parsing (labels block is verbatim-identical today).
- **5.4** Relocations: `generateAiDescriptionResponse` out of
  `apiRouteUtils.ts:113` into a handler module; `server/jira.ts` → pure
  barrel (field updates → `jiraFieldUpdates.ts`, priorities →
  `jiraPriorities.ts`, ADF media scrubbing → ADF/description layer);
  `shared/settingsJql.ts` → `shared/jql.ts`.

Delegation: 5.1 (client `src/api`) is disjoint from 5.2–5.4 (server) — two
workers in parallel; 5.2 → 5.3 → 5.4 sequential within the server worker.
Caveat: if Phase 4 runs concurrently, 4.5 and 5.1 both touch
`src/api/jira.ts` — the orchestrator sequences those two tasks explicitly.

### Phase 4/5 recorded behavior deltas (reviewer-verified, accepted)

- Description saves now also merge the server ticket into the list cache on
  success (previously detail-cache only) — convergent with all other fields.
- Local tickets gain optimistic updates for status/priority/assignee/
  description; local optimistic status uses the target status name.
- Team/watching updates regain parent summary/issueType propagation.
- Local-ticket file I/O failures now surface as 500 (previously swallowed
  into 400 by the per-route catch); remote domain validation is now 400
  (previously 500); upstream Jira failures map 404→404, else 502.

## Phase 6 — Controller decomposition (4,701 → target <800 lines)

Precondition: Phases 2 and 3 complete.

- **6.1** `parseViewId()` for the `team:<key>:<section>` grammar — replaces
  14 `viewId.split(':')` sites (11 in controller, 3 in `helpers.ts`, 1 in
  `useSidebarNavigation.ts:81`) and the 30-line `getContextKeyForViewId`
  branch ladder (561–591).
- **6.2** Extract the pure filter engine → `filterEngine.ts` (~700 LOC:
  `get*FilterOptions` ×4, `*MatchesFilter` ×4, date helpers; joins
  `filterGroupsMatch` in spirit); collapse the ×4 `applyViewFiltersTo*`
  shells; thin computed adapters remain in the controller.
- **6.3** Extract `useViewStatePersistence`: capture/apply, resolve/persist,
  the three sync watches, unmount flush, and a single `withSyncSuppressed(fn)`
  replacing the 18 `suppressViewDisplaySync` sites / 5 copy-pasted
  guard-release rituals.
- **6.4** Extract `useProjectRows` / `useInitiativeRows` aggregation
  pipelines; replace the O(n²) parent lookup in `getProjectKey` with a
  key→ticket Map.
  - 6.4 accepted delta: ticket lookups now go through a first-wins
    key→ticket Map (matching `Array#find`). The only site where semantics
    could diverge is `getInitiativeSourceTicket`: with duplicate ticket keys
    where the first occurrence is not an initiative but a later one is, the
    old `find` matched the later ticket; the Map lookup returns null. Keys
    are unique in practice (cache merges by key), so no observable change.
- **6.5** Extract interaction composables: `useIssueSelection`,
  `useSidebarResize`, `useCommandMenu`, `useTicketListKeyboard` (dedupe the
  repeated search-escape branch and unreachable enter-guard in
  `handleGlobalKeydown` 4049–4197).
- **6.6** Collapse remaining ×4 copy-paste families (`toggle*RowField`
  3246–3385, `get*GridTemplate` 3386–3427) into generic helpers; table-ify
  the `activeValueFilterFieldId` identity ladder (894–924).
- **6.7** Single source of ticket taxonomy: `useSidebarNavigation.ts:85-136`
  drops its private epic/initiative/backlog/scoping pipeline and reuses the
  shared one.
- **6.8** Final sweep: lint + typecheck + tests green; dead-export scan over
  touched files; verify no file grew past 1,000 lines.

### Phase 6 outcome (2026-07-07)

6.1–6.8 executed; gate green throughout (typecheck 0, eslint clean, 227
tests). Controller: 4,701 → 2,691 lines. Extracted modules: filterEngine
(715), useViewStatePersistence (~370), useTicketRows (353), useCommandMenu
(287), useIssueSelection (121), useSidebarResize (78). One regression found
and fixed in review: watch-registration order vs the legacy inbox redirect
(4fd0c5d). useTicketListKeyboard was evaluated and deliberately NOT
extracted — handleGlobalKeydown dispatches over ~27 heterogeneous deps and
extraction would only relocate the bag. The <800 target was not reached;
remaining bulk is custom-view editor/favorites/view management (~700),
issue sections + sorting pipeline (~450), navigation/open-close routing,
keyboard dispatcher, and menu plumbing. Further decomposition is optional
follow-up, not blocked.

Delegation: **no parallel fan-out in this phase.** Every task rewrites
`useTicketListController.ts`; the controller is single-writer. Extractions
run one at a time with the full gate between each, and a reviewer-subagent
behavior-preservation pass after each major extraction (6.2–6.5), not just
at phase end.

---

## Deferred (noted in audit, intentionally out of scope)

- Shared `<AppModal>` / context-menu primitives (7 modal shells, 3+
  hand-rolled menus) — worthwhile, separate effort.
- `server/ai/assistant.ts` vs `providers/localCli.ts` parallel CLI-spawn
  stacks → shared `spawnLocalCli` runner.
- Silent-fallback policy: corrupt `settings.json` / local tickets persist
  defaults over user data; phantom tickets from malformed Jira responses;
  request bodies logged at `console.warn` (`jiraClient.ts:101,126`).
- `useSidebarNavigation` manual pinned-ticket cache mirroring → `useQueries`.
- Ticket-detail `defineExpose` ref-forwarding chains → provided focus
  registry.
