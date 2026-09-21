import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, MapPin, Printer, ShieldCheck } from 'lucide-react'
import { getRequest, listProfiles, listQuotesForRequest, type DbProfile, type DbQuote, type DbRequest } from '../lib/anyworkApi'

export function InvoicePage({
  requestId,
  onBack,
}: {
  requestId: string
  onBack: () => void
}) {
  const [request, setRequest] = useState<DbRequest | null>(null)
  const [quote, setQuote] = useState<DbQuote | null>(null)
  const [provider, setProvider] = useState<DbProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const loadedRequest = await getRequest(requestId)
        const quotes = await listQuotesForRequest(requestId)
        const accepted = quotes.find((item) => item.status === 'Accepted') || quotes[0] || null

        let loadedProvider: DbProfile | null = null
        if (accepted) {
          const profiles = await listProfiles([accepted.provider_id])
          loadedProvider = profiles[0] || null
        }

        if (!active) return
        setRequest(loadedRequest)
        setQuote(accepted)
        setProvider(loadedProvider)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to load the invoice.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [requestId])

  const invoiceNumber = request?.request_number
    ? 'INV-' + request.request_number
    : 'INV-' + requestId.slice(0, 8).toUpperCase()

  const providerName = provider?.company_name
    || provider?.display_name
    || [provider?.first_name, provider?.last_name].filter(Boolean).join(' ')
    || 'ANYwork Provider'

  const customerName = request?.requester_name
    || 'Customer'

  const amount = quote ? Number(quote.amount) : 0
  const issueDate = request?.created_at ? new Date(request.created_at) : new Date()
  const serviceDate = request?.preferred_date ? new Date(request.preferred_date) : null

  const statusLabel = request?.status === 'Completed'
    ? 'Completed'
    : quote?.status === 'Accepted'
      ? 'Accepted'
      : 'Estimate'

  const description = useMemo(
    () => request?.description || 'Professional service work requested through ANYwork.',
    [request?.description],
  )

  if (loading) {
    return (
      <div className="invoicePageShell">
        <div className="invoiceLoading">
          <div className="requestLoadingPulse" />
          <h2>Preparing invoice</h2>
          <p>Fetching request, provider and quote details.</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="invoicePageShell">
        <div className="invoiceError">
          <span className="eyebrow">INVOICE</span>
          <h2>Unable to open invoice</h2>
          <p>{error || 'The requested invoice could not be found.'}</p>
          <button className="buttonSecondary" onClick={onBack}>
            <ArrowLeft size={15} /> Back to request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="invoicePageShell">
      <div className="invoiceToolbar noPrint">
        <button className="buttonGhost" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="invoiceToolbarActions">
          <span className="invoicePrintHint">Ready to print or save as PDF</span>
          <button className="buttonPrimary" onClick={() => window.print()}>
            <Printer size={15} /> Print invoice
          </button>
        </div>
      </div>

      <article className="invoiceDocument">
        <header className="invoiceHeader">
          <div className="invoiceBrand">
            <img src="/anywork.png" alt="ANYwork Services" />
            <div>
              <strong>ANYwork Services</strong>
              <span>Service marketplace</span>
            </div>
          </div>
          <div className="invoiceHeading">
            <span className="eyebrow">SERVICE INVOICE</span>
            <h1>{invoiceNumber}</h1>
            <span className={'invoiceStatus ' + statusLabel.toLowerCase()}>{statusLabel}</span>
          </div>
        </header>

        <section className="invoiceMetaGrid">
          <div>
            <span>Issued to</span>
            <strong>{customerName}</strong>
            {request.requester_email && <small>{request.requester_email}</small>}
            {request.requester_phone && <small>{request.requester_phone}</small>}
          </div>
          <div>
            <span>Provider</span>
            <strong>{providerName}</strong>
            {provider?.city && <small>{provider.city}</small>}
          </div>
          <div>
            <span>Issue date</span>
            <strong>{issueDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            <small>{invoiceNumber}</small>
          </div>
          <div>
            <span>Service date</span>
            <strong>{serviceDate ? serviceDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be scheduled'}</strong>
            {serviceDate && <small>{serviceDate.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</small>}
          </div>
        </section>

        <section className="invoiceBillTo">
          <div>
            <span className="eyebrow">SERVICE DETAILS</span>
            <h2>{request.title}</h2>
            <p>{description}</p>
          </div>
          <div className="invoiceServiceLocation">
            <span>Service location</span>
            <strong><MapPin size={14} /> {request.location}</strong>
          </div>
        </section>

        <section className="invoiceItems">
          <div className="invoiceTableHeader">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Amount</span>
          </div>
          <div className="invoiceTableRow">
            <div>
              <strong>{request.title}</strong>
              <small>{request.service_key || 'Service request'}</small>
            </div>
            <span>1</span>
            <span>₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            <strong>₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
          </div>
        </section>

        <section className="invoiceTotals">
          <div><span>Subtotal</span><strong>₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
          <div><span>Tax</span><strong>₱0.00</strong></div>
          <div className="invoiceGrandTotal"><span>Total</span><strong>₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
        </section>

        <section className="invoiceFooterGrid">
          <div>
            <span className="eyebrow">NOTES</span>
            <p>
              This invoice reflects the accepted provider quote for this ANYwork request.
              Payment terms and additional approved work are subject to the agreement between the customer and provider.
            </p>
          </div>
          <div className="invoiceTrust">
            <ShieldCheck size={18} />
            <strong>ANYwork request record</strong>
            <small>{request.request_number} · {request.status}</small>
          </div>
        </section>

        <footer className="invoiceDocumentFooter">
          <span>ANYwork Services</span>
          <span><CalendarDays size={12} /> {request.request_number}</span>
          <span>Generated {new Date().toLocaleDateString('en-PH')}</span>
        </footer>
      </article>
    </div>
  )
}
