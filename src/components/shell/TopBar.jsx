import { Bell, BellOff, Menu } from 'lucide-react'
import HealthDot from './HealthDot.jsx'
import dialogLogo from '../../assets/dialog-logo.jpg'
import { useTour } from '../../tour/TourProvider.jsx'
import { useSystemHealth } from '../../hooks/useSystemHealth.js'

const ENV = import.meta.env.VITE_ENV ?? 'dev'

// Left: identity. Right: one system-status indicator and the alert-sound switch.
// The guided tours live in the sidebar's Help section, not here.
export default function TopBar({ muteAlerts, onToggleMute, onToggleSidebar }) {
  const tour = useTour()
  const { health, reachable, dot } = useSystemHealth()
  return (
    <header className="h-14 bg-white border-b border-line flex items-center px-4 gap-3 shrink-0 z-30">
      <button
        onClick={onToggleSidebar}
        className="text-ink-muted hover:text-ink p-1.5 hover:bg-surface-alt rounded transition-colors"
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-3 min-w-0">
        <img src={dialogLogo} alt="Dialog" className="h-9 w-9 rounded object-contain" />
        <span className="text-ink font-semibold text-base hidden sm:block">Dialog Smart Alerts</span>
        {ENV !== 'prod' && (
          <span className="text-xs text-ink-muted bg-surface-alt px-2 py-0.5 rounded uppercase tracking-wider">
            {ENV}
          </span>
        )}
      </div>

      <div data-tour="topbar-status" className="flex items-center gap-4 ml-auto">
        {/* While the guided tour runs it uses its own scripted data, so it reports healthy. */}
        <HealthDot health={health} reachable={reachable} dot={tour?.active ? 'green' : dot} />

        <button
          onClick={onToggleMute}
          className="text-ink-muted hover:text-ink p-1.5 hover:bg-surface-alt rounded transition-colors"
          title={muteAlerts ? 'Unmute audible alerts' : 'Mute audible alerts'}
          aria-label={muteAlerts ? 'Unmute audible alerts' : 'Mute audible alerts'}
        >
          {muteAlerts ? <BellOff size={18} /> : <Bell size={18} />}
        </button>
      </div>
    </header>
  )
}
