import { useEffect, useRef, useState } from 'react'
import { api } from '@/services/api'

/** Debounce a fast-changing value (search inputs). */
export function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

/** Global keyboard shortcuts. Keys look like "ctrl+k", "alt+n", "escape". */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>) {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const key = [e.ctrlKey || e.metaKey ? 'ctrl' : '', e.altKey ? 'alt' : '', e.shiftKey ? 'shift' : '', e.key.toLowerCase()].filter(Boolean).join('+')
      const fn = ref.current[key]
      if (fn) { e.preventDefault(); fn(e) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
}

/** Fires onWarn `warnSec` seconds before timeout and onIdle when the user has been inactive for `minutes`. */
export function useIdleTimeout(minutes: number, onIdle: () => void, onWarn: (left: number | null) => void, warnSec = 60) {
  const cb = useRef({ onIdle, onWarn }); cb.current = { onIdle, onWarn }
  useEffect(() => {
    let last = Date.now(), warned = false
    const touch = () => { last = Date.now(); if (warned) { warned = false; cb.current.onWarn(null) } }
    const evs = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    evs.forEach(e => window.addEventListener(e, touch, { passive: true }))
    const t = setInterval(() => {
      const left = Math.round(minutes * 60 - (Date.now() - last) / 1000)
      if (left <= 0) cb.current.onIdle()
      else if (left <= warnSec) { warned = true; cb.current.onWarn(left) }
    }, 1000)
    return () => { clearInterval(t); evs.forEach(e => window.removeEventListener(e, touch)) }
  }, [minutes, warnSec])
}

/** Fetch through the API layer; exposes `loading` so screens can render skeletons. */
export function useFetch<T = any>(url: string) {
  const [state, set] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null })
  useEffect(() => {
    let live = true
    set(s => ({ ...s, loading: true }))
    api.get(url).then(r => live && set({ data: r.data, loading: false, error: null })).catch(e => live && set({ data: null, loading: false, error: e.message }))
    return () => { live = false }
  }, [url])
  return state
}
