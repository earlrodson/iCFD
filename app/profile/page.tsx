'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/useAuthStore'
import { useFavoritesStore, useFavoritesCount } from '@/store/useFavoritesStore'
import { useProgressStore, useReadCount } from '@/store/useProgressStore'
import { usePathsStore } from '@/store/usePathsStore'
import { useAppStore } from '@/store/useAppStore'
import { getProfile, updateProfile, type UserProfile } from '@/lib/supabase/profile'
import {
  User, SignOut, PencilSimple, Check, X, BookOpen,
  Heart, CheckCircle, GraduationCap, Shield, ArrowLeft, Crown
} from '@phosphor-icons/react'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:  { label: 'Admin',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  user:   { label: 'Member', color: 'bg-muted text-muted-foreground' },
}

function Avatar({ name, url, size = 56 }: { name?: string | null; url?: string | null; size?: number }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name ?? 'Avatar'} width={size} height={size}
        className="rounded-full object-cover" style={{ width: size, height: size }} />
    )
  }

  return (
    <div
      className="rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, role, signOut, loading: authLoading } = useAuthStore()
  const { initialize, settings, updateSettings } = useAppStore()
  const { loadFavorites } = useFavoritesStore()
  const { loadProgress, readTopicIds } = useProgressStore()
  const { paths, loadPaths, getPathProgress } = usePathsStore()
  const favCount = useFavoritesCount()
  const readCount = useReadCount()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/profile')
    }
  }, [user, authLoading, router])

  // Load data
  useEffect(() => {
    if (!user) return
    initialize()
    loadFavorites()
    loadProgress()
    loadPaths()
    getProfile(user.id).then(p => {
      setProfile(p)
      setNameInput(p?.display_name ?? '')
    })
  }, [user, initialize, loadFavorites, loadProgress, loadPaths])

  const handleSaveName = useCallback(async () => {
    if (!user) return
    setSaving(true)
    const { error } = await updateProfile(user.id, { display_name: nameInput.trim() || null })
    if (!error) {
      setProfile(p => p ? { ...p, display_name: nameInput.trim() || null } : p)
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
    setEditingName(false)
  }, [user, nameInput])

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
  }

  const completedPaths = paths.filter(p => {
    const { percent } = getPathProgress(p.slug, readTopicIds)
    return percent === 100
  }).length

  const displayName = profile?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const roleInfo = ROLE_LABELS[role ?? 'user'] ?? ROLE_LABELS.user

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Nav */}
      <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border/60">
        <div className="container mx-auto px-4 max-w-2xl flex items-center h-12 gap-3">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link href="/"><ArrowLeft weight="light" className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-[17px] font-semibold flex-1">Profile</h1>
          {role === 'admin' && (
            <Link href="/admin" className="text-[13px] text-primary font-medium">Admin</Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-2xl py-5 space-y-4">

        {/* Identity card */}
        <div className="rounded-2xl bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} url={profile?.avatar_url} size={60} />
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="h-8 text-[15px]"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSaveName} disabled={saving}>
                    <Check weight="bold" className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingName(false)}>
                    <X weight="bold" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-[17px] font-semibold text-foreground truncate">{displayName}</p>
                  <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground">
                    <PencilSimple weight="light" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-[13px] text-muted-foreground truncate mt-0.5">{user.email}</p>
              {saveMsg && <p className="text-[12px] text-green-600 mt-0.5">{saveMsg}</p>}
            </div>
            <Badge className={`shrink-0 text-[11px] ${roleInfo.color}`}>{roleInfo.label}</Badge>
          </div>
        </div>

        {/* Progress stats */}
        <p className="section-header">Your Progress</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Topics Read', value: readCount, icon: BookOpen, href: null },
            { label: 'Favorites',   value: favCount,  icon: Heart,    href: '/favorites' },
            { label: 'Paths Done',  value: completedPaths, icon: GraduationCap, href: '/paths' },
          ].map(({ label, value, icon: Icon, href }) => {
            const inner = (
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] p-4 flex flex-col items-center gap-1">
                <Icon weight="light" className="h-5 w-5 text-primary" />
                <span className="text-[22px] font-bold leading-none">{value}</span>
                <span className="text-[11px] text-muted-foreground font-medium text-center">{label}</span>
              </div>
            )
            return href
              ? <Link key={label} href={href}>{inner}</Link>
              : <div key={label}>{inner}</div>
          })}
        </div>

        {/* Path progress */}
        {paths.length > 0 && (
          <>
            <p className="section-header">Learning Paths</p>
            <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
              {paths.map(path => {
                const { completed, total, percent } = getPathProgress(path.slug, readTopicIds)
                return (
                  <Link
                    key={path.slug}
                    href={`/paths/${path.slug}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-muted transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${percent === 100 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'}`}>
                      {percent === 100
                        ? <CheckCircle weight="light" className="h-4 w-4 text-green-600" />
                        : <Shield weight="light" className="h-4 w-4 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{path.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{completed}/{total}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Settings */}
        <p className="section-header">Preferences</p>
        <div className="rounded-2xl bg-card overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] divide-y divide-border">
          {/* Theme */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[15px] font-medium">Theme</p>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              {(['light', 'dark', 'system'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`px-3 py-1 rounded-md text-[12px] font-medium capitalize transition-all ${
                    settings.theme === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[15px] font-medium">Language</p>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              {(['en', 'tl', 'ceb'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => updateSettings({ language: l })}
                  className={`px-3 py-1 rounded-md text-[12px] font-medium uppercase transition-all ${
                    settings.language === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[15px] font-medium">Text Size</p>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              {(['small', 'medium', 'large'] as const).map((s, i) => (
                <button
                  key={s}
                  onClick={() => updateSettings({ fontSize: s })}
                  className={`px-3 py-1 rounded-md font-semibold transition-all text-[${['12px', '14px', '17px'][i]}] ${
                    settings.fontSize === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  A
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Admin link */}
        {(role === 'admin' || role === 'editor') && (
          <>
            <p className="section-header">Administration</p>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)] active:bg-muted transition-colors"
            >
              <div className="h-8 w-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Crown weight="light" className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium">Admin Panel</p>
                <p className="text-[12px] text-muted-foreground">Manage content, users, and paths</p>
              </div>
            </Link>
          </>
        )}

        {/* Sign out */}
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={handleSignOut}
          >
            <SignOut weight="light" className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>

        {/* User ID (for support) */}
        <p className="text-center text-[11px] text-muted-foreground/50 pb-2">
          ID: {user.id.slice(0, 8)}…
        </p>

      </main>
    </div>
  )
}
