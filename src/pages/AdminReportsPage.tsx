import { useEffect, useState } from 'react'
import { Activity, CircleDollarSign, FileText, ShieldCheck, UsersRound } from 'lucide-react'
import { getAdminDashboardStats, getAdminServiceReport, type AdminDashboardStats, type AdminServiceReport } from '../lib/phase6Api'

export function AdminReportsPage(){
 const [stats,setStats]=useState<AdminDashboardStats|null>(null)
 const [services,setServices]=useState<AdminServiceReport[]>([])
 const [days,setDays]=useState(30)
 useEffect(()=>{const to=new Date();const from=new Date(Date.now()-days*86400000);void Promise.all([getAdminDashboardStats(from.toISOString(),to.toISOString()),getAdminServiceReport(from.toISOString(),to.toISOString())]).then(([a,b])=>{setStats(a);setServices(b)}).catch(()=>undefined)},[days])
 const metrics=stats?[['Requests',stats.requests,FileText],['Completed',stats.completed_jobs,Activity],['Providers',stats.providers,ShieldCheck],['Customers',stats.customers,UsersRound],['Revenue','₱'+Number(stats.revenue).toLocaleString(),CircleDollarSign],['Open disputes',stats.open_disputes,Activity]] as const:[]
 return <div className="workspaceDashboard adminModern">
  <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">REPORTS & INTELLIGENCE</span><h1>Marketplace reports</h1><p>Live operational metrics calculated from the production database.</p></div><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></div>
  <div className="metricRow">{metrics.map(([label,value,Icon])=><div className="metricCard" key={label}><div className="metricIcon"><Icon size={18}/></div><span>{label}</span><strong>{value}</strong><small>Selected period</small></div>)}</div>
  <section className="dashboardCard"><div className="cardHeading"><div><span className="eyebrow">SERVICE PERFORMANCE</span><h2>Services</h2></div></div>
   <div className="adminLiveTable">{services.map(s=><div className="adminLiveRow" key={s.service_key}><div><strong>{s.service_key}</strong><small>{s.requests} requests · {s.quoted} quoted · {s.completed} completed</small></div><strong>₱{Number(s.revenue).toLocaleString()}</strong></div>)}{!services.length&&<div className="emptyModern"><FileText size={20}/><strong>No report data for this period</strong></div>}</div>
  </section>
 </div>
}
