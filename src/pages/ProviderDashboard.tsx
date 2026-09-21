import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  MessageCircle,
  PackageCheck,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react'
import { services } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'
import { CustomerMessagesPage } from './CustomerMessagesPage'
import type { AnyWorkProfile } from '../types/auth'
import {
  getCurrentUserId,
  listProviderQuotes,
  listProviderRequests,
  listProviderServices,
  saveProviderService,
  subscribeToQuotes,
  subscribeToRequests,
  type DbProviderService,
  type DbQuote,
  type DbRequest,
} from '../lib/anyworkApi'
import { confirmAction, showError, showToast } from '../lib/alerts'

type RequestFilter = 'All' | 'Needs quote' | 'Quoted' | 'Scheduled' | 'In Progress' | 'Completed'

export function ProviderDashboard({
  section,
  profile,
  onNavigate,
  messageRequestId,
  messageProviderId,
}: {
  section: string
  profile: AnyWorkProfile
  onNavigate: (path: string) => void
  messageRequestId?: string
  messageProviderId?: string
}) {
  if (section === 'requests') return <ProviderRequests onNavigate={onNavigate} />
  if (section === 'jobs') return <ProviderJobs onNavigate={onNavigate} />
  if (section === 'services') return <ProviderServices />
  if (section === 'earnings') return <ProviderEarnings />
  if (section === 'messages') return <ProviderMessages onNavigate={onNavigate} requestId={messageRequestId} providerId={messageProviderId} />
  return <ProviderHome profile={profile} onNavigate={onNavigate} />
}

function ProviderHome({ profile, onNavigate }: { profile: AnyWorkProfile; onNavigate: (path: string) => void }) {
  const [requests, setRequests] = useState<DbRequest[]>([])
  const [quotes, setQuotes] = useState<DbQuote[]>([])
  const [providerId, setProviderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [realtime, setRealtime] = useState<'connecting' | 'live' | 'offline'>('connecting')

  useEffect(() => {
    Promise.all([getCurrentUserId(), listProviderRequests(), listProviderQuotes()])
      .then(([id, requestRows, quoteRows]) => {
        setProviderId(id)
        setRequests(requestRows)
        setQuotes(quoteRows)
      })
      .finally(() => setLoading(false))
  }, [])
  
  useEffect(() => {
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined
    void subscribeToRequests((change) => {
      if (!change.record && change.oldRecord?.id) {
        setRequests((current) => current.filter((item) => item.id !== change.oldRecord?.id))
        return
      }
      if (change.record) {
        setRequests((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    }, (status) => setRealtime(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' ? 'offline' : 'connecting'))
      .then((dispose) => { requestCleanup = dispose }).catch(() => setRealtime('offline'))
    void subscribeToQuotes((change) => {
      if (!change.record && change.oldRecord?.id) {
        setQuotes((current) => current.filter((item) => item.id !== change.oldRecord?.id))
        return
      }
      if (change.record) setQuotes((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!])
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)
    return () => { requestCleanup?.(); quoteCleanup?.() }
  }, [])

  const incoming = requests.filter((request) => request.status === 'Requested')
  const activeJobs = requests.filter((request) => request.selected_provider_id === providerId && ['Scheduled', 'In Progress'].includes(request.status))
  const completed = requests.filter((request) => request.selected_provider_id === providerId && request.status === 'Completed')
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'Accepted')
  const businessName = profile.company_name || profile.display_name || 'Your business'
  const responseNeeded = requests.filter((request) => request.status === 'Requested').length
  const grossValue = acceptedQuotes.reduce((sum, quote) => sum + Number(quote.amount), 0)

  const todayJobs = activeJobs.slice(0, 3)
  const pipeline = ['Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed'] as const

  return (
    <div className="workspaceDashboard providerHub providerDashboardPage">
      <div className="workspaceWelcome experienceWelcome providerWelcome">
        <div>
          <span className="eyebrow">PROVIDER HOME</span>
          <h1>Good business starts with a clear pipeline.</h1>
          <p>{businessName} has {responseNeeded} request{responseNeeded === 1 ? '' : 's'} waiting for a quote.</p>
        </div>
        <div className="providerHeroActions">
          <span className={'providerLiveStatus ' + realtime}><span /> {realtime === 'live' ? 'Live pipeline' : realtime === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</span>
          <button className="buttonSecondary" onClick={() => onNavigate('/provider/jobs')}><CalendarDays size={16} /> Today's jobs</button>
          <button className="buttonPrimary" onClick={() => onNavigate('/provider/requests')}><BriefcaseBusiness size={16} /> Review requests</button>
        </div>
      </div>

      <div className="metricRow providerMetricRow">
        <Metric label="Needs your response" value={loading ? '—' : String(responseNeeded)} note="New opportunities" icon={<Clock3 />} />
        <Metric label="Active jobs" value={loading ? '—' : String(activeJobs.length)} note="Scheduled or in progress" icon={<PackageCheck />} />
        <Metric label="Accepted value" value={loading ? '—' : '$' + grossValue.toLocaleString()} note="Accepted quotes" icon={<DollarSign />} />
        <Metric label="Completed jobs" value={loading ? '—' : String(completed.length)} note="From your current account" icon={<Star />} />
      </div>

      <section className="dashboardCard wide providerAnalyticsCard">
        <CardHeading eyebrow="PERFORMANCE" title="Business performance" />
        <div className="dashboardChartWrap">
          <div className="dashboardChartLegend"><span><i className="chartDot chartDotPrimary" /> Accepted value</span><span><i className="chartDot chartDotSecondary" /> Completed jobs</span></div>
          <svg className="dashboardChart" viewBox="0 0 720 230" role="img" aria-label="Provider accepted value and completed jobs for the last six months">
            <line x1="45" y1="190" x2="700" y2="190" className="chartAxis" />
            {buildProviderMonthlySeries(requests, acceptedQuotes).map((item, index) => {
              const x = 70 + index * 125
              const height = (item.value / Math.max(...buildProviderMonthlySeries(requests, acceptedQuotes).map((row) => row.value), 1)) * 135
              return <g key={item.label}>
                <rect x={x - 24} y={190 - height} width="48" height={height} rx="7" className="chartBar" />
                <text x={x} y="212" textAnchor="middle" className="chartLabel">{item.label}</text>
                <text x={x} y={185 - height} textAnchor="middle" className="chartValue">{item.value > 999 ? '$' + Math.round(item.value / 1000) + 'k' : item.value}</text>
              </g>
            })}
          </svg>
        </div>
      </section>

      <div className="dashboardGrid providerDashboardGrid">
        <section className="dashboardCard wide providerActionCard">
          <CardHeading eyebrow="ACTION CENTER" title="Requests worth reviewing" action="View all" onClick={() => onNavigate('/provider/requests')} />
          {incoming.length ? incoming.slice(0, 4).map((request) => (
            <button className="requestRowModern providerOpportunityRow" key={request.id} onClick={() => onNavigate('/provider/requests/' + request.id)}>
              <div>
                <span className="requestId">{request.request_number}</span>
                <strong>{request.title}</strong>
                <small>{request.location} · {formatRequestDate(request.preferred_date)}</small>
              </div>
              <div className="opportunityBudget">
                <span>Budget</span>
                <strong>{request.budget !== null ? '$' + Number(request.budget).toLocaleString() : 'Open'}</strong>
              </div>
              <span className="attentionPill">Needs quote</span>
              <ChevronRight size={16} />
            </button>
          )) : (
            <EmptyPanel title="Your inbox is clear" description="New customer requests will appear here when they need a provider response." />
          )}
        </section>

        <section className="dashboardCard providerTodayCard">
          <CardHeading eyebrow="TODAY" title="Schedule" />
          {todayJobs.length ? todayJobs.map((request) => (
            <button className="providerScheduleRow providerScheduleInteractive" key={request.id} onClick={() => onNavigate('/provider/jobs/' + request.id)}>
              <b>{request.preferred_date ? new Date(request.preferred_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</b>
              <div><strong>{request.title}</strong><span>{request.location}</span></div>
              <StatusBadge status={request.status} />
            </button>
          )) : <EmptyPanel title="No jobs scheduled yet" description="Accepted work will appear here." />}
        </section>

        <section className="dashboardCard">
          <CardHeading eyebrow="PIPELINE" title="Request lifecycle" />
          <div className="providerPipeline">
            {pipeline.map((status) => {
              const count = requests.filter((request) => request.status === status).length
              return (
                <button key={status} onClick={() => onNavigate(status === 'Requested' || status === 'Quoted' ? '/provider/requests' : '/provider/jobs')}>
                  <span>{status}</span><strong>{count}</strong>
                </button>
              )
            })}
          </div>
        </section>

        <section className="dashboardCard wide">
          <CardHeading eyebrow="BUSINESS HEALTH" title="Keep your provider profile strong" action="Manage services" onClick={() => onNavigate('/provider/services')} />
          <div className="profileHealth providerHealthGrid">
            <div><ShieldCheck /><strong>Verified provider</strong><span>Visible to customers</span></div>
            <div><Star /><strong>Marketplace rating</strong><span>Keep reviews and delivery quality high</span></div>
            <div><MessageCircle /><strong>Fast response</strong><span>Reply quickly to quote requests</span></div>
            <div><Users /><strong>{acceptedQuotes.length} accepted quotes</strong><span>{quotes.length} quote responses in your pipeline</span></div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ProviderRequests({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [requests, setRequests] = useState<DbRequest[]>([])
  const [quotes, setQuotes] = useState<DbQuote[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RequestFilter>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtime, setRealtime] = useState<'connecting' | 'live' | 'offline'>('connecting')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [requestRows, quoteRows] = await Promise.all([listProviderRequests(), listProviderQuotes()])
      setRequests(requestRows)
      setQuotes(quoteRows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load provider requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined
    void subscribeToRequests((change) => {
      if (!change.record && change.oldRecord?.id) {
        setRequests((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      } else if (change.record) {
        setRequests((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    }, (status) => setRealtime(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' ? 'offline' : 'connecting')).then((dispose) => { requestCleanup = dispose }).catch(() => setRealtime('offline'))
    void subscribeToQuotes((change) => {
      if (!change.record && change.oldRecord?.id) {
        setQuotes((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      } else if (change.record) {
        setQuotes((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)
    return () => { requestCleanup?.(); quoteCleanup?.() }
  }, [])

  const quoteByRequest = useMemo(() => new Map(quotes.map((quote) => [quote.request_id, quote])), [quotes])

  const filtered = useMemo(() => requests.filter((request) => {
    const quote = quoteByRequest.get(request.id)
    const matchesStatus = filter === 'Scheduled' || filter === 'In Progress' || filter === 'Completed'
      ? request.status === filter
      : false
    const matchesFilter = filter === 'All'
      || (filter === 'Needs quote' && request.status === 'Requested' && !quote)
      || (filter === 'Quoted' && Boolean(quote))
      || matchesStatus
    const text = (request.request_number + ' ' + request.title + ' ' + request.location).toLowerCase()
    return matchesFilter && text.includes(search.toLowerCase())
  }), [requests, quoteByRequest, filter, search])

  const filters: RequestFilter[] = ['All', 'Needs quote', 'Quoted', 'Scheduled', 'In Progress', 'Completed']

  return (
    <div className="workspaceDashboard providerHub">
      <div className="providerRequestPageHeading">
        <PageTitle kicker="OPPORTUNITIES" title="Service requests" description="Review new work, send quotes and turn qualified opportunities into scheduled jobs." />
        <span className={'providerLiveStatus ' + realtime}><span /> {realtime === 'live' ? 'Live requests' : realtime === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</span>
      </div>

      <div className="providerRequestToolbar">
        <div className="searchField"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request, service or location..." /></div>
        <button className="buttonSecondary"><Settings2 size={15} /> Filters</button>
      </div>

      <div className="providerStatusTabs">
        {filters.map((item) => (
          <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
            <span>{item}</span><b>{item === 'All' ? requests.length : item === 'Needs quote' ? requests.filter((request) => request.status === 'Requested' && !quoteByRequest.has(request.id)).length : item === 'Quoted' ? quotes.length : requests.filter((request) => (item === 'Scheduled' || item === 'In Progress' || item === 'Completed') && request.status === item).length}</b>
          </button>
        ))}
      </div>

      {error && <div className="formError">{error}</div>}

      <div className="providerOpportunityGrid">
        {loading ? <EmptyPanel title="Loading opportunities" description="Checking your latest marketplace requests." /> : filtered.length ? filtered.map((request) => {
          const quote = quoteByRequest.get(request.id)
          return (
            <article className="providerOpportunityCard" key={request.id}>
              <div className="providerOpportunityTop">
                <div><span className="requestId">{request.request_number}</span><StatusBadge status={request.status} /></div>
                <span className="providerOpportunityAge">{timeSince(request.created_at)}</span>
              </div>
              <h3>{request.title}</h3>
              <p>{request.description}</p>
              <div className="providerOpportunityMeta">
                <span><MapPinIcon /> {request.location}</span>
                <span><CalendarDays size={13} /> {formatRequestDate(request.preferred_date)}</span>
              </div>
              <div className="providerOpportunityFooter">
                <div><span>Customer budget</span><strong>{request.budget !== null ? '$' + Number(request.budget).toLocaleString() : 'Open to quote'}</strong></div>
                <span className={quote ? 'quoteSubmitted' : 'quotePending'}>{quote ? 'Quote submitted' : 'Response needed'}</span>
              </div>
              <div className="providerOpportunityActions">
                <button className="buttonSecondary" onClick={() => onNavigate('/provider/requests/' + request.id)}>View request</button>
                {quote ? <button className="buttonGhost" onClick={() => onNavigate('/provider/messages?request=' + request.id)}>Message</button> : <button className="buttonPrimary" onClick={() => onNavigate('/provider/requests/' + request.id)}>Send quote <ArrowRight size={14} /></button>}
              </div>
            </article>
          )
        }) : <EmptyPanel title="No matching requests" description="Try another search or status filter." />}
      </div>
    </div>
  )
}

function ProviderJobs({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [requests, setRequests] = useState<DbRequest[]>([])
  const [quotes, setQuotes] = useState<DbQuote[]>([])
  const [providerId, setProviderId] = useState('')
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Today' | 'In Progress' | 'Completed'>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCurrentUserId(), listProviderRequests(), listProviderQuotes()])
      .then(([id, rows, quoteRows]) => {
        setProviderId(id)
        setRequests(rows.filter((request) => request.selected_provider_id === id))
        setQuotes(quoteRows)
      })
      .finally(() => setLoading(false))
  }, [])
  
  useEffect(() => {
    if (!providerId) return
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined
    void subscribeToRequests((change) => {
      if (!change.record && change.oldRecord?.id) {
        setRequests((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      } else if (change.record) {
        setRequests((current) => {
          const next = current.filter((item) => item.id !== change.record!.id)
          if (change.record!.selected_provider_id === providerId) next.push(change.record!)
          return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        })
      }
    }).then((dispose) => { requestCleanup = dispose }).catch(() => undefined)
    void subscribeToQuotes((change) => {
      if (!change.record && change.oldRecord?.id) setQuotes((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      else if (change.record) setQuotes((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!])
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)
    return () => { requestCleanup?.(); quoteCleanup?.() }
  }, [providerId])

  const filters = ['All', 'Upcoming', 'Today', 'In Progress', 'Completed'] as const
  const acceptedQuoteByRequest = new Map(
    quotes.filter((quote) => quote.status === 'Accepted').map((quote) => [quote.request_id, quote]),
  )

  const matchesFilter = (request: DbRequest, currentFilter: typeof filters[number]) => {
    if (currentFilter === 'All') return true
    if (currentFilter === 'In Progress') return request.status === 'In Progress'
    if (currentFilter === 'Completed') return request.status === 'Completed'
    if (currentFilter === 'Today') {
      return request.preferred_date
        ? new Date(request.preferred_date).toDateString() === new Date().toDateString()
        : false
    }
    return ['Scheduled', 'In Progress'].includes(request.status)
  }

  const filtered = requests.filter((request) => matchesFilter(request, filter))

  return (
    <div className="workspaceDashboard providerHub">
      <PageTitle kicker="OPERATIONS" title="Jobs" description="Run confirmed work from schedule through completion." />
      <div className="providerStatusTabs">
        {filters.map((item) => (
          <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
            <span>{item}</span><b>{requests.filter((request) => matchesFilter(request, item)).length}</b>
          </button>
        ))}
      </div>
      <div className="providerJobsList">
        {loading ? <EmptyPanel title="Loading jobs" description="Checking your confirmed work." /> : filtered.length ? filtered.map((request) => (
          <article className="providerJobCard" key={request.id}>
            <div className="providerJobDate">
              <strong>{request.preferred_date ? new Date(request.preferred_date).toLocaleDateString([], { day: '2-digit', month: 'short' }) : '—'}</strong>
              <span>{request.preferred_date ? new Date(request.preferred_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}</span>
            </div>
            <div className="providerJobMain">
              <span className="requestId">{request.request_number}</span>
              <h3>{request.title}</h3>
              <p>{request.location}</p>
            </div>
            <div className="providerJobValue">
              <span>Job value</span>
              <strong>{acceptedQuoteByRequest.get(request.id) ? '$' + Number(acceptedQuoteByRequest.get(request.id)!.amount).toLocaleString() : request.budget !== null ? '$' + Number(request.budget).toLocaleString() : 'TBD'}</strong>
            </div>
            <StatusBadge status={request.status} />
            <button className="jobRowArrow" onClick={() => onNavigate('/provider/jobs/' + request.id)}><ChevronRight size={18} /></button>
          </article>
        )) : <EmptyPanel title="No jobs in this view" description="Accepted work will appear here." />}
      </div>
    </div>
  )
}

function ProviderServices() {
  const [configured, setConfigured] = useState<DbProviderService[]>([])
  const [saving, setSaving] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [leadTime, setLeadTime] = useState('1')

  useEffect(() => {
    listProviderServices().then(setConfigured).catch(() => undefined)
  }, [])

  const configuredByKey = new Map(configured.map((item) => [item.service_key, item]))
  const catalog = services.filter((service) => service.title.toLowerCase().includes(search.toLowerCase()) || service.label.toLowerCase().includes(search.toLowerCase()))

  const beginEdit = (serviceKey: string) => {
    const current = configuredByKey.get(serviceKey)
    setEditing(serviceKey)
    setPrice(current?.starting_price != null ? String(current.starting_price) : '')
    setLeadTime(String(current?.lead_time_days ?? 1))
  }

  const toggle = async (serviceKey: string) => {
    const current = configuredByKey.get(serviceKey)
    const nextEnabled = !(current?.enabled ?? false)

    if (!nextEnabled) {
      const service = services.find((item) => item.id === serviceKey)
      const confirmed = await confirmAction({
        title: 'Disable this service?',
        text: service ? service.label + ' will no longer appear as available to customers.' : 'Customers will no longer be able to request this service.',
        confirmText: 'Disable service',
        cancelText: 'Keep enabled',
        danger: true,
      })
      if (!confirmed) return
    }

    setSaving(serviceKey)
    try {
      const saved = await saveProviderService({
        serviceKey,
        enabled: !(current?.enabled ?? false),
        startingPrice: current?.starting_price ?? null,
        minimumJobValue: current?.minimum_job_value ?? null,
        serviceArea: current?.service_area ?? null,
        leadTimeDays: current?.lead_time_days ?? 1,
      })
      setConfigured((items) => [...items.filter((item) => item.service_key !== serviceKey), saved])
      await showToast(saved.enabled ? 'Service enabled' : 'Service disabled')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to update this service.'
      await showError('Unable to update service', message)
    } finally {
      setSaving('')
    }
  }

  const saveConfig = async (serviceKey: string) => {
    const current = configuredByKey.get(serviceKey)
    setSaving(serviceKey)
    try {
      const saved = await saveProviderService({
        serviceKey,
        enabled: current?.enabled ?? true,
        startingPrice: price ? Number(price) : null,
        minimumJobValue: current?.minimum_job_value ?? null,
        serviceArea: current?.service_area ?? null,
        leadTimeDays: Math.max(0, Number(leadTime) || 1),
      })
      setConfigured((items) => [...items.filter((item) => item.service_key !== serviceKey), saved])
      setEditing(null)
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="workspaceDashboard providerHub">
      <PageTitle kicker="BUSINESS" title="Services" description="Control what customers can request, what you charge from, and how quickly you can respond." />
      <div className="providerServiceToolbar">
        <div className="searchField"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services..." /></div>
        <div className="providerServiceSummary"><strong>{configured.filter((item) => item.enabled).length}</strong><span>active services</span></div>
      </div>
      <div className="providerServiceGrid">
        {catalog.map((service) => {
          const config = configuredByKey.get(service.id)
          const enabled = Boolean(config?.enabled)
          return (
            <article className={'providerServiceCard ' + (enabled ? 'enabled' : '')} key={service.id}>
              <div className="providerServiceIcon"><BriefcaseBusiness size={20} /></div>
              <div className="providerServiceCardHeader">
                <div><span className="eyebrow">{service.title}</span><h3>{service.label}</h3></div>
                <button onClick={() => void toggle(service.id)} disabled={saving === service.id} aria-label={'Toggle ' + service.label}>
                  {enabled ? <ToggleRight className="toggleOn" size={27} /> : <ToggleLeft size={27} />}
                </button>
              </div>
              <p>{service.description}</p>
              <div className="providerServiceMeta">
                <span>Starting price<strong>{config?.starting_price != null ? '$' + Number(config.starting_price).toLocaleString() : service.startingPrice}</strong></span>
                <span>Lead time<strong>{config?.lead_time_days ?? 1} day{(config?.lead_time_days ?? 1) === 1 ? '' : 's'}</strong></span>
              </div>
              {editing === service.id ? (
                <div className="providerServiceEditor">
                  <label><span>Starting price</span><input value={price} onChange={(event) => setPrice(event.target.value)} type="number" min="0" /></label>
                  <label><span>Lead time (days)</span><input value={leadTime} onChange={(event) => setLeadTime(event.target.value)} type="number" min="0" /></label>
                  <div><button className="buttonGhost" onClick={() => setEditing(null)}>Cancel</button><button className="buttonPrimary" disabled={saving === service.id} onClick={() => void saveConfig(service.id)}>{saving === service.id ? 'Saving…' : 'Save settings'}</button></div>
                </div>
              ) : (
                <div className="providerServiceFooter">
                  <span className={enabled ? 'enabledDot' : 'disabledDot'} /> {enabled ? 'Visible to customers' : 'Not accepting requests'}
                  <button className="textLink" onClick={() => beginEdit(service.id)}>Configure</button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function ProviderEarnings() {
  const [quotes, setQuotes] = useState<DbQuote[]>([])
  const [requests, setRequests] = useState<DbRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listProviderQuotes(), listProviderRequests()])
      .then(([quoteRows, requestRows]) => {
        setQuotes(quoteRows)
        setRequests(requestRows)
      })
      .finally(() => setLoading(false))
  }, [])
  
  useEffect(() => {
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined
    void subscribeToRequests((change) => {
      if (!change.record && change.oldRecord?.id) setRequests((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      else if (change.record) setRequests((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!])
    }).then((dispose) => { requestCleanup = dispose }).catch(() => undefined)
    void subscribeToQuotes((change) => {
      if (!change.record && change.oldRecord?.id) setQuotes((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      else if (change.record) setQuotes((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!])
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)
    return () => { requestCleanup?.(); quoteCleanup?.() }
  }, [])

  const accepted = quotes.filter((quote) => quote.status === 'Accepted')
  const completed = accepted.filter((quote) => requests.find((request) => request.id === quote.request_id)?.status === 'Completed')
  const pending = accepted.filter((quote) => ['Scheduled', 'In Progress'].includes(requests.find((request) => request.id === quote.request_id)?.status || ''))
  const open = quotes.filter((quote) => quote.status === 'Pending')
  const gross = completed.reduce((sum, quote) => sum + Number(quote.amount), 0)
  const pendingValue = pending.reduce((sum, quote) => sum + Number(quote.amount), 0)
  const openValue = open.reduce((sum, quote) => sum + Number(quote.amount), 0)

  return (
    <div className="workspaceDashboard providerHub">
      <PageTitle kicker="FINANCIAL CENTER" title="Earnings" description="Track accepted work, completed revenue and open quote value from one place." />
      <div className="metricRow providerEarningsMetrics">
        <Metric label="Completed revenue" value={loading ? '—' : '$' + gross.toLocaleString()} note={completed.length + ' completed jobs'} icon={<DollarSign />} />
        <Metric label="Pending payout" value={loading ? '—' : '$' + pendingValue.toLocaleString()} note="Accepted, not completed" icon={<Clock3 />} />
        <Metric label="Open quote value" value={loading ? '—' : '$' + openValue.toLocaleString()} note={open.length + ' opportunities'} icon={<BriefcaseBusiness />} />
        <Metric label="Accepted jobs" value={loading ? '—' : String(accepted.length)} note="Current quote pipeline" icon={<PackageCheck />} />
      </div>

      <section className="dashboardCard earningsTableCard">
        <CardHeading eyebrow="TRANSACTIONS" title="Recent job value" />
        <div className="providerEarningsTableHead"><span>Request</span><span>Status</span><span>Customer job</span><span>Amount</span></div>
        {accepted.length ? accepted.slice(0, 10).map((quote) => {
          const request = requests.find((item) => item.id === quote.request_id)
          return <button className="providerEarningsRow" key={quote.id}>
            <span className="requestId">{request?.request_number || quote.request_id.slice(0, 8)}</span>
            <StatusBadge status={request?.status || 'Quoted'} />
            <strong>{request?.title || 'Service job'}</strong>
            <b>{'$' + Number(quote.amount).toLocaleString()}</b>
          </button>
        }) : <EmptyPanel title="No accepted work yet" description="Accepted quotes will appear here as financial activity." />}
      </section>
    </div>
  )
}

function ProviderMessages({ onNavigate, requestId, providerId }: { onNavigate: (path: string) => void; requestId?: string; providerId?: string }) {
  return <CustomerMessagesPage workspaceRole="provider" requestId={requestId} providerId={providerId} onNavigate={onNavigate} />
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: ReactNode }) {
  return <div className="metricCard"><div className="metricIcon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function CardHeading({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>
}

function PageTitle({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return <div className="workspacePageTitle providerPageTitle"><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return <div className="providerEmptyPanel"><div className="metricIcon"><CheckCircle2 size={17} /></div><strong>{title}</strong><span>{description}</span></div>
}

function timeSince(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 3600) return Math.max(1, Math.floor(seconds / 60)) + ' min ago'
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago'
  return Math.floor(seconds / 86400) + ' days ago'
}

function formatRequestDate(value: string | null) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Flexible schedule'
}

function buildProviderMonthlySeries(requests: DbRequest[], quotes: DbQuote[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    const value = quotes.filter((quote) => quote.status === 'Accepted' && quote.created_at.startsWith(key)).reduce((sum, quote) => sum + Number(quote.amount), 0)
    const jobs = requests.filter((request) => request.status === 'Completed' && request.created_at.startsWith(key)).length
    return { label: date.toLocaleDateString(undefined, { month: 'short' }), value, jobs }
  })
}

function MapPinIcon() {
  return <span aria-hidden="true">⌖</span>
}
