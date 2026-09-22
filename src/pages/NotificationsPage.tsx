import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, ChevronRight } from 'lucide-react'
import { listNotifications, markNotificationRead, type NotificationRow } from '../lib/phase6Api'

export function NotificationsPage(){
 const [rows,setRows]=useState<NotificationRow[]>([])
 const [filter,setFilter]=useState('All')
 const load=()=>void listNotifications().then(setRows).catch(()=>setRows([]))
 useEffect(()=>{load()},[])
 const filtered=useMemo(()=>rows.filter(r=>filter==='All'||r.category===filter),[rows,filter])
 const read=async(id:string)=>{await markNotificationRead(id);setRows(r=>r.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x))}
 return <div className="workspaceDashboard productionWorkspace">
  <div className="workspacePageTitle"><div><span className="eyebrow">NOTIFICATIONS</span><h1>Notifications</h1><p>Requests, appointments, messages, payments and system updates in one place.</p></div></div>
  <div className="adminCategoryTabs">{['All','Requests','Appointments','Messages','Payments','Reviews','System'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
  <section className="dashboardCard">
   {filtered.map(row=><button className="productionListRow" key={row.id} onClick={()=>void read(row.id)} style={{width:'100%',textAlign:'left',opacity:row.read_at?.length?0.7:1}}>
    <div><strong>{row.title}</strong><span>{row.body}</span><small>{new Date(row.created_at).toLocaleString()}</small></div>
    <div>{!row.read_at?<span className="statusBadge neutral"><Bell size={13}/> New</span>:<Check size={15}/>}<ChevronRight size={16}/></div>
   </button>)}
   {!filtered.length&&<div className="emptyModern"><Bell size={20}/><strong>No notifications</strong></div>}
  </section>
 </div>
}
