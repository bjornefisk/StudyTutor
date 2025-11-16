import type { HTMLAttributes } from 'react'

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>
}

export function TooltipContent({ children, ..._props }: { children: React.ReactNode; sideOffset?: number }) {
  // No-op placeholder; real tooltip system can be wired later
  return <>{/* tooltip */}{children}</>
}
