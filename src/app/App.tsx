import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bell, ChevronDown, HeartHandshake, LogIn, Menu, Search, UserRound, X } from 'lucide-react'
import { usePath } from './router'
import { services, providers } from '../data/mockData'
import type { Role } from '../types/marketplace'
import { PublicHome } from '../pages/PublicHome'
import { PublicServices } from '../pages/PublicServices'
import { ProviderProfilePage } from '../pages/ProviderProfilePage'
import { CustomerDashboard } from '../pages/CustomerDashboard'
import { CustomerRequestsPage } from '../pages/CustomerRequestsPage'
import { RequestDetailPage } from '../pages/RequestDetailPage'
import { ProviderDashboard } from '../pages/ProviderDashboard'
import { ProviderRequestDetail } from '../pages/ProviderRequestDetail'
import { AdminDashboard } from '../pages/AdminDashboard'
import { AuthPage } from '../pages/AuthPage'
import { QuoteWizard } from '../components/QuoteWizard'
import { WorkspaceLayout } from '../components/WorkspaceLayout'
import '../styles/modern.css'

const roleRoute = (path: string): Role | null => {
  if (path.startsWith('/customer')) return 'customer'
  if (path.startsWith('/provider')) return 'provider'
  if (path.startsWith('/admin')) return 'admin'
  return null
}

export default function App() {
  const { path, navigate } = usePath()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteService, setQuoteService] = useState('')
  const [sessionRole, setSessionRole] = useState<Role | null>(() => {
    const value = sessionStorage.getItem('anywork_role')
    return value === 'customer' || value === 'provider' || value === 'admin' ? value : null
  })

  useEffect(() => {
    const protectedRole = roleRoute(path)
    if (protectedRole && sessionRole !== protectedRole) navigate('/signin')
  }, [path, sessionRole, navigate])

  const openQuote = (serviceId = '') => {
    setQuoteService(serviceId)
    setQuoteOpen(true)
  }

  const signIn = (role: Role) => {
    sessionStorage.setItem('anywork_role', role)
    setSessionRole(role)
    navigate('/' + role)
  }

  const signOut = () => {
    sessionStorage.removeItem('anywork_role')
    setSessionRole(null)
    navigate('/')
  }

  if (path === '/signin') return <AuthPage onContinue={signIn} />

  const publicContent = path === '/'
    ? <PublicHome services={services} providers={providers} onNavigate={navigate} onQuote={openQuote} />
    : path === '/services'
      ? <PublicServices services={services} providers={providers} onQuote={openQuote} onProvider={(id) => navigate('/providers/' + id)} />
      : path.startsWith('/providers/')
        ? <ProviderProfilePage provider={providers.find((item) => item.id === path.split('/')[2]) || providers[0]} services={services} onQuote={openQuote} />
        : null

  if (publicContent) {
    return <><PublicHeader path={path} onNavigate={navigate} onQuote={openQuote} onSignIn={() => navigate('/signin')} /><div className="publicMain">{publicContent}</div><PublicFooter onNavigate={navigate} />{quoteOpen && <QuoteWizard initialService={quoteService} onClose={() => setQuoteOpen(false)} />}</>
  }

  if (!sessionRole) return null

  if (path.startsWith('/customer/')) {
    const requestId = path.split('/')[3]
    const section = path.split('/')[2]
    const content = section === 'requests' && requestId
      ? <RequestDetailPage requestId={requestId} onBack={() => navigate('/customer/requests')} onNavigate={navigate} />
      : section === 'requests'
        ? <CustomerRequestsPage onNavigate={navigate} />
        : section === 'messages'
          ? <SimpleMessages title="ANYwork Support" />
          : section === 'profile'
            ? <SimpleProfile role="customer" />
            : <CustomerDashboard onNavigate={navigate} />
    return <WorkspaceLayout role="customer" title={section === 'requests' ? 'Requests' : section === 'messages' ? 'Messages' : section === 'profile' ? 'Profile' : 'Overview'} current={section || 'dashboard'} onNavigate={(item) => navigate('/customer/' + (item === 'dashboard' ? '' : item))} onPublicSite={() => { signOut(); navigate('/') }}>{content}</WorkspaceLayout>
  }

  if (path === '/customer') return <WorkspaceLayout role="customer" title="Overview" current="dashboard" onNavigate={(item) => navigate('/customer/' + (item === 'dashboard' ? '' : item))} onPublicSite={() => { signOut(); navigate('/') }}><CustomerDashboard onNavigate={navigate} /></WorkspaceLayout>

  if (path.startsWith('/provider/requests/')) {
    const id = path.split('/')[3] || 'AW-1027'
    return <WorkspaceLayout role="provider" title="Request" current="requests" onNavigate={(item) => navigate('/provider/' + item)} onPublicSite={() => { signOut(); navigate('/') }}><ProviderRequestDetail requestId={id} onBack={() => navigate('/provider/requests')} onNavigate={navigate} /></WorkspaceLayout>
  }

  if (path === '/provider' || path.startsWith('/provider/')) {
    const section = path.split('/')[2] || 'dashboard'
    return <WorkspaceLayout role="provider" title={section === 'dashboard' ? 'Overview' : section.charAt(0).toUpperCase() + section.slice(1)} current={section} onNavigate={(item) => navigate('/provider/' + item)} onPublicSite={() => { signOut(); navigate('/') }}><ProviderDashboard section={section} onNavigate={navigate} /></WorkspaceLayout>
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    const section = path.split('/')[2] || 'dashboard'
    return <WorkspaceLayout role="admin" title={section === 'dashboard' ? 'Overview' : section.charAt(0).toUpperCase() + section.slice(1)} current={section} onNavigate={(item) => navigate('/admin/' + item)} onPublicSite={() => { signOut(); navigate('/') }}><AdminDashboard section={section} /></WorkspaceLayout>
  }

  return <PublicHeader path={path} onNavigate={navigate} onQuote={openQuote} onSignIn={() => navigate('/signin')} />
}

function PublicHeader({ path, onNavigate, onQuote, onSignIn }: { path: string; onNavigate: (path: string) => void; onQuote: (serviceId?: string) => void; onSignIn: () => void }) {
  const [mobile, setMobile] = useState(false)
  const active = useMemo(() => path === '/' ? 'home' : path.startsWith('/services') ? 'services' : path.startsWith('/providers') ? 'providers' : '', [path])
  return <header className="publicHeader"><div className="container publicHeaderInner"><button className="brandButton" onClick={() => onNavigate('/')}><span className="brandMark">AW</span><strong>ANYwork</strong></button><nav className="publicNav"><button className={active === 'services' ? 'active' : ''} onClick={() => onNavigate('/services')}>Services</button><button className={active === 'providers' ? 'active' : ''} onClick={() => onNavigate('/services')}>Providers</button><button onClick={() => onNavigate('/')}>How it works</button></nav><div className="publicHeaderActions"><button className="headerSignIn" onClick={onSignIn}><LogIn size={16} /> Sign in</button><button className="headerCTA" onClick={() => onQuote()}>Request a service</button><button className="mobileMenuButton" onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</button></div></div>{mobile && <div className="mobilePublicNav"><button onClick={() => { onNavigate('/services'); setMobile(false) }}>Services</button><button onClick={() => { onNavigate('/services'); setMobile(false) }}>Providers</button><button onClick={onSignIn}>Sign in</button><button onClick={() => { onQuote(); setMobile(false) }}>Request a service</button></div>}</header>
}

function PublicFooter({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <footer className="publicFooter"><div className="container footerGrid"><div><div className="footerBrand"><span className="brandMark">AW</span><strong>ANYwork</strong></div><p>Find the right service. Request the work. Track it to done.</p></div><div><strong>Marketplace</strong><button onClick={() => onNavigate('/services')}>Services</button><button onClick={() => onNavigate('/services')}>Providers</button><button onClick={() => onNavigate('/signin')}>Sign in</button></div><div><strong>How it works</strong><span>Request a service</span><span>Compare quotes</span><span>Schedule the work</span><span>Track completion</span></div><div><strong>Trust & support</strong><span>Verified providers</span><span>Clear request status</span><span>Support center</span></div></div><div className="container footerBottom"><span>© 2026 ANYwork</span><span>Built for better service jobs.</span></div></footer>
}

function SimpleMessages({ title }: { title: string }) { return <div className="workspaceDashboard"><div className="workspacePageTitle"><span className="eyebrow">MESSAGES</span><h1>{title}</h1><p>Keep conversations attached to the work.</p></div><div className="chatModern"><div className="chatModernHeader"><strong>Job #AW-1027</strong><Bell size={16} /></div><div className="chatBubble incoming">Hi! Your provider has sent an update on the job.</div><div className="chatBubble outgoing">Thanks. Can we move the appointment to 10 AM?</div><div className="chatBubble incoming">Yes, that works.</div><div className="chatComposer"><input placeholder="Write a message..." /><button className="buttonPrimary">Send</button></div></div></div> }

function SimpleProfile({ role }: { role: Role }) { const provider = role === 'provider'; return <div className="workspaceDashboard"><div className="workspacePageTitle"><span className="eyebrow">{provider ? 'BUSINESS PROFILE' : 'ACCOUNT'}</span><h1>{provider ? 'Northside Fabrication' : 'John Doe'}</h1><p>{provider ? 'Verified provider · North Sydney' : 'Customer account'}</p></div><div className="profileWorkspaceGrid"><section className="dashboardCard profileOverview"><div className="providerAvatarHuge">{provider ? 'NF' : 'JD'}</div><h2>{provider ? 'Northside Fabrication' : 'John Doe'}</h2><p>{provider ? '4.9 rating · 184 jobs' : 'john@example.com'}</p><button className="buttonSecondary">Edit profile</button></section><section className="dashboardCard"><h2>{provider ? 'Business details' : 'Saved address'}</h2><div className="detailStack"><span><UserRound size={16} /> {provider ? 'Verified business' : 'John Doe'}</span><span><HeartHandshake size={16} /> {provider ? 'Mon–Sat · 8 AM–6 PM' : '2 Example Street, Parramatta'}</span><span><Bell size={16} /> Notifications enabled</span></div></section></div></div> }

