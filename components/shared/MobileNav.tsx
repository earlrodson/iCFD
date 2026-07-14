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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/60 pb-safe">
        <div className="flex h-[49px]">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className={`h-[22px] w-[22px] ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                  {href === '/favorites' && favCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 leading-none">
                      {favCount > 99 ? '99+' : favCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-none font-medium">{label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setAuthOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors ${
              user ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className="relative">
              <User className={`h-[22px] w-[22px] ${user ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
              {user && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-card" />
              )}
            </div>
            <span className="text-[10px] leading-none font-medium">{user ? 'Account' : 'Sign In'}</span>
          </button>
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
