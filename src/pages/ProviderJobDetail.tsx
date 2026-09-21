import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  MessageCircle,
  Play,
  ShieldCheck,
} from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { RequestPhotos } from '../components/RequestPhotos'
import { confirmAction, showError, showSuccess } from '../lib/alerts'
import {
  getRequest,
  getCurrentUserId,
  listProfiles,
  listQuotesForRequest,
  updateProviderJobStatus,
  subscribeToRequests,
  subscribeToQuotes,
  type DbProfile,
  type DbRequest,
  type DbQuote,
} from '../lib/anyworkApi'

export function ProviderJobDetail({
  requestId,
  onBack,
  onNavigate,
}: {
  requestId: string
  onBack: () => void
  onNavigate: (path: string) => void
}) {
  const [request, setRequest] = useState<DbRequest | null>(null)
  const [quote, setQuote] = useState<DbQuote | null>(null)
  const [customer, setCustomer] = useState<DbProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [providerId, dbRequest] = await Promise.all([getCurrentUserId(), getRequest(requestId)])
        if (dbRequest.selected_provider_id !== providerId) {
          throw new Error('This job is not assigned to your provider account.')
        }
        const [quotes, profiles] = await Promise.all([
          listQuotesForRequest(dbRequest.id),
          listProfiles([dbRequest.customer_id]),
        ])
        setRequest(dbRequest)
        setQuote(quotes.find((item) => item.status === 'Accepted' && item.provider_id === providerId) || null)
        setCustomer(profiles[0] || null)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this job.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [requestId])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    void subscribeToRequests((change) => {
      if (change.record?.id === requestId) {
        if (change.record.selected_provider_id) setRequest(change.record)
      }
      if (!change.record && change.oldRecord?.id === requestId) setRequest(null)
    }).then((dispose) => { cleanup = dispose }).catch(() => undefined)
    return () => cleanup?.()
  }, [requestId])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    void subscribeToQuotes((change) => {
      if (change.record?.request_id === requestId && change.record.status === 'Accepted') {
        setQuote(change.record)
      }
    }).then((dispose) => { cleanup = dispose }).catch(() => undefined)
    return () => cleanup?.()
  }, [requestId])

  const customerName = customer
    ? customer.company_name || customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    : 'Customer'

  const updateStatus = async (status: 'In Progress' | 'Completed') => {
    if (!request) return

    const confirmed = await confirmAction({
      title: status === 'Completed' ? 'Mark this job complete?' : 'Start this job?',
      text: status === 'Completed'
        ? 'The customer will see this job as completed.'
        : 'This will move the job into the in-progress stage.',
      confirmText: status === 'Completed' ? 'Mark complete' : 'Start job',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setBusy(true)
    setError('')
    try {
      const nextRequest = await updateProviderJobStatus(request.id, status)
      setRequest(nextRequest)
      await showSuccess(
        status === 'Completed' ? 'Job completed' : 'Job started',
        status === 'Completed'
          ? 'The customer can now see that this job has been completed.'
          : 'The job is now marked as in progress.',
      )
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : 'Unable to update the job status.'
      setError(message)
      await showError('Unable to update job', message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="workspaceDashboard providerJobDetail"><div className="providerEmptyPanel"><div className="metricIcon"><Clock3 /></div><strong>Loading job</strong><span>Fetching schedule, customer and quote details.</span></div></div>
  }

  if (!request) {
    return <div className="workspaceDashboard providerJobDetail"><div className="providerEmptyPanel"><strong>Job unavailable</strong><span>{error || 'This job could not be found.'}</span><button className="buttonPrimary" onClick={onBack}>Back to jobs</button></div></div>
  }

  const progress = [
    { label: 'Confirmed', done: ['Scheduled', 'In Progress', 'Completed'].includes(request.status) },
    { label: 'Scheduled', done: ['Scheduled', 'In Progress', 'Completed'].includes(request.status) },
    { label: 'In progress', done: ['In Progress', 'Completed'].includes(request.status) },
    { label: 'Completed', done: request.status === 'Completed' },
  ]

  return (
    <div className="workspaceDashboard providerJobDetail">
      <button className="backLinkModern" onClick={onBack}><ArrowLeft size={15} /> Back to jobs</button>

      {error && <div className="formError">{error}</div>}

      <div className="providerJobDetailHeader">
        <div>
          <span className="requestId">{request.request_number}</span>
          <div className="providerJobDetailTitle"><h1>{request.title}</h1><StatusBadge status={request.status} /></div>
          <p>{customerName} · {request.location}</p>
        </div>
        <div className="providerJobDetailActions">
          <button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + request.id + '&provider=' + request.customer_id)}><MessageCircle size={15} /> Message customer</button>
          {request.status === 'Scheduled' && <button className="buttonPrimary" disabled={busy} onClick={() => void updateStatus('In Progress')}><Play size={15} /> {busy ? 'Updating…' : 'Start job'}</button>}
          {request.status === 'In Progress' && <button className="buttonPrimary" disabled={busy} onClick={() => void updateStatus('Completed')}><Check size={15} /> {busy ? 'Updating…' : 'Mark complete'}</button>}
        </div>
      </div>

      <div className="providerJobProgress">
        {progress.map((step, index) => (
          <div className={step.done ? 'done' : ''} key={step.label}>
            <span>{step.done ? <CheckCircle2 size={15} /> : index + 1}</span>
            <small>{step.label}</small>
          </div>
        ))}
      </div>

      <RequestPhotos requestId={requestId} />
      
      <div className="providerJobDetailGrid">
        <main>
          <section className="dashboardCard">
            <span className="eyebrow">JOB BRIEF</span>
            <h2>Deliver against the agreed scope.</h2>
            <p className="providerJobBriefText">{request.description}</p>
            {request.access_notes && <div className="providerAccessNote"><strong>Access notes</strong><span>{request.access_notes}</span></div>}
          </section>

          <section className="dashboardCard">
            <span className="eyebrow">JOB TIMELINE</span>
            <div className="providerJobTimeline">
              <Timeline label="Confirmed" done={progress[0].done} detail="Customer selected your quote." />
              <Timeline label="Scheduled" done={progress[1].done} detail={request.preferred_date ? new Date(request.preferred_date).toLocaleString() : 'Schedule confirmed with customer.'} />
              <Timeline label="In progress" done={progress[2].done} detail="Start the job when you arrive on site." />
              <Timeline label="Completed" done={progress[3].done} detail="Mark the job complete after the work is finished." />
            </div>
          </section>
        </main>

        <aside className="requestDetailAside">
          <div className="sideCard">
            <span className="eyebrow">JOB DETAILS</span>
            <div className="sideDetail"><span><MapPin size={13} /> Location</span><strong>{request.location}</strong></div>
            <div className="sideDetail"><span><CalendarDays size={13} /> Schedule</span><strong>{request.preferred_date ? new Date(request.preferred_date).toLocaleString() : 'Flexible'}</strong></div>
            <div className="sideDetail"><span><CircleDollarSign size={13} /> Agreed value</span><strong>{quote ? '$' + Number(quote.amount).toLocaleString() : request.budget !== null ? '$' + Number(request.budget).toLocaleString() : 'Open'}</strong></div>
            <div className="sideDetail"><span><ShieldCheck size={13} /> Customer</span><strong>{customerName}</strong></div>
          </div>

          <div className="sideCard">
            <span className="eyebrow">CUSTOMER</span>
            <h3>{customerName}</h3>
            <p>Keep updates professional and tied to this job.</p>
            <button className="buttonPrimary full" onClick={() => onNavigate('/provider/messages?request=' + request.id + '&provider=' + request.customer_id)}><MessageCircle size={15} /> Open conversation</button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Timeline({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return (
    <div className={'providerJobTimelineItem ' + (done ? 'done' : '')}>
      <div>{done ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</div>
      <span><strong>{label}</strong><small>{detail}</small></span>
    </div>
  )
}
