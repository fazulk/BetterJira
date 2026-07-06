import type { ComputedRef, Ref } from 'vue'
import type { LabelColors } from '~/shared/settings'
import { computed, ref } from 'vue'
import { useSpaceSettings } from '@/composables/useSpaceSettings'

const DEFAULT_LABEL_COLOR = '#ef4444'

export const LABEL_COLOR_PALETTE = [
  DEFAULT_LABEL_COLOR,
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
]

interface LabelColorMenuState {
  open: boolean
  label: string
  x: number
  y: number
}

interface LabelColorsApi {
  labelColorPalette: string[]
  labelColorMenuState: Ref<LabelColorMenuState>
  labelColors: ComputedRef<LabelColors>
  getLabelColor: (label: string) => string
  setLabelColor: (label: string, color: string) => void
  resetLabelColor: (label: string) => void
  openLabelColorMenu: (label: string, event: MouseEvent) => void
  closeLabelColorMenu: () => void
}

const labelColorMenuState = ref<LabelColorMenuState>({
  open: false,
  label: '',
  x: 0,
  y: 0,
})
let labelColorsApi: LabelColorsApi | null = null

export function normalizeLabelColorKey(label: string): string {
  return label.trim().toLowerCase()
}

export function normalizeLabelHexColor(color: string): string | null {
  const normalizedColor = color.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(normalizedColor) ? normalizedColor : null
}

export function addHexAlpha(color: string, alpha: string): string {
  return `${color}${alpha}`
}

function getFallbackLabelColor(label: string): string {
  const normalizedLabel = normalizeLabelColorKey(label)
  let hash = 0

  for (const character of normalizedLabel) {
    hash = (hash * 31 + character.charCodeAt(0)) % LABEL_COLOR_PALETTE.length
  }

  return LABEL_COLOR_PALETTE[hash] ?? DEFAULT_LABEL_COLOR
}

export function useLabelColors(): LabelColorsApi {
  if (labelColorsApi) {
    return labelColorsApi
  }

  const { settings, setLabelColors } = useSpaceSettings()
  const labelColors = computed<LabelColors>(() => settings.value.labelColors)

  function getLabelColor(label: string): string {
    const normalizedLabel = normalizeLabelColorKey(label)
    if (!normalizedLabel) {
      return DEFAULT_LABEL_COLOR
    }

    return labelColors.value[normalizedLabel] ?? getFallbackLabelColor(normalizedLabel)
  }

  function persistLabelColors(nextLabelColors: LabelColors): void {
    void setLabelColors(nextLabelColors).catch((error: unknown) => {
      console.error('Failed to save label colors:', error)
    })
  }

  function setLabelColor(label: string, color: string): void {
    const normalizedLabel = normalizeLabelColorKey(label)
    const normalizedColor = normalizeLabelHexColor(color)

    if (!normalizedLabel || !normalizedColor) {
      return
    }

    persistLabelColors({
      ...labelColors.value,
      [normalizedLabel]: normalizedColor,
    })
  }

  function resetLabelColor(label: string): void {
    const normalizedLabel = normalizeLabelColorKey(label)
    if (!normalizedLabel) {
      return
    }

    const nextLabelColors: LabelColors = { ...labelColors.value }
    delete nextLabelColors[normalizedLabel]
    persistLabelColors(nextLabelColors)
  }

  function openLabelColorMenu(label: string, event: MouseEvent): void {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    labelColorMenuState.value = {
      open: true,
      label: trimmedLabel,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function closeLabelColorMenu(): void {
    labelColorMenuState.value = {
      open: false,
      label: '',
      x: 0,
      y: 0,
    }
  }

  const api: LabelColorsApi = {
    labelColorPalette: LABEL_COLOR_PALETTE,
    labelColorMenuState,
    labelColors,
    getLabelColor,
    setLabelColor,
    resetLabelColor,
    openLabelColorMenu,
    closeLabelColorMenu,
  }

  labelColorsApi = api
  return api
}
