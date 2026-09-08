import type { Editor } from '@tiptap/core'
import type { PropType } from 'vue'
import { defineComponent } from 'vue'

type MarkAction = 'bold' | 'italic' | 'underline' | 'strike' | 'code'
type NodeAction = 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock'

function buttonClass(isActive: boolean): string {
  return isActive
    ? 'border-white/[0.16] bg-white/[0.09] text-slate-100'
    : 'border-white/[0.08] bg-transparent text-slate-400 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-slate-200'
}

function getSelectValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLSelectElement ? target.value : 'paragraph'
}

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
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

    const toolbarButtonClass = 'h-7 rounded-md border px-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-50'
    const inactiveButtonClass = 'h-7 rounded-md border border-white/[0.08] px-2 text-xs text-slate-400 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50'

    return () => (
      <>
        <div
          class={[
            'flex flex-wrap items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-2 py-2 transition-opacity',
            props.unsupported ? 'opacity-70' : '',
            props.showToolbar ? '' : 'pointer-events-none invisible',
          ]}
          aria-hidden={!props.showToolbar}
        >
          <select
            class="h-7 rounded-md border border-white/[0.08] bg-surface-0 px-2 text-xs text-slate-300 outline-none transition focus:border-white/[0.16]"
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

          <button type="button" class={[toolbarButtonClass, 'font-semibold', buttonClass(!!props.editor?.isActive('bold'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleBold().run())} onClick={() => emit('toggleMark', 'bold')}>B</button>
          <button type="button" class={[toolbarButtonClass, 'italic', buttonClass(!!props.editor?.isActive('italic'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleItalic().run())} onClick={() => emit('toggleMark', 'italic')}>I</button>
          <button type="button" class={[toolbarButtonClass, 'underline', buttonClass(!!props.editor?.isActive('underline'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleUnderline().run())} onClick={() => emit('toggleMark', 'underline')}>U</button>
          <button type="button" class={[toolbarButtonClass, 'line-through', buttonClass(!!props.editor?.isActive('strike'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleStrike().run())} onClick={() => emit('toggleMark', 'strike')}>S</button>
          <button type="button" class={[toolbarButtonClass, 'font-mono', buttonClass(!!props.editor?.isActive('code'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleCode().run())} onClick={() => emit('toggleMark', 'code')}>{'</>'}</button>
          <button type="button" class={[toolbarButtonClass, buttonClass(!!props.editor?.isActive('bulletList'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleBulletList().run())} onClick={() => emit('toggleNode', 'bulletList')}>• List</button>
          <button type="button" class={[toolbarButtonClass, buttonClass(!!props.editor?.isActive('orderedList'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleOrderedList().run())} onClick={() => emit('toggleNode', 'orderedList')}>1. List</button>
          <button type="button" class={[toolbarButtonClass, buttonClass(!!props.editor?.isActive('blockquote'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleBlockquote().run())} onClick={() => emit('toggleNode', 'blockquote')}>Quote</button>
          <button type="button" class={[toolbarButtonClass, buttonClass(!!props.editor?.isActive('codeBlock'))]} disabled={markButtonDisabled(!!props.editor?.can().chain().focus().toggleCodeBlock().run())} onClick={() => emit('toggleNode', 'codeBlock')}>Code</button>
          <button type="button" class={[toolbarButtonClass, buttonClass(!!props.editor?.isActive('link'))]} disabled={props.disabled || props.unsupported} onClick={() => emit('openLinkMenu')}>Link</button>
          <button type="button" class={inactiveButtonClass} disabled={props.disabled || props.unsupported || !props.editor?.can().undo()} onClick={() => props.editor?.chain().focus().undo().run()}>Undo</button>
          <button type="button" class={inactiveButtonClass} disabled={props.disabled || props.unsupported || !props.editor?.can().redo()} onClick={() => props.editor?.chain().focus().redo().run()}>Redo</button>
        </div>

        {props.showToolbar && props.linkMenuOpen && (
          <div class="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <input
              value={props.linkDraft}
              type="text"
              class="h-8 min-w-[16rem] flex-1 rounded-md border border-white/[0.08] bg-surface-0 px-3 text-[13px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16]"
              placeholder="Paste or type a URL"
              disabled={props.disabled || props.unsupported}
              onInput={event => emit('update:linkDraft', getInputValue(event))}
              onKeydown={handleLinkKeydown}
            />
            <button type="button" class="h-8 rounded-md bg-accent-indigo px-3 text-xs font-medium text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:opacity-60" disabled={props.disabled || props.unsupported} onClick={() => emit('applyLink')}>
              Apply
            </button>
            <button type="button" class="h-8 rounded-md border border-white/[0.08] px-3 text-xs text-slate-400 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={props.disabled || props.unsupported} onClick={() => emit('removeLink')}>
              Remove
            </button>
            <button type="button" class="h-8 rounded-md border border-white/[0.08] px-3 text-xs text-slate-400 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-slate-200" onClick={() => emit('closeLinkMenu')}>
              Cancel
            </button>
          </div>
        )}
      </>
    )
  },
})
