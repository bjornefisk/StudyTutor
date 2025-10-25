"use client"

import ThemeToggle from './ThemeToggle'
import { GraduationCap } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">AI Tutor</h1>
            <p className="text-xs text-muted-foreground">Local Study Assistant</p>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Running Locally</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
