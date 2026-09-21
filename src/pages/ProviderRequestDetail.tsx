import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  MapPin,
  Send,
  Users,
} from 'lucide-react'
import { requests as mockRequests, services } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'
import { showError, showSuccess } from '../lib/alerts'
import { RequestPhotos } from '../components/RequestPhotos'
import {
  createQuote,
  retryQuoteEmail,
  getCurrentUserId,
  getRequest,
  listProfiles,
  listQuotesForRequest,
  subscribeToQuotes,
  subscribeToRequests,
  type DbProfile,
  type DbQuote,
  type DbRequest,
} from '../lib/anyworkApi'

export function ProviderRequestDetail({
  requestId,
  onBack,
  onNavigate,
}: {
  requestId: string
  onBack: () => void
  onNavigate: (path: string) => void
}) {
  const mockRequest = mockRequests.find((item) => item.id === requestId)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)

  const [request, setRequest] = useState<DbRequest | null>(null)
  const [customer, setCustomer] = useState<DbProfile | null>(null)
  const [quote, setQuote] = useState<DbQuote | null>(null)
  const [amount, setAmount] = useState('')
  const [availability, setAvailability] = useState('')
  const [message, setMessage] = useState('We can complete the requested work based on the details provided. Final measurements and access will be confirmed before the appointment.')
  const [loading, setLoading] = useState(isUuid)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (!isUuid) {
      setAmount(mockRequest?.budget ? String(mockRequest.budget) : '')
      setAvailability(mockRequest?.date || '')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [currentProviderId, dbRequest] = await Promise.all([getCurrentUserId(), getRequest(requestId)])
        const [quotes, profiles] = await Promise.all([
          listQuotesForRequest(dbRequest.id),
          dbRequest.customer_id ? listProfiles([dbRequest.customer_id]) : Promise.resolve([] as DbProfile[]),
        ])
        const existingQuote = quotes.find((item) => item.provider_id === currentProviderId) || null
        setRequest(dbRequest)
        setCustomer(profiles[0] || null)
        setQuote(existingQuote)
        setAmount(existingQuote ? String(existingQuote.amount) : dbRequest.budget !== null ? String(dbRequest.budget) : '')
        setAvailability(existingQuote?.availability ? new Date(existingQuote.availability).toISOString().slice(0, 16) : dbRequest.preferred_date ? new Date(dbRequest.preferred_date).toISOString().slice(0, 16) : '')
        setMessage(existingQuote?.message || 'We can complete the requested work based on the details provided. Final measurements and access will be confirmed before the appointment.')
        setSent(Boolean(existingQuote))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this request.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [requestId, isUuid, mockRequest?.budget, mockRequest?.date])

  useEffect(() => {
    if (!isUuid) return
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined

    void subscribeToRequests((change) => {
      if (change.record?.id === requestId) setRequest(change.record)
      if (!change.record && change.oldRecord?.id === requestId) setRequest(null)
    }).then((dispose) => { requestCleanup = dispose }).catch(() => undefined)

    void subscribeToQuotes((change) => {
      if (change.record?.request_id === requestId) {
        void getCurrentUserId().then((providerId) => {
          if (change.record?.provider_id !== providerId) return
          setQuote(change.record)
          setSent(true)
          setAmount(String(change.record.amount))
          setAvailability(change.record.availability ? new Date(change.record.availability).toISOString().slice(0, 16) : '')
          setMessage(change.record.message)
        }).catch(() => undefined)
      }
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)

    return () => { requestCleanup?.(); quoteCleanup?.() }
  }, [requestId, isUuid])

  const detail = request || mockRequest
  const serviceKey = request?.service_key || mockRequest?.serviceId
  const service = services.find((item) => item.id === serviceKey)
  const requestLabel = request?.request_number || mockRequest?.id || requestId
  const requestDate = request?.preferred_date
    ? new Date(request.preferred_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : mockRequest?.date || 'Flexible schedule'
  const customerName = customer
    ? customer.company_name || customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    : request?.requester_name || mockRequest?.customer || 'Guest requester'
  const numericAmount = Number(amount)
  const validQuote = Number.isFinite(numericAmount) && numericAmount > 0 && message.trim().length >= 10

  const requestDescription = request?.description || mockRequest?.description || ''
  const requestBudget = request?.budget ?? mockRequest?.budget ?? null

  const submitQuote = async () => {
    if (!isUuid || !request || !validQuote) return
    setSending(true)
    setError('')
    try {
      const result = await createQuote({
        requestId: request.id,
        amount: numericAmount,
        availability: availability ? new Date(availability).toISOString() : null,
        message: message.trim(),
      })
      setQuote(result.quote)
      setSent(true)
      setEmailError(result.emailError || '')

      if (result.emailSent) {
        await showSuccess('Quote sent', 'The customer received your quote by email and can review it now.')
      } else {
        await showSuccess(
          'Quote submitted',
          result.emailError
            ? 'The quote was saved, but the email could not be delivered yet. Check the email configuration in Supabase.'
            : 'The quote was submitted successfully.',
        )
      }
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : 'Unable to send your quote.'
      setError(messageText)
      await showError('Unable to send quote', messageText)
    } finally {
      setSending(false)
    }
  }

  const retryEmail = async () => {
    if (!quote) return
    setSending(true)
    try {
      const result = await retryQuoteEmail(quote.id)
      if (!result.sent) throw new Error(result.error || 'The quote email could not be sent.')
      setEmailError('')
      await showSuccess('Quote email sent', 'The customer received the quote email.')
    } catch (retryError) {
      const messageText = retryError instanceof Error ? retryError.message : 'Unable to send the quote email.'
      setEmailError(messageText)
      await showError('Email delivery failed', messageText)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="workspaceDashboard providerRequestDetail"><div className="providerEmptyPanel"><div className="metricIcon"><Clock3 /></div><strong>Loading request</strong><span>Fetching the customer requirements and quote history.</span></div></div>
  }

  if (!detail) {
    return <div className="workspaceDashboard providerRequestDetail"><div className="providerEmptyPanel"><strong>Request not found</strong><span>This opportunity may no longer be available.</span><button className="buttonPrimary" onClick={onBack}>Back to requests</button></div></div>
  }

  return (
    <div className="workspaceDashboard providerRequestDetail">
      <button className="backLinkModern" onClick={onBack}><ArrowLeft size={15} /> Back to requests</button>

      {error && <div className="formError">{error}</div>}

      <div className="requestDetailTop providerRequestTop">
        <div>
          <div className="requestDetailEyebrow"><span className="requestId">{requestLabel}</span><StatusBadge status={request?.status || mockRequest?.status || 'Requested'} /></div>
          <h1>{detail.title}</h1>
          <p>{customerName} · {detail.location} · {requestDate}</p>
        </div>
        {request?.customer_id && (
          <button className="buttonSecondary" onClick={() => onNavigate('/provider/messages' + (request ? '?request=' + request.id + (customer?.user_id ? '&provider=' + customer.user_id : '') : ''))}>
            <MessageCircle size={15} /> Message customer
          </button>
        )}
      </div>

      {isUuid && <RequestPhotos requestId={requestId} />}
      
      <div className="providerRequestSummary">
        <div><MapPin size={16} /><span><small>Location</small><strong>{detail.location}</strong></span></div>
        <div><CalendarDays size={16} /><span><small>Preferred schedule</small><strong>{requestDate}</strong></span></div>
        <div><CircleDollarSign size={16} /><span><small>Customer budget</small><strong>{requestBudget !== null ? '$' + Number(requestBudget).toLocaleString() : 'Open'}</strong></span></div>
        <div><Users size={16} /><span><small>Service</small><strong>{service?.label || service?.title || serviceKey}</strong></span></div>
      </div>

      <div className="providerQuoteLayout providerRequestLayout">
        <section className="dashboardCard providerRequestBrief">
          <span className="eyebrow">CUSTOMER REQUEST</span>
          <h2>Understand the work</h2>
          <p>{requestDescription}</p>
          {request?.access_notes && <div className="providerAccessNote"><strong>Access notes</strong><span>{request.access_notes}</span></div>}
          <div className="requestInfoList">
            <span><Users /> {customerName}</span>
            {request?.requester_email && <span>✉ {request.requester_email}</span>}
            <span><MapPin /> {detail.location}</span>
            <span><CalendarDays /> {requestDate}</span>
            <span><CircleDollarSign /> {requestBudget !== null ? '$' + Number(requestBudget).toLocaleString() + ' customer budget' : 'Budget is open to quotes'}</span>
          </div>
        </section>

        <section className="dashboardCard quoteBuilderCard providerQuoteComposer">
          <span className="eyebrow">YOUR QUOTE</span>
          <h2>{sent ? 'Quote submitted.' : 'Send a clear quote.'}</h2>
          {sent ? (
            <>
              <div className="quoteSubmittedState"><CheckCircle2 size={22} /><strong>{quote ? '
              <div className="quoteBuilderActions">
                {request?.customer_id && <button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + (request?.id || requestId))}><MessageCircle size={15} /> Message customer</button>}
                <button className="buttonPrimary" onClick={onBack}>Back to opportunities <ArrowRight size={15} /></button>
              </div>
            </>
          ) : (
            <>
              <label><span>Quote amount</span><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 1850" /></label>
              <label><span>Earliest availability</span><input type="datetime-local" value={availability} onChange={(event) => setAvailability(event.target.value)} /></label>
              <label><span>Message to customer</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what is included, timing and any assumptions." /></label>
              <div className="quoteComposerGuidance"><span><CheckCircle2 size={13} /> Be specific about what's included.</span><span><CheckCircle2 size={13} /> Confirm your earliest realistic availability.</span></div>
              <div className="quoteBuilderActions"><button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + (request?.id || requestId))}><MessageCircle size={15} /> Message first</button><button className="buttonPrimary" disabled={!validQuote || sending} onClick={() => void submitQuote()}><Send size={15} /> {sending ? 'Sending…' : 'Send quote'}</button></div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
 + Number(quote.amount).toLocaleString() : '
              <div className="quoteBuilderActions">
                {request?.customer_id && <button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + (request?.id || requestId))}><MessageCircle size={15} /> Message customer</button>}
                <button className="buttonPrimary" onClick={onBack}>Back to opportunities <ArrowRight size={15} /></button>
              </div>
            </>
          ) : (
            <>
              <label><span>Quote amount</span><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 1850" /></label>
              <label><span>Earliest availability</span><input type="datetime-local" value={availability} onChange={(event) => setAvailability(event.target.value)} /></label>
              <label><span>Message to customer</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what is included, timing and any assumptions." /></label>
              <div className="quoteComposerGuidance"><span><CheckCircle2 size={13} /> Be specific about what's included.</span><span><CheckCircle2 size={13} /> Confirm your earliest realistic availability.</span></div>
              <div className="quoteBuilderActions"><button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + (request?.id || requestId))}><MessageCircle size={15} /> Message first</button><button className="buttonPrimary" disabled={!validQuote || sending} onClick={() => void submitQuote()}><Send size={15} /> {sending ? 'Sending…' : 'Send quote'}</button></div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
 + numericAmount.toLocaleString()}</strong><span>Your response is attached to {requestLabel}. You can still message the customer while they review it.</span></div>
              {emailError && (
                <div className="formError">
                  <span>Quote saved, but email delivery needs attention.</span>
                  <button className="buttonGhost" type="button" onClick={() => void retryEmail()} disabled={sending}>Retry email</button>
                </div>
              )}
              <div className="quoteBuilderActions">
                {request?.customer_id && <button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + (request?.id || requestId))}><MessageCircle size={15} /> Message customer</button>}
                <button className="buttonPrimary" onClick={onBack}>Back to opportunities <ArrowRight size={15} /></button>
              </div>
            </>
          ) : (
            <>
              <label><span>Quote amount</span><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 1850" /></label>
              <label><span>Earliest availability</span><input type="datetime-local" value={availability} onChange={(event) => setAvailability(event.target.value)} /></label>
              <label><span>Message to customer</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what is included, timing and any assumptions." /></label>
              <div className="quoteComposerGuidance"><span><CheckCircle2 size={13} /> Be specific about what's included.</span><span><CheckCircle2 size={13} /> Confirm your earliest realistic availability.</span></div>
              <div className="quoteBuilderActions"><button className="buttonSecondary" onClick={() => onNavigate('/provider/messages?request=' + (request?.id || requestId))}><MessageCircle size={15} /> Message first</button><button className="buttonPrimary" disabled={!validQuote || sending} onClick={() => void submitQuote()}><Send size={15} /> {sending ? 'Sending…' : 'Send quote'}</button></div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
