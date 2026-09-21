import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  Flag,
  Plus,
  Search,
  ShieldCheck,
  Store,
  UserCheck,
  X,
  Smartphone,
  Globe,
  Sparkles,
} from 'lucide-react'
import { requests, providers, services } from '../data/mockData'
import type { Provider, ServiceRequest } from '../types/marketplace'
import { StatusBadge } from '../components/StatusBadge'
import { createAdminService, deleteAdminService, listAdminServices, updateAdminService, type DbService } from '../lib/anyworkApi'

const customers = [
  { id: 'CUS-1001', name: 'John Doe', email: 'john@example.com', jobs: 2, spend: 2770, status: 'Active' },
  { id: 'CUS-1002', name: 'ABC Business', email: 'hello@abc-business.com', jobs: 7, spend: 12400, status: 'Active' },
  { id: 'CUS-1003', name: 'Retail Co.', email: 'ops@retailco.com', jobs: 11, spend: 32800, status: 'Active' },
  { id: 'CUS-1004', name: 'Office Group', email: 'team@officegroup.com', jobs: 5, spend: 8950, status: 'Review' },
]

export function AdminDashboard({ section, onNavigate }: { section: string; onNavigate: (path: string) => void }) {
  switch (section) {
    case 'requests': return <AdminRequests />
    case 'providers': return <AdminProviders />
    case 'services': return <AdminServices />
    case 'customers': return <AdminCustomers />
    case 'settings': return <AdminSettings />
    default: return <AdminHome onNavigate={onNavigate} />
  }
}

function AdminHome({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const selected = requests.find((item) => item.id === selectedRequest)
  const metrics = [
    { label: 'Open requests', value: '24', note: '8 awaiting quotes', icon: FileText },
    { label: 'Verified providers', value: '71', note: '86 total providers', icon: ShieldCheck },
    { label: 'GMV this month', value: '$94k', note: '+12% vs last month', icon: CircleDollarSign },
    { label: 'Completed jobs', value: '312', note: '98% on-time completion', icon: CheckCircle2 },
  ]

  return (
    <div className="workspaceDashboard adminModern">
      <div className="workspaceWelcome adminHero">
        <div><span className="eyebrow">OPERATIONS</span><h1>Run ANYwork with confidence.</h1><p>Keep requests moving, providers healthy and customer issues visible before they become problems.</p></div>
        <div className="adminHeroActions">
          <button className="buttonSecondary" onClick={() => onNavigate('/admin/services')}><Plus size={16} /> Add service</button>
          <button className="buttonPrimary" onClick={() => onNavigate('/admin/requests')}>Review queue <ArrowRight size={16} /></button>
        </div>
      </div>

      <div className="metricRow adminMetricRow">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <div className="metricCard adminMetricCard" key={label}><div className="metricIcon"><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
        ))}
      </div>

      <div className="adminOverviewGrid">
        <section className="dashboardCard adminQueueCard">
          <AdminCardHeader eyebrow="NEEDS ATTENTION" title="Operations queue" action="View all" onClick={() => onNavigate('/admin/requests')} />
          <div className="adminQueueList">
            {requests.map((request) => {
              const provider = request.providerId ? providers.find((item) => item.id === request.providerId) : null
              return <button className="adminQueueRowModern" key={request.id} onClick={() => setSelectedRequest(request.id)}>
                <div className="adminQueueIdentity"><span className="requestId">{request.id}</span><strong>{request.title}</strong><small>{request.customer} · {provider?.name || 'No provider assigned'} · {request.location}</small></div>
                <div className="adminQueueMeta"><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong></div><ChevronRight size={17} />
              </button>
            })}
          </div>
        </section>

        <section className="dashboardCard adminHealthCard">
          <AdminCardHeader eyebrow="PLATFORM HEALTH" title="Marketplace signals" />
          <div className="signalHero"><div className="signalScore">98<span>%</span></div><div><strong>Healthy operations</strong><p>Core marketplace activity is moving inside expected ranges.</p></div></div>
          <div className="healthMetricList">
            <HealthMetric icon={<ShieldCheck />} label="Verified providers" value="71 / 86" progress={82} />
            <HealthMetric icon={<Activity />} label="Provider response" value="98%" progress={98} />
            <HealthMetric icon={<Clock3 />} label="On-time completion" value="98%" progress={98} />
            <HealthMetric icon={<Flag />} label="Disputes open" value="3" progress={18} tone="warning" />
          </div>
        </section>
      </div>

      <section className="dashboardCard adminFlowCard">
        <AdminCardHeader eyebrow="REQUEST LIFECYCLE" title="Marketplace flow" action="Open requests" onClick={() => onNavigate('/admin/requests')} />
        <div className="adminFlow">
          {['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].map((status, index) => {
            const count = requests.filter((request) => request.status === status).length
            return <div className="adminFlowStep" key={status}><div className="adminFlowDot">{index + 1}</div><div><span>{status}</span><strong>{count}</strong></div>{index < 4 && <ChevronRight className="adminFlowArrow" size={16} />}</div>
          })}
        </div>
      </section>

      <section className="adminBottomGrid">
        <section className="dashboardCard">
          <AdminCardHeader eyebrow="PROVIDERS" title="Top marketplace providers" action="Directory" onClick={() => onNavigate('/admin/providers')} />
          <div className="adminMiniList">{providers.slice(0, 4).map((provider) => <div className="adminMiniRow" key={provider.id}><div className="providerAvatarLarge">{provider.initials}</div><div><strong>{provider.name}</strong><small>{provider.location} · {provider.completedJobs} jobs</small></div><span className="adminRating">{provider.rating} ★</span></div>)}</div>
        </section>
        <section className="dashboardCard">
          <AdminCardHeader eyebrow="CUSTOMERS" title="Recent customer activity" action="Customers" onClick={() => onNavigate('/admin/customers')} />
          <div className="adminMiniList">{customers.map((customer) => <div className="adminMiniRow" key={customer.id}><div className="smallAvatar">{customer.name.slice(0, 2).toUpperCase()}</div><div><strong>{customer.name}</strong><small>{customer.jobs} jobs · {'$' + customer.spend.toLocaleString()} spent</small></div><span className={customer.status === 'Review' ? 'adminStatusReview' : 'adminStatusActive'}>{customer.status}</span></div>)}</div>
        </section>
      </section>

      {selected && <RequestDrawer request={selected} onClose={() => setSelectedRequest(null)} />}
    </div>
  )
}

function AdminRequests() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = useMemo(() => requests.filter((request) => {
    const haystack = [request.id, request.title, request.customer, request.location].join(' ').toLowerCase()
    return haystack.includes(query.toLowerCase()) && (status === 'All' || request.status === status)
  }), [query, status])
  const selected = requests.find((item) => item.id === selectedId)

  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="OPERATIONS" title="Service requests" description="Review every request, assignment and quote state from one control surface." action={<button className="buttonPrimary"><Plus size={16} /> New request</button>} />
    <div className="adminToolbar">
      <div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests, customers or locations..." /></div>
      <select className="adminSelect" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Requested</option><option>Quoted</option><option>Scheduled</option><option>In Progress</option><option>Completed</option></select>
      <button className="buttonSecondary"><Filter size={15} /> Filter</button>
    </div>
    <div className="adminSummaryStrip"><span>{filtered.length} requests</span><span>{filtered.filter((item) => item.status === 'Requested').length} need provider action</span><span>{filtered.filter((item) => item.status === 'In Progress').length} currently active</span></div>
    <div className="tableCard adminTableCard">
      <div className="adminTableHead"><span>REQUEST</span><span>CUSTOMER</span><span>DATE</span><span>STATUS</span><span>VALUE</span><span /></div>
      {filtered.map((request) => <button className="adminTableRow" key={request.id} onClick={() => setSelectedId(request.id)}><div><span className="requestId">{request.id}</span><strong>{request.title}</strong><small>{request.location}</small></div><span>{request.customer}</span><span>{request.date}</span><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong><ChevronRight size={17} /></button>)}
      {!filtered.length && <div className="emptyModern adminEmpty"><Search size={20} /><strong>No matching requests</strong><p>Try a different search or status filter.</p></div>}
    </div>
    {selected && <RequestDrawer request={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

function AdminProviders() {
  const [query, setQuery] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = providers.filter((provider) => [provider.name, provider.location, provider.summary].join(' ').toLowerCase().includes(query.toLowerCase()) && (!verifiedOnly || provider.verified))
  const selected = providers.find((item) => item.id === selectedId)

  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="DIRECTORY" title="Providers" description="Manage visibility, trust signals and marketplace performance." action={<button className="buttonPrimary"><Plus size={16} /> Add provider</button>} />
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers or locations..." /></div><button className={verifiedOnly ? 'buttonPrimary' : 'buttonSecondary'} onClick={() => setVerifiedOnly((value) => !value)}><ShieldCheck size={15} /> {verifiedOnly ? 'Verified only' : 'All providers'}</button></div>
    <div className="providerAdminGrid adminProviderGridModern">{filtered.map((provider) => <button className="providerAdminCard providerAdminCardModern" key={provider.id} onClick={() => setSelectedId(provider.id)}><div className="providerAvatarLarge">{provider.initials}</div><div className="providerAdminMain"><div className="providerAdminTitle"><strong>{provider.name}</strong>{provider.verified && <ShieldCheck size={14} />}</div><span>{provider.location}</span><small>{provider.completedJobs} jobs · {provider.reviewCount} reviews · {provider.responseRate} response</small><p>{provider.summary}</p></div><div className="providerAdminScore"><strong>{provider.rating}</strong><span>★</span></div><ChevronRight size={16} /></button>)}</div>
    {selected && <ProviderDrawer provider={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

export function AdminServices() {
  type CatalogService = DbService & { category: string; subcategory: string }
  const [catalog, setCatalog] = useState<CatalogService[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [activeService, setActiveService] = useState<Record<string, boolean>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [form, setForm] = useState({
    category: 'Software',
    subcategory: 'General',
    label: '',
    description: '',
    items: '',
    tags: [] as string[],
    startingPrice: '',
  })

  useEffect(() => {
    if (!showForm) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [showForm])

  useEffect(() => {
    if (!showForm) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  useEffect(() => {
    void listAdminServices()
      .then((rows) => {
        setCatalog(rows)
        setActiveService(Object.fromEntries(rows.map((service) => [service.id, service.enabled])))
      })
      .catch(() => {
        const fallback = services.map((service) => ({
          ...service,
          starting_price: null,
          starting_price_label: service.startingPrice,
          enabled: true,
          category: service.title,
          subcategory: service.label,
        })) as CatalogService[]
        setCatalog(fallback)
        setActiveService(Object.fromEntries(fallback.map((service) => [service.id, true])))
      })
  }, [])

  const categories = Array.from(new Set(catalog.map((service) => service.category).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const filtered = catalog.filter((service) => {
    const matchesCategory = category === 'All' || service.category === category
    const haystack = [service.category, service.subcategory, service.title, service.label, service.description, ...(service.tags || [])].join(' ').toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  })
  const activeCount = Object.values(activeService).filter(Boolean).length

  const submitService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const items = form.items.split(',').map((item) => item.trim()).filter(Boolean)
      const startingPrice = form.startingPrice.trim() ? Number(form.startingPrice) : null
      if (startingPrice !== null && Number.isNaN(startingPrice)) throw new Error('Starting price must be a valid number.')

      if (editingId) {
        const updated = await updateAdminService(editingId, {
          category: form.category.trim(),
          subcategory: form.subcategory.trim(),
          title: form.category.trim(),
          label: form.label.trim(),
          description: form.description.trim(),
          items,
          tags: form.tags,
          startingPrice,
          startingPriceLabel: startingPrice !== null ? '$' + startingPrice.toLocaleString() : 'Quote',
        })
        setCatalog((current) => current.map((item) => item.id === editingId ? updated : item))
      } else {
        const created = await createAdminService({
          category: form.category.trim(),
          subcategory: form.subcategory.trim(),
          title: form.category.trim(),
          label: form.label.trim(),
          description: form.description.trim(),
          icon: 'Store',
          items,
          tags: form.tags,
          startingPrice,
          startingPriceLabel: startingPrice !== null ? '
        setCatalog((current) => [created, ...current])
        setActiveService((current) => ({ ...current, [created.id]: true }))
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ category: categories[0] || 'General', subcategory: 'General', label: '', description: '', items: '', tags: [], startingPrice: '' })
      setTagDraft('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    try {
      await deleteAdminService(id)
      setCatalog((current) => current.filter((item) => item.id !== id))
      setActiveService((current) => { const next = { ...current }; delete next[id]; return next })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete service.')
    }
  }

  const toggleService = async (service: CatalogService) => {
    const next = !activeService[service.id]
    setActiveService((current) => ({ ...current, [service.id]: next }))
    try {
      await updateAdminService(service.id, { enabled: next })
      setCatalog((current) => current.map((item) => item.id === service.id ? { ...item, enabled: next } : item))
    } catch {
      setActiveService((current) => ({ ...current, [service.id]: !next }))
    }
  }

  return <div className="workspaceDashboard adminModern">
    <PageTitle
      kicker="CATALOG"
      title="Services"
      description="Organize the marketplace by category and subcategory so customers can find the exact service they need."
      action={<button className="buttonPrimary" onClick={() => setShowForm(true)}><Plus size={16} /> Add service</button>}
    />

    <div className="adminServiceCategoryBar">
      <div className="adminCategoryHeading"><Store size={16} /><strong>Service categories</strong><span>{categories.length} categories · {catalog.length} services</span></div>
      <div className="adminCategoryTabs">
        <button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All</button>
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
    </div>

    <div className="adminToolbar">
      <div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category, subcategory or service..." /></div>
      <div className="adminSummaryPill"><Store size={15} /> {activeCount} active</div>
    </div>

    <div className="adminServiceGridModern">
      {filtered.map((service) => {
        const active = activeService[service.id] ?? service.enabled
        return <article className={active ? 'adminServiceCard adminServiceCardModern' : 'adminServiceCard adminServiceCardModern isDisabled'} key={service.id}>
          <div className="adminServiceHeader"><div className="serviceCardIcon"><Store size={19} /></div><button className={active ? 'adminToggle active' : 'adminToggle'} onClick={() => void toggleService(service)} aria-label={'Toggle ' + service.label}><span /></button></div>
          <div className="adminServiceBreadcrumb"><span>{service.category}</span><ChevronRight size={11} /><strong>{service.subcategory}</strong></div>
          <h3>{service.label}</h3>
          <p>{service.description}</p>
          <div className="adminServiceTags">{(service.tags?.length ? service.tags : service.items).map((item) => <span key={item}>{item}</span>)}</div>
          <div className="adminServiceFooter"><strong>{service.starting_price_label || 'Quote'}</strong><div className="adminServiceFooterActions"><button className="buttonSecondary" onClick={() => { setEditingId(service.id); setForm({ category: service.category, subcategory: service.subcategory, label: service.label, description: service.description, items: service.items.join(', '), tags: service.tags || [], startingPrice: service.starting_price?.toString() || '' }); setTagDraft(''); setShowForm(true) }}>Edit</button><button className="buttonSecondary" onClick={() => { if (window.confirm('Delete this service?')) void deleteService(service.id) }}>Delete</button></div></div>
        </article>
      })}
    </div>

    {!filtered.length && <div className="emptyModern adminEmpty"><Search size={20} /><strong>No services found</strong><p>Try another category or search term.</p></div>}

    {showForm && <div className="adminDrawerOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
      <form className="adminServiceForm" onSubmit={submitService}>
        <div className="drawerHeader"><div><span className="eyebrow">SERVICE CATALOG</span><h2>{editingId ? 'Edit service' : 'Add service'}</h2></div><button type="button" className="roundIcon" onClick={() => setShowForm(false)}><X size={17} /></button></div>
        {error && <div className="formError">{error}</div>}
        <label><span>Category</span><select value={form.category} onChange={(event) => {
          const nextCategory = event.target.value
          const nextSubcategories = Array.from(new Set(catalog.filter((item) => item.category === nextCategory).map((item) => item.subcategory).filter(Boolean)))
          setForm((current) => ({ ...current, category: nextCategory, subcategory: nextSubcategories[0] || 'General' }))
        }} required>
          {(categories.length ? categories : ['General']).map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label><span>Subcategory</span><select value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} required>
          {Array.from(new Set(catalog.filter((item) => item.category === form.category).map((item) => item.subcategory).filter(Boolean))).concat(
            Array.from(new Set(catalog.filter((item) => item.category === form.category).map((item) => item.subcategory).filter(Boolean))).length ? [] : ['General']
          ).map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label><span>Service name</span><input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Mobile App Development" required /></label>
        <label><span>Description</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what this service includes..." required /></label>
        <label><span>What's included</span><input value={form.items} onChange={(event) => setForm((current) => ({ ...current, items: event.target.value }))} placeholder="iOS apps, Android apps, API integration" /></label>
        <label className="adminTagField">
          <span>Tags</span>
          <div className="adminTagInputRow">
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault()
                  const next = tagDraft.trim().replace(/,$/, '')
                  if (!next || form.tags.some(tag => tag.toLowerCase() === next.toLowerCase())) return
                  setForm(current => ({ ...current, tags: [...current.tags, next] }))
                  setTagDraft('')
                }
              }}
              placeholder="e.g. Mobile, API, React"
            />
            <button type="button" className="buttonSecondary adminAddTagButton" onClick={() => {
              const next = tagDraft.trim()
              if (!next || form.tags.some(tag => tag.toLowerCase() === next.toLowerCase())) return
              setForm(current => ({ ...current, tags: [...current.tags, next] }))
              setTagDraft('')
            }}>Add tag</button>
          </div>
          {!!form.tags.length && (
            <div className="adminFormTags">
              {form.tags.map(tag => (
                <button type="button" className="adminFormTag" key={tag} onClick={() => setForm(current => ({ ...current, tags: current.tags.filter(item => item !== tag) }))}>
                  {tag}<X size={11} />
                </button>
              ))}
            </div>
          )}
          <small>Use short tags to help customers scan and filter services quickly.</small>
        </label>

        <label><span>Starting price</span><input type="number" min="0" value={form.startingPrice} onChange={(event) => setForm((current) => ({ ...current, startingPrice: event.target.value }))} placeholder="Leave empty for Quote" /></label>
        <div className="drawerActions"><button type="button" className="buttonSecondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="buttonPrimary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update service' : 'Save service'}</button></div>
      </form>
    </div>}
  </div>
}

function AdminCustomers() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = customers.filter((customer) => [customer.name, customer.email, customer.id].join(' ').toLowerCase().includes(query.toLowerCase()))
  const selected = customers.find((item) => item.id === selectedId)
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="CUSTOMERS" title="Customers" description="Understand account activity, service history and customer health." action={<button className="buttonPrimary"><UserCheck size={16} /> Invite customer</button>} />
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." /></div></div>
    <div className="adminCustomerGrid">{filtered.map((customer) => <button className="adminCustomerCard" key={customer.id} onClick={() => setSelectedId(customer.id)}><div className="smallAvatar adminCustomerAvatar">{customer.name.slice(0, 2).toUpperCase()}</div><div className="adminCustomerMain"><span className="requestId">{customer.id}</span><strong>{customer.name}</strong><small>{customer.email}</small></div><div className="adminCustomerStats"><span><strong>{customer.jobs}</strong> jobs</span><span><strong>{'$' + customer.spend.toLocaleString()}</strong> spend</span></div><span className={customer.status === 'Review' ? 'adminStatusReview' : 'adminStatusActive'}>{customer.status}</span><ChevronRight size={16} /></button>)}</div>
    {selected && <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

function AdminSettings() {
  const [settings, setSettings] = useState({ providerVerification: true, reviews: true, messaging: true, quoteComparison: true, maintenanceMode: false })
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="PLATFORM" title="Settings" description="Control marketplace behavior, access and the request lifecycle." />
    <div className="settingsGridModern">
      <section className="dashboardCard settingsCardModern">
        <AdminCardHeader eyebrow="MARKETPLACE" title="Customer experience" />
        <SettingRow label="Require provider verification" description="Only verified providers receive the trusted badge." checked={settings.providerVerification} onChange={() => setSettings((current) => ({ ...current, providerVerification: !current.providerVerification }))} />
        <SettingRow label="Allow customer reviews" description="Customers can review completed jobs." checked={settings.reviews} onChange={() => setSettings((current) => ({ ...current, reviews: !current.reviews }))} />
        <SettingRow label="Provider messaging" description="Keep job conversations attached to the request." checked={settings.messaging} onChange={() => setSettings((current) => ({ ...current, messaging: !current.messaging }))} />
        <SettingRow label="Quote comparison" description="Customers can compare multiple quotes." checked={settings.quoteComparison} onChange={() => setSettings((current) => ({ ...current, quoteComparison: !current.quoteComparison }))} />
      </section>
      <section className="dashboardCard settingsCardModern"><AdminCardHeader eyebrow="LIFECYCLE" title="Request states" /><div className="lifecycleModern">{['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong><small>{lifecycleCopy[item]}</small></div>)}</div></section>
      <section className="dashboardCard settingsCardDanger"><div><span className="eyebrow">MAINTENANCE</span><h2>Maintenance mode</h2><p>Pause new customer requests while existing jobs remain accessible.</p></div><button className={settings.maintenanceMode ? 'adminToggle active' : 'adminToggle'} onClick={() => setSettings((current) => ({ ...current, maintenanceMode: !current.maintenanceMode }))}><span /></button></section>
    </div>
  </div>
}

const lifecycleCopy: Record<string, string> = {
  Requested: 'Customer submitted a service request.',
  Quoted: 'Providers have responded with pricing and availability.',
  Scheduled: 'A quote was accepted and work is booked.',
  'In Progress': 'The selected provider is actively working.',
  Completed: 'The job is finished and ready for review.',
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <button className="settingRowModern" onClick={onChange}><span><strong>{label}</strong><small>{description}</small></span><span className={checked ? 'adminToggle active' : 'adminToggle'}><span /></span></button>
}

function RequestDrawer({ request, onClose }: { request: ServiceRequest; onClose: () => void }) {
  const provider = request.providerId ? providers.find((item) => item.id === request.providerId) : null
  return <Drawer title={request.title} eyebrow={request.id} onClose={onClose}><div className="drawerStatusRow"><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong></div><div className="drawerGrid"><Info label="Customer" value={request.customer} /><Info label="Location" value={request.location} /><Info label="Date" value={request.date} /><Info label="Provider" value={provider?.name || 'Unassigned'} /></div><div className="drawerBlock"><span className="eyebrow">DESCRIPTION</span><p>{request.description}</p></div><div className="drawerBlock"><span className="eyebrow">QUOTES</span><p>{request.quotes.length ? request.quotes.length + ' provider quotes attached to this request.' : 'No quotes have been submitted yet.'}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open request <ArrowRight size={15} /></button></div></Drawer>
}

function ProviderDrawer({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  return <Drawer title={provider.name} eyebrow="PROVIDER PROFILE" onClose={onClose}><div className="providerDrawerHero"><div className="providerAvatarLarge">{provider.initials}</div><div><strong>{provider.rating} ★</strong><span>{provider.reviewCount} reviews · {provider.completedJobs} completed jobs</span></div></div><div className="drawerGrid"><Info label="Location" value={provider.location} /><Info label="Response" value={provider.responseTime} /><Info label="Response rate" value={provider.responseRate} /><Info label="Status" value={provider.verified ? 'Verified' : 'Pending'} /></div><div className="drawerBlock"><span className="eyebrow">ABOUT</span><p>{provider.summary}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open provider</button></div></Drawer>
}

function CustomerDrawer({ customer, onClose }: { customer: typeof customers[number]; onClose: () => void }) {
  return <Drawer title={customer.name} eyebrow={customer.id} onClose={onClose}><div className="drawerGrid"><Info label="Email" value={customer.email} /><Info label="Status" value={customer.status} /><Info label="Jobs" value={String(customer.jobs)} /><Info label="Total spend" value={'$' + customer.spend.toLocaleString()} /></div><div className="drawerBlock"><span className="eyebrow">ACCOUNT</span><p>This account is active in the marketplace. Request and job history can be attached here as the marketplace data layer grows.</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open customer</button></div></Drawer>
}

function Drawer({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="adminDrawerOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="adminDrawer"><button className="modalClose" onClick={onClose} aria-label="Close"><X size={16} /></button><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</aside></div>
}

function HealthMetric({ icon, label, value, progress, tone = 'success' }: { icon: ReactNode; label: string; value: string; progress: number; tone?: 'success' | 'warning' }) {
  return <div className="healthMetric"><div className="healthMetricTop"><span>{icon}{label}</span><strong>{value}</strong></div><div className="healthMetricBar"><i className={tone} style={{ width: progress + '%' }} /></div></div>
}

function AdminCardHeader({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>
}

function PageTitle({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) {
  return <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="drawerInfo"><span>{label}</span><strong>{value}</strong></div>
}
 + startingPrice.toLocaleString() : 'Quote',
        })
        setCatalog((current) => [created, ...current])
        setActiveService((current) => ({ ...current, [created.id]: true }))
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ category: categories[0] || 'General', subcategory: 'General', label: '', description: '', items: '', startingPrice: '' })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    try {
      await deleteAdminService(id)
      setCatalog((current) => current.filter((item) => item.id !== id))
      setActiveService((current) => { const next = { ...current }; delete next[id]; return next })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete service.')
    }
  }

  const toggleService = async (service: CatalogService) => {
    const next = !activeService[service.id]
    setActiveService((current) => ({ ...current, [service.id]: next }))
    try {
      await updateAdminService(service.id, { enabled: next })
      setCatalog((current) => current.map((item) => item.id === service.id ? { ...item, enabled: next } : item))
    } catch {
      setActiveService((current) => ({ ...current, [service.id]: !next }))
    }
  }

  return <div className="workspaceDashboard adminModern">
    <PageTitle
      kicker="CATALOG"
      title="Services"
      description="Organize the marketplace by category and subcategory so customers can find the exact service they need."
      action={<button className="buttonPrimary" onClick={() => setShowForm(true)}><Plus size={16} /> Add service</button>}
    />

    <div className="adminServiceCategoryBar">
      <div className="adminCategoryHeading"><Store size={16} /><strong>Service categories</strong><span>{categories.length} categories · {catalog.length} services</span></div>
      <div className="adminCategoryTabs">
        <button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All</button>
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
    </div>

    <div className="adminToolbar">
      <div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category, subcategory or service..." /></div>
      <div className="adminSummaryPill"><Store size={15} /> {activeCount} active</div>
    </div>

    <div className="adminServiceGridModern">
      {filtered.map((service) => {
        const active = activeService[service.id] ?? service.enabled
        return <article className={active ? 'adminServiceCard adminServiceCardModern' : 'adminServiceCard adminServiceCardModern isDisabled'} key={service.id}>
          <div className="adminServiceHeader"><div className="serviceCardIcon"><Store size={19} /></div><button className={active ? 'adminToggle active' : 'adminToggle'} onClick={() => void toggleService(service)} aria-label={'Toggle ' + service.label}><span /></button></div>
          <div className="adminServiceBreadcrumb"><span>{service.category}</span><ChevronRight size={11} /><strong>{service.subcategory}</strong></div>
          <h3>{service.label}</h3>
          <p>{service.description}</p>
          <div className="adminServiceTags">{service.items.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="adminServiceFooter"><strong>{service.starting_price_label || 'Quote'}</strong><div className="adminServiceFooterActions"><button className="buttonSecondary" onClick={() => { setEditingId(service.id); setForm({ category: service.category, subcategory: service.subcategory, label: service.label, description: service.description, items: service.items.join(', '), startingPrice: service.starting_price?.toString() || '' }); setShowForm(true) }}>Edit</button><button className="buttonSecondary" onClick={() => { if (window.confirm('Delete this service?')) void deleteService(service.id) }}>Delete</button></div></div>
        </article>
      })}
    </div>

    {!filtered.length && <div className="emptyModern adminEmpty"><Search size={20} /><strong>No services found</strong><p>Try another category or search term.</p></div>}

    {showForm && <div className="adminDrawerOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
      <form className="adminServiceForm" onSubmit={submitService}>
        <div className="drawerHeader"><div><span className="eyebrow">SERVICE CATALOG</span><h2>{editingId ? 'Edit service' : 'Add service'}</h2></div><button type="button" className="roundIcon" onClick={() => setShowForm(false)}><X size={17} /></button></div>
        {error && <div className="formError">{error}</div>}
        <label><span>Category</span><input list="anywork-service-categories" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="e.g. Software" required /><datalist id="anywork-service-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
        <label><span>Subcategory</span><input list="anywork-service-subcategories" value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} placeholder="e.g. Web Application" required /><datalist id="anywork-service-subcategories">{Array.from(new Set(catalog.filter((item) => item.category === form.category).map((item) => item.subcategory))).map((item) => <option key={item} value={item} />)}</datalist></label>
        <label><span>Service name</span><input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Mobile App Development" required /></label>
        <label><span>Description</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what this service includes..." required /></label>
        <label><span>What's included</span><input value={form.items} onChange={(event) => setForm((current) => ({ ...current, items: event.target.value }))} placeholder="iOS apps, Android apps, API integration" /></label>
        <label><span>Starting price</span><input type="number" min="0" value={form.startingPrice} onChange={(event) => setForm((current) => ({ ...current, startingPrice: event.target.value }))} placeholder="Leave empty for Quote" /></label>
        <div className="drawerActions"><button type="button" className="buttonSecondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="buttonPrimary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update service' : 'Save service'}</button></div>
      </form>
    </div>}
  </div>
}

function AdminCustomers() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = customers.filter((customer) => [customer.name, customer.email, customer.id].join(' ').toLowerCase().includes(query.toLowerCase()))
  const selected = customers.find((item) => item.id === selectedId)
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="CUSTOMERS" title="Customers" description="Understand account activity, service history and customer health." action={<button className="buttonPrimary"><UserCheck size={16} /> Invite customer</button>} />
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." /></div></div>
    <div className="adminCustomerGrid">{filtered.map((customer) => <button className="adminCustomerCard" key={customer.id} onClick={() => setSelectedId(customer.id)}><div className="smallAvatar adminCustomerAvatar">{customer.name.slice(0, 2).toUpperCase()}</div><div className="adminCustomerMain"><span className="requestId">{customer.id}</span><strong>{customer.name}</strong><small>{customer.email}</small></div><div className="adminCustomerStats"><span><strong>{customer.jobs}</strong> jobs</span><span><strong>{'$' + customer.spend.toLocaleString()}</strong> spend</span></div><span className={customer.status === 'Review' ? 'adminStatusReview' : 'adminStatusActive'}>{customer.status}</span><ChevronRight size={16} /></button>)}</div>
    {selected && <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

function AdminSettings() {
  const [settings, setSettings] = useState({ providerVerification: true, reviews: true, messaging: true, quoteComparison: true, maintenanceMode: false })
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="PLATFORM" title="Settings" description="Control marketplace behavior, access and the request lifecycle." />
    <div className="settingsGridModern">
      <section className="dashboardCard settingsCardModern">
        <AdminCardHeader eyebrow="MARKETPLACE" title="Customer experience" />
        <SettingRow label="Require provider verification" description="Only verified providers receive the trusted badge." checked={settings.providerVerification} onChange={() => setSettings((current) => ({ ...current, providerVerification: !current.providerVerification }))} />
        <SettingRow label="Allow customer reviews" description="Customers can review completed jobs." checked={settings.reviews} onChange={() => setSettings((current) => ({ ...current, reviews: !current.reviews }))} />
        <SettingRow label="Provider messaging" description="Keep job conversations attached to the request." checked={settings.messaging} onChange={() => setSettings((current) => ({ ...current, messaging: !current.messaging }))} />
        <SettingRow label="Quote comparison" description="Customers can compare multiple quotes." checked={settings.quoteComparison} onChange={() => setSettings((current) => ({ ...current, quoteComparison: !current.quoteComparison }))} />
      </section>
      <section className="dashboardCard settingsCardModern"><AdminCardHeader eyebrow="LIFECYCLE" title="Request states" /><div className="lifecycleModern">{['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong><small>{lifecycleCopy[item]}</small></div>)}</div></section>
      <section className="dashboardCard settingsCardDanger"><div><span className="eyebrow">MAINTENANCE</span><h2>Maintenance mode</h2><p>Pause new customer requests while existing jobs remain accessible.</p></div><button className={settings.maintenanceMode ? 'adminToggle active' : 'adminToggle'} onClick={() => setSettings((current) => ({ ...current, maintenanceMode: !current.maintenanceMode }))}><span /></button></section>
    </div>
  </div>
}

const lifecycleCopy: Record<string, string> = {
  Requested: 'Customer submitted a service request.',
  Quoted: 'Providers have responded with pricing and availability.',
  Scheduled: 'A quote was accepted and work is booked.',
  'In Progress': 'The selected provider is actively working.',
  Completed: 'The job is finished and ready for review.',
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <button className="settingRowModern" onClick={onChange}><span><strong>{label}</strong><small>{description}</small></span><span className={checked ? 'adminToggle active' : 'adminToggle'}><span /></span></button>
}

function RequestDrawer({ request, onClose }: { request: ServiceRequest; onClose: () => void }) {
  const provider = request.providerId ? providers.find((item) => item.id === request.providerId) : null
  return <Drawer title={request.title} eyebrow={request.id} onClose={onClose}><div className="drawerStatusRow"><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong></div><div className="drawerGrid"><Info label="Customer" value={request.customer} /><Info label="Location" value={request.location} /><Info label="Date" value={request.date} /><Info label="Provider" value={provider?.name || 'Unassigned'} /></div><div className="drawerBlock"><span className="eyebrow">DESCRIPTION</span><p>{request.description}</p></div><div className="drawerBlock"><span className="eyebrow">QUOTES</span><p>{request.quotes.length ? request.quotes.length + ' provider quotes attached to this request.' : 'No quotes have been submitted yet.'}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open request <ArrowRight size={15} /></button></div></Drawer>
}

function ProviderDrawer({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  return <Drawer title={provider.name} eyebrow="PROVIDER PROFILE" onClose={onClose}><div className="providerDrawerHero"><div className="providerAvatarLarge">{provider.initials}</div><div><strong>{provider.rating} ★</strong><span>{provider.reviewCount} reviews · {provider.completedJobs} completed jobs</span></div></div><div className="drawerGrid"><Info label="Location" value={provider.location} /><Info label="Response" value={provider.responseTime} /><Info label="Response rate" value={provider.responseRate} /><Info label="Status" value={provider.verified ? 'Verified' : 'Pending'} /></div><div className="drawerBlock"><span className="eyebrow">ABOUT</span><p>{provider.summary}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open provider</button></div></Drawer>
}

function CustomerDrawer({ customer, onClose }: { customer: typeof customers[number]; onClose: () => void }) {
  return <Drawer title={customer.name} eyebrow={customer.id} onClose={onClose}><div className="drawerGrid"><Info label="Email" value={customer.email} /><Info label="Status" value={customer.status} /><Info label="Jobs" value={String(customer.jobs)} /><Info label="Total spend" value={'$' + customer.spend.toLocaleString()} /></div><div className="drawerBlock"><span className="eyebrow">ACCOUNT</span><p>This account is active in the marketplace. Request and job history can be attached here as the marketplace data layer grows.</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open customer</button></div></Drawer>
}

function Drawer({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="adminDrawerOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="adminDrawer"><button className="modalClose" onClick={onClose} aria-label="Close"><X size={16} /></button><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</aside></div>
}

function HealthMetric({ icon, label, value, progress, tone = 'success' }: { icon: ReactNode; label: string; value: string; progress: number; tone?: 'success' | 'warning' }) {
  return <div className="healthMetric"><div className="healthMetricTop"><span>{icon}{label}</span><strong>{value}</strong></div><div className="healthMetricBar"><i className={tone} style={{ width: progress + '%' }} /></div></div>
}

function AdminCardHeader({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>
}

function PageTitle({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) {
  return <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="drawerInfo"><span>{label}</span><strong>{value}</strong></div>
}
 + startingPrice.toLocaleString() : 'Quote',
        })
        setCatalog((current) => [created, ...current])
        setActiveService((current) => ({ ...current, [created.id]: true }))
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ category: categories[0] || 'General', subcategory: 'General', label: '', description: '', items: '', tags: [], startingPrice: '' })
      setTagDraft('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    try {
      await deleteAdminService(id)
      setCatalog((current) => current.filter((item) => item.id !== id))
      setActiveService((current) => { const next = { ...current }; delete next[id]; return next })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete service.')
    }
  }

  const toggleService = async (service: CatalogService) => {
    const next = !activeService[service.id]
    setActiveService((current) => ({ ...current, [service.id]: next }))
    try {
      await updateAdminService(service.id, { enabled: next })
      setCatalog((current) => current.map((item) => item.id === service.id ? { ...item, enabled: next } : item))
    } catch {
      setActiveService((current) => ({ ...current, [service.id]: !next }))
    }
  }

  return <div className="workspaceDashboard adminModern">
    <PageTitle
      kicker="CATALOG"
      title="Services"
      description="Organize the marketplace by category and subcategory so customers can find the exact service they need."
      action={<button className="buttonPrimary" onClick={() => setShowForm(true)}><Plus size={16} /> Add service</button>}
    />

    <div className="adminServiceCategoryBar">
      <div className="adminCategoryHeading"><Store size={16} /><strong>Service categories</strong><span>{categories.length} categories · {catalog.length} services</span></div>
      <div className="adminCategoryTabs">
        <button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All</button>
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
    </div>

    <div className="adminToolbar">
      <div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category, subcategory or service..." /></div>
      <div className="adminSummaryPill"><Store size={15} /> {activeCount} active</div>
    </div>

    <div className="adminServiceGridModern">
      {filtered.map((service) => {
        const active = activeService[service.id] ?? service.enabled
        return <article className={active ? 'adminServiceCard adminServiceCardModern' : 'adminServiceCard adminServiceCardModern isDisabled'} key={service.id}>
          <div className="adminServiceHeader"><div className="serviceCardIcon"><Store size={19} /></div><button className={active ? 'adminToggle active' : 'adminToggle'} onClick={() => void toggleService(service)} aria-label={'Toggle ' + service.label}><span /></button></div>
          <div className="adminServiceBreadcrumb"><span>{service.category}</span><ChevronRight size={11} /><strong>{service.subcategory}</strong></div>
          <h3>{service.label}</h3>
          <p>{service.description}</p>
          <div className="adminServiceTags">{(service.tags?.length ? service.tags : service.items).map((item) => <span key={item}>{item}</span>)}</div>
          <div className="adminServiceFooter"><strong>{service.starting_price_label || 'Quote'}</strong><div className="adminServiceFooterActions"><button className="buttonSecondary" onClick={() => { setEditingId(service.id); setForm({ category: service.category, subcategory: service.subcategory, label: service.label, description: service.description, items: service.items.join(', '), tags: service.tags || [], startingPrice: service.starting_price?.toString() || '' }); setTagDraft(''); setShowForm(true) }}>Edit</button><button className="buttonSecondary" onClick={() => { if (window.confirm('Delete this service?')) void deleteService(service.id) }}>Delete</button></div></div>
        </article>
      })}
    </div>

    {!filtered.length && <div className="emptyModern adminEmpty"><Search size={20} /><strong>No services found</strong><p>Try another category or search term.</p></div>}

    {showForm && <div className="adminDrawerOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
      <form className="adminServiceForm" onSubmit={submitService}>
        <div className="drawerHeader"><div><span className="eyebrow">SERVICE CATALOG</span><h2>{editingId ? 'Edit service' : 'Add service'}</h2></div><button type="button" className="roundIcon" onClick={() => setShowForm(false)}><X size={17} /></button></div>
        {error && <div className="formError">{error}</div>}
        <label><span>Category</span><select value={form.category} onChange={(event) => {
          const nextCategory = event.target.value
          const nextSubcategories = Array.from(new Set(catalog.filter((item) => item.category === nextCategory).map((item) => item.subcategory).filter(Boolean)))
          setForm((current) => ({ ...current, category: nextCategory, subcategory: nextSubcategories[0] || 'General' }))
        }} required>
          {(categories.length ? categories : ['General']).map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label><span>Subcategory</span><select value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} required>
          {Array.from(new Set(catalog.filter((item) => item.category === form.category).map((item) => item.subcategory).filter(Boolean))).concat(
            Array.from(new Set(catalog.filter((item) => item.category === form.category).map((item) => item.subcategory).filter(Boolean))).length ? [] : ['General']
          ).map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label><span>Service name</span><input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Mobile App Development" required /></label>
        <label><span>Description</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what this service includes..." required /></label>
        <label><span>What's included</span><input value={form.items} onChange={(event) => setForm((current) => ({ ...current, items: event.target.value }))} placeholder="iOS apps, Android apps, API integration" /></label>
        <label className="adminTagField">
          <span>Tags</span>
          <div className="adminTagInputRow">
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault()
                  const next = tagDraft.trim().replace(/,$/, '')
                  if (!next || form.tags.some(tag => tag.toLowerCase() === next.toLowerCase())) return
                  setForm(current => ({ ...current, tags: [...current.tags, next] }))
                  setTagDraft('')
                }
              }}
              placeholder="e.g. Mobile, API, React"
            />
            <button type="button" className="buttonSecondary adminAddTagButton" onClick={() => {
              const next = tagDraft.trim()
              if (!next || form.tags.some(tag => tag.toLowerCase() === next.toLowerCase())) return
              setForm(current => ({ ...current, tags: [...current.tags, next] }))
              setTagDraft('')
            }}>Add tag</button>
          </div>
          {!!form.tags.length && (
            <div className="adminFormTags">
              {form.tags.map(tag => (
                <button type="button" className="adminFormTag" key={tag} onClick={() => setForm(current => ({ ...current, tags: current.tags.filter(item => item !== tag) }))}>
                  {tag}<X size={11} />
                </button>
              ))}
            </div>
          )}
          <small>Use short tags to help customers scan and filter services quickly.</small>
        </label>

        <label><span>Starting price</span><input type="number" min="0" value={form.startingPrice} onChange={(event) => setForm((current) => ({ ...current, startingPrice: event.target.value }))} placeholder="Leave empty for Quote" /></label>
        <div className="drawerActions"><button type="button" className="buttonSecondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="buttonPrimary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update service' : 'Save service'}</button></div>
      </form>
    </div>}
  </div>
}

function AdminCustomers() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = customers.filter((customer) => [customer.name, customer.email, customer.id].join(' ').toLowerCase().includes(query.toLowerCase()))
  const selected = customers.find((item) => item.id === selectedId)
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="CUSTOMERS" title="Customers" description="Understand account activity, service history and customer health." action={<button className="buttonPrimary"><UserCheck size={16} /> Invite customer</button>} />
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." /></div></div>
    <div className="adminCustomerGrid">{filtered.map((customer) => <button className="adminCustomerCard" key={customer.id} onClick={() => setSelectedId(customer.id)}><div className="smallAvatar adminCustomerAvatar">{customer.name.slice(0, 2).toUpperCase()}</div><div className="adminCustomerMain"><span className="requestId">{customer.id}</span><strong>{customer.name}</strong><small>{customer.email}</small></div><div className="adminCustomerStats"><span><strong>{customer.jobs}</strong> jobs</span><span><strong>{'$' + customer.spend.toLocaleString()}</strong> spend</span></div><span className={customer.status === 'Review' ? 'adminStatusReview' : 'adminStatusActive'}>{customer.status}</span><ChevronRight size={16} /></button>)}</div>
    {selected && <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

function AdminSettings() {
  const [settings, setSettings] = useState({ providerVerification: true, reviews: true, messaging: true, quoteComparison: true, maintenanceMode: false })
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="PLATFORM" title="Settings" description="Control marketplace behavior, access and the request lifecycle." />
    <div className="settingsGridModern">
      <section className="dashboardCard settingsCardModern">
        <AdminCardHeader eyebrow="MARKETPLACE" title="Customer experience" />
        <SettingRow label="Require provider verification" description="Only verified providers receive the trusted badge." checked={settings.providerVerification} onChange={() => setSettings((current) => ({ ...current, providerVerification: !current.providerVerification }))} />
        <SettingRow label="Allow customer reviews" description="Customers can review completed jobs." checked={settings.reviews} onChange={() => setSettings((current) => ({ ...current, reviews: !current.reviews }))} />
        <SettingRow label="Provider messaging" description="Keep job conversations attached to the request." checked={settings.messaging} onChange={() => setSettings((current) => ({ ...current, messaging: !current.messaging }))} />
        <SettingRow label="Quote comparison" description="Customers can compare multiple quotes." checked={settings.quoteComparison} onChange={() => setSettings((current) => ({ ...current, quoteComparison: !current.quoteComparison }))} />
      </section>
      <section className="dashboardCard settingsCardModern"><AdminCardHeader eyebrow="LIFECYCLE" title="Request states" /><div className="lifecycleModern">{['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong><small>{lifecycleCopy[item]}</small></div>)}</div></section>
      <section className="dashboardCard settingsCardDanger"><div><span className="eyebrow">MAINTENANCE</span><h2>Maintenance mode</h2><p>Pause new customer requests while existing jobs remain accessible.</p></div><button className={settings.maintenanceMode ? 'adminToggle active' : 'adminToggle'} onClick={() => setSettings((current) => ({ ...current, maintenanceMode: !current.maintenanceMode }))}><span /></button></section>
    </div>
  </div>
}

const lifecycleCopy: Record<string, string> = {
  Requested: 'Customer submitted a service request.',
  Quoted: 'Providers have responded with pricing and availability.',
  Scheduled: 'A quote was accepted and work is booked.',
  'In Progress': 'The selected provider is actively working.',
  Completed: 'The job is finished and ready for review.',
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <button className="settingRowModern" onClick={onChange}><span><strong>{label}</strong><small>{description}</small></span><span className={checked ? 'adminToggle active' : 'adminToggle'}><span /></span></button>
}

function RequestDrawer({ request, onClose }: { request: ServiceRequest; onClose: () => void }) {
  const provider = request.providerId ? providers.find((item) => item.id === request.providerId) : null
  return <Drawer title={request.title} eyebrow={request.id} onClose={onClose}><div className="drawerStatusRow"><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong></div><div className="drawerGrid"><Info label="Customer" value={request.customer} /><Info label="Location" value={request.location} /><Info label="Date" value={request.date} /><Info label="Provider" value={provider?.name || 'Unassigned'} /></div><div className="drawerBlock"><span className="eyebrow">DESCRIPTION</span><p>{request.description}</p></div><div className="drawerBlock"><span className="eyebrow">QUOTES</span><p>{request.quotes.length ? request.quotes.length + ' provider quotes attached to this request.' : 'No quotes have been submitted yet.'}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open request <ArrowRight size={15} /></button></div></Drawer>
}

function ProviderDrawer({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  return <Drawer title={provider.name} eyebrow="PROVIDER PROFILE" onClose={onClose}><div className="providerDrawerHero"><div className="providerAvatarLarge">{provider.initials}</div><div><strong>{provider.rating} ★</strong><span>{provider.reviewCount} reviews · {provider.completedJobs} completed jobs</span></div></div><div className="drawerGrid"><Info label="Location" value={provider.location} /><Info label="Response" value={provider.responseTime} /><Info label="Response rate" value={provider.responseRate} /><Info label="Status" value={provider.verified ? 'Verified' : 'Pending'} /></div><div className="drawerBlock"><span className="eyebrow">ABOUT</span><p>{provider.summary}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open provider</button></div></Drawer>
}

function CustomerDrawer({ customer, onClose }: { customer: typeof customers[number]; onClose: () => void }) {
  return <Drawer title={customer.name} eyebrow={customer.id} onClose={onClose}><div className="drawerGrid"><Info label="Email" value={customer.email} /><Info label="Status" value={customer.status} /><Info label="Jobs" value={String(customer.jobs)} /><Info label="Total spend" value={'$' + customer.spend.toLocaleString()} /></div><div className="drawerBlock"><span className="eyebrow">ACCOUNT</span><p>This account is active in the marketplace. Request and job history can be attached here as the marketplace data layer grows.</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open customer</button></div></Drawer>
}

function Drawer({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="adminDrawerOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="adminDrawer"><button className="modalClose" onClick={onClose} aria-label="Close"><X size={16} /></button><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</aside></div>
}

function HealthMetric({ icon, label, value, progress, tone = 'success' }: { icon: ReactNode; label: string; value: string; progress: number; tone?: 'success' | 'warning' }) {
  return <div className="healthMetric"><div className="healthMetricTop"><span>{icon}{label}</span><strong>{value}</strong></div><div className="healthMetricBar"><i className={tone} style={{ width: progress + '%' }} /></div></div>
}

function AdminCardHeader({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>
}

function PageTitle({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) {
  return <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="drawerInfo"><span>{label}</span><strong>{value}</strong></div>
}
 + startingPrice.toLocaleString() : 'Quote',
        })
        setCatalog((current) => [created, ...current])
        setActiveService((current) => ({ ...current, [created.id]: true }))
      }

      setShowForm(false)
      setEditingId(null)
      setForm({ category: categories[0] || 'General', subcategory: 'General', label: '', description: '', items: '', startingPrice: '' })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    try {
      await deleteAdminService(id)
      setCatalog((current) => current.filter((item) => item.id !== id))
      setActiveService((current) => { const next = { ...current }; delete next[id]; return next })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete service.')
    }
  }

  const toggleService = async (service: CatalogService) => {
    const next = !activeService[service.id]
    setActiveService((current) => ({ ...current, [service.id]: next }))
    try {
      await updateAdminService(service.id, { enabled: next })
      setCatalog((current) => current.map((item) => item.id === service.id ? { ...item, enabled: next } : item))
    } catch {
      setActiveService((current) => ({ ...current, [service.id]: !next }))
    }
  }

  return <div className="workspaceDashboard adminModern">
    <PageTitle
      kicker="CATALOG"
      title="Services"
      description="Organize the marketplace by category and subcategory so customers can find the exact service they need."
      action={<button className="buttonPrimary" onClick={() => setShowForm(true)}><Plus size={16} /> Add service</button>}
    />

    <div className="adminServiceCategoryBar">
      <div className="adminCategoryHeading"><Store size={16} /><strong>Service categories</strong><span>{categories.length} categories · {catalog.length} services</span></div>
      <div className="adminCategoryTabs">
        <button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All</button>
        {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
    </div>

    <div className="adminToolbar">
      <div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category, subcategory or service..." /></div>
      <div className="adminSummaryPill"><Store size={15} /> {activeCount} active</div>
    </div>

    <div className="adminServiceGridModern">
      {filtered.map((service) => {
        const active = activeService[service.id] ?? service.enabled
        return <article className={active ? 'adminServiceCard adminServiceCardModern' : 'adminServiceCard adminServiceCardModern isDisabled'} key={service.id}>
          <div className="adminServiceHeader"><div className="serviceCardIcon"><Store size={19} /></div><button className={active ? 'adminToggle active' : 'adminToggle'} onClick={() => void toggleService(service)} aria-label={'Toggle ' + service.label}><span /></button></div>
          <div className="adminServiceBreadcrumb"><span>{service.category}</span><ChevronRight size={11} /><strong>{service.subcategory}</strong></div>
          <h3>{service.label}</h3>
          <p>{service.description}</p>
          <div className="adminServiceTags">{service.items.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="adminServiceFooter"><strong>{service.starting_price_label || 'Quote'}</strong><div className="adminServiceFooterActions"><button className="buttonSecondary" onClick={() => { setEditingId(service.id); setForm({ category: service.category, subcategory: service.subcategory, label: service.label, description: service.description, items: service.items.join(', '), startingPrice: service.starting_price?.toString() || '' }); setShowForm(true) }}>Edit</button><button className="buttonSecondary" onClick={() => { if (window.confirm('Delete this service?')) void deleteService(service.id) }}>Delete</button></div></div>
        </article>
      })}
    </div>

    {!filtered.length && <div className="emptyModern adminEmpty"><Search size={20} /><strong>No services found</strong><p>Try another category or search term.</p></div>}

    {showForm && <div className="adminDrawerOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
      <form className="adminServiceForm" onSubmit={submitService}>
        <div className="drawerHeader"><div><span className="eyebrow">SERVICE CATALOG</span><h2>{editingId ? 'Edit service' : 'Add service'}</h2></div><button type="button" className="roundIcon" onClick={() => setShowForm(false)}><X size={17} /></button></div>
        {error && <div className="formError">{error}</div>}
        <label><span>Category</span><input list="anywork-service-categories" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="e.g. Software" required /><datalist id="anywork-service-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
        <label><span>Subcategory</span><input list="anywork-service-subcategories" value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} placeholder="e.g. Web Application" required /><datalist id="anywork-service-subcategories">{Array.from(new Set(catalog.filter((item) => item.category === form.category).map((item) => item.subcategory))).map((item) => <option key={item} value={item} />)}</datalist></label>
        <label><span>Service name</span><input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Mobile App Development" required /></label>
        <label><span>Description</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what this service includes..." required /></label>
        <label><span>What's included</span><input value={form.items} onChange={(event) => setForm((current) => ({ ...current, items: event.target.value }))} placeholder="iOS apps, Android apps, API integration" /></label>
        <label><span>Starting price</span><input type="number" min="0" value={form.startingPrice} onChange={(event) => setForm((current) => ({ ...current, startingPrice: event.target.value }))} placeholder="Leave empty for Quote" /></label>
        <div className="drawerActions"><button type="button" className="buttonSecondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="buttonPrimary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update service' : 'Save service'}</button></div>
      </form>
    </div>}
  </div>
}

function AdminCustomers() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = customers.filter((customer) => [customer.name, customer.email, customer.id].join(' ').toLowerCase().includes(query.toLowerCase()))
  const selected = customers.find((item) => item.id === selectedId)
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="CUSTOMERS" title="Customers" description="Understand account activity, service history and customer health." action={<button className="buttonPrimary"><UserCheck size={16} /> Invite customer</button>} />
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." /></div></div>
    <div className="adminCustomerGrid">{filtered.map((customer) => <button className="adminCustomerCard" key={customer.id} onClick={() => setSelectedId(customer.id)}><div className="smallAvatar adminCustomerAvatar">{customer.name.slice(0, 2).toUpperCase()}</div><div className="adminCustomerMain"><span className="requestId">{customer.id}</span><strong>{customer.name}</strong><small>{customer.email}</small></div><div className="adminCustomerStats"><span><strong>{customer.jobs}</strong> jobs</span><span><strong>{'$' + customer.spend.toLocaleString()}</strong> spend</span></div><span className={customer.status === 'Review' ? 'adminStatusReview' : 'adminStatusActive'}>{customer.status}</span><ChevronRight size={16} /></button>)}</div>
    {selected && <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

function AdminSettings() {
  const [settings, setSettings] = useState({ providerVerification: true, reviews: true, messaging: true, quoteComparison: true, maintenanceMode: false })
  return <div className="workspaceDashboard adminModern">
    <PageTitle kicker="PLATFORM" title="Settings" description="Control marketplace behavior, access and the request lifecycle." />
    <div className="settingsGridModern">
      <section className="dashboardCard settingsCardModern">
        <AdminCardHeader eyebrow="MARKETPLACE" title="Customer experience" />
        <SettingRow label="Require provider verification" description="Only verified providers receive the trusted badge." checked={settings.providerVerification} onChange={() => setSettings((current) => ({ ...current, providerVerification: !current.providerVerification }))} />
        <SettingRow label="Allow customer reviews" description="Customers can review completed jobs." checked={settings.reviews} onChange={() => setSettings((current) => ({ ...current, reviews: !current.reviews }))} />
        <SettingRow label="Provider messaging" description="Keep job conversations attached to the request." checked={settings.messaging} onChange={() => setSettings((current) => ({ ...current, messaging: !current.messaging }))} />
        <SettingRow label="Quote comparison" description="Customers can compare multiple quotes." checked={settings.quoteComparison} onChange={() => setSettings((current) => ({ ...current, quoteComparison: !current.quoteComparison }))} />
      </section>
      <section className="dashboardCard settingsCardModern"><AdminCardHeader eyebrow="LIFECYCLE" title="Request states" /><div className="lifecycleModern">{['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong><small>{lifecycleCopy[item]}</small></div>)}</div></section>
      <section className="dashboardCard settingsCardDanger"><div><span className="eyebrow">MAINTENANCE</span><h2>Maintenance mode</h2><p>Pause new customer requests while existing jobs remain accessible.</p></div><button className={settings.maintenanceMode ? 'adminToggle active' : 'adminToggle'} onClick={() => setSettings((current) => ({ ...current, maintenanceMode: !current.maintenanceMode }))}><span /></button></section>
    </div>
  </div>
}

const lifecycleCopy: Record<string, string> = {
  Requested: 'Customer submitted a service request.',
  Quoted: 'Providers have responded with pricing and availability.',
  Scheduled: 'A quote was accepted and work is booked.',
  'In Progress': 'The selected provider is actively working.',
  Completed: 'The job is finished and ready for review.',
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <button className="settingRowModern" onClick={onChange}><span><strong>{label}</strong><small>{description}</small></span><span className={checked ? 'adminToggle active' : 'adminToggle'}><span /></span></button>
}

function RequestDrawer({ request, onClose }: { request: ServiceRequest; onClose: () => void }) {
  const provider = request.providerId ? providers.find((item) => item.id === request.providerId) : null
  return <Drawer title={request.title} eyebrow={request.id} onClose={onClose}><div className="drawerStatusRow"><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong></div><div className="drawerGrid"><Info label="Customer" value={request.customer} /><Info label="Location" value={request.location} /><Info label="Date" value={request.date} /><Info label="Provider" value={provider?.name || 'Unassigned'} /></div><div className="drawerBlock"><span className="eyebrow">DESCRIPTION</span><p>{request.description}</p></div><div className="drawerBlock"><span className="eyebrow">QUOTES</span><p>{request.quotes.length ? request.quotes.length + ' provider quotes attached to this request.' : 'No quotes have been submitted yet.'}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open request <ArrowRight size={15} /></button></div></Drawer>
}

function ProviderDrawer({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  return <Drawer title={provider.name} eyebrow="PROVIDER PROFILE" onClose={onClose}><div className="providerDrawerHero"><div className="providerAvatarLarge">{provider.initials}</div><div><strong>{provider.rating} ★</strong><span>{provider.reviewCount} reviews · {provider.completedJobs} completed jobs</span></div></div><div className="drawerGrid"><Info label="Location" value={provider.location} /><Info label="Response" value={provider.responseTime} /><Info label="Response rate" value={provider.responseRate} /><Info label="Status" value={provider.verified ? 'Verified' : 'Pending'} /></div><div className="drawerBlock"><span className="eyebrow">ABOUT</span><p>{provider.summary}</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open provider</button></div></Drawer>
}

function CustomerDrawer({ customer, onClose }: { customer: typeof customers[number]; onClose: () => void }) {
  return <Drawer title={customer.name} eyebrow={customer.id} onClose={onClose}><div className="drawerGrid"><Info label="Email" value={customer.email} /><Info label="Status" value={customer.status} /><Info label="Jobs" value={String(customer.jobs)} /><Info label="Total spend" value={'$' + customer.spend.toLocaleString()} /></div><div className="drawerBlock"><span className="eyebrow">ACCOUNT</span><p>This account is active in the marketplace. Request and job history can be attached here as the marketplace data layer grows.</p></div><div className="drawerActions"><button className="buttonSecondary" onClick={onClose}>Close</button><button className="buttonPrimary">Open customer</button></div></Drawer>
}

function Drawer({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="adminDrawerOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="adminDrawer"><button className="modalClose" onClick={onClose} aria-label="Close"><X size={16} /></button><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</aside></div>
}

function HealthMetric({ icon, label, value, progress, tone = 'success' }: { icon: ReactNode; label: string; value: string; progress: number; tone?: 'success' | 'warning' }) {
  return <div className="healthMetric"><div className="healthMetricTop"><span>{icon}{label}</span><strong>{value}</strong></div><div className="healthMetricBar"><i className={tone} style={{ width: progress + '%' }} /></div></div>
}

function AdminCardHeader({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>
}

function PageTitle({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) {
  return <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="drawerInfo"><span>{label}</span><strong>{value}</strong></div>
}
