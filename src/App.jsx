import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/shell/AppShell.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import TourProvider from './tour/TourProvider.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './hooks/useAuth.js'
import { Spinner } from './components/ui'

// Operations pages
import Dashboard from './pages/Dashboard.jsx'
import LiveIncidents from './pages/LiveIncidents.jsx'
import IncidentLog from './pages/IncidentLog.jsx'
import GIS from './pages/GIS.jsx'
import RoadSigns from './pages/RoadSigns.jsx'
import Devices from './pages/Devices.jsx'
import Simulator from './pages/Simulator.jsx'

// Admin – configuration
import AdminUseCases from './pages/admin/UseCases.jsx'
import AdminRules from './pages/admin/Rules.jsx'
import AdminStakeholders from './pages/admin/Stakeholders.jsx'
import AdminRoadSignBoards from './pages/admin/RoadSignBoards.jsx'

// Admin – system
import AdminEscalation from './pages/admin/EscalationPolicies.jsx'
import AdminChannels from './pages/admin/Channels.jsx'

// Setup
import SetupWizard from './pages/SetupWizard.jsx'
import StyleGuide from './pages/StyleGuide.jsx'

import KioskDisplay from './pages/KioskDisplay.jsx'
import SignDisplay from './pages/SignDisplay.jsx'

function Wrap({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function RequireAuth({ children }) {
  const { authenticated, login } = useAuth()
  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} />
      </div>
    )
  }
  if (!authenticated) {
    return <Login onLogin={login} />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <TourProvider>
      <Routes>
        {/* Kiosk & sign displays are unauthenticated field hardware — no login. */}
        <Route path="/device/:deviceId" element={<Wrap><KioskDisplay /></Wrap>} />
        <Route path="/sign/:signId" element={<Wrap><SignDisplay /></Wrap>} />

        {/* Setup wizard — full-screen, outside the dashboard chrome, still needs login */}
        <Route path="/setup" element={<RequireAuth><Wrap><SetupWizard /></Wrap></RequireAuth>} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Wrap><Dashboard /></Wrap>} />

          {/* Operations */}
          <Route path="/dashboard"  element={<Wrap><Dashboard /></Wrap>} />
          <Route path="/incidents"  element={<Wrap><LiveIncidents /></Wrap>} />
          <Route path="/incidents/log" element={<Wrap><IncidentLog /></Wrap>} />
          {/* Map View was replaced by the GIS page; old links still land on the map. */}
          <Route path="/map"        element={<Navigate to="/gis" replace />} />
          <Route path="/gis"        element={<Wrap><GIS /></Wrap>} />
          <Route path="/road-signs" element={<Wrap><RoadSigns /></Wrap>} />
          <Route path="/devices"    element={<Wrap><Devices /></Wrap>} />
          {/* Hardware Units and the Device Registry were folded into Devices; old links still land there. */}
          <Route path="/hardware"   element={<Navigate to="/devices?show=actuators" replace />} />
          <Route path="/admin/devices" element={<Navigate to="/devices" replace />} />
          <Route path="/simulator"  element={<Wrap><Simulator /></Wrap>} />

          {/* Configuration admin */}
          <Route path="/admin/use-cases"    element={<Wrap><AdminUseCases /></Wrap>} />
          <Route path="/admin/rules"        element={<Wrap><AdminRules /></Wrap>} />
          <Route path="/admin/stakeholders" element={<Wrap><AdminStakeholders /></Wrap>} />
          <Route path="/admin/road-signs"   element={<Wrap><AdminRoadSignBoards /></Wrap>} />

          {/* System admin */}
          <Route path="/admin/escalation" element={<Wrap><AdminEscalation /></Wrap>} />
          <Route path="/admin/channels"   element={<Wrap><AdminChannels /></Wrap>} />
          <Route path="/admin/templates"  element={<Navigate to="/admin/channels" replace />} />
          <Route path="/styleguide"       element={<Wrap><StyleGuide /></Wrap>} />
        </Route>
      </Routes>
      </TourProvider>
    </BrowserRouter>
  )
}
