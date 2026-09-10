import * as stylex from '@stylexjs/stylex'
import { breakpoints, colors } from '@/styles/tokens.stylex'

const thinking = stylex.keyframes({
  '0%': { opacity: 0.35, transform: 'translateY(0)' },
  '30%': { opacity: 1, transform: 'translateY(-3px)' },
  '60%': { opacity: 0.35, transform: 'translateY(0)' },
  '100%': { opacity: 0.35, transform: 'translateY(0)' },
})

export const styles = stylex.create({
  icon: { width: '1rem', height: '1rem', flexShrink: 0 },
  column: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: colors['--color-slate-200'] },
  wide: { width: '100%', maxWidth: '52rem', marginInline: 'auto' },
  timestamp: { display: 'block', marginTop: '0.5rem', fontSize: 10, color: colors['--color-slate-500'] },
  copy: { fontSize: 11, padding: '0.25rem', color: colors['--color-slate-400'] },
  header: { display: 'flex', height: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem' },
  headerText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-100'] },
  headerActions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.125rem' },
  iconButton: { display: 'flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  messages: { minHeight: 0, flexGrow: '1', flexShrink: '1', flexBasis: '0%', overflowY: 'auto', paddingInline: '0.75rem', paddingBlock: '1rem' },
  emptyState: { display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingInline: '1rem', textAlign: 'center' },
  emptyIcon: { width: '1.75rem', height: '1.75rem', color: colors['--color-slate-600'] },
  messageListItem: { display: 'flex', marginTop: '1rem' },
  messageUserAlign: { justifyContent: 'flex-end' },
  messageAssistantAlign: { justifyContent: 'flex-start' },
  bubble: { overflowWrap: 'break-word', borderRadius: '0.5rem', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: 13, lineHeight: 1.625 },
  userBubble: { maxWidth: '85%', whiteSpace: 'pre-wrap', backgroundColor: 'rgba(255, 255, 255, 0.08)', color: colors['--color-white'] },
  assistantBubble: { minWidth: 0, maxWidth: '100%', color: colors['--color-slate-200'] },
  skillTag: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem', marginBottom: '0.25rem', borderRadius: '0.25rem', backgroundColor: 'rgba(255, 255, 255, 0.14)', paddingInline: '0.375rem', paddingBlock: '0.125rem', fontSize: 11, color: 'rgba(255, 255, 255, 0.9)' },
  pending: { display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-400'] },
  pendingDots: { display: 'flex', height: '1.25rem', flexShrink: 0, alignItems: 'center', gap: '0.25rem', color: colors['--color-accent-indigo'] },
  pendingDot: { width: '0.375rem', height: '0.375rem', borderRadius: '9999px', backgroundColor: 'currentColor', animationName: { default: thinking, [breakpoints.reducedMotion]: 'none' }, animationDuration: '1.2s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' },
  error: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(251, 113, 133, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-200'] },
  composerShell: { flexShrink: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', padding: '0.75rem' },
  ticketPill: { display: 'inline-flex', maxWidth: '100%', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, color: colors['--color-slate-400'] },
  warning: { marginBottom: '0.5rem', fontSize: 11, color: 'rgba(252, 211, 77, 0.8)' },
  inputBox: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingInline: '0.625rem', paddingBlock: '0.5rem' },
  composerRow: { display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginTop: '0.375rem' },
  textarea: { 'maxHeight': '8rem', 'minHeight': '1.5rem', 'flexGrow': '1', 'flexShrink': '1', 'flexBasis': '0%', 'resize': 'none', 'borderWidth': 0, 'backgroundColor': 'transparent', 'fontSize': 13, 'color': colors['--color-slate-200'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  sendButton: { display: 'flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': colors['--color-accent-indigo'], ':hover': 'rgba(111, 115, 255, 0.9)', ':disabled': 'rgba(255, 255, 255, 0.06)' }, color: { 'default': colors['--color-white'], ':disabled': colors['--color-slate-600'] }, cursor: { 'default': null, ':disabled': 'not-allowed' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  stopButton: { display: 'flex', width: '1.75rem', height: '1.75rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' }, color: colors['--color-slate-200'], transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
})

export const dotDelays = ['0ms', '160ms', '320ms']

export const dynamicStyles = stylex.create({
  animationDelay: (delay: string) => ({ animationDelay: { default: delay } }),
})
