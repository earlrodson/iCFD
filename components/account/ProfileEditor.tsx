'use client'

import { useEffect, useRef, useState } from 'react'
import { User, PencilSimple, Check, X, Camera, IdentificationCard, ShieldStar } from '@phosphor-icons/react'
import { saveProfileToCloud, type UserProfile } from '@/lib/supabase/sync'
import type { User as SupabaseUser } from '@/lib/supabase/auth'
import { parseJsonResponse } from '@/lib/utils'

interface ProfileEditorProps {
  user: SupabaseUser
  profile: UserProfile | null
  onProfileChange: (profile: UserProfile) => void
}

interface FormState {
  first_name: string
  last_name: string
  age: string
  location: string
  certifications: string
  mobile_number: string
  chapter: string
  diocese: string
}

function toFormState(profile: UserProfile | null): FormState {
  return {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    age: profile?.age != null ? String(profile.age) : '',
    location: profile?.location ?? '',
    certifications: (profile?.certifications ?? []).join(', '),
    mobile_number: profile?.mobile_number ?? '',
    chapter: profile?.chapter ?? '',
    diocese: profile?.diocese ?? '',
  }
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function ProfileEditor({ user, profile, onProfileChange }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(toFormState(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cfdIdUploading, setCfdIdUploading] = useState(false)
  const [cfdIdSignedUrl, setCfdIdSignedUrl] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const cfdIdInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setForm(toFormState(profile))
  }, [profile, editing])

  useEffect(() => {
    if (!profile?.is_cfd_member || !profile.cfd_id_image_path) { setCfdIdSignedUrl(null); return }
    fetch('/api/profile/cfd-id')
      .then((r) => r.json())
      .then((d) => setCfdIdSignedUrl(d.signed_url ?? null))
      .catch(() => setCfdIdSignedUrl(null))
  }, [profile?.is_cfd_member, profile?.cfd_id_image_path])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const age = form.age.trim() ? Number(form.age) : null
      if (age != null && (Number.isNaN(age) || age < 0 || age > 130)) {
        setError('Enter a valid age.')
        return
      }
      const certifications = form.certifications
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      const fields = {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        age,
        location: form.location.trim() || null,
        certifications,
        mobile_number: form.mobile_number.trim() || null,
        ...(profile?.is_cfd_member
          ? { chapter: form.chapter.trim() || null, diocese: form.diocese.trim() || null }
          : {}),
      }

      await saveProfileToCloud(user.id, fields)
      onProfileChange({ ...(profile as UserProfile), ...fields })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body })
      const data = await parseJsonResponse<{ avatar_url: string }>(res, 'Upload failed')
      onProfileChange({ ...(profile as UserProfile), avatar_url: data.avatar_url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload profile picture.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleCfdIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCfdIdUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/profile/cfd-id', { method: 'POST', body })
      const data = await parseJsonResponse<{ signed_url: string | null }>(res, 'Upload failed')
      setCfdIdSignedUrl(data.signed_url ?? null)
      onProfileChange({ ...(profile as UserProfile), cfd_id_image_path: 'uploaded' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload CFD ID image.')
    } finally {
      setCfdIdUploading(false)
    }
  }

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || (user.user_metadata?.display_name as string | undefined)
    || user.email
    || 'User'

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User weight="light" size={32} className="text-primary" />
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm disabled:opacity-60"
            aria-label="Change profile picture"
          >
            {avatarUploading
              ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              : <Camera weight="fill" size={12} />
            }
          </button>
          <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{displayName}</p>
            {profile?.is_cfd_member && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <ShieldStar weight="fill" size={11} /> CFD Member
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground truncate">{user.email}</p>
        </div>

        {!editing && (
          <button
            onClick={() => { setForm(toFormState(profile)); setEditing(true); setError('') }}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Edit profile"
          >
            <PencilSimple weight="light" size={16} />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.first_name}
              onChange={(e) => updateField('first_name', e.target.value)}
              placeholder="First name"
              className="rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.last_name}
              onChange={(e) => updateField('last_name', e.target.value)}
              placeholder="Last name"
              className="rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={0}
              max={130}
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
              placeholder="Age"
              className="rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={form.mobile_number}
              onChange={(e) => updateField('mobile_number', e.target.value)}
              placeholder="Mobile number"
              className="rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <input
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="Location (city, country)"
            className="w-full rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={form.certifications}
            onChange={(e) => updateField('certifications', e.target.value)}
            placeholder="Certifications (comma-separated)"
            className="w-full rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {profile?.is_cfd_member && (
            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">CFD Membership</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.chapter}
                  onChange={(e) => updateField('chapter', e.target.value)}
                  placeholder="Chapter"
                  className="rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  value={form.diocese}
                  onChange={(e) => updateField('diocese', e.target.value)}
                  placeholder="Diocese"
                  className="rounded-xl bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Check weight="bold" size={15} />
              }
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setError('') }}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <X weight="light" size={15} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <ProfileField label="Age" value={profile?.age != null ? String(profile.age) : null} />
          <ProfileField label="Mobile" value={profile?.mobile_number} />
          <ProfileField label="Location" value={profile?.location} className="col-span-2" />
          <ProfileField
            label="Certifications"
            value={profile?.certifications?.length ? profile.certifications.join(', ') : null}
            className="col-span-2"
          />
        </div>
      )}

      {/* CFD membership details — never shown to regular (non-member) users */}
      {profile?.is_cfd_member && !editing && (
        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldStar weight="fill" size={13} className="text-primary" /> CFD Membership
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <ProfileField label="Chapter" value={profile.chapter} />
            <ProfileField label="Diocese" value={profile.diocese} />
            <ProfileField label="Member since" value={formatDate(profile.membership_date)} />
            <ProfileField label="Expires" value={formatDate(profile.membership_expiration)} />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {cfdIdSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cfdIdSignedUrl} alt="CFD ID card" className="h-full w-full object-cover" />
              ) : (
                <IdentificationCard weight="light" size={22} className="text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => cfdIdInputRef.current?.click()}
              disabled={cfdIdUploading}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
            >
              {cfdIdUploading ? 'Uploading…' : cfdIdSignedUrl ? 'Replace CFD ID image' : 'Upload CFD ID image'}
            </button>
            <input ref={cfdIdInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCfdIdChange} />
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileField({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-foreground">{value || '—'}</p>
    </div>
  )
}
