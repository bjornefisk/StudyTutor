import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary'
type ButtonSize = 'default' | 'sm' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const base = 'inline-flex items-center justify-center font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 disabled:opacity-60 disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  default: 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:shadow-lg',
  outline: 'border border-white/20 bg-transparent text-white hover:bg-white/10',
  ghost: 'bg-transparent text-white hover:bg-white/10',
  secondary: 'bg-white/10 text-white hover:bg-white/20'
}

const sizes: Record<ButtonSize, string> = {
  default: 'h-11 px-5 py-2 rounded-xl text-sm',
  sm: 'h-9 px-4 rounded-lg text-sm',
  icon: 'h-10 w-10 rounded-xl'
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
}
