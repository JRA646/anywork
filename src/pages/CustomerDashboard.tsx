import { ArrowRight, CalendarDays, ChevronRight, CircleDollarSign } from 'lucide-react'
import { quotes, requests, providers } from '../data/mockData'
import { ProviderCard } from '../components/ProviderCard'
import { StatusBadge } from '../components/StatusBadge'

export function CustomerDashboard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const mine = requests.filter((request) => request.customer === 'John Doe')
  const quoteRequest = mine.find((request) => request.status === 'Quoted')
  const quoteCount = quoteRequest?.quotes.length || 0
  const lowestQuote = quoteRequest ? Math.min(...quoteRequest.quotes.map((id) => quotes.find((q) => q.id === id)?.amount || 99999)) : 0
  return <div className="workspaceDashboard">
    <div className="workspaceWelcome"><div><span className="eyebrow">CUSTOMER HOME</span><h1>Good morning, John.</h1><p>Here is what is happening with your work.</p></div><button className="buttonPrimary" onClick={() => onNavigate('/services')}>Find a service <ArrowRight size={17} /></button></div>
    <div className="metricRow"><Metric label="Active requests" value={String(mine.filter((item) => item.status !== 'Completed').length)} note={'Across ' + mine.length + ' total requests'} /><Metric label="Quotes waiting" value={String(quoteCount)} note="Ready to compare" /><Metric label="Next appointment" value="27 Sep" note="9:00 AM · North Sydney" /><Metric label="Current spend" value="$2,770" note="This month" /></div>
    <div className="dashboardGrid">
      <section className="dashboardCard wide"><CardHeading eyebrow="YOUR REQUESTS" title="Recent work" action="View all" onClick={() => onNavigate('/customer/requests')} />{mine.map((request) => <button className="requestRowModern" key={request.id} onClick={() => onNavigate('/customer/requests/' + request.id)}><div><span className="requestId">{request.id}</span><strong>{request.title}</strong><small>{request.location} · {request.date}</small></div><StatusBadge status={request.status} /><ChevronRight size={16} /></button>)}</section>
      <section className="dashboardCard"><CardHeading eyebrow="NEXT UP" title="Appointment" /><div className="appointmentCard"><CalendarDays size={21} /><strong>Office furniture assembly</strong><span>27 Sep 2026 · 9:00 AM</span><small>North Sydney · Northside Fabrication</small><button className="buttonSecondary" onClick={() => onNavigate('/customer/requests/AW-1026')}>View job</button></div></section>
      <section className="dashboardCard"><CardHeading eyebrow="QUOTES" title="Compare before you choose" /><CircleDollarSign size={22} className="cardAccentIcon" />{quoteRequest ? <><p className="cardMuted">{quoteCount} providers responded to your banner request.</p><button className="quoteHighlight" onClick={() => onNavigate('/customer/requests/AW-1027')}><div><strong>{quoteCount} quotes</strong><span>{'Lowest $' + lowestQuote.toLocaleString()}</span></div><ArrowRight size={17} /></button></> : <p className="cardMuted">No quotes waiting right now.</p>}</section>
      <section className="dashboardCard wide"><CardHeading eyebrow="RECOMMENDED" title="Providers for your next job" action="Browse" onClick={() => onNavigate('/services')} /><div className="providerGridCompact">{providers.slice(0, 3).map((provider) => <ProviderCard key={provider.id} provider={provider} compact onClick={() => onNavigate('/providers/' + provider.id)} />)}</div></section>
    </div>
  </div>
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }
function CardHeading({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) { return <div className="cardHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="textLink" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div> }