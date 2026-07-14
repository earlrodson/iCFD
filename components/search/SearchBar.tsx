'use client'

import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useSearchStore } from '@/store/useSearchStore'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function SearchBar({
  placeholder = 'Search topics…',
  className,
  autoFocus = false,
}: SearchBarProps) {
  const { query, setQuery } = useSearchStore()

  return (
    <div className={cn('relative flex items-center', className)}>
      <MagnifyingGlass
        weight="light"
        size={18}
        className="absolute left-3 text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl bg-muted py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-3 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X weight="light" size={16} />
        </button>
      )}
    </div>
  )
}
