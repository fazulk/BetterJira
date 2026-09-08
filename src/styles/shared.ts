import * as stylex from '@stylexjs/stylex'
import { colors } from './tokens.stylex'

const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const slideUp = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } })

export const uiStyles = stylex.create({
  shell: { backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0) 220px)', backgroundColor: colors['--color-surface-0'] },
  panel: { backgroundColor: colors['--color-surface-1'], borderWidth: 1, borderStyle: 'solid', borderColor: colors['--color-border-subtle'] },
  row: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'transparent', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.035)' } },
  activeRow: { backgroundColor: 'rgba(111, 115, 255, 0.09)' },
  stableScrollbar: { scrollbarGutter: 'stable' },
  fadeIn: { animationName: fadeIn, animationDuration: '160ms', animationTimingFunction: 'ease', animationFillMode: 'both' },
  slideUp: { animationName: slideUp, animationDuration: '200ms', animationTimingFunction: 'ease', animationFillMode: 'both' },
})
