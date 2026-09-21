import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ChevronRight, CircleDollarSign, FileText, Search, ShieldCheck, UsersRound } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import {
  getAdminOverviewStats, listAdminProfiles, listAdminRequests, updateAdminProfile, updateAdminRequestStatus,
  type AdminOverviewStats, type DbProfile, type DbRequest,
} from '../lib/anyworkApi'
import { AdminServices } from './AdminDashboard'

export function AdminOperationsPage({ section, onNavigate }: { section: string; onNavigate: (path: string) => void }) {
  if (section === 'services') return <AdminServices />
  if (section === 'providers') return <AdminDirectory role="provider" />
  if (section === 'customers') return <AdminDirectory role="customer" />
  if (section === 'requests') return <AdminRequestsDynamic />
  if (section === 'settings') return <AdminSettingsDynamic />
  return <AdminHomeDynamic onNavigate={onNavigate} />
}

function AdminHomeDynamic({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null)
  const [requests, setRequests] = useState<DbRequest[]>([])
  useEffect(() => {
    void Promise.all([getAdminOverviewStats(), listAdminRequests(8)]).then(([nextStats, rows]) => { setStats(nextStats); setRequests(rows) }).catch(() => undefined)
  }, [])
  const metrics = [
    ['Open requests', stats?.openRequests ?? '—', FileText],
    ['Active providers', stats?.activeProviders ?? '—', ShieldCheck],
    ['Customers', stats?.customers ?? '—', UsersRound],
    ['Accepted quote value', stats ? '$' + stats.gmv.toLocaleString() : '—', CircleDollarSign],
  ] as const
  return <div className="workspaceDashboard adminModern">
    <div className="workspaceWelcome adminHero"><div><span className="eyebrow">OPERATIONS</span><h1>Marketplace operations</h1><p>Manage real requests, providers, customers and the service catalog from one data-driven workspace.</p></div><button className="buttonPrimary" onClick={() => onNavigate('/admin/requests')}>Review requests <ChevronRight size={16} /></button></div>
    <div className="metricRow adminMetricRow">{metrics.map(([label,value,Icon]) => <div className="metricCard adminMetricCard" key={label}><div className="metricIcon"><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{label === 'Accepted quote value' ? 'Accepted quotes' : 'Live database value'}</small></div>)}</div>
    <div className="adminOverviewGrid">
      <section className="dashboardCard adminQueueCard"><div className="cardHeading"><div><span className="eyebrow">LIVE QUEUE</span><h2>Recent requests</h2></div><button className="textLink" onClick={() => onNavigate('/admin/requests')}>View all <ChevronRight size={15}/></button></div>
        <div className="adminQueueList">{requests.map((request) => <button className="adminQueueRowModern" key={request.id} onClick={() => onNavigate('/admin/requests')}><div className="adminQueueIdentity"><span className="requestId">{request.request_number}</span><strong>{request.title}</strong><small>{request.location} · {request.service_key}</small></div><div className="adminQueueMeta"><StatusBadge status={request.status}/><strong>{request.budget ? '$'+Number(request.budget).toLocaleString() : 'Quote'}</strong></div><ChevronRight size={17}/></button>)}{!requests.length && <div className="emptyModern"><FileText size={20}/><strong>No requests yet</strong></div>}</div>
      </section>
      <section className="dashboardCard adminHealthCard"><div className="cardHeading"><div><span className="eyebrow">PLATFORM</span><h2>Live totals</h2></div></div><div className="healthMetricList"><Health label="Requests" value={stats?.requests ?? 0}/><Health label="Completed jobs" value={stats?.completedJobs ?? 0}/><Health label="Providers" value={stats?.providers ?? 0}/><Health label="Customers" value={stats?.customers ?? 0}/></div></section>
    </div>
  </div>
}

function AdminRequestsDynamic() {
  const [rows, setRows] = useState<DbRequest[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(() => listAdminRequests(200).then(setRows).catch(() => setRows([])), [])
  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => rows.filter((row) => (status === 'All' || row.status === status) && [row.request_number,row.title,row.location,row.service_key].join(' ').toLowerCase().includes(query.toLowerCase())), [rows,query,status])
  const statuses = ['All','Requested','Quoted','Scheduled','In Progress','Completed']
  const move = async (row: DbRequest, next: DbRequest['status']) => {
    setBusy(row.id)
    try { const updated = await updateAdminRequestStatus(row.id,next); setRows((current) => current.map((item) => item.id === row.id ? updated : item)) } finally { setBusy(null) }
  }
  return <div className="workspaceDashboard adminModern">
    <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">REQUESTS</span><h1>Request queue</h1><p>Every request is loaded from the live ANYwork database.</p></div></div>
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search request, location or service..."/></div><div className="adminCategoryTabs">{statuses.map(item=><button key={item} className={status===item?'active':''} onClick={()=>setStatus(item)}>{item}</button>)}</div></div>
    <div className="adminLiveTable">{filtered.map(row=><div className="adminLiveRow" key={row.id}><div><span className="requestId">{row.request_number}</span><strong>{row.title}</strong><small>{row.location} · {row.service_key} · {new Date(row.created_at).toLocaleString()}</small></div><StatusBadge status={row.status}/><select value={row.status} disabled={busy===row.id} onChange={(e)=>void move(row,e.target.value as DbRequest['status'])}>{statuses.slice(1).map(item=><option key={item}>{item}</option>)}</select></div>)}{!filtered.length&&<div className="emptyModern"><Search size={20}/><strong>No matching requests</strong></div>}</div>
  </div>
}

function AdminDirectory({ role }: { role: 'provider' | 'customer' }) {
  const [rows,setRows]=useState<(DbProfile & {created_at:string})[]>([])
  const [query,setQuery]=useState('')
  const load=useCallback(()=>listAdminProfiles(role,300).then(setRows).catch(()=>setRows([])),[role])
  useEffect(()=>{void load()},[load])
  const filtered=rows.filter(row=>[row.display_name,row.first_name,row.last_name,row.company_name||'',row.city||''].join(' ').toLowerCase().includes(query.toLowerCase()))
  const toggle=async(row:DbProfile & {created_at:string})=>{const updated=await updateAdminProfile(row.user_id,{isActive:!row.is_active});setRows(current=>current.map(item=>item.user_id===row.user_id?{...item,...updated}:item))}
  return <div className="workspaceDashboard adminModern">
    <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">{role.toUpperCase()} DIRECTORY</span><h1>{role==='provider'?'Providers':'Customers'}</h1><p>Manage live accounts and account access.</p></div></div>
    <div className="adminToolbar"><div className="searchField adminSearch"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={'Search '+role+'s...'}/></div></div>
    <div className="adminLiveTable">{filtered.map(row=><div className="adminLiveRow" key={row.user_id}><div className="adminDirectoryIdentity">{row.avatar_url?<img src={row.avatar_url} alt=""/>:<span>{(row.display_name||row.first_name||'?').slice(0,2).toUpperCase()}</span>}<div><strong>{row.display_name||[row.first_name,row.last_name].filter(Boolean).join(' ')||'Unnamed'}</strong><small>{row.company_name||row.city||'No company/location'} · {new Date(row.created_at).toLocaleDateString()}</small></div></div><span className={row.is_active?'adminStatusActive':'adminStatusReview'}>{row.is_active?'Active':'Inactive'}</span><button className="buttonSecondary" onClick={()=>void toggle(row)}>{row.is_active?'Deactivate':'Activate'}</button></div>)}{!filtered.length&&<div className="emptyModern"><UsersRound size={20}/><strong>No {role}s found</strong></div>}</div>
  </div>
}

function AdminSettingsDynamic() {
  const [stats,setStats]=useState<AdminOverviewStats|null>(null)
  useEffect(()=>{void getAdminOverviewStats().then(setStats).catch(()=>undefined)},[])
  return <div className="workspaceDashboard adminModern"><div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">PLATFORM</span><h1>Settings</h1><p>Configuration should be backed by database settings as the platform grows.</p></div></div><section className="dashboardCard"><div className="cardHeading"><div><span className="eyebrow">CURRENT DATA</span><h2>Marketplace baseline</h2></div></div><div className="healthMetricList"><Health label="Requests" value={stats?.requests??0}/><Health label="Providers" value={stats?.providers??0}/><Health label="Customers" value={stats?.customers??0}/><Health label="Completed jobs" value={stats?.completedJobs??0}/></div></section></div>
}

function Health({label,value}:{label:string|number;value:string|number}) { return <div className="healthMetric"><div className="healthMetricTop"><span><Activity size={15}/>{label}</span><strong>{value}</strong></div></div> }
