import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, MapPin, RefreshCw, Search, UserCheck, Users } from 'lucide-react'
import {
  assignProvider,
  generateProviderMatches,
  listDispatchQueue,
  listProviderMatches,
  type DispatchQueueRow,
  type ProviderMatch,
} from '../lib/productionApi'

export function DispatchCenterPage() {
  const [rows, setRows] = useState<DispatchQueueRow[]>([])
  const [selected, setSelected] = useState<DispatchQueueRow | null>(null)
  const [matches, setMatches] = useState<ProviderMatch[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Needs attention')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setRows(await listDispatchQueue())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load dispatch queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const openRequest = async (row: DispatchQueueRow) => {
    setSelected(row)
    setMessage('')
    setBusy(true)
    try {
      await generateProviderMatches(row.id)
      setMatches(await listProviderMatches(row.id))
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to find matching providers.')
    } finally {
      setBusy(false)
    }
  }

  const assign = async (providerId: string) => {
    if (!selected) return
    setBusy(true)
    setMessage('')
    try {
      await assignProvider(selected.id, providerId)
      setMessage('Provider assigned and the job pipeline has been updated.')
      setSelected(null)
      setMatches([])
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to assign provider.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = rows.filter((row) => {
    const text = (row.request_number + ' ' + row.title + ' ' + row.location + ' ' + row.service_key).toLowerCase()
    const matchesSearch = text.includes(query.trim().toLowerCase())
    const needsAttention = !row.selected_provider_id || ['Requested', 'Quoted'].includes(row.status)
    const matchesFilter = filter === 'All' || (filter === 'Needs attention' && needsAttention) || (filter === 'Scheduled' && row.status === 'Scheduled')
    return matchesSearch && matchesFilter
  })

  return (
    <div className="workspaceDashboard productionWorkspace">
      <div className="workspaceWelcome experienceWelcome">
        <div>
          <span className="eyebrow">OPERATIONS</span>
          <h1>Dispatch center</h1>
          <p>See which requests need attention, find matching providers and assign work without jumping between modules.</p>
        </div>
        <button className="buttonSecondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button>
      </div>

      <div className="metricRow">
        <Metric label="Needs attention" value={String(rows.filter(row => !row.selected_provider_id && row.status !== 'Completed').length)} note="Unassigned requests" icon={<AlertTriangle/>}/>
        <Metric label="Scheduled today" value={String(rows.filter(row => row.status === 'Scheduled' && row.preferred_date && new Date(row.preferred_date).toDateString() === new Date().toDateString()).length)} note="Today's field work" icon={<CalendarDays/>}/>
        <Metric label="In progress" value={String(rows.filter(row => row.status === 'In Progress').length)} note="Active service jobs" icon={<CheckCircle2/>}/>
        <Metric label="Open requests" value={String(rows.filter(row => row.status !== 'Completed').length)} note="Current pipeline" icon={<Users/>}/>
      </div>

      <section className="dashboardCard dispatchCard">
        <div className="cardHeading">
          <div><span className="eyebrow">JOB QUEUE</span><h2>Requests that need coordination</h2></div>
        </div>
        <div className="dispatchToolbar">
          <div className="searchField"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search request, service or location..." /></div>
          <div className="requestFilterTabs">
            {['Needs attention','Scheduled','All'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
        </div>

        {loading ? <div className="emptyModern"><p>Loading dispatch queue…</p></div> : filtered.length ? (
          <div className="dispatchQueue">
            {filtered.map(row => (
              <button className={'dispatchRow ' + (selected?.id === row.id ? 'active' : '')} key={row.id} onClick={() => void openRequest(row)}>
                <div className="dispatchPriority"><span className={'priorityDot priority' + row.priority}>{row.priority}</span></div>
                <div className="dispatchMain">
                  <span className="requestId">{row.request_number}</span>
                  <strong>{row.title}</strong>
                  <small><MapPin size={12}/> {row.location} · {row.service_key}</small>
                </div>
                <div className="dispatchDate">
                  <span>{row.preferred_date ? new Date(row.preferred_date).toLocaleDateString([], {month:'short',day:'numeric'}) : 'Flexible'}</span>
                  <small>{row.suggested_provider_count} suggested</small>
                </div>
                <span className="statusBadge neutral">{row.selected_provider_id ? row.status : 'Unassigned'}</span>
              </button>
            ))}
          </div>
        ) : <div className="emptyModern"><p>No requests match the current queue.</p></div>}
      </section>

      {selected && (
        <section className="dashboardCard dispatchMatches">
          <div className="cardHeading">
            <div><span className="eyebrow">PROVIDER MATCHING</span><h2>{selected.title}</h2><p>{selected.request_number} · {selected.location}</p></div>
            <button className="buttonGhost" onClick={() => { setSelected(null); setMatches([]) }}>Close</button>
          </div>
          {busy && <div className="dispatchLoading"><RefreshCw size={16}/> Finding available providers…</div>}
          {message && <div className="dispatchMessage">{message}</div>}
          {!busy && matches.length > 0 && (
            <div className="providerMatchGrid">
              {matches.slice(0, 8).map(match => (
                <div className="providerMatchCard" key={match.provider_id}>
                  <div className="providerMatchTop"><div className="providerMatchAvatar">{match.display_name.slice(0,1).toUpperCase()}</div><div><strong>{match.company_name || match.display_name}</strong><span>{match.display_name}</span></div><b>{Math.round(match.match_score)}%</b></div>
                  <div className="providerMatchReasons">{match.reasons.map(reason => <span key={reason}>✓ {reason}</span>)}</div>
                  <button className="buttonPrimary" onClick={() => void assign(match.provider_id)} disabled={busy}><UserCheck size={15}/> Assign provider</button>
                </div>
              ))}
            </div>
          )}
          {!busy && !matches.length && <div className="emptyModern"><p>No eligible provider matches were found. Check the service, coverage area and provider availability.</p></div>}
        </section>
      )}
    </div>
  )
}

function Metric({ label, value, note, icon }: { label:string; value:string; note:string; icon:React.ReactNode }) {
  return <div className="metricCard"><div className="metricIcon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}
