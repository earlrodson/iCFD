'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Search, Heart, User } from 'lucide-react'
import { useFavoritesCount } from '@/store/useFavoritesStore'
import { useAuthStore } from '@/store/useAuthStore'
import { AuthModal } from '@/components/auth/AuthModal'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/handbook', label: 'Handbook', icon: BookOpen },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/favorites', label: 'Favorites', icon: Heart },
]

export function MobileNav() {
  const pathname = usePathname()
  const favCount = useFavoritesCount()
  const user = useAuthStore(s => s.user)
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t safe-area-pb">
        <div className="flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/'
              ? pathname === '/'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {href === '/favorites' && favCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center leading-none px-0.5">
                      {favCount > 99 ? '99+' : favCount}
                    </span>
                  )}
                </div>
                <span className="leading-none">{label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setAuthOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              user ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <User className="h-5 w-5" />
              {user && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
              )}
            </div>
            <span className="leading-none">{user ? 'Account' : 'Sign In'}</span>
          </button>
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
