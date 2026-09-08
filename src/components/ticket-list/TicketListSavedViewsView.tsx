import type { PropType } from 'vue'
import type { SavedViewRow, SavedViewRowFieldId } from '@/features/ticket-list/types'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { Icon } from '#components'
import { uiStyles } from '@/styles/shared'

const styles = stylex.create({
  root: { minHeight: 0, flex: '1', overflowY: 'auto' },
  header: (gridTemplateColumns: string) => ({ display: 'grid', gridTemplateColumns: { default: gridTemplateColumns }, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1rem', paddingBlock: '0.5rem', fontSize: 12, color: '#777a83' }),
  row: (gridTemplateColumns: string) => ({ display: 'grid', minHeight: '3rem', width: '100%', alignItems: 'center', paddingInline: '1rem', paddingBlock: '0.5rem', textAlign: 'left', gridTemplateColumns: { default: gridTemplateColumns } }),
  nameCell: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.75rem', paddingRight: '1rem' },
  iconBox: (backgroundColor: string) => ({ display: 'flex', height: '1.75rem', width: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { default: backgroundColor }, color: 'white' }),
  icon: { height: '1rem', width: '1rem' },
  text: { minWidth: 0 },
  title: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: '#e6e7ea' },
  description: { marginTop: '0.125rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#777a83' },
  mutedCell: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#aeb0b7' },
  countCell: { fontSize: 12, color: '#8f9198' },
  ownerCell: { paddingRight: '1rem' },
  updatedCell: { color: '#777a83' },
  empty: { display: 'flex', height: '100%', minHeight: '20rem', alignItems: 'center', justifyContent: 'center', paddingInline: '1.5rem', textAlign: 'center' },
  emptyContent: { maxWidth: '24rem' },
  emptyTitle: { fontSize: 13, fontWeight: 500, color: '#d7d8dc' },
  emptyDescription: { marginTop: '0.25rem', fontSize: 12, color: '#777a83' },
})

export default defineComponent({
  name: 'TicketListSavedViewsView',
  props: {
    rows: {
      type: Array as PropType<SavedViewRow[]>,
      required: true,
    },
    gridTemplate: {
      type: String,
      required: true,
    },
    isFieldVisible: {
      type: Function as PropType<(field: SavedViewRowFieldId) => boolean>,
      required: true,
    },
    getRelativeTimeLabel: {
      type: Function as PropType<(value?: string) => string>,
      required: true,
    },
  },
  emits: {
    open: (viewId: string) => typeof viewId === 'string',
  },
  setup(props, { emit }) {
    return () => (
      <div {...stylex.attrs(styles.root)}>
        <div {...stylex.attrs(styles.header(props.gridTemplate))}>
          <span>Name</span>
          {props.isFieldVisible('type') && <span>Type</span>}
          {props.isFieldVisible('items') && <span>Items</span>}
          {props.isFieldVisible('owner') && <span>Owner</span>}
          {props.isFieldVisible('updated') && <span>Updated</span>}
        </div>

        {props.rows.length
          ? (
              <div>
                {props.rows.map(row => (
                  <button
                    key={row.id}
                    type="button"
                    {...stylex.attrs(styles.row(props.gridTemplate), uiStyles.row)}
                    onClick={() => emit('open', row.viewId)}
                  >
                    <span {...stylex.attrs(styles.nameCell)}>
                      <span {...stylex.attrs(styles.iconBox(row.color))} aria-hidden="true">
                        <Icon name={`lucide:${row.icon}`} {...stylex.attrs(styles.icon)} />
                      </span>
                      <span {...stylex.attrs(styles.text)}>
                        <span {...stylex.attrs(styles.title)}>{row.name}</span>
                        <span {...stylex.attrs(styles.description)}>{row.description}</span>
                      </span>
                    </span>

                    {props.isFieldVisible('type') && <span {...stylex.attrs(styles.mutedCell)}>{row.category}</span>}
                    {props.isFieldVisible('items') && <span {...stylex.attrs(styles.countCell)}>{row.count}</span>}
                    {props.isFieldVisible('owner') && <span {...stylex.attrs(styles.mutedCell, styles.ownerCell)}>{row.owner}</span>}
                    {props.isFieldVisible('updated') && <span {...stylex.attrs(styles.mutedCell, styles.updatedCell)}>{props.getRelativeTimeLabel(row.updatedAt)}</span>}
                  </button>
                ))}
              </div>
            )
          : (
              <div {...stylex.attrs(styles.empty)}>
                <div {...stylex.attrs(styles.emptyContent)}>
                  <p {...stylex.attrs(styles.emptyTitle)}>No saved views found</p>
                  <p {...stylex.attrs(styles.emptyDescription)}>Create a custom issue or project view to see it here.</p>
                </div>
              </div>
            )}
      </div>
    )
  },
})
