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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../types/marketplace'
import type { AnyWorkProfile } from '../types/auth'
import { BrandLogo } from './BrandLogo'
import {
  listCustomerRequests,
  subscribeToQuotes,
  subscribeToRequests,
  subscribeToUserMessages,
  type DbQuote,
  type DbRealtimeChange,
  type DbRequest,
  type DbMessage,
} from '../lib/anyworkApi'
import { confirmAction } from '../lib/alerts'

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

type NotificationItem = {
  id: string
  title: string
  detail: string
  createdAt: number
  href?: string
}

const notificationTime = (createdAt: number) => {
  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000))
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
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined
    let messageCleanup: (() => void) | undefined
    let requestIds = new Set<string>()

    const addNotification = (item: NotificationItem) => {
      setNotifications((current) => {
        if (current.some((existing) => existing.id === item.id)) return current
        return [item, ...current].slice(0, 8)
      })
      setUnreadCount((current) => current + 1)
    }

    const handleRequestChange = (change: DbRealtimeChange<DbRequest>) => {
      const record = change.record
      const oldRecord = change.oldRecord

      if (record?.customer_id === profile.user_id) requestIds.add(record.id)
      if (oldRecord?.customer_id === profile.user_id && oldRecord.id) requestIds.add(oldRecord.id)

      const relevant = role === 'admin'
        || (role === 'customer' && record?.customer_id === profile.user_id)
        || (role === 'provider' && (
          record?.selected_provider_id === profile.user_id
          || record?.status === 'Requested'
          || oldRecord?.selected_provider_id === profile.user_id
        ))

      if (!relevant) return

      const titleText = change.event === 'INSERT'
        ? role === 'provider' ? 'New service request' : 'Request created'
        : change.event === 'DELETE'
          ? 'Request removed'
          : 'Request updated'

      addNotification({
        id: 'request:' + (record?.id || oldRecord?.id || '') + ':' + change.event + ':' + Date.now(),
        title: titleText,
        detail: record?.title || 'A service request has changed.',
        createdAt: Date.now(),
        href: record?.id ? '/requests/' + record.id : undefined,
      })
    }

    const handleQuoteChange = (change: DbRealtimeChange<DbQuote>) => {
      const record = change.record
      const relevant = role === 'admin'
        || (role === 'provider' && record?.provider_id === profile.user_id)
        || (role === 'customer' && !!record?.request_id && requestIds.has(record.request_id))

      if (!relevant) return

      addNotification({
        id: 'quote:' + (record?.id || change.oldRecord?.id || '') + ':' + change.event + ':' + Date.now(),
        title: change.event === 'INSERT' ? 'New quote activity' : 'Quote updated',
        detail: role === 'customer' ? 'A provider has responded to one of your requests.' : 'A quote in your marketplace pipeline changed.',
        createdAt: Date.now(),
        href: record?.request_id ? '/requests/' + record.request_id : undefined,
      })
    }

    const handleMessage = (message: DbMessage) => {
      if (message.sender_id === profile.user_id || message.receiver_id !== profile.user_id) return

      addNotification({
        id: 'message:' + message.id,
        title: 'New message',
        detail: 'You received a new work conversation message.',
        createdAt: Date.now(),
        href: message.request_id
          ? '/messages?request=' + message.request_id + '&provider=' + message.sender_id
          : '/messages',
      })
    }

    const start = async () => {
      if (role === 'customer') {
        try {
          const rows = await listCustomerRequests()
          requestIds = new Set(rows.map((row) => row.id))
        } catch {
          requestIds = new Set()
        }
      }

      requestCleanup = await subscribeToRequests(handleRequestChange)
      quoteCleanup = await subscribeToQuotes(handleQuoteChange)
      messageCleanup = await subscribeToUserMessages(handleMessage)
    }

    void start()

    return () => {
      requestCleanup?.()
      quoteCleanup?.()
      messageCleanup?.()
    }
  }, [profile.user_id, role])

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
    if (next) setUnreadCount(0)
  }

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
                        if (notification.href) onNavigate(notification.href)
                      }}
                    >
                      <span className="notificationIndicator" />
                      <div>
                        <strong>{notification.title}</strong>
                        <small>{notification.detail}</small>
                        <time>{notificationTime(notification.createdAt)}</time>
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
