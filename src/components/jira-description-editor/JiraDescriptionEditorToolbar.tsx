import type { Editor } from '@tiptap/core'
import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors, typography } from '@/styles/tokens.stylex'

type MarkAction = 'bold' | 'italic' | 'underline' | 'strike' | 'code'
type NodeAction = 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock'

function getSelectValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLSelectElement ? target.value : 'paragraph'
}

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
}

const styles = stylex.create({
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    paddingInline: '0.5rem',
    paddingBlock: '0.5rem',
    transitionProperty: 'opacity',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  unsupported: { opacity: 0.7 },
  hidden: { pointerEvents: 'none', visibility: 'hidden' },
  select: {
    height: '1.75rem',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    backgroundColor: colors['--color-surface-0'],
    paddingInline: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    color: colors['--color-slate-300'],
    outlineStyle: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  toolbarButton: {
    height: '1.75rem',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    paddingInline: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    transitionProperty: 'color, border-color, background-color, opacity',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: { 'default': 'pointer', ':disabled': 'not-allowed' },
    opacity: { 'default': 1, ':disabled': 0.5 },
  },
  activeButton: { borderColor: 'rgba(255, 255, 255, 0.16)', backgroundColor: 'rgba(255, 255, 255, 0.09)', color: colors['--color-slate-100'] },
  inactiveButton: {
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' },
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.05)' },
    color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] },
  },
  bold: { fontWeight: 600 },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  mono: { fontFamily: typography['--font-mono'] },
  linkMenu: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  linkInput: {
    'height': '2rem',
    'minWidth': '16rem',
    'flex': '1',
    'borderRadius': '0.375rem',
    'borderWidth': 1,
    'borderStyle': 'solid',
    'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    'backgroundColor': colors['--color-surface-0'],
    'paddingInline': '0.75rem',
    'fontSize': 13,
    'color': colors['--color-slate-200'],
    'outlineStyle': 'none',
    'transitionProperty': 'border-color',
    'transitionDuration': '150ms',
    'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '::placeholder': { color: colors['--color-slate-600'] },
  },
  primaryButton: { height: '2rem', borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)' }, paddingInline: '0.75rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-white'], transitionProperty: 'background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
  secondaryButton: { height: '2rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' }, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.05)' }, paddingInline: '0.75rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color, border-color, background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
})

function activeButtonStyle(isActive: boolean) {
  return isActive ? styles.activeButton : styles.inactiveButton
}

export default defineComponent({
  name: 'JiraDescriptionEditorToolbar',
  props: {
    currentBlockType: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      required: true,
    },
    editor: {
      type: Object as PropType<Editor | null | undefined>,
      default: undefined,
    },
    linkDraft: {
      type: String,
      required: true,
    },
    linkMenuOpen: {
      type: Boolean,
      required: true,
    },
    showToolbar: {
      type: Boolean,
      required: true,
    },
    unsupported: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    'applyBlockType': (value: string) => typeof value === 'string',
    'applyLink': () => true,
    'closeLinkMenu': () => true,
    'openLinkMenu': () => true,
    'removeLink': () => true,
    'toggleMark': (action: MarkAction) => ['bold', 'italic', 'underline', 'strike', 'code'].includes(action),
    'toggleNode': (action: NodeAction) => ['bulletList', 'orderedList', 'blockquote', 'codeBlock'].includes(action),
    'update:linkDraft': (value: string) => typeof value === 'string',
  },
  setup(props, { emit }) {
    function markButtonDisabled(commandSupported: boolean): boolean {
      return props.disabled || props.unsupported || !commandSupported
    }

    function handleLinkKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter') {
        event.preventDefault()
        emit('applyLink')
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        emit('closeLinkMenu')
      }
    }

    return () => (
      <>
        <div
          {...stylex.attrs(styles.toolbar, props.unsupported ? styles.unsupported : null, props.showToolbar ? null : styles.hidden)}
          aria-hidden={!props.showToolbar}
        >
          <select
            {...stylex.attrs(styles.select)}
            disabled={props.disabled || props.unsupported}
            value={props.currentBlockType}
            onChange={event => emit('applyBlockType', getSelectValue(event))}
          >
            <option value="paragraph">Paragraph</option>
            <option value="heading-1">Heading 1</option>
            <option value="heading-2">Heading 2</option>
            <option value="heading-3">Heading 3</option>
            <option value="blockquote">Quote</option>
            <option value="codeBlock">Code block</option>
          </select>

          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.bold, activeButtonStyle(!!props.editor?.isActive('bold')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleBold().run())} onClick={() => emit('toggleMark', 'bold')}>B</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.italic, activeButtonStyle(!!props.editor?.isActive('italic')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleItalic().run())} onClick={() => emit('toggleMark', 'italic')}>I</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.underline, activeButtonStyle(!!props.editor?.isActive('underline')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleUnderline().run())} onClick={() => emit('toggleMark', 'underline')}>U</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.strike, activeButtonStyle(!!props.editor?.isActive('strike')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleStrike().run())} onClick={() => emit('toggleMark', 'strike')}>S</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.mono, activeButtonStyle(!!props.editor?.isActive('code')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleCode().run())} onClick={() => emit('toggleMark', 'code')}>{'</>'}</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, activeButtonStyle(!!props.editor?.isActive('bulletList')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleBulletList().run())} onClick={() => emit('toggleNode', 'bulletList')}>• List</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, activeButtonStyle(!!props.editor?.isActive('orderedList')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleOrderedList().run())} onClick={() => emit('toggleNode', 'orderedList')}>1. List</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, activeButtonStyle(!!props.editor?.isActive('blockquote')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleBlockquote().run())} onClick={() => emit('toggleNode', 'blockquote')}>Quote</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, activeButtonStyle(!!props.editor?.isActive('codeBlock')))} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleCodeBlock().run())} onClick={() => emit('toggleNode', 'codeBlock')}>Code</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, activeButtonStyle(!!props.editor?.isActive('link')))} disabled={props.disabled || props.unsupported} onClick={() => emit('openLinkMenu')}>Link</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.inactiveButton)} disabled={props.disabled || props.unsupported || !props.editor?.can().undo()} onClick={() => props.editor?.chain().focus().undo().run()}>Undo</button>
          <button type="button" {...stylex.attrs(styles.toolbarButton, styles.inactiveButton)} disabled={props.disabled || props.unsupported || !props.editor?.can().redo()} onClick={() => props.editor?.chain().focus().redo().run()}>Redo</button>
        </div>

        {props.showToolbar && props.linkMenuOpen && (
          <div {...stylex.attrs(styles.linkMenu)}>
            <input
              value={props.linkDraft}
              type="text"
              {...stylex.attrs(styles.linkInput)}
              placeholder="Paste or type a URL"
              disabled={props.disabled || props.unsupported}
              onInput={event => emit('update:linkDraft', getInputValue(event))}
              onKeydown={handleLinkKeydown}
            />
            <button type="button" {...stylex.attrs(styles.primaryButton)} disabled={props.disabled || props.unsupported} onClick={() => emit('applyLink')}>
              Apply
            </button>
            <button type="button" {...stylex.attrs(styles.secondaryButton)} disabled={props.disabled || props.unsupported} onClick={() => emit('removeLink')}>
              Remove
            </button>
            <button type="button" {...stylex.attrs(styles.secondaryButton)} onClick={() => emit('closeLinkMenu')}>
              Cancel
            </button>
          </div>
        )}
      </>
    )
  },
})
