import { useMemo, useState } from 'react'
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
import { quotes, requests, providers, services } from '../data/mockData'
import { StatusBadge } from '../components/StatusBadge'
import { ProviderCard } from '../components/ProviderCard'

export function RequestDetailPage({
  requestId,
  onBack,
  onNavigate,
}: {
  requestId: string
  onBack: () => void
  onNavigate: (path: string) => void
}) {
  const request = requests.find((item) => item.id === requestId) || requests[0]
  const [tab, setTab] = useState<'quotes' | 'activity'>('quotes')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(
    request.quotes.find((id) => quotes.find((quote) => quote.id === id)?.status === 'Accepted') || null,
  )

  const service = services.find((item) => item.id === request.serviceId)
  const requestQuotes = useMemo(
    () => request.quotes
      .map((id) => quotes.find((quote) => quote.id === id))
      .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote)),
    [request.quotes],
  )

  const selectedQuote = requestQuotes.find((quote) => quote.id === selectedQuoteId) || null
  const currentProvider = selectedQuote ? providers.find((item) => item.id === selectedQuote.providerId) : null
  const lowestQuote = requestQuotes.length ? Math.min(...requestQuotes.map((quote) => quote.amount)) : null
  const budgetDifference = lowestQuote !== null ? lowestQuote - request.budget : null

  const progress = [
    { label: 'Request submitted', done: true },
    { label: 'Providers reviewing', done: request.status !== 'Requested' },
    { label: 'Quotes received', done: request.quotes.length > 0 && request.status !== 'Requested' },
    { label: 'Provider selected', done: Boolean(selectedQuote) },
    { label: 'Scheduled', done: ['Scheduled', 'In Progress', 'Completed'].includes(request.status) },
    { label: 'In progress', done: ['In Progress', 'Completed'].includes(request.status) },
    { label: 'Completed', done: request.status === 'Completed' },
  ]

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId)
  }

  return (
    <div className="workspaceDashboard requestDetailPage">
      <button className="backLinkModern" onClick={onBack}>
        <ArrowLeft size={15} /> Back to requests
      </button>

      <section className="requestDetailHero">
        <div className="requestDetailHeading">
          <div>
            <div className="requestDetailEyebrow">
              <span className="requestId">{request.id}</span>
              <StatusBadge status={request.status} />
            </div>
            <h1>{request.title}</h1>
            <p><MapPin size={14} /> {request.location} <span>·</span> <CalendarDays size={14} /> {request.date}</p>
          </div>
          <div className="requestDetailActions">
            <button className="buttonSecondary" onClick={() => onNavigate('/customer/messages/' + request.id)}>
              <MessageCircle size={15} /> Message
            </button>
            {request.status === 'Requested' ? (
              <button className="buttonSecondary" onClick={() => onNavigate('/help')}>
                <Pencil size={15} /> Request support
              </button>
            ) : (
              <button className="buttonPrimary" onClick={() => document.getElementById('request-quotes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                Compare quotes <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="requestProgressCard">
          <div className="requestProgressHeader">
            <div>
              <span className="eyebrow">REQUEST PROGRESS</span>
              <strong>{selectedQuote ? 'Provider selected' : request.status === 'Quoted' ? request.quotes.length + ' quotes received' : request.status}</strong>
            </div>
            <span>{progress.filter((step) => step.done).length} of {progress.length} milestones</span>
          </div>
          <div className="requestProgressRail">
            {progress.map((step, index) => (
              <div className={'requestProgressStep ' + (step.done ? 'done' : '')} key={step.label}>
                <span className="requestProgressDot">{step.done ? <Check size={11} /> : index + 1}</span>
                <small>{step.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="requestSummaryGrid">
          <div className="requestSummaryCard">
            <span>Service</span>
            <strong>{service?.label || service?.title}</strong>
            <small>{service?.title}</small>
          </div>
          <div className="requestSummaryCard">
            <span>Location</span>
            <strong>{request.location}</strong>
            <small>Service address</small>
          </div>
          <div className="requestSummaryCard">
            <span>Budget</span>
            <strong>{'$' + request.budget.toLocaleString()}</strong>
            <small>Customer budget</small>
          </div>
          <div className="requestSummaryCard requestSummaryHighlight">
            <span>Next step</span>
            <strong>{selectedQuote ? 'Confirm scheduling' : 'Review provider quotes'}</strong>
            <small>{selectedQuote ? 'Your selected provider is ready to coordinate.' : `${requestQuotes.length} providers have responded to this request.`}</small>
          </div>
        </div>
      </section>

      <div className="requestDetailLayout">
        <main>
          <div className="requestContentTabs" id="request-quotes">
            <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>Quotes ({requestQuotes.length})</button>
            <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button>
          </div>

          {tab === 'quotes' ? (
            <section className="requestQuotesSection">
              <div className="requestSectionHeading">
                <div>
                  <span className="eyebrow">COMPARE PROVIDERS</span>
                  <h2>Quotes for this request</h2>
                </div>
                <span>{requestQuotes.length} responses</span>
              </div>

              <div className="quoteBudgetBar">
                <div>
                  <span>Your budget</span>
                  <strong>{'$' + request.budget.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Lowest quote</span>
                  <strong>{lowestQuote !== null ? '$' + lowestQuote.toLocaleString() : '—'}</strong>
                </div>
                <div>
                  <span>Difference</span>
                  <strong className={budgetDifference !== null && budgetDifference <= 0 ? 'withinBudget' : ''}>
                    {budgetDifference !== null ? (budgetDifference > 0 ? '+' : '') + '$' + budgetDifference.toLocaleString() : '—'}
                  </strong>
                </div>
              </div>

              <div className="quoteComparison professionalQuotes">
                {requestQuotes.length ? requestQuotes.map((quote) => {
                  const provider = providers.find((item) => item.id === quote.providerId)
                  if (!provider) return null
                  const selected = selectedQuoteId === quote.id
                  return (
                    <article className={'quoteCardModern professionalQuoteCard ' + (selected ? 'selected' : '')} key={quote.id}>
                      <div className="professionalQuoteTop">
                        <div className="professionalQuoteProvider">
                          <ProviderCard provider={provider} compact />
                          {provider.verified && <span className="verifiedPill"><ShieldCheck size={11} /> Verified</span>}
                        </div>
                        <div className="professionalQuotePrice">
                          <small>QUOTE</small>
                          <strong>{'$' + quote.amount.toLocaleString()}</strong>
                        </div>
                      </div>
                      <p>{quote.message}</p>
                      <div className="quoteMeta professionalQuoteMeta">
                        <span><CalendarDays size={14} /> {quote.availability}</span>
                        <span><Star size={14} /> {provider.rating} ({provider.reviewCount})</span>
                        <span><CheckCircle2 size={14} /> {provider.completedJobs} jobs</span>
                      </div>
                      {selected && <div className="selectedQuoteNotice"><CheckCircle2 size={14} /> Selected for your request</div>}
                      <div className="quoteActions">
                        <button className="buttonSecondary" onClick={() => onNavigate('/providers/' + provider.id)}>View provider</button>
                        <button className={selected ? 'buttonPrimary quoteSelectedButton' : 'buttonPrimary'} onClick={() => handleSelectQuote(quote.id)}>
                          {selected ? <><Check size={15} /> Selected</> : <>Select quote <ArrowRight size={15} /></>}
                        </button>
                        <button className="buttonGhost" onClick={() => onNavigate('/customer/messages/' + request.id)}>
                          <MessageCircle size={14} /> Message
                        </button>
                      </div>
                    </article>
                  )
                }) : (
                  <div className="emptyModern">
                    <h3>Waiting for provider responses</h3>
                    <p>Providers matching this request will appear here.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="requestActivitySection">
              <div className="requestSectionHeading">
                <div>
                  <span className="eyebrow">ACTIVITY</span>
                  <h2>Request history</h2>
                </div>
              </div>
              <div className="updatesTimeline professionalTimeline">
                <TimelineItem title="Request submitted" detail="Your service request was created." done />
                <TimelineItem title="Providers contacted" detail="Matching providers were notified." done={request.status !== 'Requested'} />
                <TimelineItem title="Quotes received" detail={request.quotes.length + ' provider responses are available.'} done={request.status !== 'Requested'} />
                <TimelineItem title="Provider selected" detail={selectedQuote ? 'A provider has been selected for the next step.' : 'Choose a quote to move forward.'} done={Boolean(selectedQuote)} />
                <TimelineItem title="Appointment scheduled" detail={request.date} done={['Scheduled', 'In Progress', 'Completed'].includes(request.status)} />
                <TimelineItem title="Work in progress" detail="Provider completes the requested work." done={['In Progress', 'Completed'].includes(request.status)} />
                <TimelineItem title="Completed & ready for review" detail="Review the completed service when the job is finished." done={request.status === 'Completed'} />
              </div>
            </section>
          )}
        </main>

        <aside className="requestDetailAside">
          <div className="sideCard requestInfoCard">
            <span className="eyebrow">YOUR REQUEST</span>
            <h3>What you asked for</h3>
            <p>{request.description}</p>
            <div className="sideDetail"><span><Tag size={13} /> Service</span><strong>{service?.title}</strong></div>
            <div className="sideDetail"><span><MapPin size={13} /> Location</span><strong>{request.location}</strong></div>
            <div className="sideDetail"><span><CalendarDays size={13} /> Date</span><strong>{request.date}</strong></div>
            <div className="sideDetail"><span>Budget</span><strong>{'$' + request.budget.toLocaleString()}</strong></div>
          </div>

          {currentProvider ? (
            <div className="sideCard selectedProviderCard">
              <span className="eyebrow">SELECTED PROVIDER</span>
              <ProviderCard provider={currentProvider} compact />
              <button className="buttonPrimary full" onClick={() => onNavigate('/customer/messages/' + request.id)}>
                <MessageCircle size={15} /> Message provider
              </button>
            </div>
          ) : (
            <div className="sideCard nextStepCard">
              <span className="eyebrow">NEXT STEP</span>
              <h3>Review your quotes</h3>
              <p>Three providers have responded. Compare availability, experience and quote details before selecting one.</p>
              <button className="buttonPrimary full" onClick={() => document.getElementById('request-quotes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                Compare quotes <ArrowRight size={15} />
              </button>
            </div>
          )}

          <div className="sideCard supportCard">
            <span className="eyebrow">NEED HELP?</span>
            <h3>ANYwork support</h3>
            <p>Your request, messages and updates stay together so you always know what happens next.</p>
            <button className="textLink" onClick={() => onNavigate('/help')}>Open support <ArrowRight size={15} /></button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function TimelineItem({ title, detail, done }: { title: string; detail: string; done: boolean }) {
  return (
    <div className={'timelineModernItem professionalTimelineItem ' + (done ? 'done' : '')}>
      <div>{done ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</div>
      <span><strong>{title}</strong><small>{detail}</small></span>
    </div>
  )
}
