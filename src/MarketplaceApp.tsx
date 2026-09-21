import { useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock3, FileText, Hammer, HardHat, LayoutDashboard, Mail, MapPin, Menu, MessageCircle,
  PackageCheck, Phone, Plus, Printer, Search, Settings, Star, Users, Wrench, X, Boxes
} from 'lucide-react'
import './marketplace.css'

type Role = 'customer' | 'provider' | 'admin'
type Icon = ComponentType<{ size?: number; className?: string }>
type Status = 'Requested' | 'Quoted' | 'Scheduled' | 'In Progress' | 'Completed'

type Service = {
  id: string
  title: string
  label: string
  icon: Icon
  description: string
  items: string[]
}

type Provider = {
  id: string
  name: string
  initials: string
  services: string[]
  rating: number
  jobs: number
  location: string
  summary: string
}

type Request = {
  id: string
  customer: string
  provider: string
  service: string
  status: Status
  location: string
  date: string
  budget: string
  total?: string
}

const services: Service[] = [
  { id: 'print', title: 'Print', label: 'Printing & signage', icon: Printer, description: 'Banners, signage and promotional printing for business, events and sites.', items: ['Banner & tarpaulin printing', 'Business & site signage', 'Window graphics'] },
  { id: 'build', title: 'Build', label: 'Furniture & fabrication', icon: Hammer, description: 'Custom furniture, fixtures and practical built solutions.', items: ['Custom furniture', 'Cabinets & counters', 'Shelving & storage'] },
  { id: 'install', title: 'Install', label: 'Installation & assembly', icon: Boxes, description: 'Professional installation and assembly for signs, furniture and displays.', items: ['Banner installation', 'Sign installation', 'Furniture assembly'] },
  { id: 'maintain', title: 'Maintain', label: 'Handyman & maintenance', icon: Wrench, description: 'General repairs and maintenance for homes, offices and commercial spaces.', items: ['Minor repairs', 'Painting & patching', 'Fixture replacement'] },
  { id: 'site', title: 'Site', label: 'Site services', icon: HardHat, description: 'Practical support for sites, fit-outs, preparation and coordination.', items: ['Site preparation', 'Fit-out assistance', 'Material handling'] },
  { id: 'custom', title: 'Custom', label: 'Special projects', icon: BriefcaseBusiness, description: 'Unusual work can be routed to the right provider.', items: ['Custom jobs', 'Event setup', 'Special fabrication'] },
]

const providers: Provider[] = [
  { id: 'p1', name: 'Northside Fabrication', initials: 'NF', services: ['Build', 'Install'], rating: 4.9, jobs: 184, location: 'North Sydney', summary: 'Custom furniture, shop fit-outs and installation.' },
  { id: 'p2', name: 'Signal Works', initials: 'SW', services: ['Print', 'Install'], rating: 4.8, jobs: 231, location: 'Parramatta', summary: 'Commercial signage, banners and on-site installation.' },
  { id: 'p3', name: 'FixRight Services', initials: 'FR', services: ['Maintain', 'Site'], rating: 4.7, jobs: 97, location: 'Mascot', summary: 'Maintenance, repairs and practical site support.' },
]

const requests: Request[] = [
  { id: 'AW-1027', customer: 'John Doe', provider: 'Signal Works', service: 'Print', status: 'Quoted', location: 'Parramatta', date: '24 Sep 2026', budget: '$1,500', total: '$1,850' },
  { id: 'AW-1026', customer: 'John Doe', provider: 'Northside Fabrication', service: 'Build', status: 'Scheduled', location: 'North Sydney', date: '27 Sep 2026', budget: '$900', total: '$920' },
  { id: 'AW-1025', customer: 'ABC Business', provider: 'FixRight Services', service: 'Maintain', status: 'Requested', location: 'Mascot', date: '29 Sep 2026', budget: '$750' },
  { id: 'AW-1024', customer: 'Retail Co.', provider: 'Signal Works', service: 'Install', status: 'In Progress', location: 'Parramatta', date: '22 Sep 2026', budget: '$2,000', total: '$2,140' },
]

const label = (value: string) => value === 'home'
  ? 'Home'
  : value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

function App() {
  const [role, setRole] = useState<Role>('customer')
  const [page, setPage] = useState('home')
  const [mobile, setMobile] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState('AW-1027')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteService, setQuoteService] = useState('')

  const nav = role === 'customer'
    ? ['home', 'services', 'requests', 'messages', 'profile']
    : role === 'provider'
      ? ['dashboard', 'services', 'requests', 'jobs', 'messages', 'earnings', 'profile']
      : ['dashboard', 'requests', 'providers', 'services', 'customers', 'settings']

  const go = (next: string) => { setPage(next); setMobile(false) }

  const switchRole = () => {
    const next = role === 'customer' ? 'provider' : role === 'provider' ? 'admin' : 'customer'
    setRole(next)
    setPage(next === 'customer' ? 'home' : 'dashboard')
  }

  const openQuote = (service = '') => {
    setQuoteService(service)
    setQuoteOpen(true)
  }

  return (
    <div className="marketplaceApp">
      <header className="marketHeader">
        <button className="marketBrand" onClick={() => go(role === 'customer' ? 'home' : 'dashboard')}>
          <span className="marketLogo">AW</span>
          <span>ANYwork</span>
        </button>

        <nav className="marketNav">
          {nav.slice(0, 6).map((item) => (
            <button key={item} className={page === item ? 'active' : ''} onClick={() => go(item)}>{label(item)}</button>
          ))}
        </nav>

        <div className="marketActions">
          <button className="roleSwitcher" onClick={switchRole}>
            {role === 'customer' ? 'Customer' : role === 'provider' ? 'Provider' : 'Admin'}
            <ChevronRight size={15} />
          </button>
          <button className="marketIconButton" onClick={() => setMobile(!mobile)}>
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {mobile && (
        <div className="marketMobileNav">
          {nav.map((item) => <button key={item} onClick={() => go(item)}>{label(item)}</button>)}
          <button onClick={switchRole}>Switch role</button>
        </div>
      )}

      {role === 'customer' && (
        <CustomerView
          page={page}
          go={go}
          openQuote={openQuote}
          selectedRequest={selectedRequest}
          setSelectedRequest={setSelectedRequest}
        />
      )}

      {role === 'provider' && (
        <ProviderView
          page={page}
          go={go}
          selectedRequest={selectedRequest}
          setSelectedRequest={setSelectedRequest}
        />
      )}

      {role === 'admin' && <AdminView page={page} go={go} />}

      <footer className="marketFooter">
        <strong>ANYwork</strong>
        <span>Find the right service. Request the work. Track it to done.</span>
        <span>Print · Build · Install · Maintain · Site · Custom</span>
        <span>© 2026 ANYwork</span>
      </footer>

      {quoteOpen && <QuoteWizard serviceId={quoteService} close={() => setQuoteOpen(false)} />}
    </div>
  )
}

function CustomerView({ page, go, openQuote, selectedRequest, setSelectedRequest }: {
  page: string
  go: (page: string) => void
  openQuote: (service?: string) => void
  selectedRequest: string
  setSelectedRequest: (id: string) => void
}) {
  if (page === 'services') return <CustomerServices openQuote={openQuote} />
  if (page === 'requests') return <CustomerRequests go={go} setSelectedRequest={setSelectedRequest} />
  if (page === 'request') return <CustomerRequestDetail requestId={selectedRequest} go={go} />
  if (page === 'messages') return <Messages title="ANYwork Support" />
  if (page === 'profile') return <CustomerProfile />
  return <CustomerHome go={go} openQuote={openQuote} />
}

function CustomerHome({ go, openQuote }: { go: (page: string) => void; openQuote: (service?: string) => void }) {
  return (
    <>
      <section className="marketHero">
        <div>
          <span className="eyebrow">ANYWORK MARKETPLACE</span>
          <h1>Got a job that<br /><em>needs doing?</em></h1>
          <p>Find a service, compare providers, request a quote and track the job from request to completion.</p>
          <div className="marketHeroActions">
            <button className="primaryAction" onClick={() => openQuote()}>Request a Quote <ArrowRight size={18} /></button>
            <button className="secondaryAction" onClick={() => go('services')}>Find a Service</button>
          </div>
          <div className="trustRow"><span><CheckCircle2 /> Clear quotes</span><span><CheckCircle2 /> Verified providers</span><span><CheckCircle2 /> Job tracking</span></div>
        </div>
        <div className="heroPanel">
          <span className="eyebrow">ONE REQUEST</span>
          <h3>The right provider.<br />The right schedule.</h3>
          <p>Tell us what you need, add photos and location, then review provider quotes and availability.</p>
          <button className="heroPanelButton" onClick={() => openQuote()}>Start a request <ArrowRight size={16} /></button>
        </div>
      </section>

      <section className="marketSection">
        <SectionTitle eyebrow="SERVICES" title="What do you need done?" action="View all" onClick={() => go('services')} />
        <div className="marketServiceGrid">{services.map((service) => <ServiceCard key={service.id} service={service} onClick={() => openQuote(service.id)} />)}</div>
      </section>

      <section className="marketSplit">
        <div>
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>From request to done.</h2>
          <div className="marketSteps">
            <Step number="01" title="Describe the job" text="Choose a service and tell us what you need." />
            <Step number="02" title="Compare providers" text="Review location, rating, availability and quotes." />
            <Step number="03" title="Schedule the work" text="Approve the quote and confirm the appointment." />
            <Step number="04" title="Track completion" text="Messages, photos, status and invoice stay together." />
          </div>
        </div>
        <div className="darkMarketPanel">
          <span className="eyebrow">CUSTOM WORK</span>
          <h3>Not sure which service you need?</h3>
          <p>Send the details and photos. ANYwork can route unusual work to the right category and provider.</p>
          <button className="primaryAction light" onClick={() => openQuote()}>Tell us what you need <ArrowRight size={17} /></button>
        </div>
      </section>

      <section className="marketSection">
        <SectionTitle eyebrow="PROVIDERS" title="People behind the work." action="Browse services" onClick={() => go('services')} />
        <div className="providerGrid">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div>
      </section>
    </>
  )
}

function CustomerServices({ openQuote }: { openQuote: (service?: string) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Service | null>(null)

  const filtered = services.filter((service) =>
    (service.title + ' ' + service.label).toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <main className="marketSection marketPage">
      <div className="pageHeading">
        <div><span className="eyebrow">SERVICES & PROVIDERS</span><h1>Find the right service.</h1><p>Browse services, then compare providers before starting a request.</p></div>
        <button className="primaryAction" onClick={() => openQuote()}>Request a Quote <ArrowRight size={17} /></button>
      </div>
      <div className="marketToolbar"><div className="marketSearch"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services..." /></div><span>{filtered.length} services</span></div>
      <div className="marketServiceGrid">{filtered.map((service) => <ServiceCard key={service.id} service={service} onClick={() => setSelected(service)} />)}</div>

      {selected && (
        <div className="serviceDetailCard">
          <div><span className="eyebrow">{selected.title.toUpperCase()}</span><h2>{selected.label}</h2><p>{selected.description}</p><ul>{selected.items.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul><button className="primaryAction" onClick={() => openQuote(selected.id)}>Request this service <ArrowRight size={17} /></button></div>
          <div className="serviceDetailVisual"><selected.icon size={72} /><span>Compare available providers for this service</span></div>
        </div>
      )}

      <div className="providerDirectory">
        <SectionTitle eyebrow="PROVIDER DIRECTORY" title="Who can do the work?" />
        <div className="providerGrid">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div>
      </div>
    </main>
  )
}

function CustomerRequests({ go, setSelectedRequest }: { go: (page: string) => void; setSelectedRequest: (id: string) => void }) {
  return (
    <main className="marketSection marketPage">
      <div className="pageHeading"><div><span className="eyebrow">CUSTOMER PORTAL</span><h1>My Requests</h1><p>Every request, quote and job in one place.</p></div></div>
      <div className="filterTabs"><span className="active">All</span><span>Requested</span><span>Quoted</span><span>Scheduled</span><span>Completed</span></div>
      <div className="marketRequestList">
        {requests.filter((request) => request.customer === 'John Doe').map((request) => (
          <button key={request.id} className="marketRequestCard" onClick={() => { setSelectedRequest(request.id); go('request') }}>
            <div><span className="requestId">{request.id}</span><h3>{request.service} request</h3><p><MapPin size={14} /> {request.location} · <CalendarDays size={14} /> {request.date}</p><span className="requestProvider">Provider: {request.provider}</span></div>
            <div className="requestSummary"><StatusBadge status={request.status} /><strong>{request.total ?? request.budget}</strong></div>
            <div className="marketProgress"><span style={{ width: progress(request.status) + '%' }} /></div>
          </button>
        ))}
      </div>
    </main>
  )
}

function CustomerRequestDetail({ requestId, go }: { requestId: string; go: (page: string) => void }) {
  const request = requests.find((item) => item.id === requestId) || requests[0]
  const provider = providers.find((item) => item.name === request.provider) || providers[0]

  return (
    <main className="marketSection marketPage">
      <button className="backLink" onClick={() => go('requests')}>← Back to requests</button>
      <div className="pageHeading"><div><span className="requestId">{request.id}</span><h1>{request.service} request</h1><p>{request.customer} · {request.location} · {request.date}</p></div><StatusBadge status={request.status} /></div>
      <div className="marketTwoColumn">
        <div className="marketPanel"><PanelTitle title="Request timeline" /><Timeline status={request.status} /></div>
        <div className="marketPanel"><PanelTitle title="Selected provider" /><ProviderCard provider={provider} compact /><div className="inlineActions"><button className="secondaryAction" onClick={() => go('messages')}><MessageCircle size={16} /> Message</button><button className="primaryAction"><CalendarDays size={16} /> Schedule</button></div></div>
      </div>
      <div className="marketTwoColumn">
        <div className="marketPanel"><PanelTitle title="Job details" /><p>Service request for {request.service.toLowerCase()} work. Final measurements and access details are confirmed before the appointment.</p><div className="detailRows"><span><MapPin /> {request.location}</span><span><CalendarDays /> {request.date}</span><span><CircleDollarSign /> Budget {request.budget}</span></div></div>
        <div className="marketPanel"><PanelTitle title="Job photos" /><div className="photoPlaceholders"><div>Before</div><div>During</div><div>Completed</div></div></div>
      </div>
    </main>
  )
}

function CustomerProfile() {
  return <main className="marketSection marketPage"><span className="eyebrow">ACCOUNT</span><h1>Profile</h1><div className="marketTwoColumn"><div className="marketPanel profilePanel"><div className="largeAvatar">JD</div><h2>John Doe</h2><p>Customer</p><div className="detailRows"><span><Mail /> john@example.com</span><span><Phone /> +61 400 000 000</span></div><button className="secondaryAction">Edit profile</button></div><div className="marketPanel"><PanelTitle title="Saved address" /><p>2 Example Street, Parramatta NSW</p><button className="secondaryAction">Manage addresses</button><hr /><PanelTitle title="Notifications" /><label className="toggleLine"><span>Job updates</span><input type="checkbox" defaultChecked /></label><label className="toggleLine"><span>Quote notifications</span><input type="checkbox" defaultChecked /></label></div></div></main>
}

function ProviderView({ page, go, selectedRequest, setSelectedRequest }: { page: string; go: (page: string) => void; selectedRequest: string; setSelectedRequest: (id: string) => void }) {
  if (page === 'services') return <ProviderServices />
  if (page === 'requests') return <ProviderRequests go={go} setSelectedRequest={setSelectedRequest} />
  if (page === 'request') return <ProviderRequestDetail requestId={selectedRequest} go={go} />
  if (page === 'jobs') return <ProviderJobs />
  if (page === 'messages') return <Messages title="Customer messages" />
  if (page === 'earnings') return <ProviderEarnings />
  if (page === 'profile') return <ProviderProfile />
  return <ProviderDashboard go={go} setSelectedRequest={setSelectedRequest} />
}

function ProviderDashboard({ go, setSelectedRequest }: { go: (page: string) => void; setSelectedRequest: (id: string) => void }) {
  return (
    <main className="providerPage">
      <div className="pageHeading"><div><span className="eyebrow">PROVIDER PORTAL</span><h1>Your work, all in one place.</h1><p>Manage requests, schedules, customer communication and earnings.</p></div><button className="primaryAction" onClick={() => go('services')}><Plus size={17} /> Manage services</button></div>
      <div className="statGrid"><Stat icon={PackageCheck} label="Active jobs" value="8" /><Stat icon={Clock3} label="New requests" value="4" /><Stat icon={CircleDollarSign} label="This month" value="$18.4k" /><Stat icon={Star} label="Rating" value="4.9" /></div>
      <div className="marketTwoColumn"><div className="marketPanel"><PanelTitle title="New opportunities" /><div className="providerRequestList">{requests.filter((request) => request.status === 'Requested' || request.status === 'Quoted').map((request) => <button key={request.id} className="providerRequestRow" onClick={() => { setSelectedRequest(request.id); go('request') }}><div className="smallAvatar">{request.customer.slice(0, 2).toUpperCase()}</div><div><strong>{request.service} · {request.customer}</strong><span>{request.location} · {request.date}</span></div><StatusBadge status={request.status} /><ChevronRight size={16} /></button>)}</div></div><div className="marketPanel"><PanelTitle title="Today" /><ScheduleRow time="09:00" title="Banner installation" details="Parramatta · Retail Co." /><ScheduleRow time="13:30" title="Site inspection" details="Alexandria · ABC Business" /><ScheduleRow time="16:00" title="Furniture assembly" details="North Sydney · John Doe" /></div></div>
      <div className="marketPanel"><PanelTitle title="Request pipeline" /><div className="pipeline">{(['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'] as Status[]).map((status) => <div key={status}><span>{status}</span><strong>{requests.filter((request) => request.status === status).length}</strong></div>)}</div></div>
    </main>
  )
}

function ProviderRequests({ go, setSelectedRequest }: { go: (page: string) => void; setSelectedRequest: (id: string) => void }) {
  return <main className="providerPage"><div className="pageHeading"><div><span className="eyebrow">REQUESTS</span><h1>Service requests</h1><p>Review incoming work and send clear quotes.</p></div><div className="marketSearch"><Search size={17} /><input placeholder="Search requests..." /></div></div><div className="filterTabs"><span className="active">All</span><span>New</span><span>Quoted</span><span>Scheduled</span></div><div className="marketPanel requestTable">{requests.map((request) => <button key={request.id} className="providerTableRow" onClick={() => { setSelectedRequest(request.id); go('request') }}><span className="requestId">{request.id}</span><div><strong>{request.service}</strong><span>{request.customer} · {request.location}</span></div><span>{request.date}</span><StatusBadge status={request.status} /><strong>{request.total || request.budget}</strong><ChevronRight size={16} /></button>)}</div></main>
}

function ProviderRequestDetail({ requestId, go }: { requestId: string; go: (page: string) => void }) {
  const request = requests.find((item) => item.id === requestId) || requests[0]
  return <main className="providerPage"><button className="backLink" onClick={() => go('requests')}>← Back to requests</button><div className="pageHeading"><div><span className="requestId">{request.id}</span><h1>{request.service} opportunity</h1><p>{request.customer} · {request.location} · {request.date}</p></div><StatusBadge status={request.status} /></div><div className="marketTwoColumn"><div className="marketPanel"><PanelTitle title="Customer request" /><p>Review the scope, location, timing and budget before responding.</p><div className="detailRows"><span><Users /> {request.customer}</span><span><MapPin /> {request.location}</span><span><CalendarDays /> {request.date}</span><span><CircleDollarSign /> Budget {request.budget}</span></div></div><div className="marketPanel"><PanelTitle title="Send your quote" /><label className="formField"><span>Quote amount</span><input defaultValue={request.total || request.budget} /></label><label className="formField"><span>Availability</span><input defaultValue={request.date} /></label><label className="formField"><span>Message</span><textarea defaultValue="We can complete the requested work based on the details provided." /></label><div className="inlineActions"><button className="secondaryAction" onClick={() => go('messages')}><MessageCircle size={16} /> Message customer</button><button className="primaryAction">Send quote <ArrowRight size={17} /></button></div></div></div></main>
}

function ProviderServices() {
  return <main className="providerPage"><div className="pageHeading"><div><span className="eyebrow">MY SERVICES</span><h1>Services you offer</h1><p>Control which services customers can request from you.</p></div><button className="primaryAction"><Plus size={17} /> Add service</button></div><div className="providerServiceGrid">{providers[0].services.map((name) => <div className="marketPanel" key={name}><div className="serviceIcon"><Wrench size={22} /></div><h3>{name}</h3><p>Professional {name.toLowerCase()} services for businesses and homes.</p><span>Starting from $450</span><button className="secondaryAction">Edit service</button></div>)}</div></main>
}

function ProviderJobs() {
  return <main className="providerPage"><span className="eyebrow">ACTIVE WORK</span><h1>Jobs</h1><p className="lead">Track scheduled and in-progress work.</p><div className="marketRequestList">{requests.filter((request) => ['Scheduled', 'In Progress', 'Completed'].includes(request.status)).map((request) => <div className="marketRequestCard" key={request.id}><div><span className="requestId">{request.id}</span><h3>{request.service} · {request.customer}</h3><p>{request.location} · {request.date}</p></div><div className="requestSummary"><StatusBadge status={request.status} /><strong>{request.total}</strong></div><div className="marketProgress"><span style={{ width: progress(request.status) + '%' }} /></div></div>)}</div></main>
}

function ProviderEarnings() {
  return <main className="providerPage"><span className="eyebrow">EARNINGS</span><h1>Revenue</h1><p className="lead">See completed work, open quotes and upcoming payments.</p><div className="statGrid"><Stat icon={CircleDollarSign} label="This month" value="$18,420" /><Stat icon={CheckCircle2} label="Completed" value="14" /><Stat icon={Clock3} label="Awaiting payment" value="$2,640" /><Stat icon={BriefcaseBusiness} label="Open quotes" value="$7,900" /></div><div className="marketPanel"><PanelTitle title="Recent invoices" /><div className="invoiceList">{['INV-1027', 'INV-1021', 'INV-1018'].map((id, i) => <div className="invoiceRow" key={id}><FileText /><div><span>{id}</span><strong>{['$1,850', '$920', '$640'][i]}</strong></div><small>{['Due 30 Sep', 'Paid', 'Paid'][i]}</small><button className="secondaryAction small">View</button></div>)}</div></div></main>
}

function ProviderProfile() {
  return <main className="providerPage"><span className="eyebrow">BUSINESS PROFILE</span><h1>Provider profile</h1><div className="marketTwoColumn"><div className="marketPanel profilePanel"><div className="largeAvatar">NF</div><h2>Northside Fabrication</h2><p>Verified provider · North Sydney</p><div className="ratingLine"><Star size={15} /> 4.9 · 184 jobs</div><button className="secondaryAction">Edit profile</button></div><div className="marketPanel"><PanelTitle title="Business details" /><div className="detailRows"><span><Mail /> hello@northsidefabrication.com</span><span><Phone /> +61 400 123 456</span><span><MapPin /> North Sydney NSW</span></div><hr /><PanelTitle title="Availability" /><p>Mon–Sat · 8:00 AM–6:00 PM</p><button className="secondaryAction">Manage availability</button></div></div></main>
}

function AdminView({ page, go }: { page: string; go: (page: string) => void }) {
  if (page === 'requests') return <AdminRequests go={go} />
  if (page === 'providers') return <AdminProviders />
  if (page === 'services') return <AdminServices />
  if (page === 'customers') return <AdminCustomers />
  if (page === 'settings') return <AdminSettings />
  return <AdminDashboard go={go} />
}

function AdminLayout({ children, active, go }: { children: ReactNode; active: string; go: (page: string) => void }) {
  const items = ['dashboard', 'requests', 'providers', 'services', 'customers', 'settings']
  return <div className="adminShell"><aside className="adminSidebar"><div className="sideBrand"><span className="marketLogo">AW</span><strong>Operations</strong></div>{items.map((item) => <button className={active === item ? 'sideActive' : ''} key={item} onClick={() => go(item)}>{item === 'dashboard' ? <LayoutDashboard /> : item === 'requests' ? <FileText /> : item === 'providers' ? <Users /> : item === 'services' ? <Boxes /> : item === 'customers' ? <Users /> : <Settings />}{label(item)}</button>)}</aside><div className="adminBody">{children}</div></div>
}

function AdminDashboard({ go }: { go: (page: string) => void }) {
  return <AdminLayout active="dashboard" go={go}><div className="pageHeading"><div><span className="eyebrow">ADMIN</span><h1>ANYwork operations</h1><p>Monitor marketplace activity and the service lifecycle.</p></div><button className="primaryAction" onClick={() => go('requests')}><FileText size={16} /> Review requests</button></div><div className="statGrid"><Stat icon={FileText} label="Open requests" value="24" /><Stat icon={Users} label="Providers" value="86" /><Stat icon={CircleDollarSign} label="GMV this month" value="$94k" /><Stat icon={CheckCircle2} label="Completed jobs" value="312" /></div><div className="marketTwoColumn"><div className="marketPanel"><PanelTitle title="Request queue" />{requests.map((request) => <div className="adminRequestRow" key={request.id}><span className="requestId">{request.id}</span><div><strong>{request.customer}</strong><span>{request.service} · {request.provider}</span></div><StatusBadge status={request.status} /><strong>{request.total || request.budget}</strong></div>)}</div><div className="marketPanel"><PanelTitle title="Platform health" /><div className="healthList"><span><CheckCircle2 /> 86 verified providers</span><span><CheckCircle2 /> 24 active requests</span><span><CheckCircle2 /> 98% response rate</span><span><Clock3 /> 3 disputes need review</span></div></div></div></AdminLayout>
}

function AdminRequests({ go }: { go: (page: string) => void }) {
  return <AdminLayout active="requests" go={go}><div className="pageHeading"><div><span className="eyebrow">OPERATIONS</span><h1>Service requests</h1><p>Track requests across the marketplace lifecycle.</p></div><div className="marketSearch"><Search size={17} /><input placeholder="Search requests..." /></div></div><div className="marketPanel requestTable">{requests.map((request) => <div className="providerTableRow" key={request.id}><span className="requestId">{request.id}</span><div><strong>{request.service}</strong><span>{request.customer} · {request.provider}</span></div><span>{request.location}</span><StatusBadge status={request.status} /><strong>{request.total || request.budget}</strong><ChevronRight size={16} /></div>)}</div></AdminLayout>
}

function AdminProviders() {
  return <AdminLayout active="providers" go={() => {}}><div className="pageHeading"><div><span className="eyebrow">DIRECTORY</span><h1>Providers</h1><p>Manage provider profiles and verification.</p></div><button className="primaryAction"><Plus size={16} /> Invite provider</button></div><div className="providerGrid">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div></AdminLayout>
}

function AdminServices() {
  return <AdminLayout active="services" go={() => {}}><div className="pageHeading"><div><span className="eyebrow">CATALOG</span><h1>Services</h1><p>Control the marketplace service catalog.</p></div><button className="primaryAction"><Plus size={16} /> Add service</button></div><div className="marketServiceGrid">{services.map((service) => <ServiceCard key={service.id} service={service} onClick={() => undefined} />)}</div></AdminLayout>
}

function AdminCustomers() {
  return <AdminLayout active="customers" go={() => {}}><div className="pageHeading"><div><span className="eyebrow">CUSTOMERS</span><h1>Customers</h1><p>Manage customer accounts and activity.</p></div><button className="primaryAction"><Plus size={16} /> Add customer</button></div><div className="customerGrid">{['John Doe', 'ABC Business', 'Retail Co.', 'Office Group'].map((name) => <div className="customerCard" key={name}><div className="smallAvatar">{name.slice(0, 2).toUpperCase()}</div><div><strong>{name}</strong><span>Active customer · recent request</span></div><ChevronRight /></div>)}</div></AdminLayout>
}

function AdminSettings() {
  return <AdminLayout active="settings" go={() => {}}><span className="eyebrow">PLATFORM</span><h1>Settings</h1><div className="marketTwoColumn"><div className="marketPanel"><PanelTitle title="Marketplace settings" /><label className="toggleLine"><span>Require provider verification</span><input type="checkbox" defaultChecked /></label><label className="toggleLine"><span>Allow customer reviews</span><input type="checkbox" defaultChecked /></label><label className="toggleLine"><span>Enable provider messaging</span><input type="checkbox" defaultChecked /></label></div><div className="marketPanel"><PanelTitle title="Request lifecycle" /><p>Requested → Quoted → Scheduled → In Progress → Completed</p><button className="secondaryAction">Manage statuses</button></div></div></AdminLayout>
}

function ServiceCard({ service, onClick }: { service: Service; onClick: () => void }) {
  const Icon = service.icon
  return <button className="marketServiceCard" onClick={onClick}><div className="serviceIcon"><Icon size={22} /></div><h3>{service.title}</h3><p>{service.label}</p><span>{service.items.slice(0, 2).join(' · ')}</span><ArrowRight className="cardArrow" size={17} /></button>
}

function ProviderCard({ provider, compact = false }: { provider: Provider; compact?: boolean }) {
  return <div className={'providerCard' + (compact ? ' compact' : '')}><div className="largeAvatar">{provider.initials}</div><div className="providerBody"><div className="providerNameRow"><strong>{provider.name}</strong><span className="verified"><CheckCircle2 size={13} /> Verified</span></div><span className="providerLocation">{provider.location}</span><p>{provider.summary}</p><div className="providerMeta"><span><Star size={13} /> {provider.rating}</span><span>{provider.jobs} jobs</span><span>{provider.services.join(' · ')}</span></div></div>{!compact && <ChevronRight size={17} />}</div>
}

function SectionTitle({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="sectionTitle"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textAction" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="marketStep"><b>{number}</b><div><strong>{title}</strong><p>{text}</p></div></div>
}

function PanelTitle({ title }: { title: string }) {
  return <div className="panelTitle"><h2>{title}</h2></div>
}

function ScheduleRow({ time, title, details }: { time: string; title: string; details: string }) {
  return <div className="scheduleItem"><time>{time}</time><div><strong>{title}</strong><span>{details}</span></div><StatusBadge status="Scheduled" /></div>
}

function Stat({ icon: Icon, label, value }: { icon: Icon; label: string; value: string }) {
  return <div className="statCard"><Icon size={18} /><span>{label}</span><strong>{value}</strong></div>
}

function Messages({ title }: { title: string }) {
  return <main className="marketSection marketPage"><span className="eyebrow">MESSAGES</span><h1>{title}</h1><div className="chatPanel"><div className="chatHead"><span><MessageCircle /> Job #AW-1027</span><StatusBadge status="In Progress" /></div><div className="chatMessage incoming">Hi! Your provider has sent an update on the job.</div><div className="chatMessage outgoing">Thanks. Can we move the appointment to 10 AM?</div><div className="chatMessage incoming">Yes, the provider has confirmed the change.</div><div className="chatComposer"><input placeholder="Type a message..." /><button className="primaryAction small">Send</button></div></div></main>
}

function Timeline({ status }: { status: Status }) {
  const done = (target: Status) => ['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].indexOf(status) >= ['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].indexOf(target)
  return <div className="timeline">{[['Requested', 'Request submitted'], ['Quoted', 'Quote received'], ['Scheduled', 'Scheduled'], ['In Progress', 'Work in progress'], ['Completed', 'Completed']].map(([key, title]) => <div className={done(key as Status) ? 'timelineItem done' : 'timelineItem'} key={key}><div>{done(key as Status) ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}</div><section><strong>{title}</strong><p>{key === 'Quoted' ? 'Provider response and pricing.' : key === 'Scheduled' ? 'Appointment details are confirmed.' : 'Status and updates stay attached to the request.'}</p></section></div>)}</div>
}

function StatusBadge({ status }: { status: Status }) {
  const className = status === 'Scheduled' || status === 'Completed' ? 'green' : status === 'Quoted' ? 'amber' : status === 'In Progress' ? 'blue' : 'gray'
  return <span className={'statusBadge ' + className}>{status}</span>
}

function progress(status: Status) {
  return { Requested: 15, Quoted: 35, Scheduled: 55, 'In Progress': 78, Completed: 100 }[status]
}

function QuoteWizard({ serviceId, close }: { serviceId: string; close: () => void }) {
  const [step, setStep] = useState(serviceId ? 2 : 1)
  const [service, setService] = useState(serviceId)
  const [sent, setSent] = useState(false)

  if (sent) return <div className="marketOverlay"><div className="marketModal successModal"><button className="marketIconButton close" onClick={close}><X /></button><CheckCircle2 size={56} /><h2>Request submitted.</h2><p>Your request is now available in the ANYwork marketplace. Providers can respond with availability and a quote.</p><strong className="requestToken">REQUEST #AW-1028</strong><button className="primaryAction" onClick={close}>Back to ANYwork</button></div></div>

  return <div className="marketOverlay"><div className="marketModal"><button className="marketIconButton close" onClick={close}><X /></button><span className="eyebrow">REQUEST A SERVICE</span><h2>Tell us about the job.</h2><div className="wizardProgress"><span className={step >= 1 ? 'active' : ''}>01 Service</span><span className={step >= 2 ? 'active' : ''}>02 Details</span><span className={step >= 3 ? 'active' : ''}>03 Contact</span></div>
    {step === 1 && <><h3>What do you need?</h3><div className="optionGrid">{services.map((item) => <button key={item.id} className={'optionCard' + (service === item.id ? ' selected' : '')} onClick={() => setService(item.id)}><item.icon size={22} /><strong>{item.title}</strong><small>{item.label}</small></button>)}</div><div className="wizardActions"><button className="primaryAction" disabled={!service} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button></div></>}
    {step === 2 && <><h3>Describe the job</h3><textarea placeholder="What needs to be done? Include measurements, access notes or special requirements." /><div className="formGrid"><input placeholder="Preferred date" /><input placeholder="Job location" /><input placeholder="Budget (optional)" /><input placeholder="Access notes" /></div><div className="uploadBox"><Plus size={24} /><strong>Add reference photos</strong><span>Optional photos help providers quote accurately.</span></div><div className="wizardActions"><button className="secondaryAction" onClick={() => setStep(1)}>Back</button><button className="primaryAction" onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button></div></>}
    {step === 3 && <><h3>How should providers contact you?</h3><div className="formGrid"><input placeholder="Full name" /><input placeholder="Phone number" /><input placeholder="Email address" /><input placeholder="Preferred contact method" /></div><div className="requestReview"><span>Service <strong>{services.find((item) => item.id === service)?.title || 'Custom'}</strong></span><span>Providers will respond with availability and pricing.</span></div><div className="wizardActions"><button className="secondaryAction" onClick={() => setStep(2)}>Back</button><button className="primaryAction" onClick={() => setSent(true)}>Submit Request <ArrowRight size={16} /></button></div></>}
  </div></div>
}

export default App
