import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Scripture reference formatting
export function formatScriptureReference(reference: string): string {
  return reference.trim()
}

// Language utilities
export function getLanguageName(code: 'en' | 'tl' | 'ceb'): string {
  const names = {
    en: 'English',
    tl: 'Tagalog',
    ceb: 'Cebuano'
  }
  return names[code] || code
}

export function getLanguageFlag(code: 'en' | 'tl' | 'ceb'): string {
  const flags = {
    en: '🇺🇸',
    tl: '🇵🇭',
    ceb: '🇵🇭'
  }
  return flags[code] || '🌐'
}

// Category utilities
export function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    sacraments: 'Sacraments',
    mary: 'Mary & Saints',
    papacy: 'Papacy',
    salvation: 'Salvation',
    bible: 'Sacred Scripture',
    saints: 'Saints',
    tradition: 'Tradition',
    'church-teaching': 'Church Teaching'
  }
  return names[category] || category
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    sacraments: '✝️',
    mary: '🙏',
    papacy: '👑',
    salvation: '💒',
    bible: '📖',
    saints: '🕊️',
    tradition: '🏛️',
    'church-teaching': '📚'
  }
  return icons[category] || '📋'
}

// Difficulty utilities
export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    beginner: 'text-green-600',
    intermediate: 'text-yellow-600',
    advanced: 'text-red-600'
  }
  return colors[difficulty] || 'text-gray-600'
}

export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  }
  return labels[difficulty] || difficulty
}

// Search utilities
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text

  const searchQuery = query.trim()
  const regex = new RegExp(`(${searchQuery})`, 'gi')

  return text.replace(regex, '<mark class="scripture-highlight">$1</mark>')
}

export function excerptText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Local storage utilities
export function getLocalStorage(key: string, defaultValue: any = null): any {
  if (typeof window === 'undefined') return defaultValue

  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setLocalStorage(key: string, value: any): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to set localStorage:', error)
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to remove localStorage:', error)
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Copy to clipboard utility
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      textArea.remove()
      return result
    }
  } catch {
    return false
  }
}

// Download utility
export function downloadFile(content: string, filename: string, contentType: string = 'application/json'): void {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// URL utilities
export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '#'
    }
    return urlObj.toString()
  } catch {
    return '#'
  }
}