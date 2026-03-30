import * as React from 'react'
import { cn } from '../../lib/cn'

type Variant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

const variants: Record<Variant, string> = {
  success:
    'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300',
  warning:
    'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300',
  danger: 'bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300',
  neutral:
    'bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
  info: 'bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300',
}

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

