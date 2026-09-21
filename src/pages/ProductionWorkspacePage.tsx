import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, CheckCircle2, Clock3, FileText, LifeBuoy, MapPin, Plus, ShieldCheck, Star, Trash2, WalletCards } from 'lucide-react'
import { listAdminServices, type DbService, type DbRequest } from '../lib/anyworkApi'
import {
  createSupportTicket, deleteAddress, getProviderVerification, listAddresses, listAdminAuditLogs, listAdminDisputes, listAdminJobs, listAdminPayments,
  listInvoices, listPayments, listProviderAvailability, listProviderTimeOff, listReviews, listServiceFields, listSupportTickets,
  openDispute, saveAddress, saveProviderAvailability, saveProviderTimeOff, saveServiceField, submitProviderVerification, updateDispute,
  type Address, type Dispute, type Invoice, type Payment, type ServiceField, type SupportTicket, listDisputes,
} from '../lib/productionApi'
import type { AnyWorkProfile } from '../types/auth'
import { StatusBadge } from '../components/StatusBadge'

export function ProductionWorkspacePage({ role, section, profile, onNavigate }: { role: 'customer'|'provider'|'admin'; section: string; profile: AnyWorkProfile; onNavigate: (path:string)=>void }) {
  if (section === 'addresses') return <AddressesPage />
  if (section === 'invoices' || section === 'payments') return <FinancePage role={role} />
  if (section === 'reviews') return <ReviewsPage role={role} />
  if (section === 'support') return <SupportPage admin={role === 'admin'} />
  if (section === 'disputes') return <DisputesPage admin={role === 'admin'} />
  if (role === 'provider' && section === 'calendar') return <ProviderCalendarPage />
  if (role === 'provider' && section === 'verification') return <ProviderVerificationPage />
  if (role === 'provider' && section === 'checkins') return <ProviderCheckinPage onNavigate={onNavigate} />
  if (role === 'admin' && section === 'jobs') return <AdminJobsPage />
  if (role === 'admin' && section === 'audit') return <AuditPage />
  if (role === 'admin' && section === 'service-builder') return <ServiceBuilderPage />
  return <FinancePage role={role} />
}

function Panel({ title, kicker, children }: { title:string; kicker:string; children:React.ReactNode }) {
  return <section className="dashboardCard productionPanel"><div className="cardHeading"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div></div>{children}</section>
}

function AddressesPage() {
  const [rows,setRows]=useState<Address[]>([])
  const [form,setForm]=useState({label:'Home',address_line1:'',city:'',state:'',postal_code:''})
  const load=()=>listAddresses().then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[])
  const save=async()=>{if(!form.address_line1.trim())return;const row=await saveAddress(form);setRows(current=>[row,...current.filter(x=>x.id!==row.id)])}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="PROFILE" title="Saved addresses" description="Reuse service locations and keep your job details consistent."/><Panel title="Add address" kicker="LOCATION"><div className="productionFormGrid">{Object.entries(form).map(([key,value])=><label key={key}>{key.replaceAll('_',' ')}<input value={value} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><button className="buttonPrimary" onClick={()=>void save()}><Plus size={15}/> Save address</button></Panel><Panel title="Your addresses" kicker="SAVED LOCATIONS">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.label}</strong><span>{row.address_line1}, {row.city} {row.postal_code}</span></div><button className="buttonGhost" onClick={()=>void deleteAddress(row.id).then(load)}><Trash2 size={14}/></button></div>)}{!rows.length&&<Empty text="No saved addresses yet."/>}</Panel></div>
}

function FinancePage({ role }: { role:'customer'|'provider'|'admin' }) {
  const [invoices,setInvoices]=useState<Invoice[]>([])
  const [payments,setPayments]=useState<Payment[]>([])
  useEffect(()=>{if(role==='admin'){void listAdminPayments().then(setPayments).catch(()=>[]);return}void Promise.all([listInvoices(role),listPayments(role)]).then(([i,p])=>{setInvoices(i);setPayments(p)}).catch(()=>undefined)},[role])
  const total=payments.filter(p=>p.status==='Succeeded').reduce((s,p)=>s+Number(p.amount),0)
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="FINANCE" title={role==='provider'?'Earnings & invoices':'Invoices & payments'} description="Track transaction history, invoice status and payment records."/><div className="metricRow"><Metric label="Invoices" value={String(invoices.length)} note="Live records"/><Metric label="Paid" value={'₱'+total.toLocaleString()} note="Successful payments"/><Metric label="Pending" value={String(invoices.filter(i=>!['Paid','Void'].includes(i.status)).length)} note="Requires attention"/><Metric label="Transactions" value={String(payments.length)} note="Payment history"/></div><Panel title="Invoices" kicker="INVOICE REGISTER">{invoices.map(invoice=><div className="productionListRow" key={invoice.id}><div><strong>{invoice.invoice_number}</strong><span>₱{Number(invoice.total).toLocaleString()} · {new Date(invoice.created_at).toLocaleDateString()}</span></div><StatusBadge status={invoice.status}/></div>)}{!invoices.length&&<Empty text="No invoices available."/>}</Panel>{role==='admin'&&<Panel title="Payments" kicker="PLATFORM PAYMENTS">{payments.map(payment=><div className="productionListRow" key={payment.id}><div><strong>₱{Number(payment.amount).toLocaleString()}</strong><span>{payment.method} · {payment.transaction_reference||'No reference'}</span></div><StatusBadge status={payment.status}/></div>)}{!payments.length&&<Empty text="No payments recorded yet."/>}</Panel>}</div>
}

function ReviewsPage({ role }: { role:'customer'|'provider'|'admin' }) {
  const [rows,setRows]=useState<any[]>([])
  useEffect(()=>{void listReviews(role==='admin'?undefined:role).then(setRows).catch(()=>setRows([]))},[role])
  const average=rows.length?rows.reduce((s,r)=>s+Number(r.rating),0)/rows.length:0
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="REPUTATION" title="Reviews" description="Track service quality and customer feedback."/><div className="metricRow"><Metric label="Reviews" value={String(rows.length)} note="Published reviews"/><Metric label="Average rating" value={average?average.toFixed(1)+' ★':'—'} note="Out of 5"/></div><Panel title="Review history" kicker="FEEDBACK">{rows.map(row=><div className="productionReview" key={row.id}><div><strong>{'★'.repeat(Number(row.rating))}{'☆'.repeat(5-Number(row.rating))}</strong><span>{row.comment||'No written comment'}</span></div><small>{new Date(row.created_at).toLocaleDateString()}</small></div>)}{!rows.length&&<Empty text="No reviews yet."/>}</Panel></div>
}

function SupportPage({ admin }: { admin:boolean }) {
  const [rows,setRows]=useState<SupportTicket[]>([])
  const [subject,setSubject]=useState('')
  const [description,setDescription]=useState('')
  const load=()=> (admin?importAdminTickets():listSupportTickets()).then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[admin])
  const submit=async()=>{if(!subject.trim()||!description.trim())return;await createSupportTicket({subject,description});setSubject('');setDescription('');await load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SUPPORT" title="Support center" description="Create and track support tickets without leaving ANYwork."/><Panel title="New support ticket" kicker="CONTACT SUPPORT"><div className="productionFormGrid"><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="What do you need help with?"/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5}/></label></div><button className="buttonPrimary" onClick={()=>void submit()}><LifeBuoy size={15}/> Create ticket</button></Panel><Panel title="Tickets" kicker="TICKET HISTORY">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.ticket_number} · {row.subject}</strong><span>{row.priority} · {new Date(row.created_at).toLocaleDateString()}</span></div><StatusBadge status={row.status}/></div>)}{!rows.length&&<Empty text="No support tickets."/>}</Panel></div>
}
async function importAdminTickets(){return (await listAdminSupportTickets())}


function DisputesPage({ admin }: { admin:boolean }) {
  const [rows,setRows]=useState<Dispute[]>([])
  const load=()=> (admin?listAdminDisputes():listDisputes()).then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[admin])
  const [requestId,setRequestId]=useState('')
  const [reason,setReason]=useState('Service issue')
  const [description,setDescription]=useState('')
  const open=async()=>{if(!requestId||!description)return;await openDispute(requestId,reason,description);setRequestId('');setDescription('');await load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="TRUST" title="Disputes" description="Keep issues documented, visible and accountable."/>{!admin&&<Panel title="Open a dispute" kicker="CUSTOMER / PROVIDER"><div className="productionFormGrid"><label>Request ID<input value={requestId} onChange={e=>setRequestId(e.target.value)} placeholder="Request UUID"/></label><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)}/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4}/></label></div><button className="buttonPrimary" onClick={()=>void open()}>Open dispute</button></Panel>}<Panel title="Dispute queue" kicker="CASE MANAGEMENT">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.reason}</strong><span>{row.description}</span></div>{admin?<select value={row.status} onChange={e=>void updateDispute(row.id,e.target.value).then(load)}><option>Open</option><option>Under Review</option><option>Waiting Customer</option><option>Waiting Provider</option><option>Resolved</option><option>Closed</option></select>:<StatusBadge status={row.status}/>}</div>)}{!rows.length&&<Empty text="No disputes."/>}</Panel></div>
}

function ProviderCalendarPage() {
  const [rows,setRows]=useState<any[]>([])
  const [timeOff,setTimeOff]=useState<any[]>([])
  useEffect(()=>{void Promise.all([listProviderAvailability(),listProviderTimeOff()]).then(([a,t])=>{setRows(a);setTimeOff(t)}).catch(()=>undefined)},[])
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SCHEDULE" title="Availability & calendar" description="Set recurring availability and review blocked dates."/><Panel title="Weekly availability" kicker="PROVIDER SCHEDULE">{days.map((day,i)=>{const row=rows.find(x=>x.weekday===i);return <div className="productionListRow" key={day}><div><strong>{day}</strong><span>{row?.start_time?.slice(0,5)||'09:00'} – {row?.end_time?.slice(0,5)||'17:00'}</span></div><button className="buttonSecondary" onClick={()=>void saveProviderAvailability({weekday:i,start_time:row?.start_time||'09:00',end_time:row?.end_time||'17:00',enabled:!(row?.enabled??true)}).then(()=>listProviderAvailability()).then(setRows)}>{row?.enabled===false?'Enable':'Available'}</button></div>})}</Panel><Panel title="Time off" kicker="BLOCKED TIME">{timeOff.map(item=><div className="productionListRow" key={item.id}><div><strong>{new Date(item.starts_at).toLocaleDateString()}</strong><span>{item.reason||'Unavailable'} · {new Date(item.starts_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div></div>)}<button className="buttonSecondary" onClick={()=>void saveProviderTimeOff({starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),reason:'Blocked time'}).then(()=>listProviderTimeOff()).then(setTimeOff)}>Block next hour</button></Panel></div>
}

function ProviderVerificationPage() {
  const [verification,setVerification]=useState<any>(null)
  useEffect(()=>{void getProviderVerification().then(setVerification).catch(()=>undefined)},[])
  const submit=async()=>setVerification(await submitProviderVerification({notes:'Provider requested verification review.'}))
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="TRUST" title="Provider verification" description="Build customer trust by completing your business verification."/><Panel title="Verification status" kicker="ACCOUNT TRUST"><div className="verificationGrid">{[['Identity',verification?.identity_verified],['Business',verification?.business_verified],['Documents',verification?.documents_verified],['Payment',verification?.payment_verified]].map(([label,ok])=><div key={String(label)}><ShieldCheck/><strong>{label}</strong><span>{ok?'Verified':'Pending review'}</span></div>)}</div><button className="buttonPrimary" onClick={()=>void submit()}><ShieldCheck size={15}/> Submit for review</button></Panel></div>
}

function ProviderCheckinPage({onNavigate}:{onNavigate:(path:string)=>void}) {
  const [requestId,setRequestId]=useState('')
  const [type,setType]=useState('arrived')
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="JOB OPERATIONS" title="Job check-in" description="Record travel, arrival, start, pause and completion events."/><Panel title="Record job event" kicker="FIELD OPERATIONS"><label className="productionField">Request ID<input value={requestId} onChange={e=>setRequestId(e.target.value)} placeholder="Request UUID"/></label><div className="productionButtonGrid">{['on_way','arrived','started','paused','resumed','completed'].map(item=><button key={item} className={type===item?'buttonPrimary':'buttonSecondary'} onClick={()=>setType(item)}>{item.replace('_',' ')}</button>)}</div><button className="buttonPrimary" onClick={()=>void addCheckin(requestId,type).then(()=>onNavigate('/provider/jobs/'+requestId))}><CheckCircle2 size={15}/> Record event</button></Panel></div>
}
async function addCheckin(requestId:string,type:string){if(!requestId)throw new Error('Request ID is required');return import('../lib/productionApi').then(m=>m.addJobCheckin({requestId,type}))}

function AdminJobsPage() {
  const [rows,setRows]=useState<DbRequest[]>([])
  useEffect(()=>{void listAdminJobs().then(setRows).catch(()=>setRows([]))},[])
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="OPERATIONS" title="Job management" description="Monitor scheduled, active and completed jobs."/><Panel title="Jobs" kicker="LIVE OPERATIONS">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.request_number} · {row.title}</strong><span>{row.location} · {row.preferred_date?new Date(row.preferred_date).toLocaleString():'No schedule'}</span></div><StatusBadge status={row.status}/></div>)}{!rows.length&&<Empty text="No jobs found."/>}</Panel></div>
}

function AuditPage() {
  const [rows,setRows]=useState<any[]>([])
  useEffect(()=>{void listAdminAuditLogs().then(setRows).catch(()=>setRows([]))},[])
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SECURITY" title="Audit log" description="Review important platform activity and administrative changes."/><Panel title="Recent activity" kicker="AUDIT TRAIL">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.action} · {row.entity_type}</strong><span>{row.entity_id||'—'} · {new Date(row.created_at).toLocaleString()}</span></div></div>)}</Panel></div>
}

function ServiceBuilderPage() {
  const [services,setServices]=useState<DbService[]>([])
  const [selected,setSelected]=useState('')
  const [fields,setFields]=useState<ServiceField[]>([])
  const [label,setLabel]=useState('')
  const [type,setType]=useState('text')
  const [required,setRequired]=useState(false)
  useEffect(()=>{void listAdminServices().then(rows=>{setServices(rows);if(rows[0])setSelected(rows[0].id)}).catch(()=>[])},[])
  useEffect(()=>{if(selected)void listServiceFields(selected).then(setFields).catch(()=>setFields([]))},[selected])
  const add=async()=>{if(!selected||!label)return;const row=await saveServiceField({service_id:selected,field_key:label.toLowerCase().replace(/[^a-z0-9]+/g,'_'),label,field_type:type,required,sort_order:fields.length});setFields([...fields,row]);setLabel('')}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SERVICE BUILDER" title="Dynamic service forms" description="Create service-specific questions without changing React code."/><Panel title="Choose service" kicker="SERVICE CATALOG"><select value={selected} onChange={e=>setSelected(e.target.value)}>{services.map(s=><option key={s.id} value={s.id}>{s.category} · {s.subcategory} · {s.label}</option>)}</select></Panel><Panel title="Add field" kicker="FORM DESIGN"><div className="productionFormGrid"><label>Field label<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Number of units"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value)}>{['text','textarea','number','select','multiselect','radio','checkbox','boolean','date','time','address','photo','file','budget'].map(x=><option key={x}>{x}</option>)}</select></label><label className="productionCheckbox"><input type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/> Required</label></div><button className="buttonPrimary" onClick={()=>void add()}><Plus size={15}/> Add field</button></Panel><Panel title="Current fields" kicker="LIVE FORM">{fields.map((field)=><div className="productionListRow" key={field.id}><div><strong>{field.label}</strong><span>{field.field_type} · {field.required?'Required':'Optional'}</span></div><StatusBadge status={field.enabled?'Enabled':'Disabled'}/></div>)}{!fields.length&&<Empty text="No custom fields configured."/>}</Panel></div>
}

function PageHeader({kicker,title,description}:{kicker:string;title:string;description:string}){return <div className="workspacePageTitle"><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function Empty({text}:{text:string}){return <div className="emptyModern"><FileText size={18}/><p>{text}</p></div>}
