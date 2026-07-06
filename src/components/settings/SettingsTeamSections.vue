<script setup lang="ts">
import type { StatusLane } from '@/composables/useStatusPreferences'
import type { TeamStatusSettingsRow } from '@/features/settings/settingsTypes'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import StatusIcon from '@/components/StatusIcon.vue'
import { getStatusLaneLabel, useStatusPreferences } from '@/composables/useStatusPreferences'
import { useSettingsPageContext } from '@/features/settings/settingsPageContext'

const {
  activeSettingsSection,
  constrainedSettingsRows,
  constrainedSettingsSectionDescription,
  constrainedSettingsSectionTitle,
  statusGroupLabels,
  teamMemberRows,
  teamSettingsRows,
  teamStatusRows,
} = useSettingsPageContext()

const {
  statusColorPalette,
  getStatusColor,
  resetStatusColor,
  setStatusColor,
  setStatusOrder,
} = useStatusPreferences()

const statusLaneOrder: StatusLane[] = ['triage', 'backlog', 'unstarted', 'started', 'completed']
const draggedStatusKey = ref<string | null>(null)
const dragOverStatusKey = ref<string | null>(null)

interface ColorMenuState {
  open: boolean
  row: TeamStatusSettingsRow | null
  x: number
  y: number
}
const colorMenu = ref<ColorMenuState>({ open: false, row: null, x: 0, y: 0 })
const colorMenuElement = ref<HTMLElement | null>(null)
const customHexDraft = ref('')

function normalizeHexInput(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return /^#[0-9a-f]{6}$/.test(withHash) ? withHash : null
}

const statusLaneSections = computed(() => statusLaneOrder
  .map(lane => ({
    lane,
    label: getStatusLaneLabel(lane),
    rows: teamStatusRows.value.filter(row => row.lane === lane),
  }))
  .filter(section => section.rows.length > 0))

const activeMenuColor = computed(() => {
  const row = colorMenu.value.row
  return row ? getStatusColor(row.status, row.group) : '#000000'
})

const colorMenuLeft = computed(() => {
  if (typeof window === 'undefined') {
    return colorMenu.value.x
  }
  return Math.min(colorMenu.value.x, window.innerWidth - 232)
})

function getIssueCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'issue' : 'issues'}`
}

function startStatusDrag(statusKey: string, event: DragEvent): void {
  draggedStatusKey.value = statusKey
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', statusKey)
  }
}

function setStatusDragOver(statusKey: string): void {
  if (draggedStatusKey.value && draggedStatusKey.value !== statusKey) {
    dragOverStatusKey.value = statusKey
  }
}

function finishStatusDrag(): void {
  draggedStatusKey.value = null
  dragOverStatusKey.value = null
}

function dropStatusRow(targetStatusKey: string): void {
  const sourceStatusKey = draggedStatusKey.value
  if (!sourceStatusKey || sourceStatusKey === targetStatusKey) {
    finishStatusDrag()
    return
  }

  const currentKeys = teamStatusRows.value.map(row => row.key)
  const nextKeys = currentKeys.filter(key => key !== sourceStatusKey)
  const targetIndex = nextKeys.indexOf(targetStatusKey)
  if (targetIndex === -1) {
    finishStatusDrag()
    return
  }

  nextKeys.splice(targetIndex, 0, sourceStatusKey)
  setStatusOrder(nextKeys)
  finishStatusDrag()
}

function resetStatusOrder(): void {
  setStatusOrder([])
}

function openColorMenu(row: TeamStatusSettingsRow, event: MouseEvent): void {
  customHexDraft.value = getStatusColor(row.status, row.group).replace('#', '')
  const trigger = event.currentTarget
  if (trigger instanceof HTMLElement) {
    const rect = trigger.getBoundingClientRect()
    colorMenu.value = { open: true, row, x: rect.left, y: rect.bottom + 6 }
    return
  }
  colorMenu.value = { open: true, row, x: event.clientX, y: event.clientY }
}

const customHexPreview = computed(() => normalizeHexInput(customHexDraft.value) ?? activeMenuColor.value)
const isCustomHexValid = computed(() => normalizeHexInput(customHexDraft.value) !== null)

watch(activeMenuColor, (color) => {
  if (colorMenu.value.open) {
    customHexDraft.value = color.replace('#', '')
  }
})

function applyCustomHex(): void {
  const normalizedColor = normalizeHexInput(customHexDraft.value)
  const row = colorMenu.value.row
  if (!normalizedColor || !row) {
    return
  }
  setStatusColor(row.status, row.group, normalizedColor)
}

function applyNativeColor(event: Event): void {
  const normalizedColor = readColorInputValue(event)
  const row = colorMenu.value.row
  if (!normalizedColor || !row) {
    return
  }
  customHexDraft.value = normalizedColor.replace('#', '')
  setStatusColor(row.status, row.group, normalizedColor)
}

function closeColorMenu(): void {
  colorMenu.value = { open: false, row: null, x: 0, y: 0 }
}

function chooseMenuColor(color: string): void {
  const row = colorMenu.value.row
  if (!row) {
    return
  }
  setStatusColor(row.status, row.group, color)
}

function resetMenuColor(): void {
  const row = colorMenu.value.row
  if (!row) {
    return
  }
  resetStatusColor(row.status, row.group)
  closeColorMenu()
}

function readColorInputValue(event: Event): string | null {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return null
  }

  const normalizedColor = target.value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(normalizedColor) ? normalizedColor : null
}

function handleColorMenuPointerDown(event: PointerEvent): void {
  if (!colorMenu.value.open) {
    return
  }
  const target = event.target
  if (target instanceof Node && colorMenuElement.value?.contains(target)) {
    return
  }
  closeColorMenu()
}

function handleColorMenuKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeColorMenu()
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handleColorMenuPointerDown)
  window.addEventListener('keydown', handleColorMenuKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleColorMenuPointerDown)
  window.removeEventListener('keydown', handleColorMenuKeydown)
})
</script>

<template>
  <section v-show="activeSettingsSection === 'team-overview'" class="mx-auto max-w-3xl space-y-5">
    <div>
      <h2 class="text-xl font-semibold text-slate-100">
        Teams
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        Enabled spaces organized as workspace teams.
      </p>
    </div>

    <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div
        v-for="team in teamSettingsRows"
        :key="team.value"
        class="grid gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_7rem_10rem]"
      >
        <p class="truncate text-sm font-medium text-slate-200">
          {{ team.label }}
        </p>
        <p class="text-sm text-slate-500">
          {{ team.value }}
        </p>
        <p class="text-sm text-slate-500">
          {{ team.detail }}
        </p>
      </div>
      <p v-if="!teamSettingsRows.length" class="px-4 py-6 text-sm text-slate-500">
        No enabled Jira spaces.
      </p>
    </div>
  </section>

  <section v-show="activeSettingsSection === 'team-members'" class="mx-auto max-w-3xl space-y-5">
    <div>
      <h2 class="text-xl font-semibold text-slate-100">
        Team members
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        Membership is inferred from Jira issue assignees and enabled spaces.
      </p>
    </div>

    <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div
        v-for="team in teamMemberRows"
        :key="team.teamKey"
        class="grid gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_7rem_8rem]"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-slate-200">
            {{ team.teamName }}
          </p>
          <p class="mt-0.5 truncate text-xs text-slate-500">
            {{ team.topMembers }}
          </p>
        </div>
        <p class="text-sm text-slate-500">
          {{ team.memberCount }} {{ team.memberCount === 1 ? 'member' : 'members' }}
        </p>
        <p class="text-right text-sm text-slate-500">
          {{ team.issueCount }} {{ team.issueCount === 1 ? 'issue' : 'issues' }}
        </p>
      </div>
      <p v-if="!teamMemberRows.length" class="px-4 py-6 text-sm text-slate-500">
        No enabled Jira spaces.
      </p>
    </div>
  </section>

  <section v-show="activeSettingsSection === 'team-statuses'" class="mx-auto max-w-3xl space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-100">
          Statuses
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Drag to set the default order. Click a status icon to change its color. Jira workflows stay managed in Jira.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-md border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100"
        @click="resetStatusOrder"
      >
        Reset order
      </button>
    </div>

    <div v-if="statusLaneSections.length" class="space-y-6">
      <section v-for="section in statusLaneSections" :key="section.lane" class="space-y-1">
        <div class="rounded-md bg-white/[0.03] px-3 py-2">
          <h3 class="text-[13px] font-medium text-slate-400">
            {{ section.label }}
          </h3>
        </div>

        <div
          v-for="statusRow in section.rows"
          :key="statusRow.key"
          class="group flex items-center gap-3 rounded-md px-3 py-2.5 transition"
          :class="[
            dragOverStatusKey === statusRow.key ? 'bg-white/[0.06]' : 'hover:bg-white/[0.025]',
            draggedStatusKey === statusRow.key ? 'opacity-50' : '',
          ]"
          draggable="true"
          @dragstart="startStatusDrag(statusRow.key, $event)"
          @dragenter.prevent="setStatusDragOver(statusRow.key)"
          @dragover.prevent="setStatusDragOver(statusRow.key)"
          @drop.prevent="dropStatusRow(statusRow.key)"
          @dragend="finishStatusDrag"
        >
          <span class="w-3 shrink-0 cursor-grab select-none text-center text-slate-700 transition group-hover:text-slate-500 active:cursor-grabbing">⁝⁝</span>

          <button
            type="button"
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-white/[0.06]"
            :aria-label="`Change color for ${statusRow.status}`"
            title="Change color"
            @click="openColorMenu(statusRow, $event)"
          >
            <StatusIcon :status="statusRow.status" :status-category="statusRow.group" :size="18" />
          </button>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-100">
              {{ statusRow.status }}
            </p>
            <p class="mt-0.5 truncate text-xs text-slate-500">
              {{ getIssueCountLabel(statusRow.issueCount) }} · {{ statusGroupLabels[statusRow.group] }} · {{ statusRow.spaces || 'No space' }}
            </p>
          </div>
        </div>
      </section>
    </div>
    <p v-else class="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-sm text-slate-500">
      No issue statuses loaded yet.
    </p>

    <Teleport to="body">
      <div
        v-if="colorMenu.open"
        ref="colorMenuElement"
        class="fixed z-[100] w-56 rounded-2xl border border-white/[0.08] bg-[#11131a]/95 p-3 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur"
        :style="{ left: `${colorMenuLeft}px`, top: `${colorMenu.y}px` }"
        role="menu"
      >
        <div class="mb-3 min-w-0">
          <div class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Status color
          </div>
          <div class="mt-1 truncate font-semibold text-slate-100">
            {{ colorMenu.row?.status }}
          </div>
        </div>

        <div class="grid grid-cols-5 gap-2" aria-label="Preset status colors">
          <button
            v-for="color in statusColorPalette"
            :key="color"
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-2xl border transition hover:scale-105 hover:brightness-125"
            :class="activeMenuColor === color ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#11131a] border-transparent' : 'border-white/10'"
            :style="{ backgroundColor: color }"
            :aria-label="`Set ${colorMenu.row?.status} to ${color}`"
            @click="chooseMenuColor(color)"
          />
        </div>

        <div class="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
          <div class="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Custom
          </div>
          <div class="flex items-center gap-2">
            <label class="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/[0.12]" :style="{ backgroundColor: customHexPreview }">
              <input
                type="color"
                class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                :value="customHexPreview"
                aria-label="Pick custom status color"
                @input="applyNativeColor"
              >
            </label>
            <div class="flex flex-1 items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 focus-within:border-white/[0.2]">
              <span class="text-xs text-slate-500">#</span>
              <input
                v-model="customHexDraft"
                type="text"
                maxlength="7"
                spellcheck="false"
                placeholder="rrggbb"
                class="w-full bg-transparent text-xs uppercase tracking-wide text-slate-200 outline-none placeholder:text-slate-600"
                aria-label="Custom hex color"
                @input="applyCustomHex"
                @keydown.enter.prevent="applyCustomHex"
              >
            </div>
          </div>
          <p v-if="!isCustomHexValid && customHexDraft.length > 0" class="mt-1.5 text-[11px] text-rose-300">
            Enter a 6-digit hex color.
          </p>
        </div>

        <button
          type="button"
          class="mt-2 w-full rounded-2xl px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100"
          @click="resetMenuColor"
        >
          Reset to default color
        </button>
      </div>
    </Teleport>
  </section>

  <section v-show="activeSettingsSection === 'team-workflows' || activeSettingsSection === 'team-triage' || activeSettingsSection === 'team-cycles' || activeSettingsSection === 'team-ai'" class="mx-auto max-w-3xl space-y-5">
    <div>
      <h2 class="text-xl font-semibold text-slate-100">
        {{ constrainedSettingsSectionTitle }}
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        {{ constrainedSettingsSectionDescription }}
      </p>
    </div>

    <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div
        v-for="row in constrainedSettingsRows"
        :key="row.label"
        class="grid gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_10rem]"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-slate-200">
            {{ row.label }}
          </p>
          <p class="mt-0.5 text-xs leading-5 text-slate-500">
            {{ row.detail }}
          </p>
        </div>
        <p class="text-left text-sm text-slate-400 md:text-right">
          {{ row.value }}
        </p>
      </div>
    </div>
  </section>
</template>
