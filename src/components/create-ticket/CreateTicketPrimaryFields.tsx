import type { PropType } from 'vue'
import type { CreateFieldOption, HardcodedCreateFieldDefinition, HardcodedCreateFieldKey } from '@/features/create-ticket/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  required: { fontSize: '0.75rem', lineHeight: '1rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: colors['--color-rose-300'] },
  titleInput: {
    'width': '100%',
    'borderRadius': '0.375rem',
    'borderWidth': 1,
    'borderStyle': 'solid',
    'borderColor': { 'default': 'transparent', ':focus': 'rgba(255, 255, 255, 0.08)' },
    'backgroundColor': { 'default': 'transparent', ':focus': 'rgba(255, 255, 255, 0.02)' },
    'paddingInline': '0.25rem',
    'paddingBlock': '0.375rem',
    'fontSize': '1.25rem',
    'lineHeight': '1.75rem',
    'fontWeight': 500,
    'color': colors['--color-slate-100'],
    'outlineStyle': 'none',
    'transitionProperty': 'border-color, background-color',
    'transitionDuration': '150ms',
    'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '::placeholder': { color: colors['--color-slate-600'] },
  },
  descriptionTextarea: {
    'width': '100%',
    'resize': 'vertical',
    'borderRadius': '0.375rem',
    'borderWidth': 1,
    'borderStyle': 'solid',
    'borderColor': { 'default': 'transparent', ':focus': 'rgba(255, 255, 255, 0.08)' },
    'backgroundColor': { 'default': 'transparent', ':focus': 'rgba(255, 255, 255, 0.02)' },
    'paddingInline': '0.25rem',
    'paddingBlock': '0.375rem',
    'fontSize': '0.875rem',
    'lineHeight': '1.5rem',
    'color': colors['--color-slate-300'],
    'outlineStyle': 'none',
    'transitionProperty': 'border-color, background-color',
    'transitionDuration': '150ms',
    'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '::placeholder': { color: colors['--color-slate-600'] },
  },
  input: {
    width: '100%',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    paddingInline: '0.75rem',
    paddingBlock: '0.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    color: colors['--color-slate-200'],
    outlineStyle: 'none',
    transitionProperty: 'border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  helper: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  error: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-300'] },
})

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
        <div key={field.key} {...stylex.attrs(styles.field)}>
          {field.key !== 'summary' && field.key !== 'description' && (
            <label for={fieldId} {...stylex.attrs(styles.label)}>
              <span>{field.label}</span>
              {field.required && <span {...stylex.attrs(styles.required)}>Required</span>}
            </label>
          )}

          {field.type === 'text' && (
            <input
              id={fieldId}
              name={`create-${field.key}`}
              aria-label="Issue title"
              value={props.getTextValue(field.key)}
              type="text"
              {...stylex.attrs(styles.titleInput)}
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
              {...stylex.attrs(styles.descriptionTextarea)}
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
              {...stylex.attrs(styles.input)}
              disabled={props.isCreatePending}
              onInput={event => props.updateFieldValue(field.key, props.getInputValue(event))}
            />
          )}

          {!['text', 'textarea', 'date'].includes(field.type) && (
            <select
              id={fieldId}
              value={props.getTextValue(field.key)}
              {...stylex.attrs(styles.input)}
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
            <p {...stylex.attrs(styles.helper)}>
              Loading
              {field.label.toLowerCase()}
              {' '}
              options...
            </p>
          )}
          {!loading && error && <p {...stylex.attrs(styles.error)}>{error}</p>}
        </div>
      )
    }

    return () => (
      <div {...stylex.attrs(styles.root)}>
        {props.fields.map(renderField)}
      </div>
    )
  },
})
