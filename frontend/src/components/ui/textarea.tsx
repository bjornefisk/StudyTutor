import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn('flex min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-300 focus:border-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-60', className)}
      {...props}
    />
  )
}
