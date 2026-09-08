import type { StatusLane } from '@/composables/useStatusPreferences'
import type { TeamStatusSettingsRow } from '@/features/settings/settingsTypes'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, Teleport, vShow, watch, withDirectives } from 'vue'
import SettingsCyclesSection from '@/components/settings/SettingsCyclesSection'
import StatusIcon from '@/components/StatusIcon'
import { getStatusLaneLabel, useStatusPreferences } from '@/composables/useStatusPreferences'
import { useSettingsPageContext } from '@/features/settings/settingsPageContext'
import { breakpoints, colors } from '@/styles/tokens.stylex'

interface ColorMenuState {
  open: boolean
  row: TeamStatusSettingsRow | null
  x: number
  y: number
}

const styles = stylex.create({
  section: { maxWidth: '48rem', marginInline: 'auto' },
  blockGap: { marginTop: '1.25rem' },
  title: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600, color: colors['--color-slate-100'] },
  copy: { marginTop: '0.25rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  table: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)' },
  tableRow: { display: 'grid', gap: '0.5rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.75rem' },
  teamRowGrid: { gridTemplateColumns: { [breakpoints.md]: 'minmax(0, 1fr) 7rem 10rem' } },
  memberRowGrid: { gridTemplateColumns: { [breakpoints.md]: 'minmax(0, 1fr) 7rem 8rem' } },
  constrainedRowGrid: { gridTemplateColumns: { [breakpoints.md]: 'minmax(0, 1fr) 10rem' } },
  lastRow: { borderBottomWidth: 0 },
  rowTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  cellMuted: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  cellValue: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-400'], textAlign: { default: 'left', [breakpoints.md]: 'right' } },
  subtleDetail: { marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  multilineDetail: { marginTop: '0.125rem', fontSize: '0.75rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  minWidth: { minWidth: 0 },
  memberIssueCount: { textAlign: 'right' },
  empty: { paddingInline: '1rem', paddingBlock: '1.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  headerBetween: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' },
  resetButton: { flexShrink: 0, borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-100'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.04)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  laneList: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  lane: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  laneHeader: { borderRadius: '0.375rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  laneTitle: { fontSize: 13, fontWeight: 500, color: colors['--color-slate-400'] },
  statusRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '0.375rem', paddingInline: '0.75rem', paddingBlock: '0.625rem', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.025)' }, transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  statusDragOver: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  statusDragging: { opacity: 0.5 },
  dragHandle: { width: '0.75rem', flexShrink: 0, cursor: 'grab', userSelect: 'none', textAlign: 'center', color: { default: colors['--color-slate-700'], [stylex.when.ancestor(':hover')]: colors['--color-slate-500'] }, transitionProperty: 'color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  dragHandleDragging: { cursor: 'grabbing' },
  colorButton: { display: 'inline-flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' }, transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  statusContent: { minWidth: 0, flexGrow: '1', flexShrink: '1', flexBasis: '0%' },
  statusTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-100'] },
  noStatuses: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)', paddingInline: '1rem', paddingBlock: '1.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-500'] },
  menu: { position: 'fixed', zIndex: 100, width: '14rem', borderRadius: '1rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(17, 19, 26, 0.95)', padding: '0.75rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'], boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' },
  menuIntro: { minWidth: 0, marginBottom: '0.75rem' },
  menuEyebrow: { fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.18em', color: colors['--color-slate-500'] },
  menuStatus: { marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: colors['--color-slate-100'] },
  swatchGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.5rem' },
  swatch: { display: 'flex', width: '2rem', height: '2rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', transitionProperty: 'filter, transform, border-color, box-shadow', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  swatchHover: { filter: 'brightness(1.25)', transform: 'scale(1.05)' },
  swatchActive: { borderColor: 'transparent', boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.7), 0 0 0 4px #11131a' },
  customBox: { marginTop: '0.75rem', borderRadius: '1rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.625rem', paddingBlock: '0.5rem' },
  customLabel: { marginBottom: '0.375rem', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.18em', color: colors['--color-slate-500'] },
  customRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  colorInputLabel: { position: 'relative', width: '1.75rem', height: '1.75rem', flexShrink: 0, cursor: 'pointer', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.12)' },
  nativeColor: { position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', opacity: 0 },
  hexShell: { display: 'flex', flexGrow: '1', flexShrink: '1', flexBasis: '0%', alignItems: 'center', gap: '0.25rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.5rem', paddingBlock: '0.375rem' },
  hexShellFocused: { borderColor: 'rgba(255, 255, 255, 0.2)' },
  hash: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  hexInput: { 'width': '100%', 'borderWidth': 0, 'backgroundColor': 'transparent', 'fontSize': '0.75rem', 'lineHeight': '1rem', 'textTransform': 'uppercase', 'letterSpacing': '0.025em', 'color': colors['--color-slate-200'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  invalid: { marginTop: '0.375rem', fontSize: 11, color: colors['--color-rose-300'] },
  resetColorButton: { marginTop: '0.5rem', width: '100%', borderRadius: '1rem', paddingInline: '0.75rem', paddingBlock: '0.5rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-100'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})

const dynamicStyles = stylex.create({
  menuPosition: (left: number, top: number) => ({ left, top }),
  backgroundColor: (color: string) => ({ backgroundColor: { default: color } }),
})

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
    const customHexFocused = ref(false)
    const hoveredSwatch = ref<string | null>(null)

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

    watch(activeMenuColor, (color) => {
      if (colorMenu.value.open) {
        customHexDraft.value = color.replace('#', '')
      }
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

    function handleCustomHexInput(): void {
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
          <section {...stylex.attrs(styles.section)}>
            <div>
              <h2 {...stylex.attrs(styles.title)}>Teams</h2>
              <p {...stylex.attrs(styles.copy)}>Enabled spaces organized as workspace teams.</p>
            </div>
            <div {...stylex.attrs(styles.table, styles.blockGap)}>
              {teamSettingsRows.value.map((team, index) => (
                <div key={team.value} {...stylex.attrs(styles.tableRow, styles.teamRowGrid, index === teamSettingsRows.value.length - 1 && styles.lastRow)}>
                  <p {...stylex.attrs(styles.rowTitle)}>{team.label}</p>
                  <p {...stylex.attrs(styles.cellMuted)}>{team.value}</p>
                  <p {...stylex.attrs(styles.cellMuted)}>{team.detail}</p>
                </div>
              ))}
              {!teamSettingsRows.value.length && <p {...stylex.attrs(styles.empty)}>No enabled Jira spaces.</p>}
            </div>
          </section>,
          [[vShow, activeSettingsSection.value === 'team-overview']],
        )}

        {withDirectives(
          <section {...stylex.attrs(styles.section)}>
            <div>
              <h2 {...stylex.attrs(styles.title)}>Team members</h2>
              <p {...stylex.attrs(styles.copy)}>Membership is inferred from Jira issue assignees and enabled spaces.</p>
            </div>
            <div {...stylex.attrs(styles.table, styles.blockGap)}>
              {teamMemberRows.value.map((team, index) => (
                <div key={team.teamKey} {...stylex.attrs(styles.tableRow, styles.memberRowGrid, index === teamMemberRows.value.length - 1 && styles.lastRow)}>
                  <div {...stylex.attrs(styles.minWidth)}>
                    <p {...stylex.attrs(styles.rowTitle)}>{team.teamName}</p>
                    <p {...stylex.attrs(styles.subtleDetail)}>{team.topMembers}</p>
                  </div>
                  <p {...stylex.attrs(styles.cellMuted)}>
                    {team.memberCount}
                    {' '}
                    {team.memberCount === 1 ? 'member' : 'members'}
                  </p>
                  <p {...stylex.attrs(styles.cellMuted, styles.memberIssueCount)}>
                    {team.issueCount}
                    {' '}
                    {team.issueCount === 1 ? 'issue' : 'issues'}
                  </p>
                </div>
              ))}
              {!teamMemberRows.value.length && <p {...stylex.attrs(styles.empty)}>No enabled Jira spaces.</p>}
            </div>
          </section>,
          [[vShow, activeSettingsSection.value === 'team-members']],
        )}

        {withDirectives(
          <section {...stylex.attrs(styles.section)}>
            <div {...stylex.attrs(styles.headerBetween)}>
              <div>
                <h2 {...stylex.attrs(styles.title)}>Statuses</h2>
                <p {...stylex.attrs(styles.copy)}>Drag to set the default order. Click a status icon to change its color. Jira workflows stay managed in Jira.</p>
              </div>
              <button type="button" {...stylex.attrs(styles.resetButton)} onClick={resetStatusOrder}>
                Reset order
              </button>
            </div>

            {statusLaneSections.value.length
              ? (
                  <div {...stylex.attrs(styles.laneList, styles.blockGap)}>
                    {statusLaneSections.value.map(section => (
                      <section key={section.lane} {...stylex.attrs(styles.lane)}>
                        <div {...stylex.attrs(styles.laneHeader)}>
                          <h3 {...stylex.attrs(styles.laneTitle)}>{section.label}</h3>
                        </div>
                        {section.rows.map(statusRow => (
                          <div
                            key={statusRow.key}
                            {...stylex.attrs(
                              styles.statusRow,
                              stylex.defaultMarker(),
                              dragOverStatusKey.value === statusRow.key && styles.statusDragOver,
                              draggedStatusKey.value === statusRow.key && styles.statusDragging,
                            )}
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
                            <span {...stylex.attrs(styles.dragHandle, draggedStatusKey.value === statusRow.key && styles.dragHandleDragging)}>⁝⁝</span>
                            <button type="button" {...stylex.attrs(styles.colorButton)} aria-label={`Change color for ${statusRow.status}`} title="Change color" onClick={event => openColorMenu(statusRow, event)}>
                              <StatusIcon status={statusRow.status} statusCategory={statusRow.group} size={18} />
                            </button>
                            <div {...stylex.attrs(styles.statusContent)}>
                              <p {...stylex.attrs(styles.statusTitle)}>{statusRow.status}</p>
                              <p {...stylex.attrs(styles.subtleDetail)}>
                                {getIssueCountLabel(statusRow.issueCount)}
                                {' · '}
                                {statusGroupLabels[statusRow.group]}
                                {' · '}
                                {statusRow.spaces || 'No space'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                )
              : <p {...stylex.attrs(styles.noStatuses, styles.blockGap)}>No issue statuses loaded yet.</p>}

            <Teleport to="body">
              {colorMenu.value.open && (
                <div ref={colorMenuElement} {...stylex.attrs(styles.menu, dynamicStyles.menuPosition(colorMenuLeft.value, colorMenu.value.y))} role="menu">
                  <div {...stylex.attrs(styles.menuIntro)}>
                    <div {...stylex.attrs(styles.menuEyebrow)}>Status color</div>
                    <div {...stylex.attrs(styles.menuStatus)}>{colorMenu.value.row?.status}</div>
                  </div>

                  <div {...stylex.attrs(styles.swatchGrid)} aria-label="Preset status colors">
                    {statusColorPalette.map(color => (
                      <button
                        key={color}
                        type="button"
                        {...stylex.attrs(
                          styles.swatch,
                          hoveredSwatch.value === color && styles.swatchHover,
                          activeMenuColor.value === color && styles.swatchActive,
                          dynamicStyles.backgroundColor(color),
                        )}
                        aria-label={`Set ${colorMenu.value.row?.status} to ${color}`}
                        onPointerenter={() => { hoveredSwatch.value = color }}
                        onPointerleave={() => { hoveredSwatch.value = null }}
                        onClick={() => chooseMenuColor(color)}
                      />
                    ))}
                  </div>

                  <div {...stylex.attrs(styles.customBox)}>
                    <div {...stylex.attrs(styles.customLabel)}>Custom</div>
                    <div {...stylex.attrs(styles.customRow)}>
                      <label {...stylex.attrs(styles.colorInputLabel, dynamicStyles.backgroundColor(customHexPreview.value))}>
                        <input type="color" {...stylex.attrs(styles.nativeColor)} value={customHexPreview.value} aria-label="Pick custom status color" onInput={applyNativeColor} />
                      </label>
                      <div
                        {...stylex.attrs(styles.hexShell, customHexFocused.value && styles.hexShellFocused)}
                        onFocusin={() => { customHexFocused.value = true }}
                        onFocusout={() => { customHexFocused.value = false }}
                      >
                        <span {...stylex.attrs(styles.hash)}>#</span>
                        <input v-model={customHexDraft.value} type="text" maxlength="7" spellcheck={false} placeholder="rrggbb" {...stylex.attrs(styles.hexInput)} aria-label="Custom hex color" onInput={handleCustomHexInput} onKeydown={handleCustomHexKeydown} />
                      </div>
                    </div>
                    {!isCustomHexValid.value && customHexDraft.value.length > 0 && <p {...stylex.attrs(styles.invalid)}>Enter a 6-digit hex color.</p>}
                  </div>

                  <button type="button" {...stylex.attrs(styles.resetColorButton)} onClick={resetMenuColor}>
                    Reset to default color
                  </button>
                </div>
              )}
            </Teleport>
          </section>,
          [[vShow, activeSettingsSection.value === 'team-statuses']],
        )}

        {withDirectives(
          <section {...stylex.attrs(styles.section)}>
            <div>
              <h2 {...stylex.attrs(styles.title)}>{constrainedSettingsSectionTitle.value}</h2>
              <p {...stylex.attrs(styles.copy)}>{constrainedSettingsSectionDescription.value}</p>
            </div>
            {activeSettingsSection.value === 'team-cycles'
              ? <SettingsCyclesSection />
              : (
                  <div {...stylex.attrs(styles.table, styles.blockGap)}>
                    {constrainedSettingsRows.value.map((row, index) => (
                      <div key={row.label} {...stylex.attrs(styles.tableRow, styles.constrainedRowGrid, index === constrainedSettingsRows.value.length - 1 && styles.lastRow)}>
                        <div {...stylex.attrs(styles.minWidth)}>
                          <p {...stylex.attrs(styles.rowTitle)}>{row.label}</p>
                          <p {...stylex.attrs(styles.multilineDetail)}>{row.detail}</p>
                        </div>
                        <p {...stylex.attrs(styles.cellValue)}>{row.value}</p>
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
