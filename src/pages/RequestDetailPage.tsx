import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Pencil,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
} from 'lucide-react'
import { quotes as mockQuotes, requests as mockRequests, providers as mockProviders, services } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'
import { ProviderCard } from '../components/ProviderCard'
import { RequestPhotos } from '../components/RequestPhotos'
import {
  acceptQuote,
  getRequest,
  listProfiles,
  listRequestEvents,
  listQuotesForRequest,
  subscribeToQuotes,
  subscribeToRequestEvents,
  subscribeToRequests,
  type DbProfile,
  type DbQuote,
  type DbRequest,
  type DbRequestEvent,
} from '../lib/anyworkApi'

type QuoteView = DbQuote & { provider: DbProfile | null; providerMock?: typeof mockProviders[number] }

export function RequestDetailPage({
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

  const [dbRequest, setDbRequest] = useState<DbRequest | null>(null)
  const [dbQuotes, setDbQuotes] = useState<DbQuote[]>([])
  const [dbProfiles, setDbProfiles] = useState<DbProfile[]>([])
  const [events, setEvents] = useState<DbRequestEvent[]>([])
  const [tab, setTab] = useState<'quotes' | 'activity'>('quotes')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(isUuid)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!isUuid) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const request = await Promise.race([
          getRequest(requestId),
          new Promise<DbRequest>((_, reject) => {
            window.setTimeout(() => reject(new Error('The request is taking too long to load. Please try again.')), 8000)
          }),
        ])

        const rows = await Promise.race([
          listQuotesForRequest(request.id),
          new Promise<DbQuote[]>((_, reject) => {
            window.setTimeout(() => reject(new Error('Provider quotes are taking too long to load.')), 8000)
          }),
        ])

        let profiles: DbProfile[] = []
        if (rows.length) {
          const providerIds = Array.from(new Set(rows.map((quote) => quote.provider_id)))
          profiles = await Promise.race([
            listProfiles(providerIds),
            new Promise<DbProfile[]>((_, reject) => {
              window.setTimeout(() => reject(new Error('Provider details are taking too long to load.')), 8000)
            }),
          ])
        }

        setDbRequest(request)
        setDbQuotes(rows)
        setDbProfiles(profiles)
        setSelectedQuoteId(rows.find((quote) => quote.status === 'Accepted')?.id || null)
        setEvents(await listRequestEvents(request.id))
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Unable to load this request.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [requestId, isUuid, retryKey])

  useEffect(() => {
    if (!isUuid) return
    let requestCleanup: (() => void) | undefined
    let quoteCleanup: (() => void) | undefined
    let eventCleanup: (() => void) | undefined

    void subscribeToRequests((change) => {
      if (change.record?.id === requestId) setDbRequest(change.record)
      if (!change.record && change.oldRecord?.id === requestId) setDbRequest(null)
    }).then((dispose) => { requestCleanup = dispose }).catch(() => undefined)

    void subscribeToQuotes((change) => {
      if (change.record?.request_id === requestId) {
        setDbQuotes((current) => [...current.filter((item) => item.id !== change.record!.id), change.record!].sort((a, b) => Number(a.amount) - Number(b.amount)))
        const quoteProviderId = change.record.provider_id
        if (!dbProfiles.some((profile) => profile.user_id === quoteProviderId)) {
          void listProfiles([quoteProviderId]).then((rows) => {
            if (rows.length) setDbProfiles((current) => [...current.filter((item) => item.user_id !== quoteProviderId), ...rows])
          }).catch(() => undefined)
        }
        if (change.record.status === 'Accepted') setSelectedQuoteId(change.record.id)
      } else if (!change.record && change.oldRecord?.request_id === requestId && change.oldRecord.id) {
        setDbQuotes((current) => current.filter((item) => item.id !== change.oldRecord?.id))
      }
    }).then((dispose) => { quoteCleanup = dispose }).catch(() => undefined)

    void subscribeToRequestEvents(requestId, (event) => {
      setEvents((current) => current.some((item) => item.id === event.id) ? current : [...current, event])
    }).then((dispose) => { eventCleanup = dispose }).catch(() => undefined)

    return () => { requestCleanup?.(); quoteCleanup?.(); eventCleanup?.() }
  }, [requestId, isUuid, dbProfiles])

  const request = dbRequest || mockRequest
  const serviceKey = request && 'service_key' in request ? request.service_key : request?.serviceId
  const service = services.find((item) => item.id === serviceKey)

  const quoteViews = useMemo<QuoteView[]>(() => {
    if (dbRequest) {
      return dbQuotes.map((quote) => ({
        ...quote,
        provider: dbProfiles.find((profile) => profile.user_id === quote.provider_id) || null,
      }))
    }

    if (!mockRequest) return []

    return mockRequest.quotes
      .map((id) => mockQuotes.find((quote) => quote.id === id))
      .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote))
      .map((quote) => ({
        id: quote.id,
        request_id: quote.requestId,
        provider_id: quote.providerId,
        amount: quote.amount,
        availability: quote.availability,
        message: quote.message,
        status: quote.status,
        created_at: '',
        updated_at: '',
        provider: null,
        providerMock: mockProviders.find((provider) => provider.id === quote.providerId),
      }))
  }, [dbRequest, dbQuotes, dbProfiles, mockRequest])

  const selectedQuote = quoteViews.find((quote) => quote.id === selectedQuoteId) || null
  const currentProvider = selectedQuote?.provider
  const currentMockProvider = selectedQuote?.providerMock
  const lowestQuote = quoteViews.length ? Math.min(...quoteViews.map((quote) => Number(quote.amount))) : null
  const requestBudget = request ? Number('budget' in request ? request.budget : 0) : 0
  const budgetDifference = lowestQuote !== null ? lowestQuote - requestBudget : null
  const requestStatus = request?.status || 'Requested'
  const requestLocation = request?.location || ''
  const requestTitle = request?.title || ''
  const requestIdLabel = dbRequest?.request_number || mockRequest?.id || requestId
  const requestDate = dbRequest?.preferred_date
    ? new Date(dbRequest.preferred_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : mockRequest?.date || 'Flexible schedule'
  const requestDescription = dbRequest?.description || mockRequest?.description || ''

  const progress = [
    { label: 'Request submitted', done: true },
    { label: 'Providers reviewing', done: requestStatus !== 'Requested' },
    { label: 'Quotes received', done: quoteViews.length > 0 || requestStatus !== 'Requested' },
    { label: 'Provider selected', done: Boolean(selectedQuote) },
    { label: 'Scheduled', done: ['Scheduled', 'In Progress', 'Completed'].includes(requestStatus) },
    { label: 'In progress', done: ['In Progress', 'Completed'].includes(requestStatus) },
    { label: 'Completed', done: requestStatus === 'Completed' },
  ]

  const handleSelectQuote = async (quote: QuoteView) => {
    setSelectedQuoteId(quote.id)
    if (!dbRequest || !quote.provider_id) return
    try {
      await acceptQuote(dbRequest.id, quote.id, quote.provider_id)
      setDbQuotes((current) => current.map((item) => ({
        ...item,
        status: item.id === quote.id ? 'Accepted' : 'Declined',
      })))
      setDbRequest((current) => current ? { ...current, selected_provider_id: quote.provider_id } : current)
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : 'Unable to select this quote.')
    }
  }

  if (loading) {
    return <div className="workspaceDashboard requestDetailPage"><div className="requestEmptyModern requestLoadingState"><div className="requestLoadingPulse" /><h2>Loading request</h2><p>Fetching your request, quotes and provider details.</p></div></div>
  }

  if (!request) {
    return (
      <div className="workspaceDashboard requestDetailPage">
        <div className="requestEmptyModern">
          <span className="eyebrow">REQUEST UNAVAILABLE</span>
          <h2>{error ? 'We could not load this request.' : 'Request not found'}</h2>
          <p>{error || 'This request is no longer available in your account.'}</p>
          <div className="requestEmptyActions">
            <button className="buttonSecondary" onClick={onBack}>Back to requests</button>
            {isUuid && <button className="buttonPrimary" onClick={() => setRetryKey((value) => value + 1)}>Try again</button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="workspaceDashboard requestDetailPage">
      <button className="backLinkModern" onClick={onBack}><ArrowLeft size={15} /> Back to requests</button>

      {error && <div className="formError requestDetailError">{error}</div>}

      <section className="requestDetailHero">
        <div className="requestDetailHeading">
          <div>
            <div className="requestDetailEyebrow"><span className="requestId">{requestIdLabel}</span><StatusBadge status={requestStatus} /></div>
            <h1>{requestTitle}</h1>
            <p><MapPin size={14} /> {requestLocation} <span>·</span> <CalendarDays size={14} /> {requestDate}</p>
          </div>
          <div className="requestDetailActions">
            <button
              className="buttonSecondary"
              onClick={() => {
                const provider = selectedQuote?.provider_id || ''
                const query = new URLSearchParams()
                if (dbRequest?.id || isUuid) query.set('request', dbRequest?.id || requestId)
                if (provider) query.set('provider', provider)
                onNavigate('/customer/messages' + (query.toString() ? '?' + query.toString() : ''))
              }}
            >
              <MessageCircle size={15} /> Message
            </button>
            {requestStatus === 'Requested'
              ? <button className="buttonSecondary" onClick={() => onNavigate('/help')}><Pencil size={15} /> Request support</button>
              : <button className="buttonPrimary" onClick={() => document.getElementById('request-quotes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Compare quotes <ArrowRight size={15} /></button>}
          </div>
        </div>

        <div className="requestProgressCard">
          <div className="requestProgressHeader">
            <div><span className="eyebrow">REQUEST PROGRESS</span><strong>{selectedQuote ? 'Provider selected' : requestStatus === 'Quoted' ? quoteViews.length + ' quotes received' : requestStatus}</strong></div>
            <span>{progress.filter((step) => step.done).length} of {progress.length} milestones</span>
          </div>
          <div className="requestProgressRail">
            {progress.map((step, index) => (
              <div className={'requestProgressStep ' + (step.done ? 'done' : '')} key={step.label}>
                <span className="requestProgressDot">{step.done ? <Check size={11} /> : index + 1}</span><small>{step.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="requestSummaryGrid">
          <div className="requestSummaryCard"><span>Service</span><strong>{service?.label || service?.title || 'Service request'}</strong><small>{service?.title || request.service_key || ''}</small></div>
          <div className="requestSummaryCard"><span>Location</span><strong>{requestLocation}</strong><small>Service address</small></div>
          <div className="requestSummaryCard"><span>Budget</span><strong>{requestBudget ? '$' + requestBudget.toLocaleString() : 'Open to quotes'}</strong><small>Customer budget</small></div>
          <div className="requestSummaryCard requestSummaryHighlight"><span>Next step</span><strong>{selectedQuote ? 'Confirm scheduling' : 'Review provider quotes'}</strong><small>{selectedQuote ? 'Your selected provider is ready to coordinate.' : `${quoteViews.length} providers have responded to this request.`}</small></div>
        </div>
      </section>

      <div className="requestDetailLayout">
        <main>
          {isUuid && <RequestPhotos requestId={requestId} canUpload />}
          <div className="requestContentTabs" id="request-quotes">
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>Quotes ({quoteViews.length})</button>
            <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button>
          </div>

          {tab === 'quotes' ? (
            <section className="requestQuotesSection">
              <div className="requestSectionHeading"><div><span className="eyebrow">COMPARE PROVIDERS</span><h2>Quotes for this request</h2></div><span>{quoteViews.length} responses</span></div>
              <div className="quoteBudgetBar">
                <div><span>Your budget</span><strong>{requestBudget ? '$' + requestBudget.toLocaleString() : 'Open'}</strong></div>
                <div><span>Lowest quote</span><strong>{lowestQuote !== null ? '$' + lowestQuote.toLocaleString() : '—'}</strong></div>
                <div><span>Difference</span><strong className={budgetDifference !== null && budgetDifference <= 0 ? 'withinBudget' : ''}>{budgetDifference !== null ? (budgetDifference > 0 ? '+' : '') + '$' + budgetDifference.toLocaleString() : '—'}</strong></div>
              </div>

              <div className="quoteComparison professionalQuotes">
                {quoteViews.length ? quoteViews.map((quote) => {
                  const selected = selectedQuoteId === quote.id
                  const providerName = quote.provider ? (quote.provider.company_name || quote.provider.display_name || [quote.provider.first_name, quote.provider.last_name].filter(Boolean).join(' ')) : quote.providerMock?.name || 'Provider'
                  const initials = quote.provider
                    ? (quote.provider.company_name || quote.provider.display_name || [quote.provider.first_name, quote.provider.last_name].filter(Boolean).join(' ')).split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
                    : quote.providerMock?.initials || 'PR'

                  return (
                    <article className={'quoteCardModern professionalQuoteCard ' + (selected ? 'selected' : '')} key={quote.id}>
                      <div className="professionalQuoteTop">
                        <div className="professionalQuoteProvider">
                          {quote.providerMock ? (
                            <ProviderCard provider={quote.providerMock} compact />
                          ) : (
                            <div className="requestProviderIdentity">
                              <span className="providerAvatarLarge">{initials}</span>
                              <div><strong>{providerName}</strong><span>{quote.provider?.city || 'Verified provider'}</span></div>
                            </div>
                          )}
                          {quote.provider?.is_active !== false && <span className="verifiedPill"><ShieldCheck size={11} /> Verified</span>}
                        </div>
                        <div className="professionalQuotePrice"><small>QUOTE</small><strong>{'$' + Number(quote.amount).toLocaleString()}</strong></div>
                      </div>
                      <p>{quote.message}</p>
                      <div className="quoteMeta professionalQuoteMeta">
                        <span><CalendarDays size={14} /> {quote.availability ? new Date(quote.availability).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Flexible availability'}</span>
                        {quote.providerMock && <span><Star size={14} /> {quote.providerMock.rating}</span>}
                        {quote.providerMock && <span><CheckCircle2 size={14} /> {quote.providerMock.completedJobs} jobs</span>}
                      </div>
                      {selected && <div className="selectedQuoteNotice"><CheckCircle2 size={14} /> Selected for your request</div>}
                      <div className="quoteActions">
                        <button className="buttonSecondary" onClick={() => quote.providerMock ? onNavigate('/providers/' + quote.providerMock.id) : undefined}>View provider</button>
                        <button className={selected ? 'buttonPrimary quoteSelectedButton' : 'buttonPrimary'} onClick={() => void handleSelectQuote(quote)}>{selected ? <><Check size={15} /> Selected</> : <>Select quote <ArrowRight size={15} /></>}</button>
                        <button className="buttonGhost" onClick={() => {
                          const query = new URLSearchParams()
                          if (dbRequest || isUuid) query.set('request', dbRequest?.id || requestId)
                          query.set('provider', quote.provider_id)
                          onNavigate('/customer/messages?' + query.toString())
                        }}><MessageCircle size={14} /> Message</button>
                      </div>
                    </article>
                  )
                }) : <div className="emptyModern"><h3>Waiting for provider responses</h3><p>Providers matching this request will appear here.</p></div>}
              </div>
            </section>
          ) : (
            <section className="requestActivitySection">
              <div className="requestSectionHeading"><div><span className="eyebrow">ACTIVITY</span><h2>Request history</h2></div></div>
              <div className="updatesTimeline professionalTimeline">
                {events.length ? events.map((event) => (
                  <TimelineItem
                    key={event.id}
                    title={event.title}
                    detail={event.detail || ''}
                    done
                  />
                )) : (
                  <>
                    <TimelineItem title="Request submitted" detail="Your service request was created." done />
                    <TimelineItem title="Providers contacted" detail="Matching providers were notified." done={requestStatus !== 'Requested'} />
                    <TimelineItem title="Quotes received" detail={quoteViews.length + ' provider responses are available.'} done={quoteViews.length > 0} />
                    <TimelineItem title="Provider selected" detail={selectedQuote ? 'A provider has been selected for the next step.' : 'Choose a quote to move forward.'} done={Boolean(selectedQuote)} />
                    <TimelineItem title="Appointment scheduled" detail={requestDate} done={['Scheduled', 'In Progress', 'Completed'].includes(requestStatus)} />
                    <TimelineItem title="Work in progress" detail="Provider completes the requested work." done={['In Progress', 'Completed'].includes(requestStatus)} />
                    <TimelineItem title="Completed & ready for review" detail="Review the completed service when the job is finished." done={requestStatus === 'Completed'} />
                  </>
                )}
              </div>
            </section>
          )}
        </main>

        <aside className="requestDetailAside">
          <div className="sideCard requestInfoCard">
            <span className="eyebrow">YOUR REQUEST</span>
            <h3>What you asked for</h3>
            <p>{requestDescription}</p>
            <div className="sideDetail"><span><Tag size={13} /> Service</span><strong>{service?.title || serviceKey}</strong></div>
            <div className="sideDetail"><span><MapPin size={13} /> Location</span><strong>{requestLocation}</strong></div>
            <div className="sideDetail"><span><CalendarDays size={13} /> Date</span><strong>{requestDate}</strong></div>
            <div className="sideDetail"><span>Budget</span><strong>{requestBudget ? '$' + requestBudget.toLocaleString() : 'Open'}</strong></div>
            {dbRequest?.access_notes && <div className="sideDetail"><span>Access</span><strong>{dbRequest.access_notes}</strong></div>}
          </div>

          {selectedQuote ? (
            <div className="sideCard selectedProviderCard">
              <span className="eyebrow">SELECTED PROVIDER</span>
              {currentProvider ? (
                <div className="requestProviderIdentity selected"><span className="providerAvatarLarge">{currentProvider.company_name ? currentProvider.company_name.split(' ').map((p) => p[0]).slice(0, 2).join('') : 'PR'}</span><div><strong>{currentProvider.company_name || currentProvider.display_name}</strong><span>{currentProvider.city || 'Provider'}</span></div></div>
              ) : currentMockProvider ? <ProviderCard provider={currentMockProvider} compact /> : null}
              <button className="buttonPrimary full" onClick={() => {
                const query = new URLSearchParams()
                if (dbRequest || isUuid) query.set('request', dbRequest?.id || requestId)
                query.set('provider', selectedQuote.provider_id)
                onNavigate('/customer/messages?' + query.toString())
              }}><MessageCircle size={15} /> Message provider</button>
            </div>
          ) : (
            <div className="sideCard nextStepCard">
              <span className="eyebrow">NEXT STEP</span><h3>Review your quotes</h3><p>{quoteViews.length ? `${quoteViews.length} providers have responded. Compare availability, experience and quote details before selecting one.` : 'Provider quotes will appear here once providers respond to your request.'}</p>
              <button className="buttonPrimary full" onClick={() => document.getElementById('request-quotes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Compare quotes <ArrowRight size={15} /></button>
            </div>
          )}

          <div className="sideCard supportCard"><span className="eyebrow">NEED HELP?</span><h3>ANYwork support</h3><p>Your request, messages and updates stay together so you always know what happens next.</p><button className="textLink" onClick={() => onNavigate('/help')}>Open support <ArrowRight size={15} /></button></div>
        </aside>
      </div>
    </div>
  )
}

function TimelineItem({ title, detail, done }: { title: string; detail: string; done: boolean }) {
  return <div className={'timelineModernItem professionalTimelineItem ' + (done ? 'done' : '')}><div>{done ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</div><span><strong>{title}</strong><small>{detail}</small></span></div>
}
