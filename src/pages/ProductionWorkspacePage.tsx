import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, FileText, LifeBuoy, Plus, ShieldCheck, Trash2, WalletCards, Star } from 'lucide-react'
import { listAdminServices, listPublicServices, listCustomerRequests, listProviderRequests, type DbService, type DbRequest, submitJobReview, updateAdminRequestStatus } from '../lib/anyworkApi'
import {
  createSupportTicket, deleteAddress, getProviderVerification, submitProviderReview, updateSupportTicket, listAddresses, listAdminAuditLogs, listAdminDisputes, listAdminJobs, listAdminPayments,
  listInvoices, listPayments, listProviderAvailability, createInvoice, recordPayment, listProviderTimeOff, listProviderServiceAreas, saveProviderServiceArea, deleteProviderServiceArea, listReviews, listServiceFields, listSupportTickets,
  openDispute, saveAddress, saveProviderAvailability, saveProviderTimeOff, saveServiceField, submitProviderVerification, updateDispute,
  type Address, type Dispute, type Invoice, type Payment, type ServiceField, type SupportTicket, listDisputes, listAdminSupportTickets, listAdminReviews, listJobPhotos, getJobPhotoUrl, uploadJobPhoto, listAdminVerifications, updateProviderVerification, listFavorites, toggleFavorite,
} from '../lib/productionApi'

export function ProductionWorkspacePage({ role, section, onNavigate, profile: _profile }: { role: 'customer'|'provider'|'admin'; section: string; profile?: AnyWorkProfile; onNavigate: (path:string)=>void }) {
  if (section === 'account') return <AccountPage onNavigate={onNavigate} />
  if (section === 'addresses') return <AddressesPage />
  if (section === 'favorites') return <FavoritesPage />
  if (section === 'invoices' || section === 'payments') return <FinancePage role={role} />
  if (section === 'reviews') return <ReviewsPage role={role} />
  if (section === 'support') return <SupportPage admin={role === 'admin'} />
  if (section === 'disputes') return <DisputesPage admin={role === 'admin'} />
  if (role === 'provider' && section === 'calendar') return <ProviderCalendarPage />
  if (role === 'provider' && section === 'verification') return <ProviderVerificationPage />
  if (role === 'admin' && section === 'verification') return <AdminVerificationPage />
  if (role === 'provider' && section === 'checkins') return <ProviderCheckinPage />
  if (role === 'admin' && section === 'jobs') return <AdminJobsPage />
  if (role === 'admin' && section === 'audit') return <AuditPage />
  if (role === 'admin' && section === 'service-builder') return <ServiceBuilderPage />
  return <FinancePage role={role} />
}

function Panel({ title, kicker, children }: { title:string; kicker:string; children:React.ReactNode }) {
  return <section className="dashboardCard productionPanel"><div className="cardHeading"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div></div>{children}</section>
}

function AccountPage({ onNavigate }: { onNavigate:(path:string)=>void }) {
  const links=[
    ['addresses','Saved addresses','Keep service locations ready for your next request.'],
    ['favorites','Saved services','Quickly request services you use often.'],
    ['invoices','Invoices & payments','View invoices and payment history.'],
    ['reviews','Reviews','See feedback you have given and received.'],
    ['support','Support','Get help with a request or completed job.'],
  ]
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="ACCOUNT" title="Account" description="Manage the details you use across your service jobs."/><div className="accountModuleGrid">{links.map(([path,title,description])=><button className="accountModuleCard" key={path} onClick={()=>onNavigate('/customer/'+path)}><div><strong>{title}</strong><span>{description}</span></div><ArrowRight size={16}/></button>)}</div></div>
}

function AddressesPage() {
  const [rows,setRows]=useState<Address[]>([])
  const [form,setForm]=useState({label:'Home',address_line1:'',city:'',state:'',postal_code:''})
  const load=()=>listAddresses().then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[])
  const save=async()=>{if(!form.address_line1.trim())return;const row=await saveAddress(form);setRows(current=>[row,...current.filter(x=>x.id!==row.id)])}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="PROFILE" title="Saved addresses" description="Reuse service locations and keep your job details consistent."/><Panel title="Add address" kicker="LOCATION"><div className="productionFormGrid">{Object.entries(form).map(([key,value])=><label key={key}>{key.replaceAll('_',' ')}<input value={value} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><button className="buttonPrimary" onClick={()=>void save()}><Plus size={15}/> Save address</button></Panel><Panel title="Your addresses" kicker="SAVED LOCATIONS">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.label}</strong><span>{row.address_line1}, {row.city} {row.postal_code}</span></div><button className="buttonGhost" onClick={()=>void deleteAddress(row.id).then(load)}><Trash2 size={14}/></button></div>)}{!rows.length&&<Empty text="No saved addresses yet."/>}</Panel></div>
}

function FavoritesPage() {
  const [services,setServices]=useState<any[]>([])
  const [favorites,setFavorites]=useState<any[]>([])
  const load=()=>void Promise.all([listPublicServices(),listFavorites()]).then(([s,f])=>{setServices(s);setFavorites(f)}).catch(()=>undefined)
  useEffect(load,[])
  const serviceIds=new Set(favorites.filter(item=>item.service_id).map(item=>item.service_id))
  const toggle=async(id:string)=>{await toggleFavorite({serviceId:id});load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SAVED" title="Favorites" description="Keep preferred services ready for your next request."/><Panel title="Saved services" kicker="FAVORITES">{services.filter(service=>serviceIds.has(service.id)).map(service=><div className="productionListRow" key={service.id}><div><strong>{service.label}</strong><span>{service.description}</span></div><button className="buttonSecondary" onClick={()=>void toggle(service.id)}>Remove</button></div>)}{!services.some(service=>serviceIds.has(service.id))&&<Empty text="No favorite services yet."/>}</Panel><Panel title="Service catalog" kicker="DISCOVER">{services.map(service=><div className="productionListRow" key={service.id}><div><strong>{service.label}</strong><span>{service.starting_price_label||'Quote'}</span></div><button className={serviceIds.has(service.id)?'buttonSecondary':'buttonPrimary'} onClick={()=>void toggle(service.id)}>{serviceIds.has(service.id)?'Saved':'Save'}</button></div>)}</Panel></div>
}

function FinancePage({ role }: { role:'customer'|'provider'|'admin' }) {
  const [invoices,setInvoices]=useState<Invoice[]>([])
  const [payments,setPayments]=useState<Payment[]>([])
  const [requestId,setRequestId]=useState('')
  const [item,setItem]=useState('')
  const [amount,setAmount]=useState('')
  const [tax,setTax]=useState('')
  const [payInvoice,setPayInvoice]=useState<Invoice|null>(null)
  const [payMethod,setPayMethod]=useState('gcash')
  const [reference,setReference]=useState('')
  const load=()=>{if(role==='admin')void listAdminPayments().then(setPayments).catch(()=>[]);else void Promise.all([listInvoices(role),listPayments(role)]).then(([i,p])=>{setInvoices(i);setPayments(p)}).catch(()=>undefined)}
  useEffect(load,[role])
  const total=payments.filter(p=>p.status==='Succeeded').reduce((s,p)=>s+Number(p.amount),0)
  const issueInvoice=async()=>{if(!requestId||!item||!amount)return;await createInvoice({requestId,items:[{description:item,quantity:1,unit_price:Number(amount),amount:Number(amount)}],tax:Number(tax)||0});setRequestId('');setItem('');setAmount('');setTax('');load()}
  const pay=async()=>{if(!payInvoice)return;await recordPayment({invoiceId:payInvoice.id,providerId:payInvoice.provider_id,amount:Number(payInvoice.total),method:payMethod,reference});setPayInvoice(null);setReference('');load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="FINANCE" title={role==='provider'?'Earnings & invoices':'Invoices & payments'} description="Track transaction history, create invoices and record payments."/><div className="metricRow"><Metric label="Invoices" value={String(invoices.length)} note="Live records"/><Metric label="Paid" value={'₱'+total.toLocaleString()} note="Successful payments"/><Metric label="Pending" value={String(invoices.filter(i=>!['Paid','Void'].includes(i.status)).length)} note="Requires attention"/><Metric label="Transactions" value={String(payments.length)} note="Payment history"/></div>{role==='provider'&&<Panel title="Create invoice" kicker="BILLING"><div className="productionFormGrid"><label>Request ID<input value={requestId} onChange={e=>setRequestId(e.target.value)} placeholder="Request UUID"/></label><label>Item<input value={item} onChange={e=>setItem(e.target.value)} placeholder="Service or materials"/></label><label>Amount<input type="number" value={amount} onChange={e=>setAmount(e.target.value)} /></label><label>Tax<input type="number" value={tax} onChange={e=>setTax(e.target.value)} /></label></div><button className="buttonPrimary" onClick={()=>void issueInvoice()}><FileText size={15}/> Issue invoice</button></Panel>}<Panel title="Invoices" kicker="INVOICE REGISTER">{invoices.map(invoice=><div className="productionListRow" key={invoice.id}><div><strong>{invoice.invoice_number}</strong><span>₱{Number(invoice.total).toLocaleString()} · {new Date(invoice.created_at).toLocaleDateString()}</span></div><div className="productionButtonGrid">{role==='customer'&&invoice.status!=='Paid'&&<button className="buttonSecondary" onClick={()=>setPayInvoice(invoice)}><WalletCards size={14}/> Pay</button>}<span className="statusBadge neutral">{invoice.status}</span></div></div>)}{!invoices.length&&<Empty text="No invoices available."/>}</Panel>{payInvoice&&<Panel title={'Pay '+payInvoice.invoice_number} kicker="PAYMENT"><div className="productionFormGrid"><label>Method<select value={payMethod} onChange={e=>setPayMethod(e.target.value)}><option>gcash</option><option>maya</option><option>bank_transfer</option><option>card</option><option>manual</option></select></label><label>Reference<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Transaction reference"/></label></div><button className="buttonPrimary" onClick={()=>void pay()}>Record payment of ₱{Number(payInvoice.total).toLocaleString()}</button></Panel>}{role==='admin'&&<Panel title="Payments" kicker="PLATFORM PAYMENTS">{payments.map(payment=><div className="productionListRow" key={payment.id}><div><strong>₱{Number(payment.amount).toLocaleString()}</strong><span>{payment.method} · {payment.transaction_reference||'No reference'}</span></div><span className="statusBadge neutral">{payment.status}</span></div>)}{!payments.length&&<Empty text="No payments recorded yet."/>}</Panel>}</div>
}

function ReviewsPage({ role }: { role:'customer'|'provider'|'admin' }) {
  const [rows,setRows]=useState<any[]>([])
  const [jobs,setJobs]=useState<DbRequest[]>([])
  const [requestId,setRequestId]=useState('')
  const [rating,setRating]=useState('5')
  const [comment,setComment]=useState('')
  const load=()=>void (role==='admin'?listAdminReviews():listReviews(role)).then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[role])
  useEffect(()=>{if(role==='customer')void listCustomerRequests().then(setJobs).catch(()=>setJobs([]));if(role==='provider')void listProviderRequests().then(rows=>setJobs(rows.filter(row=>row.selected_provider_id))).catch(()=>setJobs([]))},[role])
  const average=rows.length?rows.reduce((s,r)=>s+Number(r.rating),0)/rows.length:0
  const reviewableJobs=jobs.filter(job=>job.status==='Completed')
  const selectedJob=reviewableJobs.find(job=>job.id===requestId)
  const submit=async()=>{
    if(!selectedJob||!comment.trim())return
    if(role==='customer'&&selectedJob.selected_provider_id)await submitJobReview({requestId:selectedJob.id,providerId:selectedJob.selected_provider_id,rating:Number(rating),comment})
    if(role==='provider'&&selectedJob.customer_id)await submitProviderReview({requestId:selectedJob.id,customerId:selectedJob.customer_id,rating:Number(rating),comment})
    setRequestId('');setComment('');load()
  }
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="REPUTATION" title="Reviews" description="Share verified feedback after a completed service."/><div className="metricRow"><Metric label="Reviews" value={String(rows.length)} note="Published reviews"/><Metric label="Average rating" value={average?average.toFixed(1)+' ★':'—'} note="Out of 5"/></div>{role!=='admin'&&<Panel title="Leave a review" kicker="POST-JOB FEEDBACK"><div className="productionFormGrid"><label>Completed job<select value={requestId} onChange={e=>setRequestId(e.target.value)}><option value="">Choose a completed job</option>{reviewableJobs.map(job=><option key={job.id} value={job.id}>{job.title} · {job.request_number}</option>)}</select></label><label>Rating<select value={rating} onChange={e=>setRating(e.target.value)}>{[5,4,3,2,1].map(x=><option key={x}>{x}</option>)}</select></label><label>Comment<textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="How did the service go?"/></label></div><button className="buttonPrimary" onClick={()=>void submit()} disabled={!selectedJob||!comment.trim()}><Star size={15}/> Submit review</button></Panel>}<Panel title="Review history" kicker="FEEDBACK">{rows.map(row=><div className="productionReview" key={row.id}><div><strong>{'★'.repeat(Number(row.rating))}{'☆'.repeat(5-Number(row.rating))}</strong><span>{row.comment||'No written comment'}</span></div><small>{new Date(row.created_at).toLocaleDateString()}</small></div>)}{!rows.length&&<Empty text="No reviews yet."/>}</Panel></div>
}
function SupportPage({ admin }: { admin:boolean }) {
  const [rows,setRows]=useState<SupportTicket[]>([])
  const [subject,setSubject]=useState('')
  const [description,setDescription]=useState('')
  const load=()=> (admin?importAdminTickets():listSupportTickets()).then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[admin])
  const submit=async()=>{if(!subject.trim()||!description.trim())return;await createSupportTicket({subject,description});setSubject('');setDescription('');await load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SUPPORT" title="Support center" description="Create and track support tickets without leaving ANYwork."/><Panel title="New support ticket" kicker="CONTACT SUPPORT"><div className="productionFormGrid"><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="What do you need help with?"/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5}/></label></div><button className="buttonPrimary" onClick={()=>void submit()}><LifeBuoy size={15}/> Create ticket</button></Panel><Panel title="Tickets" kicker="TICKET HISTORY">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.ticket_number} · {row.subject}</strong><span>{row.priority} · {new Date(row.created_at).toLocaleDateString()}</span></div>{admin?<select value={row.status} onChange={e=>void updateSupportTicket(row.id,e.target.value).then(load)}><option>Open</option><option>In Progress</option><option>Waiting</option><option>Resolved</option><option>Closed</option></select>:<span className="statusBadge neutral">{row.status}</span>}</div>)}{!rows.length&&<Empty text="No support tickets."/>}</Panel></div>
}
async function importAdminTickets(){return (await listAdminSupportTickets())}


function DisputesPage({ admin }: { admin:boolean }) {
  const [rows,setRows]=useState<Dispute[]>([])
  const [jobs,setJobs]=useState<DbRequest[]>([])
  const [requestId,setRequestId]=useState('')
  const [reason,setReason]=useState('Service issue')
  const [description,setDescription]=useState('')
  const load=()=> (admin?listAdminDisputes():listDisputes()).then(setRows).catch(()=>setRows([]))
  useEffect(()=>{void load()},[admin])
  useEffect(()=>{if(!admin)void listCustomerRequests().then(setJobs).catch(()=>setJobs([]))},[admin])
  const open=async()=>{if(!requestId||!description)return;await openDispute(requestId,reason,description);setRequestId('');setDescription('');await load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="TRUST" title="Disputes" description="Get help when a service needs review or resolution."/>{!admin&&<Panel title="Open a dispute" kicker="YOUR JOB"><div className="productionFormGrid"><label>Job<select value={requestId} onChange={e=>setRequestId(e.target.value)}><option value="">Choose a job</option>{jobs.map(job=><option key={job.id} value={job.id}>{job.title} · {job.request_number}</option>)}</select></label><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)}/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} placeholder="Tell us what happened."/></label></div><button className="buttonPrimary" onClick={()=>void open()} disabled={!requestId||!description.trim()}>Open dispute</button></Panel>}<Panel title="Dispute queue" kicker="CASE MANAGEMENT">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.reason}</strong><span>{row.description}</span></div>{admin?<select value={row.status} onChange={e=>void updateDispute(row.id,e.target.value).then(load)}><option>Open</option><option>Under Review</option><option>Waiting Customer</option><option>Waiting Provider</option><option>Resolved</option><option>Closed</option></select>:<span className="statusBadge neutral">{row.status}</span>}</div>)}{!rows.length&&<Empty text="No disputes."/>}</Panel></div>
}
function ProviderCalendarPage() {
  const [rows, setRows] = useState<any[]>([])
  const [timeOff, setTimeOff] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [areaName, setAreaName] = useState('')
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState('15')
  const [loading, setLoading] = useState(true)
  const [savingWeekday, setSavingWeekday] = useState<number | null>(null)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const defaultStart = '09:00'
  const defaultEnd = '17:00'

  const load = async () => {
    setLoading(true)
    try {
      const [availability, blocked, serviceAreas] = await Promise.all([
        listProviderAvailability(),
        listProviderTimeOff(),
        listProviderServiceAreas(),
      ])
      setRows(availability)
      setTimeOff(blocked)
      setAreas(serviceAreas)
    } catch {
      setRows([])
      setTimeOff([])
      setAreas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toggleAvailability = async (weekday: number) => {
    const row = rows.find(item => item.weekday === weekday)
    const startTime = row?.start_time?.slice(0, 5) || defaultStart
    const endTime = row?.end_time?.slice(0, 5) || defaultEnd
    const nextEnabled = !(row?.enabled ?? true)

    setSavingWeekday(weekday)
    try {
      const saved = await saveProviderAvailability({
        weekday,
        start_time: startTime,
        end_time: endTime,
        enabled: nextEnabled,
      })
      setRows(current => [...current.filter(item => item.weekday !== weekday), saved].sort((a, b) => a.weekday - b.weekday))
    } finally {
      setSavingWeekday(null)
    }
  }

  const addArea = async () => {
    if (!areaName.trim()) return
    await saveProviderServiceArea({
      areaName: areaName.trim(),
      city: city.trim(),
      radiusKm: Number(radius) || 15,
    })
    setAreaName('')
    setCity('')
    await load()
  }

  const activeDays = rows.filter(row => row.enabled !== false).length

  return (
    <div className="workspaceDashboard productionWorkspace providerCalendarWorkspace">
      <PageHeader
        kicker="SCHEDULE"
        title="Availability & service areas"
        description="Tell ANYwork when and where your team can accept service jobs."
      />

      <Panel title="Weekly availability" kicker="PROVIDER SCHEDULE">
        <div className="calendarAvailabilityPanel">
          <div className="calendarAvailabilityMeta">
            <span>{activeDays} of 7 days available</span>
            <small>Click an availability block to pause or resume bookings for that day.</small>
          </div>

          <div className="providerWeekCalendar">
            <div className="providerWeekHeader">
              <div className="providerWeekTimeGutter">TIME</div>
              {days.map((day, weekday) => {
                const row = rows.find(item => item.weekday === weekday)
                const enabled = row ? row.enabled !== false : false
                return (
                  <div className={'providerWeekDayHead ' + (enabled ? 'is-enabled' : 'is-disabled')} key={day}>
                    <strong>{day}</strong>
                    <span>{enabled ? 'Available' : 'Unavailable'}</span>
                  </div>
                )
              })}
            </div>
            <div className="providerWeekBody">
              <div className="providerWeekTimeGutter providerWeekTimes">
                <span>09:00</span>
                <span>11:00</span>
                <span>13:00</span>
                <span>15:00</span>
                <span>17:00</span>
              </div>
              {days.map((day, weekday) => {
                const row = rows.find(item => item.weekday === weekday)
                const enabled = row ? row.enabled !== false : false
                const start = row?.start_time?.slice(0, 5) || defaultStart
                const end = row?.end_time?.slice(0, 5) || defaultEnd
                const isSaving = savingWeekday === weekday
                const blocked = timeOff.filter(item => {
                  const date = new Date(item.starts_at)
                  return date.getDay() === weekday
                })
                return (
                  <div className="providerWeekDayColumn" key={day}>
                    <div className={'providerWeekCanvas ' + (enabled ? 'is-enabled' : 'is-disabled')}>
                      <button
                        type="button"
                        className={'providerWeekEvent ' + (enabled ? 'available' : 'unavailable')}
                        disabled={isSaving || loading}
                        aria-pressed={enabled}
                        onClick={() => void toggleAvailability(weekday)}
                        title={'Toggle ' + day + ' availability'}
                      >
                        <strong>{isSaving ? 'Saving…' : enabled ? 'Available' : 'Unavailable'}</strong>
                        <span>{start} – {end}</span>
                      </button>
                      {blocked.map(item => (
                        <div className="providerWeekTimeOff" key={item.id} title={item.reason || 'Blocked time'}>
                          <strong>{item.reason || 'Blocked time'}</strong>
                          <span>{new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Service coverage" kicker="WHERE YOU WORK">
        <div className="productionFormGrid">
          <label>
            Area / barangay
            <input value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="e.g. Alabang" />
          </label>
          <label>
            City / municipality
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Muntinlupa" />
          </label>
          <label>
            Coverage radius (km)
            <input type="number" min="1" value={radius} onChange={e => setRadius(e.target.value)} />
          </label>
        </div>
        <button className="buttonPrimary" onClick={() => void addArea()} disabled={!areaName.trim()}>
          <Plus size={15} /> Add service area
        </button>

        {areas.map(area => (
          <div className="productionListRow" key={area.id}>
            <div>
              <strong>{area.area_name}</strong>
              <span>{area.city || 'Any city'} · within {area.radius_km} km</span>
            </div>
            <button className="buttonGhost" onClick={() => void deleteProviderServiceArea(area.id).then(load)} aria-label={'Delete ' + area.area_name}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!areas.length && (
          <Empty text="No coverage areas added yet. Matching will use the service-area on each enabled provider service until you add areas here." />
        )}
      </Panel>

      <Panel title="Time off" kicker="BLOCKED TIME">
        {timeOff.map(item => (
          <div className="productionListRow" key={item.id}>
            <div>
              <strong>{new Date(item.starts_at).toLocaleDateString()}</strong>
              <span>
                {item.reason || 'Unavailable'} · {new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {!timeOff.length && <Empty text="No blocked time is currently scheduled." />}
        <button
          className="buttonSecondary"
          onClick={() => void saveProviderTimeOff({
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 3600000).toISOString(),
            reason: 'Blocked time',
          }).then(() => listProviderTimeOff()).then(setTimeOff)}
        >
          Block next hour
        </button>
      </Panel>
    </div>
  )
}

function ProviderVerificationPage() {
  const [verification,setVerification]=useState<any>(null)
  useEffect(()=>{void getProviderVerification().then(setVerification).catch(()=>undefined)},[])
  const submit=async()=>setVerification(await submitProviderVerification({notes:'Provider requested verification review.'}))
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="TRUST" title="Provider verification" description="Build customer trust by completing your business verification."/><Panel title="Verification status" kicker="ACCOUNT TRUST"><div className="verificationGrid">{[['Identity',verification?.identity_verified],['Business',verification?.business_verified],['Documents',verification?.documents_verified],['Payment',verification?.payment_verified]].map(([label,ok])=><div key={String(label)}><ShieldCheck/><strong>{label}</strong><span>{ok?'Verified':'Pending review'}</span></div>)}</div><button className="buttonPrimary" onClick={()=>void submit()}><ShieldCheck size={15}/> Submit for review</button></Panel></div>
}

function AdminVerificationPage() {
  const [rows,setRows]=useState<any[]>([])
  const load=()=>void listAdminVerifications().then(setRows).catch(()=>setRows([]))
  useEffect(load,[])
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="TRUST & SAFETY" title="Provider verification" description="Review and approve provider trust checks from the admin workspace."/><Panel title="Verification queue" kicker="PROVIDER REVIEW">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.provider_id}</strong><span>{row.status} · identity {row.identity_verified?'verified':'pending'} · business {row.business_verified?'verified':'pending'}</span></div><select value={row.status} onChange={e=>void updateProviderVerification(row.id,e.target.value).then(load)}><option>Pending</option><option>Under Review</option><option>Verified</option><option>Rejected</option></select></div>)}{!rows.length&&<Empty text="No provider verification records."/>}</Panel></div>
}

function ProviderCheckinPage() {
  const [requestId,setRequestId]=useState('')
  const [type,setType]=useState('arrived')
  const [photoType,setPhotoType]=useState<'before'|'during'|'after'|'completion'|'invoice'|'other'>('during')
  const [photos,setPhotos]=useState<any[]>([])
  const [busy,setBusy]=useState(false)
  const loadPhotos=()=>{if(requestId)void listJobPhotos(requestId).then(async rows=>setPhotos(await Promise.all(rows.map(async row=>({...row,url:await getJobPhotoUrl(row.storage_path)})))))}
  const record=async()=>{let coords:{latitude?:number;longitude?:number}={};if(navigator.geolocation){try{const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:8000}));coords={latitude:position.coords.latitude,longitude:position.coords.longitude}}catch{}}await addCheckin(requestId,type,coords);loadPhotos()}
  const upload=async(file:File)=>{if(!requestId)return;setBusy(true);try{await uploadJobPhoto({requestId,file,photoType});loadPhotos()}finally{setBusy(false)}}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="JOB OPERATIONS" title="Job check-in & evidence" description="Record field events and attach before, during and completion evidence."/><Panel title="Record job event" kicker="FIELD OPERATIONS"><label className="productionField">Request ID<input value={requestId} onChange={e=>{setRequestId(e.target.value);setPhotos([])}} onBlur={loadPhotos} placeholder="Request UUID"/></label><div className="productionButtonGrid">{['on_way','arrived','started','paused','resumed','completed'].map(item=><button key={item} className={type===item?'buttonPrimary':'buttonSecondary'} onClick={()=>setType(item)}>{item.replace('_',' ')}</button>)}</div><button className="buttonPrimary" onClick={()=>void record()} disabled={!requestId}><CheckCircle2 size={15}/> Record event</button></Panel><Panel title="Job evidence" kicker="PHOTO STORAGE"><div className="productionButtonGrid">{(['before','during','after','completion','invoice','other'] as const).map(item=><button key={item} className={photoType===item?'buttonPrimary':'buttonSecondary'} onClick={()=>setPhotoType(item)}>{item}</button>)}</div><input type="file" accept="image/jpeg,image/png,image/webp" disabled={!requestId||busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.currentTarget.value=''}} />{photos.length>0&&<div className="requestPhotoPreviewGrid">{photos.map(photo=><div className="requestPhotoPreview" key={photo.id}><img src={photo.url} alt={photo.file_name}/></div>)}</div>}{!photos.length&&<Empty text={requestId?'No evidence uploaded yet.':'Enter a request ID to load evidence.'}/>}</Panel></div>
}
async function addCheckin(requestId:string,type:string,coords:{latitude?:number;longitude?:number}={}){if(!requestId)throw new Error('Request ID is required');return import('../lib/productionApi').then(m=>m.addJobCheckin({requestId,type,...coords}))}

function AdminJobsPage() {
  const [rows,setRows]=useState<DbRequest[]>([])
  const load=()=>void listAdminJobs().then(setRows).catch(()=>setRows([]))
  useEffect(load,[])
  const update=async(id:string,status:DbRequest['status'])=>{await updateAdminRequestStatus(id,status);load()}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="OPERATIONS" title="Job management" description="Monitor scheduled, active and completed jobs and correct operational status."/><Panel title="Jobs" kicker="LIVE OPERATIONS">{rows.map(row=><div className="productionListRow" key={row.id}><div><strong>{row.request_number} · {row.title}</strong><span>{row.location} · {row.preferred_date?new Date(row.preferred_date).toLocaleString():'No schedule'}</span></div><select value={row.status} onChange={e=>void update(row.id,e.target.value as DbRequest['status'])}><option>Scheduled</option><option>In Progress</option><option>Completed</option></select></div>)}{!rows.length&&<Empty text="No jobs found."/>}</Panel></div>
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
  const [options,setOptions]=useState('')
  useEffect(()=>{void listAdminServices().then(rows=>{setServices(rows);if(rows[0])setSelected(rows[0].id)}).catch(()=>[])},[])
  useEffect(()=>{if(selected)void listServiceFields(selected).then(setFields).catch(()=>setFields([]))},[selected])
  const add=async()=>{if(!selected||!label)return;const row=await saveServiceField({service_id:selected,field_key:label.toLowerCase().replace(/[^a-z0-9]+/g,'_'),label,field_type:type,required,options:options.split(',').map(x=>x.trim()).filter(Boolean),sort_order:fields.length});setFields([...fields,row]);setLabel('');setOptions('')}
  const remove=async(id:string)=>{await deleteServiceField(id);setFields(current=>current.filter(field=>field.id!==id))}
  return <div className="workspaceDashboard productionWorkspace"><PageHeader kicker="SERVICE BUILDER" title="Dynamic service forms" description="Create service-specific questions without changing React code."/><Panel title="Choose service" kicker="SERVICE CATALOG"><select value={selected} onChange={e=>setSelected(e.target.value)}>{services.map(s=><option key={s.id} value={s.id}>{s.category} · {s.subcategory} · {s.label}</option>)}</select></Panel><Panel title="Add field" kicker="FORM DESIGN"><div className="productionFormGrid"><label>Field label<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Number of units"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value)}>{['text','textarea','number','select','multiselect','radio','checkbox','boolean','date','time','address','photo','file','budget'].map(x=><option key={x}>{x}</option>)}</select></label><label>Options<input value={options} onChange={e=>setOptions(e.target.value)} placeholder="e.g. Small, Medium, Large"/></label><label className="productionCheckbox"><input type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/> Required</label></div><button className="buttonPrimary" onClick={()=>void add()}><Plus size={15}/> Add field</button></Panel><Panel title="Current fields" kicker="LIVE FORM">{fields.map((field)=><div className="productionListRow" key={field.id}><div><strong>{field.label}</strong><span>{field.field_type} · {field.required?'Required':'Optional'}{Array.isArray(field.options)&&field.options.length?' · '+field.options.join(', '):''}</span></div><div className="productionButtonGrid"><span className="statusBadge neutral">{field.enabled?'Enabled':'Disabled'}</span><button className="buttonGhost" onClick={()=>void remove(field.id)}>Delete</button></div></div>)}{!fields.length&&<Empty text="No custom fields configured."/>}</Panel></div>
}


function PageHeader({kicker,title,description}:{kicker:string;title:string;description:string}){return <div className="workspacePageTitle"><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function Empty({text}:{text:string}){return <div className="emptyModern"><FileText size={18}/><p>{text}</p></div>}
