import { useState, useEffect, useCallback } from 'react'
import { useDemoCollection, isDemoActive, demoUpdate, demoRemove } from '../tour/demoStore.js'

const POLL_INTERVAL_MS = 5000   // re-fetch every 5 s as a reliable fallback

async function fetchIncidents() {
  const r = await fetch('/api/incidents')
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

export function useIncidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // ── Load + poll every 5 s ─────────────────────────────────────────────────
  // Polling guarantees the UI stays in sync even when SSE frames are missed.
  // If the backend can't be reached the page says so (`error`) and keeps the
  // last real data — it never substitutes sample incidents — and the same
  // poll clears the error as soon as the backend answers again.
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchIncidents()
        .then(data => { if (!cancelled) { setIncidents(data); setError(null) } })
        .catch(e => { if (!cancelled) setError(e?.message || 'unreachable') })
        .finally(() => { if (!cancelled) setLoading(false) })
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const applyEvent = useCallback((event) => {
    setIncidents(prev => {
      const idx = prev.findIndex(i => i.incident_id === event.incident_id)
      if (idx === -1) return [event, ...prev]
      const updated = [...prev]
      if (new Date(event.updated_at) >= new Date(prev[idx].updated_at)) {
        updated[idx] = { ...prev[idx], ...event }
      }
      return updated
    })
  }, [])

  const updateIncident = useCallback(async (id, patch) => {
    if (isDemoActive()) { demoUpdate('/api/incidents', id, patch); return }
    // Optimistic local update first…
    setIncidents(prev => prev.map(i => i.incident_id === id ? { ...i, ...patch } : i))
    // …then persist to the backend (id === incident_id) and adopt its response.
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const updated = await res.json()
        setIncidents(prev => prev.map(i => i.incident_id === id ? updated : i))
      }
    } catch {
      // Backend unavailable — keep the optimistic update
    }
  }, [])

  const deleteIncident = useCallback(async (id) => {
    if (isDemoActive()) { demoRemove('/api/incidents', id); return }
    // Optimistic local delete
    setIncidents(prev => prev.filter(i => i.incident_id !== id))
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const latest = await fetchIncidents()
        setIncidents(latest)
      }
    } catch {
      const latest = await fetchIncidents()
      setIncidents(latest)
    }
  }, [])

  // Guided tour: serve the tour's live incidents instead of the backend's.
  const demo = useDemoCollection('/api/incidents')
  if (demo) return { incidents: demo, loading: false, error: null, applyEvent, updateIncident, deleteIncident }

  return { incidents, loading, error, applyEvent, updateIncident, deleteIncident }
}
