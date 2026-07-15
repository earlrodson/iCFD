'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, CloudArrowUp, CloudArrowDown, CheckCircle } from '@phosphor-icons/react'
import { useAppStore } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useReadingStore } from '@/store/useReadingStore'
import { getUser, onAuthStateChange } from '@/lib/supabase/auth'
import {
  syncFavoritesToCloud, syncNotesToCloud, syncReadProgressToCloud,
  fetchFavoritesFromCloud, fetchNotesFromCloud, fetchReadProgressFromCloud,
} from '@/lib/supabase/sync'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Language } from '@/data/schema/topic.schema'
import type { FontSize } from '@/store/useAppStore'
import type { User } from '@/lib/supabase/auth'

const LANGUAGES: { value: Language; label: string; sublabel: string }[] = [
  { value: 'en',  label: 'English',  sublabel: 'EN'  },
  { value: 'tl',  label: 'Tagalog',  sublabel: 'TL'  },
  { value: 'ceb', label: 'Cebuano',  sublabel: 'CEB' },
]

const FONT_SIZES: { value: FontSize; label: string; description: string }[] = [
  { value: 'small',  label: 'A−', description: 'Small'  },
  { value: 'medium', label: 'A',  description: 'Medium' },
  { value: 'large',  label: 'A+', description: 'Large'  },
]

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

export default function SettingsPage() {
  const { currentLanguage, setLanguage, fontSize, setFontSize } = useAppStore()
  const { favoriteIds, addedAt, toggleFavorite } = useFavoritesStore()
  const { notes, setNote } = useNotesStore()
  const { readProgress, markAsRead } = useReadingStore()

  const [isDark, setIsDark]             = useState(false)
  const [user, setUser]                 = useState<User | null>(null)
  const [uploadStatus, setUploadStatus] = useState<SyncStatus>('idle')
  const [downloadStatus, setDownloadStatus] = useState<SyncStatus>('idle')

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-small', 'text-medium', 'text-large')
    html.classList.add(`text-${fontSize}`)
  }, [fontSize])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    getUser().then(setUser)
    return onAuthStateChange(setUser)
  }, [])

  function toggleDark() {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark'); localStorage.setItem('theme', 'light'); setIsDark(false)
    } else {
      html.classList.add('dark'); localStorage.setItem('theme', 'dark'); setIsDark(true)
    }
  }

  async function handleUpload() {
    if (!user) return
    setUploadStatus('syncing')
    try {
      await Promise.all([
        syncFavoritesToCloud(user.id, favoriteIds.map((id) => ({ id, addedAt: addedAt[id] ?? null }))),
        syncNotesToCloud(user.id, notes),
        syncReadProgressToCloud(user.id, readProgress),
      ])
      setUploadStatus('done')
    } catch { setUploadStatus('error') }
  }

  async function handleDownload() {
    if (!user) return
    setDownloadStatus('syncing')
    try {
      const [remoteFavs, remoteNotes, remoteProgress] = await Promise.all([
        fetchFavoritesFromCloud(user.id),
        fetchNotesFromCloud(user.id),
        fetchReadProgressFromCloud(user.id),
      ])
      if (remoteFavs) for (const { id } of remoteFavs) { if (!favoriteIds.includes(id)) toggleFavorite(id) }
      if (remoteNotes) for (const [k, v] of Object.entries(remoteNotes)) setNote(k, v)
      if (remoteProgress) for (const [k, { isRead }] of Object.entries(remoteProgress)) { if (isRead) markAsRead(k) }
      setDownloadStatus('done')
    } catch { setDownloadStatus('error') }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-4 pt-6 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">General Settings</h1>

        {/* ── Language ── */}
        <section className="space-y-3">
          <SectionLabel>Language</SectionLabel>
          <div className="space-y-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-colors',
                  currentLanguage === lang.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                <span className="text-sm font-medium">{lang.label}</span>
                <span className={cn(
                  'text-xs font-semibold',
                  currentLanguage === lang.value ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {lang.sublabel}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Text Size ── */}
        <section className="space-y-3">
          <SectionLabel>Text Size</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {FONT_SIZES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFontSize(f.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border py-4 transition-colors',
                  fontSize === f.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                <span className="text-lg font-bold">{f.label}</span>
                <span className={cn(
                  'text-[10px]',
                  fontSize === f.value ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {f.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Theme ── */}
        <section className="space-y-3">
          <SectionLabel>Theme</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { dark: false, label: 'Light', Icon: Sun },
              { dark: true,  label: 'Dark',  Icon: Moon },
            ].map(({ dark, label, Icon }) => (
              <button
                key={label}
                onClick={() => { if (isDark !== dark) toggleDark() }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border py-5 transition-colors',
                  isDark === dark
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                <Icon weight="light" size={24} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Cloud Sync ── */}
        {isSupabaseConfigured() && (
          <section className="space-y-3">
            <SectionLabel>Cloud Sync</SectionLabel>
            {user ? (
              <div className="space-y-2">
                <SyncButton
                  status={uploadStatus}
                  onClick={handleUpload}
                  icon={<CloudArrowUp weight="light" size={20} className="text-primary" />}
                  title="Upload to Cloud"
                  idleDesc="Push favorites, notes & progress"
                  syncingDesc="Uploading…"
                />
                <SyncButton
                  status={downloadStatus}
                  onClick={handleDownload}
                  icon={<CloudArrowDown weight="light" size={20} className="text-primary" />}
                  title="Download from Cloud"
                  idleDesc="Merge cloud data into this device"
                  syncingDesc="Downloading…"
                />
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <a href="/account" className="text-primary hover:underline">Sign in</a> to enable cloud sync.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

function SyncButton({
  status, onClick, icon, title, idleDesc, syncingDesc,
}: {
  status: SyncStatus
  onClick: () => void
  icon: React.ReactNode
  title: string
  idleDesc: string
  syncingDesc: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={status === 'syncing'}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted transition-colors disabled:opacity-60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        {status === 'done'
          ? <CheckCircle weight="fill" size={20} className="text-emerald-500" />
          : icon}
      </div>
      <div className="text-left">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {status === 'syncing' ? syncingDesc : status === 'error' ? 'Error — try again' : idleDesc}
        </p>
      </div>
    </button>
  )
}
