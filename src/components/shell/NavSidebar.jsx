import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, AlertTriangle, Map, Camera, Users, GitBranch,
  Monitor, Layers, Rocket, Send, PlayCircle, Globe, Clock,
  Radio, Signpost,
} from 'lucide-react'
import { useTour } from '../../tour/TourProvider.jsx'

const NAV = [
  // Operations
  { section: 'Operations' },
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/incidents',   icon: AlertTriangle,   label: 'Live Incidents' },
  { to: '/incidents/log', icon: Clock,         label: 'Incident Log' },
  { to: '/gis',         icon: Globe,           label: 'GIS' },
  { to: '/road-signs',  icon: Monitor,         label: 'Road Signs' },
  { to: '/devices',     icon: Camera,          label: 'Devices' },

  null, // divider

  // Configuration
  { section: 'Configuration' },
  { to: '/setup',             icon: Rocket,        label: 'Setup Wizard', tour: 'nav-setup' },
  { to: '/admin/use-cases',   icon: Layers,        label: 'Use Cases' },
  { to: '/admin/rules',       icon: GitBranch,     label: 'Rules Engine' },
  { to: '/admin/stakeholders',icon: Users,         label: 'Stakeholders' },
  { to: '/admin/channels',    icon: Send,          label: 'Channels' },
  { to: '/admin/road-signs',  icon: Signpost,      label: 'Sign Board Registry' },

  null, // divider

  // Escalation Policies (/admin/escalation) is hidden until it is backed by the platform —
  // its page is a preview that saves nothing. The route stays in App.jsx; add it back here when real.

  // Help
  { section: 'Help' },
  { action: 'executive',      icon: PlayCircle, label: 'Executive Tour' },
  { action: 'full',           icon: PlayCircle, label: 'Full Tour' },
  { action: 'live',           icon: Radio,      label: 'Live Narration' },
]

export default function NavSidebar() {
  const tour = useTour()
  return (
    <nav data-tour="nav" className="w-56 bg-white border-r border-line flex flex-col gap-0.5 py-3 shrink-0 overflow-y-auto">
      {NAV.map((item, i) => {
        if (item === null) return <div key={i} className="my-1" />
        if (item.section) {
          return (
            <div key={i} className="px-6 pt-3 pb-1">
              <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
                {item.section}
              </span>
            </div>
          )
        }
        if (item.action) {
          return (
            <button
              key={i}
              onClick={() => tour.start(item.action)}
              disabled={tour.active}
              className="group flex items-center gap-3.5 px-3 py-2.5 text-[13px] font-medium rounded-md mx-3 transition-all text-ink-muted hover:bg-surface-alt hover:text-ink disabled:opacity-50 text-left"
            >
              <item.icon size={16} className="text-brand" />
              <span>{item.label}</span>
            </button>
          )
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/incidents'}
            data-tour={item.tour}
            className={({ isActive }) =>
              `group flex items-center gap-3.5 px-3 py-2.5 text-[13px] font-medium rounded-md mx-3 transition-all relative
               ${isActive
                 ? 'bg-brand/5 text-brand font-semibold'
                 : 'text-ink-muted hover:bg-surface-alt hover:text-ink'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand rounded-r" />
                )}
                <item.icon size={16} className={isActive ? 'text-brand' : 'text-ink-subtle group-hover:text-ink transition-colors'} />
                <span>{item.label}</span>
                {item.preview && (
                  <span className="ml-auto text-xs text-ink-subtle">
                    Preview
                  </span>
                )}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
