import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { isToday } from 'date-fns'

import { AlertTriangle, Camera, CheckCircle2, Clock } from 'lucide-react'

import { useIncidents } from '../hooks/useIncidents.js'
import { useApi } from '../hooks/useApi.js'
import { useIncidentStream } from '../hooks/useIncidentStream.js'
import { relativeTime } from '../lib/format.js'
import { Banner, Card, PageHeader, StatusBadge } from '../components/ui'
import { useTour } from '../tour/TourProvider.jsx'

// Chart.js can't read Tailwind classes, so these mirror the tailwind.config.js tokens.
const C = {
  critical: '#D92D20', low: '#12B76A', high: '#F2841C', muted: '#98A2B3',
  inkMuted: '#667085', surface: '#F2F4F7', white: '#FFFFFF',
}
const FONT = { family: 'Inter', size: 12 }

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Dashboard() {
  const { incidents, error: incidentsError, applyEvent } = useIncidents()
  const { data: devices }        = useApi('/api/devices')
  const { data: events }         = useApi('/api/events')
  const streamStatus = useIncidentStream(applyEvent)
  const tour = useTour()
  // The header badge reflects the real event stream (the guided tour runs on its own data).
  const streamLive = tour?.active || streamStatus === 'live'

  // ── Dynamic Metric Computations ─────────────────────────────────────────────
  const activeCount = useMemo(() => incidents.filter(i => i.status === 'ACTIVE' || i.status === 'OPERATOR_REVIEW').length, [incidents])
  const criticalCount = useMemo(() => incidents.filter(i => i.severity === 'CRITICAL' && (i.status === 'ACTIVE' || i.status === 'OPERATOR_REVIEW')).length, [incidents])
  const resolvedCount = useMemo(() => incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED' || i.status === 'EXPIRED').length, [incidents])
  const pendingCount = useMemo(() => (events || []).filter(e => e.pending_confirmation).length, [events])
  const falsePositives = useMemo(() => (events || []).filter(e => e.false_positive).length, [events])

  const totalDetectionsToday = useMemo(
    () => (events || []).filter(e => e.received_at && isToday(new Date(e.received_at))).length,
    [events]
  )

  // Camera health calculations
  const onlineCameras = useMemo(() => (devices || []).filter(d => d.online !== false).length, [devices])
  const totalDevices = (devices || []).length
  const offlineDevices = totalDevices - onlineCameras

  // ── Dynamic 24-Hour Trend Data ──────────────────────────────────────────────
  const trend24h = useMemo(() => {
    const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
    const counts = new Array(12).fill(0)
    const since = Date.now() - 24 * 60 * 60 * 1000
    if (events && events.length > 0) {
      events.forEach(e => {
        if (!e.received_at) return
        const dt = new Date(e.received_at)
        if (isNaN(dt) || dt.getTime() < since) return
        const hr = dt.getHours()
        const idx = Math.floor(hr / 2) % 12
        counts[idx]++
      })
    }
    return { hours, counts }
  }, [events])

  // Busiest 2-hour window in the last 24 hours — computed, or nothing to report.
  const peak = useMemo(() => {
    const max = Math.max(...trend24h.counts)
    if (!max) return null
    const idx = trend24h.counts.indexOf(max)
    const start = trend24h.hours[idx]
    const end = `${String((idx * 2 + 2) % 24).padStart(2, '0')}:00`
    return { window: `${start} - ${end}`, count: max }
  }, [trend24h])

  // Incident outcomes (doughnut)
  const doughnutData = {
    labels: ['Active', 'Resolved', 'False positive', 'Awaiting confirmation'],
    datasets: [{
      data: [activeCount, resolvedCount, falsePositives, pendingCount],
      backgroundColor: [C.critical, C.low, C.muted, C.high],
      borderWidth: 2,
      borderColor: C.white,
    }],
  }
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, font: FONT, color: C.inkMuted } },
      tooltip: { cornerRadius: 6 },
    },
  }

  // Detections per 2-hour window, last 24 hours (line)
  const trendData = {
    labels: trend24h.hours,
    datasets: [{
      label: 'Detections',
      data: trend24h.counts,
      borderColor: C.critical,
      backgroundColor: 'rgba(217, 45, 32, 0.08)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2,
    }],
  }
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: FONT, color: C.inkMuted, maxRotation: 0, autoSkip: true } },
      y: { grid: { color: C.surface }, ticks: { font: FONT, color: C.inkMuted, stepSize: 1, precision: 0 }, beginAtZero: true },
    },
  }

  // Activity timeline — built only from what the platform actually recorded:
  // detections, incidents opening, and incidents closing. Nothing is filled in.
  const activityTimeline = useMemo(() => {
    const items = []
    const cap = (v) => { const t = String(v || 'object'); return t.charAt(0).toUpperCase() + t.slice(1) }

    ;(events || []).forEach(e => {
      if (!e.received_at) return
      const where = e.device_name || e.device_id
      const conf = e.confidence == null ? '' : ` · ${Math.round(e.confidence)}% confidence`
      items.push({
        ts: e.received_at,
        text: `${cap(e.object_type)} detected${where ? ` by ${where}` : ''}${conf}`,
        icon: Camera, tone: 'text-ink-muted',
      })
    })

    ;(incidents || []).forEach(inc => {
      const id = inc.incident_id || inc.id || ''
      const zone = inc.zone || inc.zone_name
      if (inc.opened_at) {
        items.push({
          ts: inc.opened_at,
          text: `Incident ${id} opened${zone ? ` in ${zone}` : ''}`,
          icon: AlertTriangle, tone: 'text-sev-critical',
        })
      }
      if (['RESOLVED', 'CLOSED', 'EXPIRED'].includes(inc.status) && (inc.expired_at || inc.updated_at)) {
        items.push({
          ts: inc.expired_at || inc.updated_at,
          text: `Incident ${id} ${inc.status.toLowerCase()}`,
          icon: inc.status === 'EXPIRED' ? Clock : CheckCircle2,
          tone: inc.status === 'EXPIRED' ? 'text-ink-subtle' : 'text-sev-low',
        })
      }
    })

    items.sort((x, y) => new Date(y.ts) - new Date(x.ts))
    return items.slice(0, 10).map(it => {
      const d = new Date(it.ts)
      return { ...it, time: isNaN(d) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }
    })
  }, [events, incidents])

  const recent = incidents.slice(0, 5)
  const countOf = (inc) => inc.number_of_elephants ?? inc.data?.number_of_elephants
  const hasCounts = recent.some(i => countOf(i) != null)

  const stats = [
    { label: 'Active incidents', value: activeCount, tone: activeCount > 0 ? 'text-sev-critical' : 'text-ink' },
    { label: 'Critical', value: criticalCount, tone: criticalCount > 0 ? 'text-sev-critical' : 'text-ink' },
    { label: 'Detections today', value: totalDetectionsToday, tone: 'text-ink' },
    {
      label: 'Devices online',
      value: `${onlineCameras} / ${totalDevices}`,
      tone: offlineDevices > 0 ? 'text-sev-critical' : 'text-ink',
      note: totalDevices === 0 ? 'None registered' : offlineDevices > 0 ? `${offlineDevices} offline` : 'All online',
    },
  ]

  return (
    <div>
    <PageHeader
      title="Dashboard"
      description="Detections, incidents and device status across all monitored zones."
      action={streamLive ? (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
          <span className="w-2 h-2 rounded-full bg-sev-low" /> Live updates on
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm text-ink">
          <span className="w-2 h-2 rounded-full bg-sev-medium" />
          {streamStatus === 'connecting' ? 'Connecting…' : 'Live updates lost — reconnecting'}
        </span>
      )}
    />
    <div className="p-6 space-y-6">

      {incidentsError && (
        <Banner variant="error" title="Can't reach the alerting backend">
          Incidents on this page may be missing or out of date. Retrying every few seconds.
        </Banner>
      )}

      {/* Headline numbers: one strip, not four boxes */}
      <Card padded={false} data-tour="kpis">
        <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
          {stats.map(st => (
            <div key={st.label} className="px-5 py-4">
              <dt className="text-sm text-ink-muted">{st.label}</dt>
              <dd className={`mt-1 text-3xl font-semibold tabular-nums ${st.tone}`}>{st.value}</dd>
              {st.note && <div className="mt-0.5 text-sm text-ink-muted">{st.note}</div>}
            </div>
          ))}
        </dl>
      </Card>

      <div data-tour="charts" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-base font-semibold text-ink mb-3">Incident outcomes</h2>
          <div className="h-44 relative">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold text-ink">Detections, last 24 hours</h2>
            <span className="text-sm text-ink-muted">
              {peak ? `Busiest: ${peak.window} (${peak.count})` : 'None in the last 24 hours'}
            </span>
          </div>
          <div className="h-44">
            <Line data={trendData} options={trendOptions} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padded={false} data-tour="recent-incidents" className="lg:col-span-2 flex flex-col">
          <div className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-line">
            <h2 className="text-base font-semibold text-ink">Recent incidents</h2>
            <Link to="/incidents" className="text-sm font-medium text-brand hover:underline">View all</Link>
          </div>

          {recent.length === 0 ? (
            <p className="p-6 text-sm text-ink-muted">No incidents. All monitored corridors are clear.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-2.5">Opened</th>
                    <th className="px-4 py-2.5">Camera</th>
                    <th className="px-4 py-2.5">Location</th>
                    <th className="px-4 py-2.5">Confidence</th>
                    {hasCounts && <th className="px-4 py-2.5">Count</th>}
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((inc, i) => {
                    const conf = inc.confidence == null ? null : Math.round(inc.confidence <= 1 ? inc.confidence * 100 : inc.confidence)
                    return (
                      <tr key={inc.incident_id || inc.id || i} className="hover:bg-surface">
                        <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{relativeTime(inc.opened_at)}</td>
                        <td className="px-4 py-3 text-ink">{inc.device_name || inc.device_id || '—'}</td>
                        <td className="px-4 py-3 text-ink">{inc.zone_name || inc.zone || inc.zone_id || '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-ink">{conf == null ? '—' : `${conf}%`}</td>
                        {hasCounts && <td className="px-4 py-3 tabular-nums text-ink">{countOf(inc) ?? '—'}</td>}
                        <td className="px-4 py-3"><StatusBadge status={inc.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padded={false} data-tour="activity" className="flex flex-col h-[22rem]">
          <div className="px-4 py-3 border-b border-line shrink-0">
            <h2 className="text-base font-semibold text-ink">Recent activity</h2>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-line">
            {activityTimeline.length === 0 && (
              <li className="px-4 py-6 text-sm text-ink-muted">No activity recorded yet.</li>
            )}
            {activityTimeline.map((item, idx) => {
              const Icon = item.icon
              return (
                <li key={idx} className="flex gap-3 px-4 py-2.5">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${item.tone || 'text-ink-subtle'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{item.text}</p>
                    <span className="text-xs text-ink-muted tabular-nums">{item.time}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

    </div>
    </div>
  )
}
