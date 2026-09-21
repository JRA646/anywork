import { useMemo, useState } from 'react'
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
import { requests } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'

type RequestFilter = 'All' | 'Requested' | 'Quoted' | 'Scheduled' | 'In Progress' | 'Completed'

const filters: RequestFilter[] = ['All', 'Requested', 'Quoted', 'Scheduled', 'In Progress', 'Completed']

export function CustomerRequestsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [active, setActive] = useState<RequestFilter>('All')
  const [query, setQuery] = useState('')

  const mine = useMemo(() => {
    return requests
      .filter((request) => request.customer === 'John Doe')
      .filter((request) => active === 'All' || request.status === active)
      .filter((request) => (request.id + ' ' + request.title + ' ' + request.location).toLowerCase().includes(query.toLowerCase()))
  }, [active, query])

  const allMine = requests.filter((request) => request.customer === 'John Doe')
  const quoteCount = allMine.reduce((total, request) => total + request.quotes.length, 0)
  const scheduledCount = allMine.filter((request) => request.status === 'Scheduled').length
  const activeCount = allMine.filter((request) => request.status !== 'Completed').length
  const nextRequest = allMine.find((request) => request.status === 'Scheduled' || request.status === 'In Progress')

  return (
    <div className="workspaceDashboard customerRequestsPage">
      <div className="customerRequestsHero">
        <div>
          <span className="eyebrow">REQUESTS</span>
          <h1>My requests</h1>
          <p>Keep every service request, quote and scheduled job organized in one place.</p>
        </div>
        <button className="buttonPrimary customerRequestsCta" onClick={() => onNavigate('/services')}>
          <Plus size={17} /> New request
        </button>
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
            <small>{nextRequest ? nextRequest.date : 'Create a new request to get started.'}</small>
          </div>
          <Clock3 size={18} />
        </div>
      </div>

      <div className="requestToolbarModern">
        <div className="requestSearchModern">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search requests..."
            aria-label="Search requests"
          />
        </div>
        <button className="filterButton requestFilterButton" type="button">
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      <div className="requestFilterTabs" role="tablist" aria-label="Request status">
        {filters.map((filter) => {
          const count = filter === 'All' ? allMine.length : allMine.filter((request) => request.status === filter).length
          return (
            <button
              key={filter}
              type="button"
              className={active === filter ? 'active' : ''}
              onClick={() => setActive(filter)}
              role="tab"
              aria-selected={active === filter}
            >
              <span>{filter}</span>
              <b>{count}</b>
            </button>
          )
        })}
      </div>

      {mine.length ? (
        <div className="requestListModern requestListEnhanced">
          {mine.map((request) => (
            <button
              className="requestCardModern customerRequestCard"
              key={request.id}
              onClick={() => onNavigate('/customer/requests/' + request.id)}
            >
              <div className="requestCardAccent" />
              <div className="customerRequestMain">
                <div className="customerRequestTopline">
                  <span className="requestId">{request.id}</span>
                  <StatusBadge status={request.status} />
                </div>
                <h3>{request.title}</h3>
                <p className="customerRequestMeta">
                  <span><FileText size={13} /> {request.quotes.length} {request.quotes.length === 1 ? 'quote' : 'quotes'}</span>
                  <span><CalendarDays size={13} /> {request.date}</span>
                </p>
                <p className="customerRequestLocation">{request.location}</p>
              </div>
              <div className="customerRequestSide">
                <span>Budget</span>
                <strong>{'$' + request.budget.toLocaleString()}</strong>
                <small><ArrowUpRight size={13} /> View request</small>
              </div>
              <ChevronRight className="customerRequestArrow" size={18} />
            </button>
          ))}
        </div>
      ) : (
        <div className="requestEmptyModern">
          <div className="requestEmptyIcon"><CheckCircle2 size={24} /></div>
          <span className="eyebrow">NO MATCHES</span>
          <h2>No requests found</h2>
          <p>Try another search or choose a different status. You can also start a new service request.</p>
          <button className="buttonPrimary" onClick={() => onNavigate('/services')}>Browse services <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  )
}
