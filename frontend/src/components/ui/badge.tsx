import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-purple-600/90 text-white',
    secondary: 'bg-white/10 text-white',
    outline: 'border border-white/20 text-white'
  }

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variants[variant], className)}
      {...props}
    />
  )
}
