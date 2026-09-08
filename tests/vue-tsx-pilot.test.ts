// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CreateTicketDueDateField from '@/components/create-ticket/CreateTicketDueDateField'
import LabelPill from '@/components/LabelPill'
import StatusIcon from '@/components/StatusIcon'
import ViewHeaderBreadcrumb from '@/components/ViewHeaderBreadcrumb'

const openLabelColorMenu = vi.fn()

vi.mock('@/composables/useLabelColors', () => ({
  useLabelColors: () => ({
    getLabelColor: (label: string) => label === 'Beta' ? '#00ff00' : '#ff0000',
    openLabelColorMenu,
  }),
}))

vi.mock('@/composables/useStatusPreferences', () => ({
  getStatusLane: (status: string) => status === 'Done' ? 'completed' : 'started',
  getStatusProgress: (status: string) => status === 'Code Review' ? 0.5 : 0.2,
  useStatusPreferences: () => ({
    getStatusColor: (status: string) => status === 'Done' ? '#6366f1' : '#f59e0b',
  }),
}))

describe('vue TSX pilot components', () => {
  it('renders StatusIcon defaults and reacts to status prop changes', async () => {
    const wrapper = mount(StatusIcon, {
      props: {
        status: 'Code Review',
        statusCategory: 'indeterminate',
      },
    })

    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('16')
    expect(svg.attributes('height')).toBe('16')
    expect(wrapper.find('path[d^="M 7 7"]').exists()).toBe(true)
    expect(wrapper.find('circle[stroke="#f59e0b"]').exists()).toBe(true)

    await wrapper.setProps({
      status: 'Done',
      statusCategory: 'done',
    })

    expect(wrapper.find('circle[fill="#6366f1"]').exists()).toBe(true)
    expect(wrapper.find('path[stroke="#0b0c0f"]').exists()).toBe(true)
    expect(wrapper.find('path[d^="M 7 7"]').exists()).toBe(false)
  })

  it('keeps LabelPill Boolean defaults and updates rendered label state', async () => {
    const wrapper = mount(LabelPill, {
      props: {
        label: 'Alpha',
      },
    })

    expect(wrapper.props('dense')).toBe(false)
    expect(wrapper.find('[data-label-dot]').attributes('style')).toContain('#ff0000')
    expect(wrapper.text()).toBe('Alpha')

    await wrapper.setProps({
      dense: true,
      label: 'Beta',
      showDot: false,
    })

    expect(wrapper.props('dense')).toBe(true)
    expect(wrapper.find('[data-label-dot]').exists()).toBe(false)
    expect(wrapper.text()).toBe('Beta')

    await wrapper.trigger('contextmenu')
    expect(openLabelColorMenu).toHaveBeenCalledWith('Beta', expect.objectContaining({ type: 'contextmenu' }))
  })

  it('preserves ViewHeaderBreadcrumb slots and reactive icon rendering', async () => {
    const wrapper = mount(ViewHeaderBreadcrumb, {
      props: {
        fallback: 'B',
      },
      slots: {
        default: '<strong>Backlog</strong>',
      },
    })

    expect(wrapper.text()).toContain('B')
    expect(wrapper.find('strong').text()).toBe('Backlog')
    expect(wrapper.find('[data-test-id="nuxt-icon"]').exists()).toBe(false)

    await wrapper.setProps({
      fallback: null,
      icon: 'folder',
      iconColor: '#22d3ee',
    })

    const icon = wrapper.find('[data-test-id="nuxt-icon"]')
    expect(icon.attributes('data-name')).toBe('lucide:folder')
    expect(wrapper.find('span span').attributes('style')).toContain('#22d3ee')
    expect(wrapper.find('strong').text()).toBe('Backlog')
  })

  it('updates CreateTicketDueDateField input value and disabled state', async () => {
    const wrapper = mount(CreateTicketDueDateField, {
      props: {
        dueDateValue: '2026-09-08',
        isCreatePending: true,
      },
    })
    const input = wrapper.find('input')

    expect(input.element.value).toBe('2026-09-08')
    expect(input.element.disabled).toBe(true)

    await wrapper.setProps({
      dueDateValue: '2026-09-09',
      isCreatePending: false,
    })

    expect(input.element.value).toBe('2026-09-09')
    expect(input.element.disabled).toBe(false)

    await input.setValue('2026-09-10')

    expect(wrapper.emitted('update:dueDate')).toEqual([['2026-09-10']])
  })
})
