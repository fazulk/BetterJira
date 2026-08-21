// @vitest-environment happy-dom
/**
 * Regression tests for the description-deletion bug.
 *
 * The ticket detail view is seeded from the ticket LIST cache, whose entries
 * omit `description`/`descriptionAdf`. If the description editor is activated
 * (focus or `d` shortcut) while the real detail fetch is still in flight, the
 * draft stays empty; when the real description arrives it must still be synced
 * into the draft — otherwise the first keystroke makes the near-empty draft
 * "dirty" and the autosave PUTs it over the real Jira description.
 */
import type { JiraAdfDocument, JiraTicket } from '@/types/jira'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, watch } from 'vue'
import TicketDetailDescription from '@/components/ticket-detail/TicketDetailDescription.vue'

const harness = vi.hoisted(() => ({
  emitters: [] as Array<(event: string, ...args: unknown[]) => void>,
  lastModel: null as JiraAdfDocument | null,
  mutateAsync: vi.fn(),
}))

vi.mock('@/components/JiraDescriptionEditor.vue', () => ({
  default: defineComponent({
    name: 'JiraDescriptionEditor',
    props: {
      modelValue: { type: null, default: null },
      disabled: { type: Boolean, default: false },
      ticketKey: { type: String, default: '' },
      placeholder: { type: String, default: '' },
      showToolbar: { type: Boolean, default: false },
      attachments: { type: Array, default: () => [] },
      uploadImage: { type: Function, default: undefined },
    },
    emits: ['update:modelValue', 'preview-image'],
    setup(props, { emit }) {
      watch(() => props.modelValue, (value) => {
        harness.lastModel = value as JiraAdfDocument | null
      })
      harness.emitters.push(emit as (event: string, ...args: unknown[]) => void)
      return () => h('div')
    },
    methods: {
      focusEditor() {},
      blurEditor() {},
    },
  }),
}))

vi.mock('@/composables/useUpdateTicketDescription', () => ({
  useUpdateTicketDescription: () => ({ mutateAsync: harness.mutateAsync }),
}))

vi.mock('@/composables/useUploadTicketAttachment', () => ({
  useUploadTicketAttachment: () => ({ mutateAsync: vi.fn() }),
}))

function adfDoc(text: string): JiraAdfDocument {
  return {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] },
    ],
  }
}

function makeTicket(overrides: Partial<JiraTicket> & { key: string }): JiraTicket {
  return {
    summary: `Summary for ${overrides.key}`,
    status: 'To Do',
    statusCategory: 'new',
    inCurrentSprint: false,
    priority: 'Medium',
    issueType: 'Task',
    labels: [],
    spaceKey: 'SPACE',
    spaceName: 'Space',
    assignee: 'nobody',
    self: `https://jira.example.com/browse/${overrides.key}`,
    ...overrides,
  }
}

const PARTIAL_TICKET = makeTicket({ key: 'T-1' })
const FULL_TICKET = makeTicket({ key: 'T-1', descriptionAdf: adfDoc('real description') })

function mountComponent(ticket: JiraTicket, detailLoaded: boolean) {
  return mount(TicketDetailDescription, {
    props: { ticket, detailLoaded, isLocalTicket: false },
  })
}

async function typeIntoEditor(text: string): Promise<void> {
  const emit = harness.emitters.at(-1)
  if (!emit)
    throw new Error('Editor stub never mounted')
  const draft = JSON.parse(JSON.stringify(harness.lastModel ?? adfDoc(''))) as JiraAdfDocument
  draft.content[0]!.content = [{ type: 'text', text }]
  emit('update:modelValue', draft)
  await nextTick()
}

beforeEach(() => {
  vi.useFakeTimers()
  harness.mutateAsync.mockReset()
  harness.mutateAsync.mockResolvedValue(undefined)
  harness.emitters.length = 0
  harness.lastModel = null
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ticket detail description autosave', () => {
  it('resyncs the empty placeholder draft when the real description arrives while the editor is active', async () => {
    const wrapper = mountComponent(PARTIAL_TICKET, false)

    // User presses `d` / clicks into the description before the detail lands.
    wrapper.vm.focusDescriptionEditor()
    await nextTick()

    // Detail fetch resolves with the real description.
    await wrapper.setProps({ ticket: FULL_TICKET, detailLoaded: true })
    await nextTick()
    await nextTick()

    expect(harness.lastModel).toEqual(adfDoc('real description'))

    // A single keystroke must save the full description plus that keystroke,
    // not replace the description with just the keystroke.
    await typeIntoEditor('real description!')
    await vi.advanceTimersByTimeAsync(3000)

    expect(harness.mutateAsync).toHaveBeenCalledTimes(1)
    expect(harness.mutateAsync).toHaveBeenCalledWith({ key: 'T-1', descriptionAdf: adfDoc('real description!') })
  })

  it('does not clobber a genuinely dirty draft when a new ticket payload arrives', async () => {
    const wrapper = mountComponent(FULL_TICKET, true)
    await nextTick()

    await typeIntoEditor('my in-progress edit')

    // An SSE/refetch payload for the same ticket arrives mid-edit.
    await wrapper.setProps({ ticket: makeTicket({ key: 'T-1', descriptionAdf: adfDoc('server copy') }) })
    await nextTick()
    await nextTick()

    await vi.advanceTimersByTimeAsync(3000)

    expect(harness.mutateAsync).toHaveBeenCalledWith({ key: 'T-1', descriptionAdf: adfDoc('my in-progress edit') })
  })

  it('never saves while the detail has not loaded', async () => {
    mountComponent(PARTIAL_TICKET, false)
    await nextTick()

    await typeIntoEditor('typed against partial ticket')
    await vi.advanceTimersByTimeAsync(3000)

    expect(harness.mutateAsync).not.toHaveBeenCalled()
  })
})
