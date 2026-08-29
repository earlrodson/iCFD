'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { getUser } from '@/lib/supabase/auth'
import type { User } from '@/lib/supabase/auth'

// Fixed (not random) so server- and client-rendered markup match on hydration.
const PARTICLES = [
  { left: '6%', size: 3, duration: 7, delay: 0 },
  { left: '14%', size: 2, duration: 9, delay: 1.4 },
  { left: '23%', size: 4, duration: 6.5, delay: 2.8 },
  { left: '32%', size: 2, duration: 8, delay: 0.6 },
  { left: '41%', size: 3, duration: 7.5, delay: 3.6 },
  { left: '50%', size: 2, duration: 9.5, delay: 1.9 },
  { left: '59%', size: 4, duration: 6, delay: 4.4 },
  { left: '68%', size: 2, duration: 8.5, delay: 0.2 },
  { left: '77%', size: 3, duration: 7, delay: 2.2 },
  { left: '86%', size: 2, duration: 9, delay: 3.1 },
  { left: '93%', size: 3, duration: 6.8, delay: 1.1 },
]

function GoldParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle-rise absolute bottom-0 rounded-full bg-[var(--cfd-gold)]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export function HomeBanner() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getUser().then(setUser)
  }, [])

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0]

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--cfd-navy)] via-[var(--cfd-navy)] to-[var(--cfd-blue)] px-6 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(242,210,31,0.12),transparent_60%)]" />

      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={604}
        height={604}
        priority
        className="pointer-events-none absolute -right-6 top-1/2 h-56 w-56 -translate-y-1/2 opacity-20 sm:h-72 sm:w-72 sm:opacity-25 md:-right-4 md:h-96 md:w-96"
      />

      <GoldParticles />

      <div className="relative mx-auto max-w-5xl">
        <div className="max-w-xl">
          {user ? (
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Welcome back,
              <br />
              <span className="text-[var(--cfd-gold)]">{displayName}</span>
            </h1>
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Defend the Faith.
              <br />
              <span className="text-[var(--cfd-gold)]">Proclaim the Truth.</span>
            </h1>
          )}

          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
            Equipping Catholics with sound doctrine, reason, and courage to defend our Holy Faith.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/paths"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cfd-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 active:scale-95"
            >
              Explore Formation
              <ArrowRight weight="bold" size={16} />
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cfd-gold)] px-4 py-2.5 text-sm font-semibold text-[var(--cfd-navy)] transition-colors hover:brightness-105 active:scale-95"
            >
              Learn More
              <ArrowRight weight="bold" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
