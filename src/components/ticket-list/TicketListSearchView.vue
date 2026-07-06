<script setup lang="ts">
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import IssueRow from '../IssueRow.vue'

const {
  currentView,
  setSearchInputRef,
  issueSearch,
  searchTabs,
  searchResultTab,
  searchedTickets,
  searchedProjectRows,
  searchedInitiativeRows,
  getDisplayedIssueRowKey,
  focusedIssueKey,
  checkedIssueKeySet,
  issueRowDisplayProps,
  openTicket,
  prefetchTicket,
  toggleCheckedIssue,
  getProjectHealthClass,
} = useTicketListContext()
</script>

<template>
  <div v-if="currentView === 'search'" class="min-h-0 flex-1 overflow-hidden">
    <div class="shrink-0 border-b border-white/[0.06] px-4 py-3">
      <div
        class="flex max-w-3xl items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2"
      >
        <span class="text-[12px] text-[#777a83]">Search</span>
        <input
          :ref="setSearchInputRef"
          v-model="issueSearch"
          type="search"
          class="min-w-0 flex-1 bg-transparent text-[13px] text-[#e6e7ea] outline-none placeholder:text-[#6f727b]"
          placeholder="Search issues, projects, initiatives..."
        >
        <button
          v-if="issueSearch"
          type="button"
          class="rounded px-1.5 py-0.5 text-[11px] text-[#777a83] hover:bg-white/[0.06] hover:text-[#d7d8dc]"
          @click="issueSearch = ''"
        >
          Clear
        </button>
      </div>

      <div class="mt-3 flex items-center gap-1">
        <button
          v-for="tab in searchTabs"
          :key="tab.id"
          type="button"
          class="rounded-full px-3 py-1.5 text-[12px] transition"
          :class="
            searchResultTab === tab.id
              ? 'bg-white/[0.08] text-[#f0f1f4]'
              : 'text-[#8f9198] hover:bg-white/[0.045] hover:text-[#d7d8dc]'
          "
          @click="searchResultTab = tab.id"
        >
          {{ tab.label }}
          <span class="ml-1 text-[#6f727b]">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <div class="h-full overflow-y-auto pb-16">
      <template v-if="searchResultTab === 'all'">
        <section v-if="searchedTickets.length" class="border-b border-white/[0.06]">
          <div
            class="flex h-8 items-center gap-2 bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]"
          >
            <span>Issues</span>
            <span class="text-[#6f727b]">{{ searchedTickets.length }}</span>
          </div>
          <IssueRow
            v-for="ticket in searchedTickets.slice(0, 12)"
            :key="getDisplayedIssueRowKey(ticket)"
            :ticket="ticket"
            :selected="focusedIssueKey === getDisplayedIssueRowKey(ticket)"
            :checked="checkedIssueKeySet.has(getDisplayedIssueRowKey(ticket))"
            v-bind="issueRowDisplayProps"
            @select="openTicket"
            @prefetch="prefetchTicket"
            @toggle-check="toggleCheckedIssue"
          />
        </section>

        <section v-if="searchedProjectRows.length" class="border-b border-white/[0.06]">
          <div
            class="flex h-8 items-center gap-2 bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]"
          >
            <span>Projects</span>
            <span class="text-[#6f727b]">{{ searchedProjectRows.length }}</span>
          </div>
          <button
            v-for="project in searchedProjectRows.slice(0, 8)"
            :key="project.key"
            type="button"
            class="linear-row grid min-h-12 w-full grid-cols-[minmax(220px,1fr)_108px_120px_132px] items-center px-4 py-2 text-left"
            @mouseenter="prefetchTicket(project.key)"
            @click="openTicket(project.key)"
          >
            <span class="min-w-0 pr-4">
              <span class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#e6e7ea]">
                <Icon
                  name="lucide:rocket"
                  class="h-3.5 w-3.5 shrink-0 text-[#9aa8c7]"
                  aria-hidden="true"
                />
                <span class="truncate">{{ project.name }}</span>
              </span>
              <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{{ project.key }} · {{ project.spaceName }}</span>
            </span>
            <span>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                :class="getProjectHealthClass(project.health)"
              >
                {{ project.health }}
              </span>
            </span>
            <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{{ project.lead }}</span>
            <span class="text-[12px] text-[#8f9198]">{{ project.progress }}% complete</span>
          </button>
        </section>

        <section v-if="searchedInitiativeRows.length" class="border-b border-white/[0.06]">
          <div
            class="flex h-8 items-center gap-2 bg-white/[0.025] px-4 text-[12px] font-medium text-[#aeb0b7]"
          >
            <span>Initiatives</span>
            <span class="text-[#6f727b]">{{ searchedInitiativeRows.length }}</span>
          </div>
          <button
            v-for="initiative in searchedInitiativeRows"
            :key="initiative.id"
            type="button"
            class="linear-row grid min-h-12 w-full grid-cols-[minmax(220px,1fr)_108px_120px_132px] items-center px-4 py-2 text-left"
            @mouseenter="prefetchTicket(initiative.id)"
            @click="openTicket(initiative.id)"
          >
            <span class="min-w-0 pr-4">
              <span class="block truncate text-[13px] font-medium text-[#e6e7ea]">{{
                initiative.name
              }}</span>
              <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{{
                initiative.description
              }}</span>
            </span>
            <span>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                :class="getProjectHealthClass(initiative.health)"
              >
                {{ initiative.health }}
              </span>
            </span>
            <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{{ initiative.lead }}</span>
            <span class="text-[12px] text-[#8f9198]">{{ initiative.projectCount }} projects</span>
          </button>
        </section>

        <div
          v-if="searchTabs[0]?.count === 0"
          class="flex min-h-80 items-center justify-center px-6 text-center"
        >
          <div class="max-w-sm">
            <p class="text-[13px] font-medium text-[#d7d8dc]">
              No results found
            </p>
            <p class="mt-1 text-[12px] text-[#777a83]">
              Try a different issue key, title, owner, status, or team.
            </p>
          </div>
        </div>
      </template>

      <template v-else-if="searchResultTab === 'issues'">
        <div v-if="searchedTickets.length">
          <IssueRow
            v-for="ticket in searchedTickets"
            :key="getDisplayedIssueRowKey(ticket)"
            :ticket="ticket"
            :selected="focusedIssueKey === getDisplayedIssueRowKey(ticket)"
            :checked="checkedIssueKeySet.has(getDisplayedIssueRowKey(ticket))"
            v-bind="issueRowDisplayProps"
            @select="openTicket"
            @prefetch="prefetchTicket"
            @toggle-check="toggleCheckedIssue"
          />
        </div>
      </template>

      <template v-else-if="searchResultTab === 'projects'">
        <div v-if="searchedProjectRows.length">
          <button
            v-for="project in searchedProjectRows"
            :key="project.key"
            type="button"
            class="linear-row grid min-h-12 w-full grid-cols-[minmax(220px,1fr)_108px_120px_132px] items-center px-4 py-2 text-left"
            @mouseenter="prefetchTicket(project.key)"
            @click="openTicket(project.key)"
          >
            <span class="min-w-0 pr-4">
              <span class="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#e6e7ea]">
                <Icon
                  name="lucide:rocket"
                  class="h-3.5 w-3.5 shrink-0 text-[#9aa8c7]"
                  aria-hidden="true"
                />
                <span class="truncate">{{ project.name }}</span>
              </span>
              <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{{ project.key }} · {{ project.spaceName }}</span>
            </span>
            <span>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                :class="getProjectHealthClass(project.health)"
              >
                {{ project.health }}
              </span>
            </span>
            <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{{ project.lead }}</span>
            <span class="text-[12px] text-[#8f9198]">{{ project.progress }}% complete</span>
          </button>
        </div>
      </template>

      <template v-else-if="searchResultTab === 'initiatives'">
        <div v-if="searchedInitiativeRows.length">
          <button
            v-for="initiative in searchedInitiativeRows"
            :key="initiative.id"
            type="button"
            class="linear-row grid min-h-12 w-full grid-cols-[minmax(220px,1fr)_108px_120px_132px] items-center px-4 py-2 text-left"
            @mouseenter="prefetchTicket(initiative.id)"
            @click="openTicket(initiative.id)"
          >
            <span class="min-w-0 pr-4">
              <span class="block truncate text-[13px] font-medium text-[#e6e7ea]">{{
                initiative.name
              }}</span>
              <span class="mt-0.5 block truncate text-[11px] text-[#777a83]">{{
                initiative.description
              }}</span>
            </span>
            <span>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                :class="getProjectHealthClass(initiative.health)"
              >
                {{ initiative.health }}
              </span>
            </span>
            <span class="truncate pr-4 text-[12px] text-[#aeb0b7]">{{ initiative.lead }}</span>
            <span class="text-[12px] text-[#8f9198]">{{ initiative.projectCount }} projects</span>
          </button>
        </div>
      </template>

      <div
        v-if="
          searchResultTab === 'documents'
            || (searchResultTab !== 'all'
              && searchTabs.find((tab) => tab.id === searchResultTab)?.count === 0)
        "
        class="flex min-h-80 items-center justify-center px-6 text-center"
      >
        <div class="max-w-sm">
          <p class="text-[13px] font-medium text-[#d7d8dc]">
            {{ searchResultTab === 'documents' ? 'No searchable documents' : 'No results found' }}
          </p>
          <p class="mt-1 text-[12px] text-[#777a83]">
            {{
              searchResultTab === 'documents'
                ? 'Document search will appear when workspace documents are connected.'
                : 'Try a different issue key, title, owner, status, or team.'
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
