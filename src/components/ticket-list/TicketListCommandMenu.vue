<script setup lang="ts">
import type { CommandMenuItem } from '@/features/ticket-list/types'
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  query: string
  items: CommandMenuItem[]
  activeIndex: number
}>()

const emit = defineEmits<{
  'close': []
  'update:query': [value: string]
  'keydown': [event: KeyboardEvent]
  'activate': [index: number]
  'run': [item: CommandMenuItem]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

function emitQueryInput(event: Event): void {
  if (event.target instanceof HTMLInputElement) {
    emit('update:query', event.target.value)
  }
}

watch(
  () => props.activeIndex,
  (index) => {
    nextTick(() => {
      listRef.value
        ?.querySelector<HTMLElement>(`[data-command-index="${index}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    })
  },
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => inputRef.value?.focus())
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1 shadow-xl shadow-black/45"
        >
          <div class="border-b border-white/[0.06] p-2">
            <div
              class="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2"
            >
              <Icon
                name="lucide:search"
                class="h-3.5 w-3.5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <input
                ref="inputRef"
                :value="query"
                type="text"
                class="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                placeholder="Find an issue, project, or command..."
                @input="emitQueryInput"
                @keydown="emit('keydown', $event)"
              >
              <span
                class="hidden rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline"
              >Esc</span>
            </div>
          </div>

          <div ref="listRef" class="max-h-[28rem] overflow-y-auto py-2">
            <template v-if="items.length">
              <div v-for="(item, index) in items" :key="item.id">
                <div
                  v-if="index === 0 || item.section !== items[index - 1]?.section"
                  class="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600"
                >
                  {{ item.section }}
                </div>
                <button
                  type="button"
                  :data-command-index="index"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left transition"
                  :class="activeIndex === index ? 'bg-white/[0.06]' : 'hover:bg-white/[0.035]'"
                  @mouseenter="emit('activate', index)"
                  @click="emit('run', item)"
                >
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[12px]"
                    :class="
                      item.section === 'Issues'
                        ? 'border-white/[0.06] bg-white/[0.025] text-slate-500'
                        : 'border-white/[0.08] bg-white/[0.035] text-slate-400'
                    "
                  >
                    <Icon
                      v-if="item.icon === 'search'"
                      name="lucide:search"
                      class="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    <template v-else>{{ item.icon ?? '>' }}</template>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-medium text-slate-200">{{
                      item.label
                    }}</span>
                    <span class="mt-0.5 block truncate text-[12px] text-slate-500">{{
                      item.description
                    }}</span>
                  </span>
                </button>
              </div>
            </template>

            <div v-else class="px-6 py-10 text-center">
              <p class="text-sm font-medium text-slate-300">
                No results
              </p>
              <p class="mt-1 text-xs text-slate-600">
                Try a different issue key, project name, title, assignee, or command.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
