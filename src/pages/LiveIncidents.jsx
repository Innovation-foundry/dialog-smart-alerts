import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import IncidentTable from '../components/incidents/IncidentTable.jsx'
import IncidentDetail from '../components/incidents/IncidentDetail.jsx'
import ToastStack from '../components/common/Toast.jsx'
import { PageHeader } from '../components/ui'
import { useIncidents } from '../hooks/useIncidents.js'
import { useIncidentStream } from '../hooks/useIncidentStream.js'
import { useToast } from '../hooks/useToast.js'

export default function LiveIncidents() {
  const { playCriticalCue } = useOutletContext() ?? {}
  const { incidents, loading, error, applyEvent, updateIncident, deleteIncident } = useIncidents()
  const streamStatus = useIncidentStream(applyEvent)
  const { toasts, addToast, removeToast } = useToast()
  const [selected, setSelected] = useState(null)

  // The guided tour opens an incident's detail by id.
  useEffect(() => {
    const onSelect = (e) => { if (e.detail) setSelected({ incident_id: e.detail }) }
    window.addEventListener('tour:select-incident', onSelect)
    return () => window.removeEventListener('tour:select-incident', onSelect)
  }, [])

  function handleSelect(incident) {
    setSelected(prev => prev?.incident_id === incident.incident_id ? null : incident)
  }

  function handleCloseIncident(id) {
    updateIncident(id, { status: 'CLOSED' })
    addToast({ message: `Incident ${id} closed.`, type: 'success' })
    setSelected(null)
  }

  function handleDeleteIncident(id) {
    deleteIncident(id)
    addToast({ message: `Incident ${id} deleted.`, type: 'success' })
    setSelected(null)
  }

  function handleHardwareOverride(unitId, state) {
    if (!selected) return
    updateIncident(selected.incident_id, {
      hardware: { ...selected.hardware, state },
    })
    addToast({ message: `Hardware ${unitId} set to ${state}.`, type: 'success' })
  }

  const selectedIncident = incidents.find(i => i.incident_id === selected?.incident_id) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      {/* Incident table */}
      <div data-tour="incident-table" className="flex flex-col overflow-hidden flex-1">
        <PageHeader
          title="Live Incidents"
          description="Open incidents, most severe first. Select one to see its detail and respond."
        />
        {error && (
          <div className="px-4 py-2 bg-sev-critical/10 text-sev-critical text-sm border-b border-line">
            Can't reach the alerting backend — this list may be missing incidents or out of date. Retrying every few seconds.
          </div>
        )}
        <IncidentTable
          incidents={incidents}
          loading={loading}
          selectedId={selectedIncident?.incident_id}
          onSelect={handleSelect}
        />
      </div>

      {/* Detail drawer */}
      {selectedIncident && (
        <IncidentDetail
          incident={selectedIncident}
          onClose={() => setSelected(null)}
          onCloseIncident={handleCloseIncident}
          onDeleteIncident={handleDeleteIncident}
          onHardwareOverride={handleHardwareOverride}
        />
      )}

      <ToastStack toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
