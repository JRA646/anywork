import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { services } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'
import { listCustomerRequests, listQuotesForRequests, subscribeToQuotes, subscribeToRequests, type DbRequest, type DbQuote } from '../lib/anyworkApi'

type RequestFilter = 'All' | 'Requested' | 'Quoted' | 'Scheduled' | 'In Progress' | 'Completed'
const filters: RequestFilter[] = ['All', 'Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed']

export function CustomerRequestsPage({
  onNavigate,
  onCreateRequest,
}: {
  onNavigate: (path: string) => void
  onCreateRequest: () => void
}) {
  const [requests, setRequests] = useState<DbRequest[]>([])
  const [quotes, setQuotes] = useState<DbQuote[]>([])
  const [active, setActive] = useState<RequestFilter>('All')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtime, setRealtime] = useState<'connecting' | 'live' | 'offline'>('connecting')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listCustomerRequests()
      setRequests(rows)
      setQuotes(await listQuotesForRequests(rows.map((row) => row.id)))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
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
        setRequests((current) => {
          const next = [...current.filter((item) => item.id !== change.record!.id), change.record!]
          return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        })
      }
    }, (status) => {
      setRealtime(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' ? 'offline' : 'connecting')
    }).then((dispose) => { requestCleanup = dispose }).catch(() => setRealtime('offline'))

    void subscribeToQuotes((change) => {
      if (!change.record && change.oldRecord?.id) {
        setQuotes((current) => current.filter((item) => item.id !== change.oldRecord?.id))
        return
      }
      if (change.record) {
        setQuotes((current) => {
          const next = [...current.filter((item) => item.id !== change.record!.id), change.record!]
          return next.sort((a, b) => Number(a.amount) - Number(b.amount))
        })
      }
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)

    return () => {
      requestCleanup?.()
      quoteCleanup?.()
    }
  }, [])

  const filtered = useMemo(() => {
    return requests
      .filter((request) => active === 'All' || request.status === active)
      .filter((request) => (
        request.request_number + ' ' + request.title + ' ' + request.location
      ).toLowerCase().includes(query.toLowerCase()))
  }, [requests, active, query])

  const quoteCount = quotes.length
  const scheduledCount = requests.filter((request) => request.status === 'Scheduled').length
  const activeCount = requests.filter((request) => request.status !== 'Completed').length
  const nextRequest = requests.find((request) => request.status === 'Scheduled' || request.status === 'In Progress')

  const quoteCountFor = (requestId: string) => quotes.filter((quote) => quote.request_id === requestId).length
  const serviceLabel = (serviceKey: string) => {
    const service = services.find((item) => item.id === serviceKey)
    return service?.title || serviceKey
  }
  const formatDate = (value: string | null) => value
    ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Flexible schedule'

  return (
    <div className="workspaceDashboard customerRequestsPage">
      <div className="customerRequestsHero">
        <div>
          <span className="eyebrow">REQUESTS</span>
          <h1>My requests</h1>
          <p>Keep every service request, quote and scheduled job organized in one place.</p>
        </div>
        <div className="customerRequestsHeroActions">
          <span className={'requestsRealtimeStatus ' + realtime}><span /> {realtime === 'live' ? 'Live updates' : realtime === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</span>
          <button className="buttonPrimary customerRequestsCta" onClick={onCreateRequest}>
            <Plus size={17} /> New request
          </button>
        </div>
      </div>

      <div className="requestInsights">
        <div className="requestInsightCard">
          <div className="requestInsightIcon"><FileText size={17} /></div>
          <span>Active requests</span>
          <strong>{activeCount}</strong>
          <small>Across your current jobs</small>
        </div>
        <div className="requestInsightCard">
          <div className="requestInsightIcon"><ArrowUpRight size={17} /></div>
          <span>Quotes received</span>
          <strong>{quoteCount}</strong>
          <small>Ready for comparison</small>
        </div>
        <div className="requestInsightCard">
          <div className="requestInsightIcon"><CalendarDays size={17} /></div>
          <span>Scheduled</span>
          <strong>{scheduledCount}</strong>
          <small>Appointments on the calendar</small>
        </div>
        <div className="requestInsightCard requestInsightHighlight">
          <div>
            <span>Next job</span>
            <strong>{nextRequest ? nextRequest.title : 'No scheduled job'}</strong>
            <small>{nextRequest ? formatDate(nextRequest.preferred_date) : 'Create a new request to get started.'}</small>
          </div>
          <Clock3 size={18} />
        </div>
      </div>

      <div className="requestToolbarModern">
        <div className="requestSearchModern">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests..." aria-label="Search requests" />
        </div>
        <button className="filterButton requestFilterButton" type="button">
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      <div className="requestFilterTabs" role="tablist" aria-label="Request status">
        {filters.map((filter) => {
          const count = filter === 'All' ? requests.length : requests.filter((request) => request.status === filter).length
          return (
            <button key={filter} type="button" className={active === filter ? 'active' : ''} onClick={() => setActive(filter)} role="tab" aria-selected={active === filter}>
              <span>{filter}</span><b>{count}</b>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="requestEmptyModern requestLoadingState">
          <div className="requestLoadingPulse" />
          <h2>Loading your requests</h2>
          <p>Fetching your latest requests and provider responses.</p>
        </div>
      ) : error ? (
        <div className="requestEmptyModern">
          <div className="requestEmptyIcon"><CheckCircle2 size={24} /></div>
          <span className="eyebrow">COULD NOT LOAD</span>
          <h2>We couldn't load your requests</h2>
          <p>{error}</p>
          <button className="buttonPrimary" onClick={() => void load()}>Try again</button>
        </div>
      ) : filtered.length ? (
        <div className="requestListModern requestListEnhanced">
          {filtered.map((request) => (
            <button className="requestCardModern customerRequestCard" key={request.id} onClick={() => onNavigate('/customer/requests/' + request.id)}>
              <div className="requestCardAccent" />
              <div className="customerRequestMain">
                <div className="customerRequestTopline">
                  <span className="requestId">{request.request_number}</span>
                  <StatusBadge status={request.status} />
                </div>
                <h3>{request.title}</h3>
                <p className="customerRequestMeta">
                  <span><FileText size={13} /> {quoteCountFor(request.id)} {quoteCountFor(request.id) === 1 ? 'quote' : 'quotes'}</span>
                  <span><CalendarDays size={13} /> {formatDate(request.preferred_date)}</span>
                </p>
                <p className="customerRequestLocation">{request.location} · {serviceLabel(request.service_key)}</p>
              </div>
              <div className="customerRequestSide">
                <span>Budget</span>
                <strong>{request.budget !== null ? '$' + Number(request.budget).toLocaleString() : 'Open'}</strong>
                <small><ArrowUpRight size={13} /> View request</small>
              </div>
              <ChevronRight className="customerRequestArrow" size={18} />
            </button>
          ))}
        </div>
      ) : (
        <div className="requestEmptyModern">
          <div className="requestEmptyIcon"><FileText size={24} /></div>
          <span className="eyebrow">NO REQUESTS</span>
          <h2>{query || active !== 'All' ? 'No requests match your filters' : 'Start your first request'}</h2>
          <p>{query || active !== 'All' ? 'Try another search or choose a different status.' : 'Tell providers what you need and receive quotes in one place.'}</p>
          <button className="buttonPrimary" onClick={onCreateRequest}>Create your first request <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  )
}
