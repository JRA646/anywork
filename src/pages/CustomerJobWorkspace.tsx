import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MessageCircle, Send, Star } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { RequestPhotos } from '../components/RequestPhotos'
import { confirmAction, showError, showSuccess } from '../lib/alerts'
import {
  approveChangeRequest, confirmJobSchedule, getJobSchedule, getRequest, listChangeRequests,
  listJobActivities, listProfiles, listQuotesForRequest, submitJobReview,
  type DbChangeRequest, type DbJobActivity, type DbJobSchedule, type DbProfile, type DbQuote, type DbRequest,
} from '../lib/anyworkApi'

export function CustomerJobWorkspace({ requestId, onBack, onNavigate }: { requestId: string; onBack: () => void; onNavigate: (path: string) => void }) {
  const [request, setRequest] = useState<DbRequest | null>(null)
  const [provider, setProvider] = useState<DbProfile | null>(null)
  const [quote, setQuote] = useState<DbQuote | null>(null)
  const [schedule, setSchedule] = useState<DbJobSchedule | null>(null)
  const [activities, setActivities] = useState<DbJobActivity[]>([])
  const [changes, setChanges] = useState<DbChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const dbRequest = await getRequest(requestId)
      const [quotes, scheduleRow, activityRows, changeRows] = await Promise.all([
        listQuotesForRequest(requestId), getJobSchedule(requestId), listJobActivities(requestId), listChangeRequests(requestId),
      ])
      const accepted = quotes.find((item) => item.status === 'Accepted') || null
      const profiles = dbRequest.selected_provider_id ? await listProfiles([dbRequest.selected_provider_id]) : []
      setRequest(dbRequest); setQuote(accepted); setProvider(profiles[0] || null); setSchedule(scheduleRow)
      setActivities(activityRows); setChanges(changeRows); setReviewed(false)
      if (scheduleRow?.proposed_start) setScheduleValue(new Date(scheduleRow.proposed_start).toISOString().slice(0,16))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load this job.') }
    finally { setLoading(false) }
  }, [requestId])

  useEffect(() => { void load() }, [load])

  const providerName = provider?.company_name || provider?.display_name || [provider?.first_name, provider?.last_name].filter(Boolean).join(' ') || 'Provider'
  const status = request?.status || 'Requested'
  const steps = ['Quote accepted', 'Schedule confirmed', 'In progress', 'Completed']
  const stepDone = [Boolean(quote), ['Scheduled','In Progress','Completed'].includes(status), ['In Progress','Completed'].includes(status), status === 'Completed']

  const confirmSchedule = async () => {
    if (!request || !scheduleValue) return
    const confirmed = await confirmAction({ title: 'Confirm this schedule?', text: 'The provider will see the job as scheduled.', confirmText: 'Confirm schedule', cancelText: 'Cancel' })
    if (!confirmed) return
    setBusy(true)
    try {
      const updated = await confirmJobSchedule({ requestId: request.id, start: new Date(scheduleValue).toISOString() })
      setRequest(updated); setSchedule(await getJobSchedule(request.id)); setActivities(await listJobActivities(request.id))
      await showSuccess('Schedule confirmed', 'The job is now ready for the provider to start.')
    } catch (e) { await showError('Unable to schedule', e instanceof Error ? e.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  const respondToChange = async (id: string, approved: boolean) => {
    setBusy(true)
    try {
      await approveChangeRequest(id, approved); setChanges(await listChangeRequests(requestId))
      await showSuccess(approved ? 'Change approved' : 'Change rejected', approved ? 'The updated amount is now part of the job.' : 'The provider has been notified.')
    } catch (e) { await showError('Unable to update change request', e instanceof Error ? e.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  const submitReview = async () => {
    if (!request?.selected_provider_id || !review.trim()) return
    setBusy(true)
    try {
      await submitJobReview({ requestId: request.id, providerId: request.selected_provider_id, rating, comment: review.trim() })
      setReviewed(true); await showSuccess('Review submitted', 'Thanks for completing the job feedback.')
    } catch (e) { await showError('Unable to submit review', e instanceof Error ? e.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="workspaceDashboard providerJobDetail"><div className="providerEmptyPanel"><div className="metricIcon"><Clock3 /></div><strong>Loading job workspace</strong><span>Fetching schedule, activity and change requests.</span></div></div>
  if (!request) return <div className="workspaceDashboard providerJobDetail"><div className="providerEmptyPanel"><strong>Job unavailable</strong><span>{error || 'This job could not be found.'}</span><button className="buttonPrimary" onClick={onBack}>Back to requests</button></div></div>

  return (
    <div className="workspaceDashboard providerJobDetail">
      <button className="backLinkModern" onClick={onBack}><ArrowLeft size={15} /> Back to requests</button>
      {error && <div className="formError">{error}</div>}
      <div className="providerJobDetailHeader">
        <div><span className="requestId">{request.request_number}</span><div className="providerJobDetailTitle"><h1>{request.title}</h1><StatusBadge status={status} /></div><p>{providerName} · {request.location}</p></div>
        <div className="providerJobDetailActions">
          <button className="buttonSecondary" onClick={() => onNavigate('/customer/messages?request=' + request.id + '&provider=' + request.selected_provider_id)}><MessageCircle size={15} /> Message provider</button>
          {status === 'Completed' && <button className="buttonSecondary" onClick={() => onNavigate('/customer/invoices/' + request.id)}>Invoice</button>}
        </div>
      </div>

      <div className="providerJobProgress">{steps.map((step, index) => <div className={stepDone[index] ? 'done' : ''} key={step}><span>{stepDone[index] ? <CheckCircle2 size={15} /> : index + 1}</span><small>{step}</small></div>)}</div>
      <RequestPhotos requestId={requestId} />

      <div className="providerJobDetailGrid">
        <main>
          <section className="dashboardCard">
            <span className="eyebrow">SCHEDULE</span><h2>{schedule?.confirmed_at ? 'Schedule confirmed' : 'Confirm the appointment'}</h2>
            <p className="providerJobBriefText">{schedule?.confirmed_at ? new Date(schedule.proposed_start || '').toLocaleString() : 'Choose the date and time when the provider should perform the work.'}</p>
            {!schedule?.confirmed_at && status === 'Quoted' && quote && <div className="jobWorkflowForm"><label><span>Date and time</span><input type="datetime-local" value={scheduleValue} onChange={(e) => setScheduleValue(e.target.value)} /></label><button className="buttonPrimary" disabled={busy || !scheduleValue} onClick={() => void confirmSchedule()}><CalendarDays size={15} /> Confirm schedule</button></div>}
          </section>

          <section className="dashboardCard">
            <span className="eyebrow">CHANGE REQUESTS</span><h2>Additional work</h2>
            {changes.length ? changes.map((change) => <div className="jobChangeCard" key={change.id}><div><strong>{change.description}</strong><small>{(change.amount_delta >= 0 ? '+' : '') + '$' + Number(change.amount_delta).toLocaleString()} · {change.status}</small></div>{change.status === 'Pending' && <div><button className="buttonSecondary" disabled={busy} onClick={() => void respondToChange(change.id, false)}>Reject</button><button className="buttonPrimary" disabled={busy} onClick={() => void respondToChange(change.id, true)}>Approve</button></div>}</div>) : <p className="providerJobBriefText">No additional work has been requested.</p>}
          </section>

          <section className="dashboardCard">
            <span className="eyebrow">ACTIVITY</span><h2>Job timeline</h2>
            <div className="providerJobTimeline">{activities.map((item) => <div className="providerJobTimelineItem done" key={item.id}><div><CheckCircle2 size={15} /></div><span><strong>{item.title}</strong><small>{(item.detail || '') + ' · ' + new Date(item.created_at).toLocaleString()}</small></span></div>)}{!activities.length && <p className="providerJobBriefText">Activity will appear here as the job moves through each stage.</p>}</div>
          </section>
        </main>

        <aside className="requestDetailAside">
          <div className="sideCard"><span className="eyebrow">JOB DETAILS</span><div className="sideDetail"><span>Provider</span><strong>{providerName}</strong></div><div className="sideDetail"><span>Agreed value</span><strong>{quote ? '$' + Number(quote.amount).toLocaleString() : 'Open'}</strong></div><div className="sideDetail"><span>Current budget</span><strong>{'$' + Number(request.budget || 0).toLocaleString()}</strong></div><div className="sideDetail"><span>Status</span><strong>{status}</strong></div></div>
          {status === 'Completed' && !reviewed && <div className="sideCard"><span className="eyebrow">REVIEW</span><h3>How did it go?</h3><div className="reviewStars">{[1,2,3,4,5].map((value) => <button key={value} aria-label={value + ' stars'} onClick={() => setRating(value)}><Star size={18} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div><textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share a short review..." rows={4} /><button className="buttonPrimary full" disabled={busy || !review.trim()} onClick={() => void submitReview()}><Send size={15} /> Submit review</button></div>}
          {reviewed && <div className="sideCard"><CheckCircle2 size={18} /><strong>Review submitted</strong><p>Your feedback is now part of the provider's record.</p></div>}
        </aside>
      </div>
    </div>
  )
}
