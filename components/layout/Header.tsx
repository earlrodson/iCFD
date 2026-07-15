'use client'

import Link from 'next/link'
import { Sun, Moon, Globe, User } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getSession } from '@/lib/supabase/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Language } from '@/data/schema/topic.schema'
import type { FontSize } from '@/store/useAppStore'

const languages: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'tl', label: 'TL' },
  { value: 'ceb', label: 'CEB' },
]

const FONT_CYCLE: FontSize[] = ['small', 'medium', 'large']
const FONT_LABEL: Record<FontSize, string> = { small: 'A−', medium: 'A', large: 'A+' }

export function Header() {
  const [isDark, setIsDark] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const { currentLanguage, setLanguage, fontSize, setFontSize } = useAppStore()

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Apply font size class to <html>
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-small', 'text-medium', 'text-large')
    html.classList.add(`text-${fontSize}`)
  }, [fontSize])

  // Track auth state for the avatar dot indicator
  useEffect(() => {
    getSession().then((s) => setSignedIn(!!s))
    const sb = getSupabaseBrowserClient()
    if (!sb) return
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(!!s))
    return () => subscription.unsubscribe()
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

  const cycleFontSize = () => {
    const idx = FONT_CYCLE.indexOf(fontSize)
    setFontSize(FONT_CYCLE[(idx + 1) % FONT_CYCLE.length])
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md no-print">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            iCFD
          </div>
          <span className="hidden font-semibold text-foreground sm:block">
            Codex Defensoris
          </span>
        </Link>

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

          {/* Font size cycle */}
          <button
            onClick={cycleFontSize}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold"
            aria-label={`Font size: ${fontSize}. Click to cycle.`}
            title={`Text size: ${fontSize}`}
          >
            {FONT_LABEL[fontSize]}
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun weight="light" size={18} /> : <Moon weight="light" size={18} />}
          </button>

          {/* Account */}
          <Link
            href="/account"
            className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Account"
          >
            <User weight="light" size={18} />
            {signedIn && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500 ring-1 ring-card" />
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
