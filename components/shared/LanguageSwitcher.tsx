'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAppStore, useCurrentLanguage } from '@/store/useAppStore'
import { getLanguageName, getLanguageFlag } from '@/lib/utils'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' }
] as const

type LanguageCode = typeof languages[number]['code']

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'dropdown'
  showFlag?: boolean
  showName?: boolean
  className?: string
}

export function LanguageSwitcher({
  variant = 'default',
  showFlag = true,
  showName = true,
  className
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentLanguage = useCurrentLanguage()
  const { setCurrentLanguage, loading } = useAppStore()

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false)
      return
    }

    try {
      await setCurrentLanguage(languageCode)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  const currentLanguageData = languages.find(lang => lang.code === currentLanguage)

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn("h-8 px-2", className)}
      >
        {showFlag && currentLanguageData?.flag}
        {showName && <span className="ml-1 text-xs">{currentLanguage?.toUpperCase()}</span>}
        <CaretDown weight="light" className="ml-1 h-3 w-3" />
      </Button>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center space-x-2"
        data-testid="language-switcher"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        {showFlag && currentLanguageData?.flag}
        {showName && <span>{currentLanguageData?.name}</span>}
        <CaretDown weight="light" className="h-4 w-4" />
        {loading && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[150px]" data-testid="lang-dropdown">
            <ul className="py-1" role="menu">
              {languages.map((language) => (
                <li key={language.code}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between",
                      language.code === currentLanguage && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleLanguageChange(language.code)}
                    disabled={loading}
                    data-testid={`lang-${language.code}`}
                    role="menuitem"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{language.flag}</span>
                      <span className="text-sm">{language.name}</span>
                    </div>
                    {language.code === currentLanguage && (
                      <Check weight="light" className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for mobile
export function CompactLanguageSwitcher({ className }: { className?: string }) {
  const currentLanguage = useCurrentLanguage()
  const { setCurrentLanguage, loading } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguageData = languages.find(lang => lang.code === currentLanguage)

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false)
      return
    }

    try {
      await setCurrentLanguage(languageCode)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="p-1 h-8 w-8"
        data-testid="language-switcher-mobile"
        aria-label="Select language (mobile)"
        aria-expanded={isOpen}
      >
        {currentLanguageData?.flag}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full right-0 mt-1 bg-background border rounded-md shadow-lg z-50" data-testid="lang-dropdown-mobile">
            <ul className="py-1" role="menu">
              {languages.map((language) => (
                <li key={language.code}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between",
                      language.code === currentLanguage && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleLanguageChange(language.code)}
                    disabled={loading}
                    data-testid={`lang-${language.code}`}
                    role="menuitem"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{language.flag}</span>
                      <span className="text-sm">{language.name}</span>
                    </div>
                    {language.code === currentLanguage && (
                      <Check weight="light" className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// Language indicator for display purposes
export function LanguageIndicator({ className }: { className?: string }) {
  const currentLanguage = useCurrentLanguage()
  const currentLanguageData = languages.find(lang => lang.code === currentLanguage)

  return (
    <div className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}>
      <span>{currentLanguageData?.flag}</span>
      <span>{currentLanguageData?.name}</span>
    </div>
  )
}