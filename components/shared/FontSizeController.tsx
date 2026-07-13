'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

const SIZE_CLASS: Record<string, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
}

export function FontSizeController() {
  const fontSize = useAppStore(state => state.settings.fontSize)

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-sm', 'text-base', 'text-lg')
    html.classList.add(SIZE_CLASS[fontSize] ?? 'text-base')
  }, [fontSize])

  return null
}
