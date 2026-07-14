'use client'

import { BookOpen, Lightning, ChatText } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { usePresentationMode, useSetPresentationMode } from '@/store/useAppStore'
import type { PresentationMode } from '@/lib/content/normalize'

const MODES: { id: PresentationMode; label: string; description: string; Icon: Icon }[] = [
  {
    id: 'full',
    label: 'Full',
    description: 'Complete explanation with all citations',
    Icon: BookOpen,
  },
  {
    id: 'concise',
    label: 'Concise',
    description: 'Summary with abbreviated sources',
    Icon: Lightning,
  },
  {
    id: 'guide',
    label: 'Guide',
    description: 'Reference + context only — debate ready',
    Icon: ChatText,
  },
]

export function PresentationToggle() {
  const mode = usePresentationMode()
  const setMode = useSetPresentationMode()

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {MODES.map(({ id, label, description, Icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          title={description}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            mode === id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
          aria-pressed={mode === id}
        >
          <Icon weight="light" className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
