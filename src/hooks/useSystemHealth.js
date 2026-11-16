import { useState, useEffect } from 'react'

/**
 * Polls /api/system/health.
 *   health    — the backend's last answer, or null (none yet / unreachable)
 *   reachable — null until the first poll finishes, then true/false
 *   dot       — green | amber | red for the top-bar indicator
 *
 * An unreachable backend is reported as exactly that. It is never replaced by
 * sample "all OK" values — a green dot must mean the backend said so.
 */
export function useSystemHealth() {
  const [health, setHealth] = useState(null)
  const [reachable, setReachable] = useState(null)

  useEffect(() => {
    let cancelled = false
    const poll = () =>
      fetch('/api/system/health')
        .then(r => { if (!r.ok) throw new Error(); return r.json() })
        .then(h => { if (!cancelled) { setHealth(h); setReachable(true) } })
        .catch(() => { if (!cancelled) { setHealth(null); setReachable(false) } })
    poll()
    const id = setInterval(poll, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Only an explicit `false` is degraded — a field the backend doesn't report
  // must not turn the dot red (the old bug: real /health omitted these fields).
  const dot = reachable === null ? 'amber'
    : !reachable || !health ? 'red'
    : (health.worker_live === false || health.broker_ok === false || health.vlm_ok === false) ? 'red'
    : health.setup_issues?.length > 0 ? 'amber'
    : (health.queue_depth > 50 || (health.fast_path_ms && health.slo_ms && health.fast_path_ms > health.slo_ms)) ? 'amber'
    : 'green'

  return { health, reachable, dot }
}
