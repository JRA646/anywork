import { useEffect, useState } from 'react'
import { Mail, Save, XCircle } from 'lucide-react'
import { listEmailQueue, listNotificationTemplates, updateEmailQueueStatus, updateNotificationTemplate } from '../lib/phase6Api'

export function AdminEmailPage(){
 const [queue,setQueue]=useState<any[]>([]); const [templates,setTemplates]=useState<any[]>([]); const [tab,setTab]=useState<'queue'|'templates'>('queue')
 const load=()=>void Promise.all([listEmailQueue(),listNotificationTemplates()]).then(([q,t])=>{setQueue(q);setTemplates(t)}).catch(()=>undefined)
 useEffect(()=>{load()},[])
 return <div className="workspaceDashboard adminModern">
  <div className="workspacePageTitle adminPageTitle"><div><span className="eyebrow">COMMUNICATIONS</span><h1>Email management</h1><p>Monitor queued delivery and maintain transactional templates.</p></div></div>
  <div className="adminCategoryTabs"><button className={tab==='queue'?'active':''} onClick={()=>setTab('queue')}>Delivery queue</button><button className={tab==='templates'?'active':''} onClick={()=>setTab('templates')}>Templates</button></div>
  {tab==='queue'?<section className="dashboardCard"><div className="adminLiveTable">{queue.map(item=><div className="adminLiveRow" key={item.id}><div><strong>{item.subject}</strong><small>{item.recipient_email} · {new Date(item.created_at).toLocaleString()}</small></div><span className="statusBadge neutral">{item.status}</span>{item.status==='Queued'&&<button className="buttonSecondary" onClick={()=>void updateEmailQueueStatus(item.id,'Cancelled').then(load)}><XCircle size={14}/> Cancel</button>}</div>)}{!queue.length&&<div className="emptyModern"><Mail size={20}/><strong>No queued emails</strong></div>}</div></section>
  :<div className="adminOverviewGrid">{templates.map(t=><TemplateEditor key={t.id} template={t} onSaved={load}/>)}</div>}
 </div>
}
function TemplateEditor({template,onSaved}:{template:any;onSaved:()=>void}){
 const [subject,setSubject]=useState(template.subject_template); const [body,setBody]=useState(template.body_template); const [enabled,setEnabled]=useState(template.enabled); const [saving,setSaving]=useState(false)
 const save=async()=>{setSaving(true);try{await updateNotificationTemplate(template.id,{subject_template:subject,body_template:body,enabled});onSaved()}finally{setSaving(false)}}
 return <section className="dashboardCard"><div className="cardHeading"><div><span className="eyebrow">{template.event_key}</span><h2>{template.name}</h2></div><button className={enabled?'adminToggle active':'adminToggle'} onClick={()=>setEnabled(v=>!v)}><span/></button></div><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Body<textarea rows={6} value={body} onChange={e=>setBody(e.target.value)}/></label><button className="buttonPrimary" disabled={saving} onClick={()=>void save()}><Save size={14}/>{saving?'Saving…':'Save template'}</button></section>
}
