import { CalendarDays, ChevronRight, MapPin } from 'lucide-react'
import { requests } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'

export function CustomerRequestsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const mine = requests.filter((request) => request.customer === 'John Doe')
  return <div className="workspaceDashboard"><div className="workspacePageTitle"><span className="eyebrow">REQUESTS</span><h1>My requests</h1><p>Every request, quote and job in one place.</p></div><div className="filterTabsModern"><span className="active">All</span><span>Requested</span><span>Quoted</span><span>Scheduled</span><span>Completed</span></div><div className="requestListModern">{mine.map((request) => <button className="requestCardModern" key={request.id} onClick={() => onNavigate('/customer/requests/' + request.id)}><div><span className="requestId">{request.id}</span><h3>{request.title}</h3><p><MapPin size={14} /> {request.location} · <CalendarDays size={14} /> {request.date}</p></div><div className="requestCardRight"><StatusBadge status={request.status} /><strong>{'$' + request.budget.toLocaleString()}</strong><ChevronRight size={17} /></div></button>)}</div></div>
}