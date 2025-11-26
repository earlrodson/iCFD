import { useState, useEffect } from 'react'

/**
 * Custom hook to debounce a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 300)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup function to cancel the timeout if value or delay changes
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook to debounce a callback function
 * @param callback The function to debounce
 * @param delay The delay in milliseconds (default: 300)
 * @returns The debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const [debouncedCallback, setDebouncedCallback] = useState<() => void>(() => () => {})

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const debouncedFn = (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        callback(...args)
      }, delay)
    }

    setDebouncedCallback(() => debouncedFn)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [callback, delay])

  return debouncedCallback as T
}