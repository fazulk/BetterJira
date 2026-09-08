// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import SettingsTeamSections from '@/components/settings/SettingsTeamSections'

const currentColor = ref('#112233')

vi.mock('@/components/settings/SettingsCyclesSection', () => ({ default: { render: () => null } }))
vi.mock('@/components/StatusIcon', () => ({ default: { render: () => null } }))
vi.mock('@/composables/useStatusPreferences', () => ({
  getStatusLaneLabel: () => 'Started',
  useStatusPreferences: () => ({
    statusColorPalette: ['#112233', '#abcdef'],
    getStatusColor: () => currentColor.value,
    setStatusColor: (_status: string, _group: string, color: string) => { currentColor.value = color },
    resetStatusColor: vi.fn(),
    setStatusOrder: vi.fn(),
  }),
}))
vi.mock('@/features/settings/settingsPageContext', async () => {
  const { ref } = await import('vue')
  return {
    useSettingsPageContext: () => ({
      activeSettingsSection: ref('team-statuses'),
      constrainedSettingsRows: ref([]),
      constrainedSettingsSectionDescription: ref(''),
      constrainedSettingsSectionTitle: ref(''),
      statusGroupLabels: { indeterminate: 'In Progress' },
      teamMemberRows: ref([]),
      teamSettingsRows: ref([]),
      teamStatusRows: ref([{ key: 'started', status: 'Doing', group: 'indeterminate', lane: 'started', issueCount: 3, spaces: 'Platform' }]),
    }),
  }
})

describe('status color menu', () => {
  it('refreshes the hex draft and native picker when a preset changes', async () => {
    const wrapper = mount(SettingsTeamSections, { attachTo: document.body })
    try {
      expect(wrapper.text()).toContain('3 issues · In Progress · Platform')
      await wrapper.get('button[aria-label="Change color for Doing"]').trigger('click')
      const hex = document.querySelector<HTMLInputElement>('input[aria-label="Custom hex color"]')!
      const native = document.querySelector<HTMLInputElement>('input[aria-label="Pick custom status color"]')!
      expect(hex.value).toBe('112233')
      document.querySelector<HTMLButtonElement>('button[aria-label="Set Doing to #abcdef"]')!.click()
      await nextTick()
      expect(hex.value).toBe('abcdef')
      expect(native.value).toBe('#abcdef')
    }
    finally {
      wrapper.unmount()
    }
  })
})
