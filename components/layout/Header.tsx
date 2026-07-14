'use client'

import { Sun, Moon, Globe } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { Language } from '@/data/schema/topic.schema'

const languages: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'tl', label: 'TL' },
  { value: 'ceb', label: 'CEB' },
]

export function Header() {
  const [isDark, setIsDark] = useState(false)
  const { currentLanguage, setLanguage } = useAppStore()

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleDark = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            iCFD
          </div>
          <span className="hidden font-semibold text-foreground sm:block">
            Catholic Faith Defender
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            <Globe weight="light" size={14} className="ml-1 text-muted-foreground" />
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                  currentLanguage === lang.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun weight="light" size={18} /> : <Moon weight="light" size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
