import { useEffect, useState } from 'react'
import IncidentTable from '../components/incidents/IncidentTable.jsx'
import IncidentDetail from '../components/incidents/IncidentDetail.jsx'
import { PageHeader } from '../components/ui'

const POLL_INTERVAL_MS = 15000

async function fetchLog() {
  const r = await fetch('/api/incidents/log')
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

export default function IncidentLog() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    function load() {
      fetchLog()
        .then(data => { if (!cancelled) { setIncidents(data); setLoading(false); setError(null) } })
        .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    }
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  function handleSelect(incident) {
    setSelected(prev => prev?.incident_id === incident.incident_id ? null : incident)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col overflow-hidden flex-1">
        <PageHeader
          title="Incident Log"
          description="Incidents, active or closed, move here from the dashboard after 3 hours open."
        />
        {error && (
          <div className="px-4 py-2 bg-sev-critical/10 text-sev-critical text-sm border-b border-line">
            Can't reach the alerting backend — this log may be out of date. Retrying automatically.
          </div>
        )}
        <IncidentTable
          incidents={incidents}
          loading={loading}
          selectedId={selected?.incident_id}
          onSelect={handleSelect}
        />
      </div>

      {selected && (
        <IncidentDetail
          incident={selected}
          onClose={() => setSelected(null)}
          readOnly
        />
      )}
    </div>
  )
}
