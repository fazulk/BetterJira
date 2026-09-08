import type { StatusLane } from '@/composables/useStatusPreferences'
import type { TeamStatusSettingsRow } from '@/features/settings/settingsTypes'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, Teleport, vShow, withDirectives } from 'vue'
import SettingsCyclesSection from '@/components/settings/SettingsCyclesSection'
import StatusIcon from '@/components/StatusIcon'
import { getStatusLaneLabel, useStatusPreferences } from '@/composables/useStatusPreferences'
import { useSettingsPageContext } from '@/features/settings/settingsPageContext'

interface ColorMenuState {
  open: boolean
  row: TeamStatusSettingsRow | null
  x: number
  y: number
}

function normalizeHexInput(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return /^#[0-9a-f]{6}$/.test(withHash) ? withHash : null
}

function readColorInputValue(event: Event): string | null {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return null
  }

  const normalizedColor = target.value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(normalizedColor) ? normalizedColor : null
}

function readInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
}

export default defineComponent({
  name: 'SettingsTeamSections',
  setup() {
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
    const colorMenu = ref<ColorMenuState>({ open: false, row: null, x: 0, y: 0 })
    const colorMenuElement = ref<HTMLElement | null>(null)
    const customHexDraft = ref('')

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

    const customHexPreview = computed(() => normalizeHexInput(customHexDraft.value) ?? activeMenuColor.value)
    const isCustomHexValid = computed(() => normalizeHexInput(customHexDraft.value) !== null)

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

    function handleCustomHexInput(event: Event): void {
      customHexDraft.value = readInputValue(event)
      applyCustomHex()
    }

    function handleCustomHexKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Enter') {
        return
      }
      event.preventDefault()
      applyCustomHex()
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

    return () => (
      <>
        {withDirectives(
          <section class="mx-auto max-w-3xl space-y-5">
            <div>
              <h2 class="text-xl font-semibold text-slate-100">Teams</h2>
              <p class="mt-1 text-sm text-slate-500">Enabled spaces organized as workspace teams.</p>
            </div>
            <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
              {teamSettingsRows.value.map(team => (
                <div key={team.value} class="grid gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_7rem_10rem]">
                  <p class="truncate text-sm font-medium text-slate-200">{team.label}</p>
                  <p class="text-sm text-slate-500">{team.value}</p>
                  <p class="text-sm text-slate-500">{team.detail}</p>
                </div>
              ))}
              {!teamSettingsRows.value.length && <p class="px-4 py-6 text-sm text-slate-500">No enabled Jira spaces.</p>}
            </div>
          </section>,
          [[vShow, activeSettingsSection.value === 'team-overview']],
        )}

        {withDirectives(
          <section class="mx-auto max-w-3xl space-y-5">
            <div>
              <h2 class="text-xl font-semibold text-slate-100">Team members</h2>
              <p class="mt-1 text-sm text-slate-500">Membership is inferred from Jira issue assignees and enabled spaces.</p>
            </div>
            <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
              {teamMemberRows.value.map(team => (
                <div key={team.teamKey} class="grid gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_7rem_8rem]">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-200">{team.teamName}</p>
                    <p class="mt-0.5 truncate text-xs text-slate-500">{team.topMembers}</p>
                  </div>
                  <p class="text-sm text-slate-500">
                    {team.memberCount}
                    {' '}
                    {team.memberCount === 1 ? 'member' : 'members'}
                  </p>
                  <p class="text-right text-sm text-slate-500">
                    {team.issueCount}
                    {' '}
                    {team.issueCount === 1 ? 'issue' : 'issues'}
                  </p>
                </div>
              ))}
              {!teamMemberRows.value.length && <p class="px-4 py-6 text-sm text-slate-500">No enabled Jira spaces.</p>}
            </div>
          </section>,
          [[vShow, activeSettingsSection.value === 'team-members']],
        )}

        {withDirectives(
          <section class="mx-auto max-w-3xl space-y-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-semibold text-slate-100">Statuses</h2>
                <p class="mt-1 text-sm text-slate-500">Drag to set the default order. Click a status icon to change its color. Jira workflows stay managed in Jira.</p>
              </div>
              <button type="button" class="shrink-0 rounded-md border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100" onClick={resetStatusOrder}>
                Reset order
              </button>
            </div>

            {statusLaneSections.value.length
              ? (
                  <div class="space-y-6">
                    {statusLaneSections.value.map(section => (
                      <section key={section.lane} class="space-y-1">
                        <div class="rounded-md bg-white/[0.03] px-3 py-2">
                          <h3 class="text-[13px] font-medium text-slate-400">{section.label}</h3>
                        </div>
                        {section.rows.map(statusRow => (
                          <div
                            key={statusRow.key}
                            class={[
                              'group flex items-center gap-3 rounded-md px-3 py-2.5 transition',
                              dragOverStatusKey.value === statusRow.key ? 'bg-white/[0.06]' : 'hover:bg-white/[0.025]',
                              draggedStatusKey.value === statusRow.key ? 'opacity-50' : '',
                            ]}
                            draggable="true"
                            onDragstart={event => startStatusDrag(statusRow.key, event)}
                            onDragenter={(event) => {
                              event.preventDefault()
                              setStatusDragOver(statusRow.key)
                            }}
                            onDragover={(event) => {
                              event.preventDefault()
                              setStatusDragOver(statusRow.key)
                            }}
                            onDrop={(event) => {
                              event.preventDefault()
                              dropStatusRow(statusRow.key)
                            }}
                            onDragend={finishStatusDrag}
                          >
                            <span class="w-3 shrink-0 cursor-grab select-none text-center text-slate-700 transition group-hover:text-slate-500 active:cursor-grabbing">⁝⁝</span>
                            <button type="button" class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-white/[0.06]" aria-label={`Change color for ${statusRow.status}`} title="Change color" onClick={event => openColorMenu(statusRow, event)}>
                              <StatusIcon status={statusRow.status} statusCategory={statusRow.group} size={18} />
                            </button>
                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-slate-100">{statusRow.status}</p>
                              <p class="mt-0.5 truncate text-xs text-slate-500">
                                {getIssueCountLabel(statusRow.issueCount)}
                                {' '}
                                ·
                                {statusGroupLabels[statusRow.group]}
                                {' '}
                                ·
                                {statusRow.spaces || 'No space'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                )
              : <p class="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-sm text-slate-500">No issue statuses loaded yet.</p>}

            <Teleport to="body">
              {colorMenu.value.open && (
                <div ref={colorMenuElement} class="fixed z-[100] w-56 rounded-2xl border border-white/[0.08] bg-[#11131a]/95 p-3 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur" style={{ left: `${colorMenuLeft.value}px`, top: `${colorMenu.value.y}px` }} role="menu">
                  <div class="mb-3 min-w-0">
                    <div class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Status color</div>
                    <div class="mt-1 truncate font-semibold text-slate-100">{colorMenu.value.row?.status}</div>
                  </div>

                  <div class="grid grid-cols-5 gap-2" aria-label="Preset status colors">
                    {statusColorPalette.map(color => (
                      <button key={color} type="button" class={['flex h-8 w-8 items-center justify-center rounded-2xl border transition hover:scale-105 hover:brightness-125', activeMenuColor.value === color ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#11131a] border-transparent' : 'border-white/10']} style={{ backgroundColor: color }} aria-label={`Set ${colorMenu.value.row?.status} to ${color}`} onClick={() => chooseMenuColor(color)} />
                    ))}
                  </div>

                  <div class="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
                    <div class="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Custom</div>
                    <div class="flex items-center gap-2">
                      <label class="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/[0.12]" style={{ backgroundColor: customHexPreview.value }}>
                        <input type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={customHexPreview.value} aria-label="Pick custom status color" onInput={applyNativeColor} />
                      </label>
                      <div class="flex flex-1 items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 focus-within:border-white/[0.2]">
                        <span class="text-xs text-slate-500">#</span>
                        <input value={customHexDraft.value} type="text" maxlength="7" spellcheck={false} placeholder="rrggbb" class="w-full bg-transparent text-xs uppercase tracking-wide text-slate-200 outline-none placeholder:text-slate-600" aria-label="Custom hex color" onInput={handleCustomHexInput} onKeydown={handleCustomHexKeydown} />
                      </div>
                    </div>
                    {!isCustomHexValid.value && customHexDraft.value.length > 0 && <p class="mt-1.5 text-[11px] text-rose-300">Enter a 6-digit hex color.</p>}
                  </div>

                  <button type="button" class="mt-2 w-full rounded-2xl px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100" onClick={resetMenuColor}>
                    Reset to default color
                  </button>
                </div>
              )}
            </Teleport>
          </section>,
          [[vShow, activeSettingsSection.value === 'team-statuses']],
        )}

        {withDirectives(
          <section class="mx-auto max-w-3xl space-y-5">
            <div>
              <h2 class="text-xl font-semibold text-slate-100">{constrainedSettingsSectionTitle.value}</h2>
              <p class="mt-1 text-sm text-slate-500">{constrainedSettingsSectionDescription.value}</p>
            </div>
            {activeSettingsSection.value === 'team-cycles'
              ? <SettingsCyclesSection />
              : (
                  <div class="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    {constrainedSettingsRows.value.map(row => (
                      <div key={row.label} class="grid gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_10rem]">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-slate-200">{row.label}</p>
                          <p class="mt-0.5 text-xs leading-5 text-slate-500">{row.detail}</p>
                        </div>
                        <p class="text-left text-sm text-slate-400 md:text-right">{row.value}</p>
                      </div>
                    ))}
                  </div>
                )}
          </section>,
          [[vShow, activeSettingsSection.value === 'team-workflows' || activeSettingsSection.value === 'team-triage' || activeSettingsSection.value === 'team-cycles' || activeSettingsSection.value === 'team-ai']],
        )}
      </>
    )
  },
})
