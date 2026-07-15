'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  BookOpen,
  MagnifyingGlass,
  Heart,
  Ladder,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useFavoritesStore } from '@/store/useFavoritesStore'

const tabs = [
  { href: '/',        label: 'Home',     Icon: House },
  { href: '/handbook',label: 'Handbook', Icon: BookOpen },
  { href: '/search',  label: 'Search',   Icon: MagnifyingGlass },
  { href: '/favorites',label: 'Favorites',Icon: Heart },
  { href: '/paths',   label: 'Paths',    Icon: Ladder },
  { href: '/submit',  label: 'Submit',   Icon: PaperPlaneTilt },
]

export function MobileNav() {
  const pathname = usePathname()
  const { favoriteIds } = useFavoritesStore()
  const favCount = favoriteIds.length

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-safe">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isFavTab = href === '/favorites'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px]',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <div className="relative">
                <Icon weight={active ? 'fill' : 'light'} size={24} />
                {isFavTab && favCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white leading-none">
                    {favCount > 99 ? '99+' : favCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
