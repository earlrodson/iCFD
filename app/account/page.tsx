'use client'

import { User } from '@phosphor-icons/react'

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <User weight="light" size={40} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Account features coming soon.</p>
        </div>
      </div>
    </div>
  )
}
