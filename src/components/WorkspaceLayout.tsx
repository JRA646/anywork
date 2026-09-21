import { useState, type ReactNode } from 'react'
import {
  Bell,
  Menu,
  X,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings2,
  Store,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../types/marketplace'
import type { AnyWorkProfile } from '../types/auth'
import { BrandLogo } from './BrandLogo'

const nav = {
  customer: ['dashboard', 'requests', 'messages', 'profile'],
  provider: ['dashboard', 'requests', 'jobs', 'services', 'earnings', 'messages', 'profile'],
  admin: ['dashboard', 'requests', 'providers', 'services', 'customers', 'settings', 'profile'],
} as const

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  requests: 'Requests',
  jobs: 'Jobs',
  services: 'Services',
  earnings: 'Earnings',
  messages: 'Messages',
  profile: 'Profile',
  providers: 'Providers',
  customers: 'Customers',
  settings: 'Settings',
}

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  requests: FileText,
  jobs: BriefcaseBusiness,
  services: Store,
  earnings: CircleDollarSign,
  messages: MessageCircle,
  profile: UserRound,
  providers: UsersRound,
  customers: UsersRound,
  settings: Settings2,
}

export function WorkspaceLayout({
  role,
  profile,
  title,
  current,
  onNavigate,
  onPublicSite,
  children,
}: {
  role: Role
  profile: AnyWorkProfile
  title: string
  current: string
  onNavigate: (value: string) => void
  onPublicSite: () => void
  children: ReactNode
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const name = profile.display_name || profile.first_name || (role === 'admin' ? 'Operations' : 'ANYwork user')
  const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const workspaceLabel = role === 'admin'
    ? 'OPERATIONS WORKSPACE'
    : role === 'provider'
      ? 'PROVIDER WORKSPACE'
      : 'CUSTOMER WORKSPACE'

  const portalLabel = role === 'provider'
    ? 'Provider portal'
    : role === 'admin'
      ? 'Operations'
      : 'Customer portal'

  return (
    <div className="workspace">
      {sidebarOpen && <button className="workspaceMobileOverlay" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={'workspaceSidebar ' + (sidebarOpen ? 'open' : '')}>
        <button className="workspaceBrand workspaceBrandLogo" onClick={onPublicSite}>
          <BrandLogo variant="sidebar" />
        </button>

        <div className="workspaceLabel">{workspaceLabel}</div>

        <nav>
          {nav[role].map((item) => {
            const Icon = icons[item]
            return (
              <button key={item} className={current === item ? 'active' : ''} onClick={() => { onNavigate(item); setSidebarOpen(false) }}>
                <Icon size={16} />
                <span>{labels[item] || item}</span>
              </button>
            )
          })}
        </nav>

        <div className="workspaceBottom">
          <button onClick={() => { onNavigate('help'); setSidebarOpen(false) }}><CircleHelp size={16} /> Help center</button>
          <button onClick={onPublicSite}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <div className="workspaceMain">
        <header className="workspaceTopbar">
          <div className="workspaceTopbarTitle">
            <button className="workspaceMobileMenu" type="button" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <span className="workspaceKicker">{portalLabel}</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className="workspaceActions">
            <div className="notificationWrap">
              <button className={notificationsOpen ? 'roundIcon active' : 'roundIcon'} aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}>
                <Bell size={18} />
                <span className="notificationDot" />
              </button>
              {notificationsOpen && (
                <div className="notificationPanel">
                  <div className="notificationPanelHeader"><strong>Notifications</strong><span>3 new</span></div>
                  <button><span className="notificationIndicator" /><div><strong>New provider response</strong><small>Signal Works sent a quote for AW-1027.</small></div></button>
                  <button><span className="notificationIndicator" /><div><strong>Request needs attention</strong><small>AW-1025 still has no assigned provider.</small></div></button>
                  <button><span className="notificationIndicator" /><div><strong>Profile update</strong><small>Your account details were synced successfully.</small></div></button>
                  <button className="notificationFooter">View all notifications</button>
                </div>
              )}
            </div>

            <button className="profileMenu" onClick={() => onNavigate('profile')} aria-label="Open profile">
              <span>{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}</span>
              <strong>{profile.first_name || name}</strong>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        <main className="workspaceContent animate-anywork-rise">{children}</main>
      </div>
    </div>
  )
}
