import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn('h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white focus:border-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-60', className)}
      {...props}
    >
      {children}
    </select>
  )
}

export function SelectTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex h-10 items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white', className)}>{children}</div>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <div className="hidden">{children}</div>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <option value={value} className="bg-[#111826] text-white">
      {children}
    </option>
  )
}
