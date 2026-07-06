<script setup lang="ts">
import { computed, ref } from 'vue'
import { SPACE_COLOR_SWATCHES } from '@/utils/spaceAppearance'
import { SPACE_ICON_NAMES } from '@/utils/spaceIconNames'

const props = defineProps<{
  icon: string | null
  color: string
}>()

const emit = defineEmits<{
  'update:icon': [icon: string]
  'update:color': [color: string]
}>()

const MAX_RESULTS = 120

const search = ref('')

const filteredIcons = computed(() => {
  const query = search.value.trim().toLowerCase()
  const matches = query
    ? SPACE_ICON_NAMES.filter(name => name.includes(query))
    : SPACE_ICON_NAMES
  return matches.slice(0, MAX_RESULTS)
})

const isPresetColor = computed(() => SPACE_COLOR_SWATCHES.some(swatch => swatch.value === props.color))

function formatIconLabel(name: string): string {
  return name.replace(/-/g, ' ')
}

function onCustomColorInput(event: Event): void {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    emit('update:color', target.value)
  }
}
</script>

<template>
  <div class="w-[420px] max-w-[92vw] overflow-hidden rounded-xl border border-white/[0.08] bg-[#16181d] text-[#d7d8dc] shadow-2xl shadow-black/50">
    <div class="border-b border-white/[0.06] px-3 pt-2.5">
      <span class="inline-block border-b-2 border-[#5e6ad2] pb-2 text-[13px] font-medium text-[#f0f1f4]">Icons</span>
    </div>

    <div class="flex items-center gap-2 border-b border-white/[0.06] px-3 py-3">
      <button
        v-for="swatch in SPACE_COLOR_SWATCHES"
        :key="swatch.value"
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:scale-110"
        :style="{ backgroundColor: swatch.value }"
        :title="swatch.label"
        :aria-label="swatch.label"
        @click="emit('update:color', swatch.value)"
      >
        <Icon v-if="color === swatch.value" name="lucide:check" class="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </button>

      <span class="mx-0.5 h-6 w-px shrink-0 bg-white/[0.1]" aria-hidden="true" />

      <label
        class="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full"
        :style="{ background: 'conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #38bdf8, #818cf8, #f472b6, #f87171)' }"
        title="Custom color"
      >
        <Icon v-if="!isPresetColor" name="lucide:check" class="h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />
        <input
          type="color"
          class="absolute inset-0 cursor-pointer opacity-0"
          :value="color"
          aria-label="Custom color"
          @input="onCustomColorInput"
        >
      </label>
    </div>

    <div class="px-3 py-2.5">
      <input
        v-model="search"
        type="text"
        placeholder="Search icons..."
        class="h-9 w-full rounded-md border border-white/[0.08] bg-black/30 px-3 text-[13px] text-[#e6e7ea] placeholder:text-[#6f727b] focus:border-[#5e6ad2] focus:outline-none"
      >
    </div>

    <div class="max-h-[280px] overflow-y-auto px-2 pb-3">
      <div v-if="filteredIcons.length === 0" class="px-2 py-6 text-center text-[12px] text-[#6f727b]">
        No icons match "{{ search }}"
      </div>
      <div v-else class="grid grid-cols-9 gap-1">
        <button
          v-for="name in filteredIcons"
          :key="name"
          type="button"
          class="flex aspect-square items-center justify-center rounded-md transition hover:bg-white/[0.08]"
          :class="icon === name ? 'bg-white/[0.1] ring-1 ring-inset ring-white/20' : ''"
          :title="formatIconLabel(name)"
          :aria-label="formatIconLabel(name)"
          @click="emit('update:icon', name)"
        >
          <Icon :name="`lucide:${name}`" class="h-4 w-4" :style="{ color }" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
