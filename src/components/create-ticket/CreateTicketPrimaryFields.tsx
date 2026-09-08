import type { PropType } from 'vue'
import type { CreateFieldOption, HardcodedCreateFieldDefinition, HardcodedCreateFieldKey } from '@/features/create-ticket/types'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CreateTicketPrimaryFields',
  props: {
    fields: {
      type: Array as PropType<HardcodedCreateFieldDefinition[]>,
      required: true,
    },
    getCreateFieldError: {
      type: Function as PropType<(fieldKey: HardcodedCreateFieldKey) => string | null>,
      required: true,
    },
    getCreateFieldOptions: {
      type: Function as PropType<(fieldKey: HardcodedCreateFieldKey) => CreateFieldOption[]>,
      required: true,
    },
    getInputValue: {
      type: Function as PropType<(event: Event) => string>,
      required: true,
    },
    getTextValue: {
      type: Function as PropType<(key: string) => string>,
      required: true,
    },
    isCreateFieldLoading: {
      type: Function as PropType<(fieldKey: HardcodedCreateFieldKey) => boolean>,
      required: true,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    updateFieldValue: {
      type: Function as PropType<(key: string, value: string) => void>,
      required: true,
    },
  },
  setup(props) {
    function renderField(field: HardcodedCreateFieldDefinition) {
      const fieldId = `create-field-${field.key}`
      const loading = props.isCreateFieldLoading(field.key)
      const error = props.getCreateFieldError(field.key)

      return (
        <div key={field.key} class="space-y-1.5">
          {field.key !== 'summary' && field.key !== 'description' && (
            <label for={fieldId} class="flex items-center gap-2 text-sm font-medium text-slate-200">
              <span>{field.label}</span>
              {field.required && <span class="text-xs uppercase tracking-[0.12em] text-rose-300">Required</span>}
            </label>
          )}

          {field.type === 'text' && (
            <input
              id={fieldId}
              name={`create-${field.key}`}
              aria-label="Issue title"
              value={props.getTextValue(field.key)}
              type="text"
              class="w-full rounded-md border border-transparent bg-transparent px-1 py-1.5 text-xl font-medium text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-white/[0.08] focus:bg-white/[0.02]"
              placeholder="Issue title"
              disabled={props.isCreatePending}
              onInput={event => props.updateFieldValue(field.key, props.getInputValue(event))}
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              id={fieldId}
              name={`create-${field.key}`}
              aria-label="Issue description"
              value={props.getTextValue(field.key)}
              rows={4}
              class="w-full resize-y rounded-md border border-transparent bg-transparent px-1 py-1.5 text-sm leading-6 text-slate-300 outline-none transition placeholder:text-slate-600 focus:border-white/[0.08] focus:bg-white/[0.02]"
              placeholder="Add description..."
              disabled={props.isCreatePending}
              onInput={event => props.updateFieldValue(field.key, props.getInputValue(event))}
            />
          )}

          {field.type === 'date' && (
            <input
              id={fieldId}
              value={props.getTextValue(field.key)}
              type="date"
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-white/[0.16]"
              disabled={props.isCreatePending}
              onInput={event => props.updateFieldValue(field.key, props.getInputValue(event))}
            />
          )}

          {!['text', 'textarea', 'date'].includes(field.type) && (
            <select
              id={fieldId}
              value={props.getTextValue(field.key)}
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-white/[0.16]"
              disabled={props.isCreatePending || loading}
              onChange={event => props.updateFieldValue(field.key, props.getInputValue(event))}
            >
              {props.getCreateFieldOptions(field.key).map(option => (
                <option key={`${field.key}-${option.value || 'empty'}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {loading && (
            <p class="text-xs text-slate-500">
              Loading
              {field.label.toLowerCase()}
              {' '}
              options...
            </p>
          )}
          {!loading && error && <p class="text-xs text-rose-300">{error}</p>}
        </div>
      )
    }

    return () => (
      <div class="space-y-3">
        {props.fields.map(renderField)}
      </div>
    )
  },
})
