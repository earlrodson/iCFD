'use client'

import Link from 'next/link'
import { Sun, Moon, Globe, User, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useSearchStore } from '@/store/useSearchStore'
import { getUser, onAuthStateChange } from '@/lib/supabase/auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const { currentLanguage, setLanguage, fontSize, setFontSize } = useAppStore()
  const { query, setQuery } = useSearchStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-small', 'text-medium', 'text-large')
    html.classList.add(`text-${fontSize}`)
  }, [fontSize])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    getUser().then((u) => setSignedIn(!!u))
    return onAuthStateChange((u) => setSignedIn(!!u))
  }, [])

  // Focus input when search expands
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const openSearch = () => setSearchOpen(true)

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  // Close on Escape
  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen])

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
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            iCFD
          </div>
          <span className="hidden font-semibold text-foreground sm:block">
            Codex Defensoris
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Expandable search — icon collapses to input */}
          <div
            className={`flex items-center overflow-hidden rounded-xl bg-muted transition-all duration-300 ease-in-out ${
              searchOpen ? 'w-44 sm:w-56' : 'w-8'
            }`}
          >
            <button
              onClick={openSearch}
              className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open search"
              tabIndex={searchOpen ? -1 : 0}
            >
              <MagnifyingGlass weight="light" size={18} />
            </button>

            {/* Input — visible only when expanded */}
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-hidden={!searchOpen}
              className={`h-8 flex-1 bg-transparent pr-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-opacity duration-200 ${
                searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* Clear / close */}
            {searchOpen && (
              <button
                onClick={closeSearch}
                className="flex h-8 w-7 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close search"
              >
                <X weight="light" size={14} />
              </button>
            )}
          </div>

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

          <button
            onClick={cycleFontSize}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold"
            aria-label={`Font size: ${fontSize}. Click to cycle.`}
            title={`Text size: ${fontSize}`}
          >
            {FONT_LABEL[fontSize]}
          </button>

          <button
            onClick={toggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun weight="light" size={18} /> : <Moon weight="light" size={18} />}
          </button>

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
