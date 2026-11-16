import { useState } from 'react'
import { X } from 'lucide-react'

const DOT_COLOR = { green: 'bg-sev-low', amber: 'bg-sev-medium', red: 'bg-sev-critical' }

/**
 * Top-bar health indicator. Takes the result of useSystemHealth() from TopBar
 * (one poll shared with the LIVE/OFFLINE badge). The panel lists only what the
 * backend actually measures — nothing is shown as OK by default.
 */
export default function HealthDot({ health, reachable, dot }) {
  const [open, setOpen] = useState(false)

  // Quiet while healthy (just a green dot); says what is wrong when it isn't.
  const problem =
    reachable === null ? 'Connecting…'
    : reachable === false ? 'Backend offline'
    : health?.broker_ok === false ? 'Message broker disconnected'
    : health?.gis_ok === false ? 'GIS unreachable'
    : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink rounded px-1.5 py-1 hover:bg-surface-alt transition-colors"
        title={problem ?? 'All systems connected'}
        aria-label={`System health: ${problem ?? 'all systems connected'}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${DOT_COLOR[dot]} ${dot !== 'green' ? 'animate-pulse-sev' : ''}`} />
        {problem && <span className={dot === 'red' ? 'text-sev-critical font-medium' : 'text-ink'}>{problem}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-14 pr-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-lg shadow-lg border border-line p-5 w-80"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-ink">System Health</span>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={16} className="text-ink-muted" /></button>
            </div>
            <div className="space-y-2 text-sm">
              {reachable === null && <p className="text-ink-muted">Checking…</p>}
              {reachable === false && (
                <>
                  <Row label="Backend" ok={false} text="UNREACHABLE" />
                  <p className="text-xs text-ink-muted pt-1">
                    The dashboard can't reach the alerting backend, so nothing on screen is updating. Retrying every 15 seconds.
                  </p>
                </>
              )}
              {reachable && health && (
                <>
                  <Row label="Backend" ok />
                  <Row label="Message broker (MQTT)" ok={health.broker_ok !== false}
                       text={health.broker_ok === false ? 'DISCONNECTED' : undefined} />
                  {health.gis_ok != null && (
                    <Row label="GIS service" ok={health.gis_ok} text={health.gis_ok ? undefined : 'UNREACHABLE'} />
                  )}
                  {health.devices_total != null && (
                    <Row label="Devices online" neutral
                         text={`${health.devices_online ?? 0} / ${health.devices_total}`} />
                  )}
                  {health.active_incidents != null && (
                    <Row label="Active incidents" neutral text={String(health.active_incidents)} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, ok, text, neutral }) {
  const tone = neutral ? 'text-ink' : ok ? 'text-sev-low' : 'text-sev-critical'
  return (
    <div className="flex justify-between items-center">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-medium ${tone}`}>{text ?? (ok ? 'OK' : 'DEGRADED')}</span>
    </div>
  )
}
