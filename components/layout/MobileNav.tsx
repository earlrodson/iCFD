'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  BookOpen,
  MagnifyingGlass,
  UserCircle,
  Books,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useDrawerStore } from '@/store/useDrawerStore'

const tabs = [
  { href: '/',         label: 'Home',     Icon: House },
  { href: '/handbook', label: 'Handbook', Icon: BookOpen },
  { href: '/library',  label: 'Library',  Icon: Books },
  { href: '/search',   label: 'Search',   Icon: MagnifyingGlass },
]

export function MobileNav() {
  const pathname = usePathname()
  const { openDrawer } = useDrawerStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-safe">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px]',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon weight={active ? 'fill' : 'light'} size={24} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}

        {/* Profile — opens drawer */}
        <button
          onClick={openDrawer}
          className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] text-muted-foreground"
          aria-label="Open menu"
        >
          <UserCircle weight="light" size={24} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  )
}
