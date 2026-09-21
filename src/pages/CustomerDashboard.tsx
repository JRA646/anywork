import { ArrowRight, CalendarDays, ChevronRight, CircleDollarSign } from 'lucide-react'
import { quotes, requests, providers } from '../data/mockData'
import { ProviderCard } from '../components/ProviderCard'
import { StatusBadge } from '../components/StatusBadge'
import type { AnyWorkProfile } from '../types/auth'

export function CustomerDashboard({ profile, onNavigate }: { profile: AnyWorkProfile; onNavigate: (path: string) => void }) {
  const name = profile.first_name || profile.display_name.split(' ')[0] || 'there'
  const mine = requests.filter((request) => request.customer === profile.display_name)
  const demoMine = profile.display_name === 'John Doe' ? mine : []
  const quoteRequest = demoMine.find((request) => request.status === 'Quoted')
  const quoteCount = quoteRequest?.quotes.length || 0
  const lowestQuote = quoteRequest ? Math.min(...quoteRequest.quotes.map((id) => quotes.find((q) => q.id === id)?.amount || 99999)) : 0

  return (
    <div className="workspaceDashboard">
      <div className="workspaceWelcome">
        <div>
          <span className="eyebrow">CUSTOMER HOME</span>
          <h1>Welcome, {name}.</h1>
          <p>Here is what is happening with your work.</p>
        </div>
        <button className="buttonPrimary" onClick={() => onNavigate('/services')}>Find a service <ArrowRight size={17} /></button>
      </div>

      <div className="metricRow">
        <Metric label="Active requests" value={String(demoMine.filter((item) => item.status !== 'Completed').length)} note={demoMine.length ? 'Across ' + demoMine.length + ' total requests' : 'Start by requesting a service'} />
        <Metric label="Quotes waiting" value={String(quoteCount)} note="Ready to compare" />
        <Metric label="Next appointment" value={demoMine.length ? '27 Sep' : '—'} note={demoMine.length ? '9:00 AM · North Sydney' : 'No appointment yet'} />
        <Metric label="Current spend" value={demoMine.length ? '$2,770' : '$0'} note="This month" />
      </div>

      <div className="dashboardGrid">
        <section className="dashboardCard wide">
          <CardHeading eyebrow="YOUR REQUESTS" title="Recent work" action="View all" onClick={() => onNavigate('/customer/requests')} />
          {demoMine.length ? demoMine.map((request) => (
            <button className="requestRowModern" key={request.id} onClick={() => onNavigate('/customer/requests/' + request.id)}>
              <div>
                <span className="requestId">{request.id}</span>
                <strong>{request.title}</strong>
                <small>{request.location} · {request.date}</small>
              </div>
              <StatusBadge status={request.status} />
              <ChevronRight size={16} />
            </button>
          )) : (
            <div className="emptyModern">
              <p>No service requests yet.</p>
              <button className="buttonSecondary" onClick={() => onNavigate('/services')}>Browse services</button>
            </div>
          )}
        </section>

        <section className="dashboardCard">
          <CardHeading eyebrow="NEXT UP" title="Appointment" />
          {demoMine.length ? (
            <div className="appointmentCard">
              <CalendarDays size={21} />
              <strong>Office furniture assembly</strong>
              <span>27 Sep 2026 · 9:00 AM</span>
              <small>North Sydney · Northside Fabrication</small>
              <button className="buttonSecondary" onClick={() => onNavigate('/customer/requests/AW-1026')}>View job</button>
            </div>
          ) : (
            <div className="emptyModern">
              <p>Your next appointment will appear here.</p>
            </div>
          )}
        </section>

        <section className="dashboardCard">
          <CardHeading eyebrow="QUOTES" title="Compare before you choose" />
          <CircleDollarSign size={22} className="cardAccentIcon" />
          {quoteRequest ? (
            <>
              <p className="cardMuted">{quoteCount} providers responded to your request.</p>
              <button className="quoteHighlight" onClick={() => onNavigate('/customer/requests/AW-1027')}>
                <div><strong>{quoteCount} quotes</strong><span>{'Lowest $' + lowestQuote.toLocaleString()}</span></div>
                <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <p className="cardMuted">No quotes waiting right now.</p>
          )}
        </section>

        <section className="dashboardCard wide">
          <CardHeading eyebrow="RECOMMENDED" title="Providers for your next job" action="Browse" onClick={() => onNavigate('/services')} />
          <div className="providerGridCompact">
            {providers.slice(0, 3).map((provider) => <ProviderCard key={provider.id} provider={provider} compact onClick={() => onNavigate('/providers/' + provider.id)} />)}
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function CardHeading({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>
}
