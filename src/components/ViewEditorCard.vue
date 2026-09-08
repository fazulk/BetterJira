<script setup lang="ts">
import type { ActiveFilterChip } from '@/features/ticket-list/types'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SpaceIconPicker from './SpaceIconPicker'

const props = defineProps<{
  name: string
  description: string
  icon: string
  color: string
  saveDisabled?: boolean
  activeFilterChips?: readonly ActiveFilterChip[]
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
  'update:icon': [value: string]
  'update:color': [value: string]
  'openFilters': []
  'openSettings': []
  'removeFilter': [chip: ActiveFilterChip]
  'save': []
  'cancel': []
}>()

const iconPickerOpen = ref(false)
const rootElement = ref<HTMLElement | null>(null)
const displayedFilterChips = computed(() => props.activeFilterChips ?? [])

function updateName(event: Event): void {
  if (event.target instanceof HTMLInputElement) {
    emit('update:name', event.target.value)
  }
}

function updateDescription(event: Event): void {
  if (event.target instanceof HTMLInputElement) {
    emit('update:description', event.target.value)
  }
}

function toggleIconPicker(): void {
  iconPickerOpen.value = !iconPickerOpen.value
}

function handlePointerDown(event: PointerEvent): void {
  if (!iconPickerOpen.value) {
    return
  }

  const target = event.target
  if (target instanceof Node && rootElement.value?.contains(target)) {
    return
  }

  iconPickerOpen.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    iconPickerOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="rootElement" class="relative mx-1.5 mb-1.5 shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.035]">
    <div class="flex min-h-[6.25rem] items-start justify-between gap-4 px-3 py-3">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition hover:brightness-110"
          :style="{ backgroundColor: props.color }"
          title="Change icon and color"
          @click="toggleIconPicker"
        >
          <Icon :name="`lucide:${props.icon}`" class="h-5 w-5" aria-hidden="true" />
        </button>

        <div v-if="iconPickerOpen" class="absolute left-3 top-12 z-50">
          <SpaceIconPicker
            :icon="props.icon"
            :color="props.color"
            @update:icon="emit('update:icon', $event)"
            @update:color="emit('update:color', $event)"
          />
        </div>

        <div class="min-w-0 flex-1 space-y-2">
          <input
            :value="props.name"
            type="text"
            class="h-7 w-full bg-transparent text-[15px] font-medium text-[#f0f1f4] outline-none placeholder:text-[#71737c]"
            placeholder="All issues"
            @input="updateName"
          >
          <input
            :value="props.description"
            type="text"
            class="h-6 w-full bg-transparent text-[13px] text-[#aeb0b7] outline-none placeholder:text-[#5f626b]"
            placeholder="Description (optional)"
            @input="updateDescription"
          >
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="rounded-md px-2 py-1 text-[12px] text-[#d7d8dc] hover:bg-white/[0.05] hover:text-[#f0f1f4]"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-[12px] text-[#f0f1f4] hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="props.saveDisabled"
          @click="emit('save')"
        >
          Save
        </button>
      </div>
    </div>

    <div class="flex min-h-12 items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-2">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span
          v-for="filter in displayedFilterChips"
          :key="filter.id"
          class="inline-flex h-7 max-w-[18rem] items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.045] px-2 text-[12px] text-[#d7d8dc]"
        >
          <span class="truncate">{{ filter.fieldLabel }}</span>
          <span class="text-[#777a83]">is</span>
          <span class="truncate text-[#f0f1f4]">{{ filter.valueLabel }}</span>
          <button
            type="button"
            class="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-[#777a83] hover:bg-white/[0.08] hover:text-[#f0f1f4]"
            :aria-label="`Remove ${filter.fieldLabel} filter`"
            @click="emit('removeFilter', filter)"
          >
            ×
          </button>
        </span>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-[#8f9198] hover:bg-white/[0.08] hover:text-[#f0f1f4]"
          title="Filter"
          @click="emit('openFilters')"
        >
          <Icon name="lucide:list-filter" class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-[#8f9198] hover:bg-white/[0.08] hover:text-[#f0f1f4]"
          title="Settings"
          @click="emit('openSettings')"
        >
          <Icon name="lucide:sliders-horizontal" class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
