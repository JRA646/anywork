import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { acceptGuestQuote, getGuestRequestPortal, type DbQuote, type GuestPortalProvider, type GuestPortalResponse } from '../lib/anyworkApi'
import { confirmAction, showError, showSuccess } from '../lib/alerts'

export function GuestRequestPage({ token }: { token: string }) {
  const [data, setData] = useState<GuestPortalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const providerById = useMemo(
    () => new Map((data?.providers || []).map((provider) => [provider.user_id, provider])),
    [data?.providers],
  )

  useEffect(() => {
    void load()
  }, [token])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getGuestRequestPortal(token))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'This request link is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [load])

  const handleAccept = async (quote: DbQuote) => {
    const confirmed = await confirmAction({
      title: 'Accept this quote?',
      text: 'This will select the provider for your request. You can continue the scheduling process afterward.',
      confirmText: 'Accept quote',
      cancelText: 'Review later',
    })
    if (!confirmed) return

    setAccepting(quote.id)
    try {
      const result = await acceptGuestQuote(token, quote.id)
      setData((current) => current ? {
        ...current,
        request: result.request,
        quotes: current.quotes.map((item) => ({
          ...item,
          status: item.id === quote.id ? 'Accepted' : 'Declined',
        })),
      } : current)
      await showSuccess('Quote accepted', 'Your provider has been selected. Check your email for the confirmation.')
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : 'Unable to accept this quote.'
      await showError('Unable to accept quote', message)
    } finally {
      setAccepting(null)
    }
  }

  if (loading) {
    return (
      <main className="guestPortalPage">
        <div className="guestPortalLoading">
          <div className="guestPortalSpinner" />
          <span>Loading your request…</span>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="guestPortalPage">
        <div className="guestPortalError">
          <ShieldCheck size={28} />
          <span className="eyebrow">SECURE REQUEST PORTAL</span>
          <h1>We couldn't open this request.</h1>
          <p>{error || 'This request link is no longer available.'}</p>
          <a className="buttonPrimary" href="/">Back to ANYwork <ArrowRight size={16} /></a>
        </div>
      </main>
    )
  }

  const { request, quotes } = data
  const accepted = quotes.find((quote) => quote.status === 'Accepted')

  return (
    <main className="guestPortalPage">
      <div className="guestPortalShell">
        <header className="guestPortalHeader">
          <div>
            <span className="eyebrow">ANYWORK SECURE REQUEST PORTAL</span>
            <h1>{request.title}</h1>
            <p>Request {request.request_number} · {request.service_key}</p>
          </div>
          <div className="guestPortalTrust"><ShieldCheck size={16} /> Secure access link</div>
        </header>

        <section className="guestPortalSummary">
          <div><span>CONTACT</span><strong>{request.requester_name || 'Guest requester'}</strong><small><Mail size={12} /> {request.requester_email}</small></div>
          <div><span>LOCATION</span><strong>{request.location}</strong><small><MapPin size={12} /> Service location</small></div>
          <div><span>STATUS</span><strong>{accepted ? 'Provider selected' : request.status}</strong><small><Clock3 size={12} /> Updated automatically</small></div>
        </section>

        <section className="guestPortalRequestCard">
          <span className="eyebrow">YOUR REQUEST</span>
          <h2>Job details</h2>
          <p>{request.description}</p>
          <div className="guestPortalMeta">
            <div><span>Preferred date</span><strong>{request.preferred_date ? new Date(request.preferred_date).toLocaleString('en-PH') : 'Flexible'}</strong></div>
            <div><span>Budget</span><strong>{request.budget !== null ? '₱' + Number(request.budget).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : 'Open to quotes'}</strong></div>
          </div>
        </section>

        <section className="guestPortalQuotes">
          <div className="guestPortalSectionHeading">
            <div>
              <span className="eyebrow">PROVIDER QUOTES</span>
              <h2>{quotes.length ? 'Compare your quotes' : 'Waiting for provider quotes'}</h2>
            </div>
            <small>{quotes.length ? quotes.length + ' quote' + (quotes.length === 1 ? '' : 's') + ' received' : 'We will email you as providers respond.'}</small>
          </div>

          {quotes.length ? quotes.map((quote) => {
            const provider = providerById.get(quote.provider_id) as GuestPortalProvider | undefined
            const providerName = provider?.company_name || provider?.display_name || [provider?.first_name, provider?.last_name].filter(Boolean).join(' ') || 'ANYwork provider'
            return (
              <article className={'guestQuoteCard ' + (quote.status === 'Accepted' ? 'accepted' : '')} key={quote.id}>
                <div className="guestQuoteProvider">
                  <div className="guestQuoteAvatar">{provider?.avatar_url ? <img src={provider.avatar_url} alt="" /> : providerName.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{providerName}</strong>
                    <small>{provider?.city || 'ANYwork provider'} · {quote.availability ? new Date(quote.availability).toLocaleString('en-PH') : 'Flexible availability'}</small>
                  </div>
                </div>
                <div className="guestQuoteAmount">₱{Number(quote.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                <p>{quote.message}</p>
                <div className="guestQuoteActions">
                  {quote.status === 'Accepted' ? (
                    <span className="guestAccepted"><CheckCircle2 size={15} /> Accepted</span>
                  ) : quote.status === 'Declined' ? (
                    <span className="guestDeclined">Not selected</span>
                  ) : (
                    <button className="buttonPrimary" disabled={Boolean(accepting)} onClick={() => void handleAccept(quote)}>
                      {accepting === quote.id ? 'Accepting…' : 'Accept quote'} <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </article>
            )
          }) : (
            <div className="guestPortalWaiting">
              <Clock3 size={22} />
              <strong>We'll email you when a provider responds.</strong>
              <span>Keep this page or use the same secure link from your email.</span>
            </div>
          )}
        </section>

        <footer className="guestPortalFooter">
          <span>Quotes and request updates are sent to {request.requester_email}.</span>
          <a href="/">ANYwork Services</a>
        </footer>
      </div>
    </main>
  )
}
