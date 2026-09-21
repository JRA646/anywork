import { useEffect, useState, type ReactNode } from 'react'
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings2,
  Store,
  UserRound,
  UsersRound,
  X,
  Star,
  CalendarDays,
  ShieldCheck,
  Activity,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../types/marketplace'
import type { AnyWorkProfile } from '../types/auth'
import { BrandLogo } from './BrandLogo'
import {
  listNotifications,
  markNotificationsRead,
  subscribeToNotifications,
  type DbNotification ,
} from '../lib/anyworkApi'
import { confirmAction } from '../lib/alerts'

const nav = {
  customer: ['dashboard', 'requests', 'jobs', 'messages', 'addresses', 'invoices', 'reviews', 'support', 'profile'],
  provider: ['dashboard', 'requests', 'jobs', 'calendar', 'services', 'earnings', 'verification', 'checkins', 'invoices', 'reviews', 'support', 'profile'],
  admin: ['dashboard', 'requests', 'jobs', 'providers', 'services', 'service-builder', 'customers', 'payments', 'reviews', 'disputes', 'support', 'audit', 'settings', 'profile'],
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
  addresses: 'Addresses',
  invoices: 'Invoices',
  payments: 'Payments',
  reviews: 'Reviews',
  support: 'Support',
  calendar: 'Calendar',
  verification: 'Verification',
  checkins: 'Job Check-in',
  'service-builder': 'Service Builder',
  jobs: 'Jobs',
  disputes: 'Disputes',
  audit: 'Audit Log',
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
  addresses: Store,
  invoices: FileText,
  payments: CircleDollarSign,
  reviews: Star,
  support: CircleHelp,
  calendar: CalendarDays,
  verification: ShieldCheck,
  checkins: BriefcaseBusiness,
  'service-builder': Store,
  jobs: BriefcaseBusiness,
  disputes: ShieldCheck,
  audit: Activity,
}

type NotificationItem = DbNotification

const notificationTime = (createdAt: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (seconds < 10) return 'Just now'
  if (seconds < 60) return seconds + 's ago'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + 'm ago'
  const hours = Math.floor(minutes / 60)
  return hours + 'h ago'
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
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

  useEffect(() => {
    let cleanup: (() => void) | undefined

    const load = async () => {
      try {
        const rows = await listNotifications()
        setNotifications(rows)
        setUnreadCount(rows.filter((item) => !item.read_at).length)
      } catch {
        setNotifications([])
        setUnreadCount(0)
      }

      try {
        cleanup = await subscribeToNotifications((notification) => {
          setNotifications((current) => [
            notification,
            ...current.filter((item) => item.id !== notification.id),
          ].slice(0, 30))
          if (!notification.read_at) {
            setUnreadCount((current) => current + 1)
          }
        }, () => undefined)
      } catch {
        cleanup = undefined
      }
    }

    void load()

    const refreshOnFocus = () => {
      if (document.visibilityState !== 'visible') return
      void listNotifications()
        .then((rows) => {
          setNotifications(rows)
          setUnreadCount(rows.filter((item) => !item.read_at).length)
        })
        .catch(() => undefined)
    }

    document.addEventListener('visibilitychange', refreshOnFocus)
    window.addEventListener('focus', refreshOnFocus)

    return () => {
      cleanup?.()
      document.removeEventListener('visibilitychange', refreshOnFocus)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [profile.user_id])
  const handleSignOut = async () => {
    const confirmed = await confirmAction({
      title: 'Sign out of ANYwork?',
      text: 'You can sign back in anytime to continue managing your work.',
      confirmText: 'Sign out',
      cancelText: 'Stay signed in',
      danger: true,
    })

    if (confirmed) onPublicSite()
  }

  const toggleNotifications = () => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (next && unreadCount > 0) {
      const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id)
      void markNotificationsRead(unreadIds).catch(() => undefined)
      setNotifications((current) => current.map((item) => unreadIds.includes(item.id) ? { ...item, read_at: new Date().toISOString() } : item))
      setUnreadCount(0)
    }
  }

  return (
    <div className="workspace">
      {sidebarOpen && <button className="workspaceMobileOverlay" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={'workspaceSidebar ' + (sidebarOpen ? 'open' : '')}>
        <button className="workspaceBrand workspaceBrandLogo" onClick={() => void handleSignOut()}>
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
          <button onClick={() => void handleSignOut()}><LogOut size={16} /> Sign out</button>
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
              <button className={notificationsOpen ? 'roundIcon active' : 'roundIcon'} aria-label="Notifications" onClick={toggleNotifications}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="notificationDot" />}
              </button>
              {notificationsOpen && (
                <div className="notificationPanel">
                  <div className="notificationPanelHeader">
                    <div>
                      <strong>Notifications</strong>
                      <small>Live activity from your workspace</small>
                    </div>
                    {unreadCount > 0 && <span>{unreadCount} new</span>}
                  </div>

                  {notifications.length ? notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false)
                        if (notification.type === 'message.received') {
                          onNavigate('/' + role + '/messages' + (notification.request_id ? '?request=' + notification.request_id : ''))
                        } else if (notification.request_id) {
                          onNavigate(role === 'admin'
                            ? '/admin/requests'
                            : '/' + role + '/requests/' + notification.request_id)
                        }
                      }}
                    >
                      <span className="notificationIndicator" />
                      <div>
                        <strong>{notification.title}</strong>
                        <small>{notification.body}</small>
                        <time>{notificationTime(notification.created_at)}</time>
                      </div>
                    </button>
                  )) : (
                    <div className="notificationEmpty">
                      <Bell size={18} />
                      <strong>You're all caught up</strong>
                      <span>New requests, quotes and messages will appear here.</span>
                    </div>
                  )}
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
