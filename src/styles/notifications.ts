import * as stylex from '@stylexjs/stylex'
import { colors } from './tokens.stylex'

export const notificationStyles = stylex.create({
  surface: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: `color-mix(in oklab, ${colors['--color-surface-1']} 95%, transparent)`, color: colors['--color-slate-200'], boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35), 0 8px 10px -6px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' },
  update: { position: 'fixed', bottom: '3.75rem', left: '1rem', zIndex: 90 },
  stack: { pointerEvents: 'none', position: 'fixed', bottom: '3.75rem', right: '1rem', zIndex: 90, display: 'flex', width: '100%', maxWidth: '24rem', flexDirection: 'column', gap: '0.5rem' },
  toast: { pointerEvents: 'auto' },
  content: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.75rem', paddingInline: '0.875rem', paddingBlock: '0.625rem' },
  dot: { width: '0.375rem', height: '0.375rem', flexShrink: 0, borderRadius: '9999px' },
  updateDot: { backgroundColor: `color-mix(in oklab, ${colors['--color-sky-300']} 90%, transparent)` },
  successDot: { backgroundColor: colors['--color-slate-400'] },
  errorDot: { backgroundColor: `color-mix(in oklab, ${colors['--color-rose-300']} 90%, transparent)` },
  message: { minWidth: 0, fontSize: 13, lineHeight: '1.25rem', color: colors['--color-slate-300'] },
  toastMessage: { flex: '1' },
  actions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.25rem' },
  button: { height: '1.5rem', borderRadius: '0.375rem', paddingInline: '0.5rem', fontSize: 12, color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, backgroundColor: { 'default': null, ':hover': 'rgba(255,255,255,0.05)' }, transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, backdrop-filter', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' },
  restart: { color: { 'default': `color-mix(in oklab, ${colors['--color-sky-300']} 90%, transparent)`, ':hover': colors['--color-sky-200'] } },
  dismiss: { display: 'inline-flex', width: '1.5rem', alignItems: 'center', justifyContent: 'center', paddingInline: 0 },
  icon: { width: '0.75rem', height: '0.75rem' },
  transition: { transitionProperty: 'all', transitionDuration: '180ms', transitionTimingFunction: 'ease' },
  hidden: { opacity: 0, transform: 'translateY(8px)' },
})
