'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Cross, Lock, BookBookmark, Scales } from '@phosphor-icons/react'
import { getUser, onAuthStateChange } from '@/lib/supabase/auth'
import type { User } from '@/lib/supabase/auth'

// ── Resource catalogue — add future books here ────────────────────────────────

const RESOURCES = [
  {
    href:        '/bible',
    icon:        BookOpen,
    title:       'Holy Bible',
    description: 'NABRE and Douay-Rheims · 73 books · Old and New Testaments',
    badge:       'Scripture',
  },
  {
    href:        '/catechism',
    icon:        Cross,
    title:       'Catechism of the Catholic Church',
    description: 'Second Edition · 2,865 paragraphs across four parts',
    badge:       'Magisterium',
  },
  {
    href:        '/girm',
    icon:        BookBookmark,
    title:       'General Instruction of the Roman Missal',
    description: 'GIRM · 399 articles across nine chapters',
    badge:       'Liturgy',
  },
  {
    href:        '/canon',
    icon:        Scales,
    title:       'Code of Canon Law',
    description: '1983 · 1,752 canons across seven books',
    badge:       'Canon Law',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')

  useEffect(() => {
    getUser().then(u => setStatus(u ? 'ok' : 'denied'))
    return onAuthStateChange(u => setStatus(u ? 'ok' : 'denied'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Lock weight="light" size={40} className="text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">Sign in to access the Library</p>
          <p className="text-sm text-muted-foreground mt-1">
            The Library is available to registered members.
          </p>
        </div>
        <Link
          href="/account"
          className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Sacred texts and Church documents</p>
      </div>

      <div className="space-y-3">
        {RESOURCES.map(({ href, icon: Icon, title, description, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-xl border border-border p-4 hover:border-primary/40 hover:bg-muted/40 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon weight="light" size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground text-sm">{title}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
            <span className="text-muted-foreground text-lg shrink-0">›</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        More resources being added
      </p>
    </div>
  )
}
