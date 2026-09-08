import type { PropType } from 'vue'
import type { AssistantSkillSetting } from '~/shared/settings'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref, Teleport } from 'vue'
import { Icon } from '#components'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  backdrop: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '1rem' },
  modal: { display: 'flex', width: '100%', maxWidth: '42rem', flexDirection: 'column', borderRadius: '0.75rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: '#16171b', padding: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' },
  nameInput: { 'minWidth': 0, 'flexGrow': '1', 'flexShrink': '1', 'flexBasis': '0%', 'borderWidth': 0, 'backgroundColor': 'transparent', 'fontSize': '1.25rem', 'lineHeight': '1.75rem', 'fontWeight': 600, 'color': colors['--color-slate-100'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  menuRoot: { position: 'relative', flexShrink: 0 },
  iconButton: { display: 'flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  icon: { width: '1rem', height: '1rem' },
  menu: { position: 'absolute', right: 0, top: '2rem', zIndex: 10, width: '9rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: '#1d1e23', paddingBlock: '0.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' },
  deleteButton: { display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', paddingInline: '0.75rem', paddingBlock: '0.375rem', textAlign: 'left', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-300'], backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  deleteIcon: { width: '0.875rem', height: '0.875rem' },
  bodyInput: { 'width': '100%', 'resize': 'vertical', 'borderRadius': '0.5rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' }, 'backgroundColor': 'rgba(255, 255, 255, 0.03)', 'paddingInline': '1rem', 'paddingBlock': '0.75rem', 'fontSize': '0.875rem', 'lineHeight': 1.625, 'color': colors['--color-slate-200'], 'outlineStyle': 'none', 'transitionProperty': 'border-color', 'transitionDuration': '150ms', 'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)', '::placeholder': { color: colors['--color-slate-600'] } },
  actions: { marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' },
  secondaryButton: { borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', paddingInline: '1rem', paddingBlock: '0.375rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-300'], backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  primaryButton: { borderRadius: '9999px', backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)' }, paddingInline: '1rem', paddingBlock: '0.375rem', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-white'], cursor: { 'default': null, ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.5 }, transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})

export default defineComponent({
  name: 'AssistantSkillModal',
  props: {
    skill: {
      type: Object as PropType<AssistantSkillSetting | null>,
      default: null,
    },
  },
  emits: {
    save: (draft: { name: string, body: string }) => typeof draft.name === 'string' && typeof draft.body === 'string',
    delete: () => true,
    close: () => true,
  },
  setup(props, { emit }) {
    const name = ref(props.skill?.name ?? '')
    const body = ref(props.skill?.body ?? '')
    const menuOpen = ref(false)
    const canSave = computed(() => name.value.trim().length > 0 && body.value.trim().length > 0)

    function save(): void {
      if (!canSave.value) {
        return
      }
      emit('save', { name: name.value, body: body.value })
    }

    function handleBackdropMouseDown(event: MouseEvent): void {
      if (event.target === event.currentTarget) {
        emit('close')
      }
    }

    return () => (
      <Teleport to="body">
        <div {...stylex.attrs(styles.backdrop)} onMousedown={handleBackdropMouseDown}>
          <div {...stylex.attrs(styles.modal)}>
            <div {...stylex.attrs(styles.header)}>
              <input
                v-model={name.value}
                type="text"
                name="skill-name"
                placeholder="Skill name"
                {...stylex.attrs(styles.nameInput)}
              />
              {props.skill && (
                <div {...stylex.attrs(styles.menuRoot)}>
                  <button
                    type="button"
                    {...stylex.attrs(styles.iconButton)}
                    aria-label="Skill options"
                    onClick={() => {
                      menuOpen.value = !menuOpen.value
                    }}
                  >
                    <Icon name="lucide:ellipsis" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                  </button>
                  {menuOpen.value && (
                    <div {...stylex.attrs(styles.menu)}>
                      <button type="button" {...stylex.attrs(styles.deleteButton)} onClick={() => emit('delete')}>
                        <Icon name="lucide:trash-2" {...stylex.attrs(styles.deleteIcon)} aria-hidden="true" />
                        Delete skill
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <textarea
              v-model={body.value}
              rows="12"
              name="skill-body"
              spellcheck={false}
              placeholder="Write the prompt this skill injects (markdown supported)…"
              {...stylex.attrs(styles.bodyInput)}
            />

            <div {...stylex.attrs(styles.actions)}>
              <button type="button" {...stylex.attrs(styles.secondaryButton)} onClick={() => emit('close')}>
                Cancel
              </button>
              <button type="button" {...stylex.attrs(styles.primaryButton)} disabled={!canSave.value} onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    )
  },
})
