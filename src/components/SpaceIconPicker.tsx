import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType } from 'vue'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, ref } from 'vue'
import { Icon } from '#components'
import { SPACE_COLOR_SWATCHES } from '@/utils/spaceAppearance'
import { SPACE_ICON_NAMES } from '@/utils/spaceIconNames'

const styles = stylex.create({
  root: { width: 420, maxWidth: '92vw', overflow: 'hidden', borderRadius: '0.75rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#16181d', color: '#d7d8dc', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  tabs: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255,255,255,0.06)', paddingInline: '0.75rem', paddingTop: '0.625rem' },
  tab: { display: 'inline-block', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: '#5e6ad2', paddingBottom: '0.5rem', fontSize: 13, fontWeight: 500, color: '#f0f1f4' },
  palette: { display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255,255,255,0.06)', padding: '0.75rem' },
  swatch: { display: 'flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', scale: { 'default': null, ':hover': '110%' }, transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
  background: (color: string) => ({ backgroundColor: { default: color } }),
  check: { width: '0.875rem', height: '0.875rem', color: '#fff' },
  checkShadow: { filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.06))' },
  separator: { marginInline: '0.125rem', height: '1.5rem', width: 1, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.1)' },
  custom: { position: 'relative', display: 'flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundImage: 'conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #38bdf8, #818cf8, #f472b6, #f87171)' },
  colorInput: { position: 'absolute', inset: 0, cursor: 'pointer', opacity: 0 },
  searchContainer: { paddingInline: '0.75rem', paddingBlock: '0.625rem' },
  search: { height: '2.25rem', width: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255,255,255,0.08)', ':focus': '#5e6ad2' }, backgroundColor: 'rgba(0,0,0,0.3)', paddingInline: '0.75rem', fontSize: 13, color: { 'default': '#e6e7ea', '::placeholder': '#6f727b' }, outlineStyle: { 'default': null, ':focus': 'none' } },
  results: { maxHeight: 280, overflowY: 'auto', paddingInline: '0.5rem', paddingBottom: '0.75rem' },
  empty: { paddingInline: '0.5rem', paddingBlock: '1.5rem', textAlign: 'center', fontSize: 12, color: '#6f727b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: '0.25rem' },
  iconButton: { display: 'flex', aspectRatio: '1', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': null, ':hover': 'rgba(255,255,255,0.08)' }, transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
  selected: { backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' },
  icon: (color: string) => ({ width: '1rem', height: '1rem', color }),
})

export default defineComponent({
  name: 'SpaceIconPicker',
  props: {
    xstyle: { type: [Object, Array] as PropType<StyleXStyles> },
    icon: { type: [String, null] as PropType<string | null>, required: true },
    color: { type: String, required: true },
  },
  emits: {
    'update:icon': (icon: string) => typeof icon === 'string',
    'update:color': (color: string) => typeof color === 'string',
  },
  setup(props, { emit }) {
    const MAX_RESULTS = 120

    const search = ref('')

    const filteredIcons = computed(() => {
      const query = search.value.trim().toLowerCase()
      const matches = query
        ? SPACE_ICON_NAMES.filter(name => name.includes(query))
        : SPACE_ICON_NAMES
      return matches.slice(0, MAX_RESULTS)
    })

    const isPresetColor = computed(() => SPACE_COLOR_SWATCHES.some(swatch => swatch.value === props.color))

    function formatIconLabel(name: string): string {
      return name.replace(/-/g, ' ')
    }

    function onCustomColorInput(event: Event): void {
      const target = event.target
      if (target instanceof HTMLInputElement) {
        emit('update:color', target.value)
      }
    }

    return () => (
      <div {...stylex.attrs(styles.root, props.xstyle)}>
        <div {...stylex.attrs(styles.tabs)}>
          <span {...stylex.attrs(styles.tab)}>Icons</span>
        </div>
        <div {...stylex.attrs(styles.palette)}>
          {SPACE_COLOR_SWATCHES.map(swatch => (
            <button
              key={swatch.value}
              type="button"
              {...stylex.attrs(styles.swatch, styles.background(swatch.value))}

              title={swatch.label}
              aria-label={swatch.label}
              onClick={() => emit('update:color', swatch.value)}
            >
              {props.color === swatch.value && <Icon name="lucide:check" {...stylex.attrs(styles.check)} aria-hidden="true" />}
            </button>
          ))}
          <span {...stylex.attrs(styles.separator)} aria-hidden="true" />
          <label
            {...stylex.attrs(styles.custom)}

            title="Custom color"
          >
            {!isPresetColor.value && <Icon name="lucide:check" {...stylex.attrs(styles.check, styles.checkShadow)} aria-hidden="true" />}
            <input type="color" {...stylex.attrs(styles.colorInput)} value={props.color} aria-label="Custom color" onInput={onCustomColorInput} />
          </label>
        </div>
        <div {...stylex.attrs(styles.searchContainer)}>
          <input
            v-model={search.value}
            type="text"
            placeholder="Search icons..."
            {...stylex.attrs(styles.search)}
          />
        </div>
        <div {...stylex.attrs(styles.results)}>
          {filteredIcons.value.length === 0
            ? (
                <div {...stylex.attrs(styles.empty)}>
                  No icons match "
                  {search.value}
                  "
                </div>
              )
            : (
                <div {...stylex.attrs(styles.grid)}>
                  {filteredIcons.value.map(name => (
                    <button
                      key={name}
                      type="button"
                      {...stylex.attrs(styles.iconButton, props.icon === name && styles.selected)}
                      title={formatIconLabel(name)}
                      aria-label={formatIconLabel(name)}
                      onClick={() => emit('update:icon', name)}
                    >
                      <Icon name={`lucide:${name}`} {...stylex.attrs(styles.icon(props.color))} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
        </div>
      </div>
    )
  },
})
