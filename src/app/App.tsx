import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, LogIn, Menu, UserRound, X } from 'lucide-react'
import { usePath } from './router'
import { services as mockServices, providers } from '../data/mockData'
import type { Service } from '../types/marketplace'
import { listPublicServices } from '../lib/anyworkApi'
import type { Role } from '../types/marketplace'
import type { AnyWorkProfile } from '../types/auth'
import { AuthProvider, useAuth } from '../auth/AuthContext'
import { PublicHome } from '../pages/PublicHome'
import { PublicServices } from '../pages/PublicServices'
import { PublicProviders } from '../pages/PublicProviders'
import { ProviderProfilePage } from '../pages/ProviderProfilePage'
import { CustomerDashboard } from '../pages/CustomerDashboard'
import { CustomerRequestsPage } from '../pages/CustomerRequestsPage'
import { CustomerMessagesPage } from '../pages/CustomerMessagesPage'
import { RequestDetailPage } from '../pages/RequestDetailPage'
import { ProviderDashboard } from '../pages/ProviderDashboard'
import { ProviderRequestDetail } from '../pages/ProviderRequestDetail'
import { ProviderJobDetail } from '../pages/ProviderJobDetail'
import { AdminOperationsPage } from '../pages/AdminOperationsPage'
import { AuthPage } from '../pages/AuthPage'
import { ProfilePage } from '../pages/ProfilePage'
import { HelpCenterPage } from '../pages/HelpCenterPage'
import { GuestRequestPage } from '../pages/GuestRequestPage'
import { InvoicePage } from '../pages/InvoicePage'
import { CustomerJobWorkspace } from '../pages/CustomerJobWorkspace'
import { CustomerJobsPage } from '../pages/CustomerJobsPage'
import { QuoteWizard } from '../components/QuoteWizard'
import { WorkspaceLayout } from '../components/WorkspaceLayout'
import { BrandLogo } from '../components/BrandLogo'
import '../styles/modern.css'
import '../styles/polish.css'
import '../styles/providers-public.css'

const roleRoute = (path: string): Role | null => {
  if (path.startsWith('/customer')) return 'customer'
  if (path.startsWith('/provider')) return 'provider'
  if (path.startsWith('/admin')) return 'admin'
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <Application />
    </AuthProvider>
  )
}

function Application() {
  const { path, navigate } = usePath()
  const { session, profile, loading, signOut } = useAuth()
  const [serviceCatalog, setServiceCatalog] = useState<Service[]>(mockServices)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteService, setQuoteService] = useState('')
  const [quoteCreatedCallback, setQuoteCreatedCallback] = useState<((requestId: string) => void) | null>(null)

  useEffect(() => {
    let mounted = true

    const loadServices = async () => {
      try {
        const rows = await listPublicServices()
        if (!mounted || !rows.length) return

        setServiceCatalog(rows.map((service) => ({
          id: service.id,
          title: service.title,
          label: service.label,
          description: service.description,
          icon: service.icon,
          items: Array.isArray(service.items) ? service.items : [],
          startingPrice: service.starting_price_label || (service.starting_price !== null ? '₱' + Number(service.starting_price).toLocaleString('en-PH') : 'Quote'),
        })))
      } catch {
        // Keep the local catalog available when Supabase is unavailable.
      }
    }

    void loadServices()

    if (!loading) {
      if (path === '/signin' || path === '/admin/signin') {
        if (session && profile) {
          const destination = profile.role === 'admin' ? '/admin' : '/' + profile.role
          if (path !== '/admin/signin' || profile.role === 'admin') navigate(destination)
        }
      } else {
        const protectedRole = roleRoute(path)
        if (protectedRole) {
          if (!session || !profile) {
            navigate(protectedRole === 'admin' ? '/admin/signin' : '/signin')
          } else if (profile.role !== protectedRole) {
            navigate(profile.role === 'admin' ? '/admin' : '/' + profile.role)
          }
        }
      }
    }
    return () => {
      mounted = false
    }
  }, [loading, path, profile, session, navigate])

  const openQuote = (serviceId = '', onCreated?: (requestId: string) => void) => {
    setQuoteService(serviceId)
    setQuoteCreatedCallback(() => onCreated || null)
    setQuoteOpen(true)
  }

  const finishAuth = (nextProfile: AnyWorkProfile) => {
    navigate('/' + nextProfile.role)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (path === '/request/') {
    return <GuestRequestPage token="" />
  }

  if (path.startsWith('/request/')) {
    const token = path.slice('/request/'.length)
    return <GuestRequestPage token={token} />
  }

  if (path.startsWith('/customer/jobs/')) {
    const jobRequestId = path.split('/')[3]
    if (!profile || profile.role !== 'customer') {
      navigate('/signin')
      return null
    }

    return (
      <WorkspaceLayout
        role="customer"
        profile={profile}
        title="Job"
        current="jobs"
        onNavigate={(item) => navigate('/customer/' + (item === 'dashboard' ? '' : item))}
        onPublicSite={handleSignOut}
      >
        <CustomerJobWorkspace requestId={jobRequestId} onBack={() => navigate('/customer/requests')} onNavigate={navigate} />
      </WorkspaceLayout>
    )
  }

  if (path.startsWith('/customer/invoices/')) {
    const invoiceRequestId = path.split('/')[3]
    if (!profile || profile.role !== 'customer') {
      navigate('/signin')
      return null
    }

    return (
      <WorkspaceLayout
        role="customer"
        profile={profile}
        title="Invoice"
        current="requests"
        onNavigate={(item) => navigate('/customer/' + (item === 'dashboard' ? '' : item))}
        onPublicSite={handleSignOut}
      >
        <InvoicePage requestId={invoiceRequestId} onBack={() => navigate('/customer/requests/' + invoiceRequestId)} />
      </WorkspaceLayout>
    )
  }

  if (path === '/signin') {
    return <AuthPage mode="workspace" onAuthenticated={finishAuth} />
  }

  if (path === '/admin/signin') {
    return <AuthPage mode="admin" onAuthenticated={finishAuth} />
  }

  if (loading) return <AppLoading />

  const publicContent = path === '/'
    ? <PublicHome services={serviceCatalog} providers={providers} onNavigate={navigate} onQuote={openQuote} />
    : path === '/services'
      ? <PublicServices services={serviceCatalog} providers={providers} onQuote={openQuote} onProvider={(id) => navigate('/providers/' + id)} />
      : path === '/providers'
        ? <PublicProviders services={serviceCatalog} providers={providers} onProvider={(id) => navigate('/providers/' + id)} />
        : path === '/help'
        ? <HelpCenterPage />
      : path.startsWith('/providers/')
        ? <ProviderProfilePage provider={providers.find((item) => item.id === path.split('/')[2]) || providers[0]} services={serviceCatalog} onQuote={openQuote} />
        : null

  if (publicContent) {
    return (
      <>
        <PublicHeader
          path={path}
          profile={profile}
          onNavigate={navigate}
          onQuote={openQuote}
          onSignIn={() => navigate('/signin')}
        />
        <div className="publicMain">{publicContent}</div>
        <PublicFooter onNavigate={navigate} onQuote={openQuote} />
        {quoteOpen && (
          <QuoteWizard
            servicesOverride={serviceCatalog}
            initialService={quoteService}
            onClose={() => { setQuoteOpen(false); setQuoteCreatedCallback(null) }}
            onCreated={(request) => quoteCreatedCallback?.(request.id)}
          />
        )}
      </>
    )
  }

  if (!profile) return null

  if (path === '/customer' || path.startsWith('/customer/')) {
    const parts = path.split('/')
    const section = parts[2] || 'dashboard'
    const requestId = parts[3]
    const content = section === 'requests' && requestId
      ? <RequestDetailPage requestId={requestId} onBack={() => navigate('/customer/requests')} onNavigate={navigate} />
      : section === 'requests'
        ? <CustomerRequestsPage onNavigate={navigate} onCreateRequest={() => openQuote('', (requestId) => navigate('/customer/requests/' + requestId))} />
        : section === 'jobs'
          ? <CustomerJobsPage onNavigate={navigate} />
        : section === 'messages'
          ? <CustomerMessagesPage
              onNavigate={navigate}
              requestId={new URLSearchParams(window.location.search).get('request') || requestId}
              providerId={new URLSearchParams(window.location.search).get('provider') || undefined}
            />
          : section === 'profile'
            ? <ProfilePage role="customer" />
            : section === 'help'
              ? <HelpCenterPage />
              : <CustomerDashboard profile={profile} onNavigate={navigate} />

    return (
      <>
        <WorkspaceLayout
          role="customer"
          profile={profile}
          title={section === 'requests' ? 'Requests' : section === 'jobs' ? 'Jobs' : section === 'messages' ? 'Messages' : section === 'profile' ? 'Profile' : section === 'help' ? 'Help Center' : 'Overview'}
          current={section}
          onNavigate={(item) => navigate('/customer/' + (item === 'dashboard' ? '' : item))}
          onPublicSite={handleSignOut}
        >
          {content}
        </WorkspaceLayout>
        {quoteOpen && (
          <QuoteWizard
            servicesOverride={serviceCatalog}
            initialService={quoteService}
            onClose={() => { setQuoteOpen(false); setQuoteCreatedCallback(null) }}
            onCreated={(request) => quoteCreatedCallback?.(request.id)}
          />
        )}
      </>
    )
  }

  if (path.startsWith('/provider/jobs/')) {
    const id = path.split('/')[3]
    return (
      <WorkspaceLayout
        role="provider"
        profile={profile}
        title="Job"
        current="jobs"
        onNavigate={(item) => navigate('/provider/' + item)}
        onPublicSite={handleSignOut}
      >
        <ProviderJobDetail requestId={id} onBack={() => navigate('/provider/jobs')} onNavigate={navigate} />
      </WorkspaceLayout>
    )
  }

  if (path.startsWith('/provider/requests/')) {
    const id = path.split('/')[3] || 'AW-1027'
    return (
      <WorkspaceLayout
        role="provider"
        profile={profile}
        title="Request"
        current="requests"
        onNavigate={(item) => navigate('/provider/' + item)}
        onPublicSite={handleSignOut}
      >
        <ProviderRequestDetail requestId={id} onBack={() => navigate('/provider/requests')} onNavigate={navigate} />
      </WorkspaceLayout>
    )
  }

  if (path === '/provider' || path.startsWith('/provider/')) {
    const section = path.split('/')[2] || 'dashboard'
    const providerContent = section === 'profile'
      ? <ProfilePage role="provider" />
      : section === 'help'
        ? <HelpCenterPage />
        : <ProviderDashboard
            section={section}
            profile={profile}
            onNavigate={navigate}
            messageRequestId={new URLSearchParams(window.location.search).get('request') || undefined}
            messageProviderId={new URLSearchParams(window.location.search).get('provider') || undefined}
          />
    const providerTitle = section === 'dashboard'
      ? 'Overview'
      : section === 'help'
        ? 'Help Center'
        : section === 'profile'
          ? 'Profile'
          : section.charAt(0).toUpperCase() + section.slice(1)

    return (
      <WorkspaceLayout
        role="provider"
        profile={profile}
        title={providerTitle}
        current={section}
        onNavigate={(item) => navigate('/provider/' + item)}
        onPublicSite={handleSignOut}
      >
        {providerContent}
      </WorkspaceLayout>
    )
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    const section = path.split('/')[2] || 'dashboard'
    const adminContent = section === 'help'
      ? <HelpCenterPage />
      : section === 'profile'
        ? <ProfilePage role="admin" />
        : <AdminOperationsPage section={section} onNavigate={navigate} />
    const adminTitle = section === 'dashboard'
      ? 'Overview'
      : section === 'help'
        ? 'Help Center'
        : section === 'profile'
          ? 'Profile'
          : section.charAt(0).toUpperCase() + section.slice(1)

    return (
      <WorkspaceLayout
        role="admin"
        profile={profile}
        title={adminTitle}
        current={section}
        onNavigate={(item) => navigate('/admin/' + (item === 'dashboard' ? '' : item))}
        onPublicSite={handleSignOut}
      >
        {adminContent}
      </WorkspaceLayout>
    )
  }

  return <PublicHeader path={path} profile={profile} onNavigate={navigate} onQuote={openQuote} onSignIn={() => navigate('/signin')} />
}

function PublicHeader({
  path,
  profile,
  onNavigate,
  onQuote,
  onSignIn,
}: {
  path: string
  profile: AnyWorkProfile | null
  onNavigate: (path: string) => void
  onQuote: (serviceId?: string) => void
  onSignIn: () => void
}) {
  const [mobile, setMobile] = useState(false)
  const active = useMemo(
    () =>
      path === '/'
        ? 'home'
        : path.startsWith('/services')
          ? 'services'
          : path === '/providers' || path.startsWith('/providers/')
            ? 'providers'
            : path.startsWith('/customer/requests')
              ? 'requests'
              : '',
    [path],
  )
  const workspacePath = profile?.role ? '/' + profile.role : '/signin'

  return (
    <header className="publicHeader">
      <div className="container publicHeaderInner">
        <button className="brandButton brandButtonLogo" onClick={() => onNavigate('/')} aria-label="ANYwork home">
          <BrandLogo variant="header" />
        </button>
        <nav className="publicNav">
          <button className={active === 'services' ? 'active' : ''} onClick={() => onNavigate('/services')}>Services</button>
          <button className={active === 'providers' ? 'active' : ''} onClick={() => onNavigate('/providers')}>Providers</button>
          <button onClick={() => onNavigate('/')}>How it works</button>
          <button className={active === 'requests' ? 'active' : ''} onClick={() => onNavigate(profile ? '/customer/requests' : '/signin')}>My Requests</button>
        </nav>
        <div className="publicHeaderActions">
          {profile ? (
            <button className="headerSignIn" onClick={() => onNavigate(workspacePath)}>
              <UserRound size={16} />
              {profile.first_name || 'Workspace'}
            </button>
          ) : (
            <button className="headerSignIn" onClick={onSignIn}>
              <LogIn size={16} /> Sign in
            </button>
          )}
          <button className="headerCTA" onClick={() => onQuote()}>
            Request a service <ArrowRight size={15} />
          </button>
          <button className="mobileMenuButton" onClick={() => setMobile(!mobile)}>
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobile && (
        <div className="mobilePublicNav">
          <button onClick={() => { onNavigate('/services'); setMobile(false) }}>Services</button>
          <button onClick={() => { onNavigate('/providers'); setMobile(false) }}>Providers</button>
          <button onClick={() => { onNavigate('/'); setMobile(false) }}>How it works</button>
          <button onClick={() => { onNavigate(profile ? '/customer/requests' : '/signin'); setMobile(false) }}>My Requests</button>
          <button onClick={() => { onNavigate(workspacePath); setMobile(false) }}>{profile ? 'My workspace' : 'Sign in'}</button>
          <button onClick={() => { onQuote(); setMobile(false) }}>Request a service</button>
        </div>
      )}
    </header>
  )
}

function PublicFooter({ onNavigate, onQuote }: { onNavigate: (path: string) => void; onQuote: (serviceId?: string) => void }) {
  return (
    <footer className="publicFooter">
      <div className="container footerGrid">
        <div>
          <button className="footerBrandButton" onClick={() => onNavigate('/')} aria-label="ANYwork home">
            <BrandLogo variant="header" />
          </button>
          <p>Find the right service. Request the work. Track it to done.</p>
        </div>
        <div>
          <strong>Marketplace</strong>
          <button onClick={() => onNavigate('/services')}>Services</button>
          <button onClick={() => onNavigate('/services')}>Providers</button>
          <button onClick={() => onNavigate('/signin')}>Sign in</button>
        </div>
        <div>
          <strong>How it works</strong>
          <button onClick={() => onQuote()}>Request a service</button>
          <button onClick={() => onNavigate('/signin')}>Compare quotes</button>
          <button onClick={() => onNavigate('/signin')}>Schedule the work</button>
          <button onClick={() => onNavigate('/signin')}>Track completion</button>
        </div>
        <div>
          <strong>Trust & support</strong>
          <button onClick={() => onNavigate('/services')}>Verified providers</button>
          <button onClick={() => onNavigate('/signin')}>Clear request status</button>
          <button onClick={() => onNavigate('/help')}>Support center</button>
        </div>
      </div>
      <div className="container footerBottom">
        <span>© 2026 ANYwork</span>
        <span>Built for better service jobs.</span>
      </div>
    </footer>
  )
}

function AppLoading() {
  return (
    <main className="appLoading" aria-live="polite" aria-busy="true">
      <div className="appLoadingCard">
        <div className="appLoadingSpinner" aria-hidden="true" />
        <strong>ANYwork</strong>
        <p>Loading your workspace…</p>
      </div>
    </main>
  )
}
