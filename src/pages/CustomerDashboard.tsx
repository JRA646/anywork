import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, CircleDollarSign, Clock3, FileText, TrendingUp } from 'lucide-react'
import { ProviderCard } from '../components/ProviderCard'
import { StatusBadge } from '../components/StatusBadge'
import { providers } from '../data/mockData'
import type { AnyWorkProfile } from '../types/auth'
import { listCustomerQuotes, listCustomerRequests, type DbQuote, type DbRequest } from '../lib/anyworkApi'

export function CustomerDashboard({ profile, onNavigate }: { profile: AnyWorkProfile; onNavigate: (path: string) => void }) {
  const name = profile.first_name || profile.display_name.split(' ')[0] || 'there'
  const [requests, setRequests] = useState<DbRequest[]>([])
  const [quotes, setQuotes] = useState<DbQuote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listCustomerRequests()
      .then(async (rows) => {
        setRequests(rows)
        setQuotes(await listCustomerQuotes(rows.map((row) => row.id)))
      })
      .finally(() => setLoading(false))
  }, [])

  const active = requests.filter((request) => request.status !== 'Completed')
  const accepted = quotes.filter((quote) => quote.status === 'Accepted')
  const spend = accepted.reduce((sum, quote) => sum + Number(quote.amount), 0)
  const quoteCount = quotes.filter((quote) => quote.status === 'Pending').length
  const monthly = useMemo(() => buildMonthlySeries(requests, accepted), [requests, accepted])
  const maxMonthly = Math.max(...monthly.map((item) => item.value), 1)

  return (
    <div className="workspaceDashboard">
      <div className="workspaceWelcome experienceWelcome customerWelcome">
        <div>
          <span className="eyebrow">CUSTOMER HOME</span>
          <h1>Welcome, {name}.</h1>
          <p>Track your requests, compare quotes and keep every job moving.</p>
        </div>
        <button className="buttonPrimary" onClick={() => onNavigate('/services')}>Find a service <ArrowRight size={17} /></button>
      </div>

      <section className="customerActionCenter">
        <div>
          <span className="eyebrow">NEXT ACTION</span>
          <h2>{quoteCount > 0 ? 'You have provider quotes waiting.' : active.length ? 'Your service work is moving.' : 'Ready to get something done?'}</h2>
          <p>{quoteCount > 0 ? 'Review the quotes, compare availability and choose the provider that fits your job.' : active.length ? 'Open your active request to see the latest status, messages and appointment details.' : 'Tell us what you need and ANYwork will help connect you with the right provider.'}</p>
        </div>
        <button className="buttonPrimary" onClick={() => quoteCount > 0
          ? onNavigate('/customer/requests/' + (quotes.find((quote) => quote.status === 'Pending')?.request_id || ''))
          : active.length
            ? onNavigate('/customer/requests/' + active[0].id)
            : onNavigate('/services')}>
          {quoteCount > 0 ? 'Compare quotes' : active.length ? 'View my work' : 'Request a service'} <ArrowRight size={16}/>
        </button>
      </section>

      <div className="metricRow">
        <Metric icon={<FileText />} label="Active requests" value={loading ? '—' : String(active.length)} note={requests.length + ' total requests'} />
        <Metric icon={<Clock3 />} label="Quotes waiting" value={loading ? '—' : String(quoteCount)} note="Ready to compare" />
        <Metric icon={<CircleDollarSign />} label="Accepted spend" value={loading ? '—' : '₱' + spend.toLocaleString('en-PH')} note="From accepted quotes" />
        <Metric icon={<CalendarDays />} label="Upcoming jobs" value={loading ? '—' : String(requests.filter((r) => r.status === 'Scheduled').length)} note="Scheduled work" />
      </div>

      <div className="customerQuickLinks">
        <button onClick={() => onNavigate('/services')}><strong>Browse services</strong><span>Find the service you need</span><ArrowRight size={15}/></button>
        <button onClick={() => onNavigate('/customer/jobs')}><strong>My jobs</strong><span>Track active and completed work</span><ArrowRight size={15}/></button>
        <button onClick={() => onNavigate('/customer/messages')}><strong>Messages</strong><span>Talk to your provider</span><ArrowRight size={15}/></button>
        <button onClick={() => onNavigate('/customer/profile')}><strong>Account</strong><span>Profile and saved details</span><ArrowRight size={15}/></button>
      </div>

      <div className="dashboardGrid">
        <section className="dashboardCard wide">
          <CardHeading eyebrow="ACTIVITY" title="Requests & spend" />
          <div className="dashboardChartWrap">
            <div className="dashboardChartLegend"><span><i className="chartDot chartDotPrimary" /> Requests</span><span><i className="chartDot chartDotSecondary" /> Spend</span></div>
            <svg className="dashboardChart" viewBox="0 0 720 230" role="img" aria-label="Customer request activity and accepted spend for the last six months">
              <line x1="45" y1="190" x2="700" y2="190" className="chartAxis" />
              {monthly.map((item, index) => {
                const x = 70 + index * 125
                const height = (item.value / maxMonthly) * 135
                return <g key={item.label}>
                  <rect x={x - 24} y={190 - height} width="48" height={height} rx="7" className="chartBar" />
                  <text x={x} y="212" textAnchor="middle" className="chartLabel">{item.label}</text>
                  <text x={x} y={185 - height} textAnchor="middle" className="chartValue">{item.value}</text>
                </g>
              })}
            </svg>
          </div>
        </section>

        <section className="dashboardCard">
          <CardHeading eyebrow="NEXT UP" title="Upcoming work" />
          {requests.filter((r) => r.status === 'Scheduled' || r.status === 'In Progress').slice(0, 3).map((request) => (
            <button className="requestRowModern" key={request.id} onClick={() => onNavigate('/customer/requests/' + request.id)}>
              <div><span className="requestId">{request.request_number}</span><strong>{request.title}</strong><small>{request.location} · {formatDate(request.preferred_date)}</small></div>
              <StatusBadge status={request.status} />
              <ArrowRight size={15} />
            </button>
          ))}
          {!requests.some((r) => r.status === 'Scheduled' || r.status === 'In Progress') && <div className="emptyModern"><p>No upcoming work yet.</p><button className="buttonSecondary" onClick={() => onNavigate('/services')}>Browse services</button></div>}
        </section>

        <section className="dashboardCard">
          <CardHeading eyebrow="QUOTES" title="Compare before choosing" />
          <TrendingUp size={22} className="cardAccentIcon" />
          <p className="cardMuted">{quoteCount ? quoteCount + ' provider quotes are waiting for your review.' : 'No quotes are waiting right now.'}</p>
          {quoteCount > 0 && <button className="quoteHighlight" onClick={() => {
            const requestId = quotes.find((quote) => quote.status === 'Pending')?.request_id
            if (requestId) onNavigate('/customer/requests/' + requestId)
          }}><div><strong>{quoteCount} quotes</strong><span>Open your request to compare</span></div><ArrowRight size={17} /></button>}
        </section>

        <section className="dashboardCard wide">
          <CardHeading eyebrow="RECENT REQUESTS" title="Your work history" action="View all" onClick={() => onNavigate('/customer/requests')} />
          {requests.slice(0, 5).map((request) => (
            <button className="requestRowModern" key={request.id} onClick={() => onNavigate('/customer/requests/' + request.id)}>
              <div><span className="requestId">{request.request_number}</span><strong>{request.title}</strong><small>{request.location} · {formatDate(request.preferred_date)}</small></div>
              <StatusBadge status={request.status} />
              <ArrowRight size={15} />
            </button>
          ))}
          {!requests.length && !loading && <div className="emptyModern"><p>No service requests yet.</p><button className="buttonSecondary" onClick={() => onNavigate('/services')}>Browse services</button></div>}
        </section>

        <section className="dashboardCard wide">
          <CardHeading eyebrow="PROVIDERS" title="Recommended providers" action="Browse" onClick={() => onNavigate('/providers')} />
          <div className="providerGridCompact">{providers.slice(0, 3).map((provider) => <ProviderCard key={provider.id} provider={provider} compact onClick={() => onNavigate('/providers/' + provider.id)} />)}</div>
        </section>
      </div>
    </div>
  )
}

function buildMonthlySeries(requests: DbRequest[], quotes: DbQuote[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    const count = requests.filter((request) => request.created_at.startsWith(key)).length
    const spend = quotes.filter((quote) => quote.created_at.startsWith(key)).reduce((sum, quote) => sum + Number(quote.amount), 0)
    return { label: date.toLocaleDateString(undefined, { month: 'short' }), value: count, spend }
  })
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : 'Date not set'
}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="metricCard"><div className="metricIcon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function CardHeading({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>
}
