'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, Cross, Lock, BookBookmark, Scales, MagnifyingGlass, Spinner, FilePdf } from '@phosphor-icons/react'
import { getUser, onAuthStateChange } from '@/lib/supabase/auth'
import type { User } from '@/lib/supabase/auth'

// ── Resource catalogue ────────────────────────────────────────────────────────

const FREE_RESOURCES = [
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
]

const CHURCH_DOCS = [
  {
    href:        '/documents/magnifica-humanitas',
    title:       'Magnifica Humanitas',
    description: 'On artificial intelligence and human dignity — Pope Leo XIV · 2026',
    badge:       'Encyclical',
  },
  {
    href:        '/documents/sacrosanctum-concilium',
    title:       'Sacrosanctum Concilium',
    description: 'Constitution on the Sacred Liturgy — Vatican II · 1963',
    badge:       'Vatican II',
  },
  {
    href:        '/documents/lumen-gentium',
    title:       'Lumen Gentium',
    description: 'Dogmatic Constitution on the Church — Vatican II · 1964',
    badge:       'Vatican II',
  },
  {
    href:        '/documents/dei-verbum',
    title:       'Dei Verbum',
    description: 'Dogmatic Constitution on Divine Revelation — Vatican II · 1965',
    badge:       'Vatican II',
  },
  {
    href:        '/documents/gaudium-et-spes',
    title:       'Gaudium et Spes',
    description: 'Pastoral Constitution on the Church in the Modern World — Vatican II · 1965',
    badge:       'Vatican II',
  },
  {
    href:        '/documents/ad-gentes',
    title:       'Ad Gentes',
    description: 'Decree on the Mission Activity of the Church — Vatican II · 1965',
    badge:       'Vatican II',
  },
  {
    href:        '/documents/lumen-fidei',
    title:       'Lumen Fidei',
    description: 'On Faith — Pope Francis · 2013',
    badge:       'Encyclical',
  },
  {
    href:        '/documents/humanae-vitae',
    title:       'Humanae Vitae',
    description: 'On the Regulation of Birth — Pope Paul VI · 1968',
    badge:       'Encyclical',
  },
  {
    href:        '/documents/council-of-trent',
    title:       'Council of Trent',
    description: 'Canons and Decrees on Scripture, Sacraments & Justification · 1545–1563',
    badge:       'Council',
  },
  {
    href:        '/documents/council-nicaea-i',
    title:       'First Council of Nicaea',
    description: '20 canons defining the divinity of Christ and Church discipline · 325',
    badge:       'Council',
  },
  {
    href:        '/documents/council-constantinople-i',
    title:       'First Council of Constantinople',
    description: '7 canons expanding the Nicene Creed and affirming the Holy Spirit · 381',
    badge:       'Council',
  },
  {
    href:        '/documents/council-ephesus',
    title:       'Council of Ephesus',
    description: 'Defined Mary as Theotokos and condemned Nestorianism · 431',
    badge:       'Council',
  },
  {
    href:        '/documents/council-chalcedon',
    title:       'Council of Chalcedon',
    description: '30 canons on the two natures of Christ, against Monophysitism · 451',
    badge:       'Council',
  },
  {
    href:        '/documents/council-constantinople-ii',
    title:       'Second Council of Constantinople',
    description: 'Condemned the Three Chapters and affirmed Chalcedonian Christology · 553',
    badge:       'Council',
  },
  {
    href:        '/documents/council-laodicea',
    title:       'Synod of Laodicea',
    description: '60 canons on liturgy, Scripture canon, and Church order · c. 363',
    badge:       'Council',
  },
]

const LOCKED_RESOURCES = [
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

// ── Search types ──────────────────────────────────────────────────────────────

interface CccResult   { paragraph: number; summary: string | null; text: string | null }
interface GirmResult  { article: number;   summary: string | null; text: string | null }
interface CanonResult { canon: number;     summary: string | null; text: string | null }
interface DocResult   { slug: string; section_num: number; section_label: string | null; text: string | null; church_document_meta: { title: string } | null }

interface SearchResults {
  ccc:   CccResult[]
  girm:  GirmResult[]
  canon: CanonResult[]
  docs:  DocResult[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

async function searchLibrary(q: string, signedIn: boolean): Promise<SearchResults> {
  const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  const enc = encodeURIComponent(q)
  const [ccc, girm, canon, docs] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/ccc_paragraphs?or=(text.ilike.*${enc}*,summary.ilike.*${enc}*)&select=paragraph,summary,text&limit=4`, { headers: h }).then(r => r.ok ? r.json() : []),
    signedIn
      ? fetch(`${SUPABASE_URL}/rest/v1/girm_articles?or=(text.ilike.*${enc}*,summary.ilike.*${enc}*)&select=article,summary,text&limit=4`, { headers: h }).then(r => r.ok ? r.json() : [])
      : Promise.resolve([]),
    signedIn
      ? fetch(`${SUPABASE_URL}/rest/v1/canons?or=(text.ilike.*${enc}*,summary.ilike.*${enc}*)&select=canon,summary,text&limit=4`, { headers: h }).then(r => r.ok ? r.json() : [])
      : Promise.resolve([]),
    fetch(`${SUPABASE_URL}/rest/v1/church_documents?text=ilike.*${enc}*&select=slug,section_num,section_label,text,church_document_meta(title)&limit=5`, { headers: h }).then(r => r.ok ? r.json() : []),
  ])
  return { ccc: ccc ?? [], girm: girm ?? [], canon: canon ?? [], docs: docs ?? [] }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  // undefined = resolving, null = guest, User = signed in
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    getUser().then(u => setUser(u ?? null))
    return onAuthStateChange(u => setUser(u ?? null))
  }, [])

  const signedIn = user !== undefined && user !== null

  useEffect(() => {
    clearTimeout(debounce.current)
    if (query.trim().length < 3) { setResults(null); return }
    setSearching(true)
    debounce.current = setTimeout(async () => {
      const r = await searchLibrary(query.trim(), signedIn)
      setResults(r)
      setSearching(false)
    }, 350)
  }, [query, signedIn])

  const hasResults = results && (results.ccc.length + results.girm.length + results.canon.length + results.docs.length) > 0
  const noResults  = results && !hasResults

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Sacred texts and Church documents</p>
      </div>

      {/* Global search */}
      <div className="relative mb-6">
        <MagnifyingGlass
          weight="light" size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={signedIn ? 'Search across Bible, Catechism, GIRM, and Canon Law…' : 'Search the Bible and Catechism…'}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searching && (
          <Spinner weight="light" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search results */}
      {(hasResults || noResults) && (
        <div className="mb-6 space-y-4">
          {noResults && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {results!.ccc.length > 0 && (
            <ResultGroup label="Catechism" badge="CCC">
              {results!.ccc.map(r => (
                <ResultItem
                  key={r.paragraph}
                  ref_={`CCC ${r.paragraph}`}
                  text={r.summary ?? r.text ?? ''}
                  href={`/catechism?p=${r.paragraph}`}
                />
              ))}
            </ResultGroup>
          )}

          {results!.girm.length > 0 && (
            <ResultGroup label="General Instruction" badge="GIRM">
              {results!.girm.map(r => (
                <ResultItem
                  key={r.article}
                  ref_={`GIRM ${r.article}`}
                  text={r.summary ?? r.text ?? ''}
                  href={`/girm?article=${r.article}`}
                />
              ))}
            </ResultGroup>
          )}

          {results!.canon.length > 0 && (
            <ResultGroup label="Code of Canon Law" badge="Canon">
              {results!.canon.map(r => (
                <ResultItem
                  key={r.canon}
                  ref_={`c.${r.canon}`}
                  text={r.summary ?? r.text ?? ''}
                  href={`/canon?canon=${r.canon}`}
                />
              ))}
            </ResultGroup>
          )}

          {results!.docs.length > 0 && (
            <ResultGroup label="Church Documents" badge="Docs">
              {results!.docs.map(r => (
                <ResultItem
                  key={`${r.slug}-${r.section_num}`}
                  ref_={`§${r.section_num}`}
                  text={`${r.church_document_meta?.title ?? r.slug} · ${r.section_label?.split(' · ').pop() ?? ''} — ${r.text ?? ''}`}
                  href={`/documents/${r.slug}?s=${r.section_num}`}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}

      {/* Resource cards */}
      {!query && (
        <div className="space-y-3">
          {/* Free resources — always accessible */}
          {FREE_RESOURCES.map(({ href, icon: Icon, title, description, badge }) => (
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

          {/* Church Documents */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-0.5">
              Church Documents
            </p>
            <div className="space-y-2">
              {CHURCH_DOCS.map(({ href, title, description, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-4 rounded-xl border border-border p-4 hover:border-primary/40 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FilePdf weight="light" size={22} className="text-primary" />
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
          </div>

          {/* Disclaimer / sign-in CTA */}
          {!signedIn && user !== undefined && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Link href="/account" className="font-medium text-primary hover:underline">Sign in</Link>
                {' '}to access more documents of the Catholic Church — including Canon Law, the Roman Missal, and additional resources.
              </p>
            </div>
          )}

          {/* Locked resources — members only */}
          {LOCKED_RESOURCES.map(({ href, icon: Icon, title, description, badge }) =>
            signedIn ? (
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
            ) : (
              <Link
                key={href}
                href="/account"
                className="flex items-start gap-4 rounded-xl border border-border p-4 opacity-50 cursor-pointer hover:opacity-60 transition-opacity"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon weight="light" size={22} className="text-muted-foreground" />
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
                <Lock weight="light" size={16} className="text-muted-foreground shrink-0 mt-1" />
              </Link>
            )
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-8">
        More resources being added
      </p>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultGroup({ label, badge, children }: { label: string; badge: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{badge}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ResultItem({ ref_, text, href }: { ref_: string; text: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors"
    >
      <span className="shrink-0 text-xs font-mono font-bold text-primary/70 bg-primary/8 rounded px-1.5 py-0.5 mt-0.5">
        {ref_}
      </span>
      <p className="text-xs text-foreground leading-relaxed line-clamp-2">{text}</p>
      <span className="shrink-0 text-muted-foreground text-sm">›</span>
    </Link>
  )
}
