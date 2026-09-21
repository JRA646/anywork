import { useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Upload, X } from 'lucide-react'
import { services } from '../data/mockData'
import { createServiceRequest, type DbRequest } from '../lib/anyworkApi'

export function QuoteWizard({
  initialService = '',
  onClose,
  onCreated,
}: {
  initialService?: string
  onClose: () => void
  onCreated?: (request: DbRequest) => void
}) {
  const [step, setStep] = useState(initialService ? 2 : 1)
  const [serviceId, setServiceId] = useState(initialService)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [accessNotes, setAccessNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [createdRequest, setCreatedRequest] = useState<DbRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const service = services.find((item) => item.id === serviceId)

  const handleSubmit = async () => {
    if (!serviceId || !title.trim() || !description.trim() || !location.trim()) {
      setError('Please complete the required request details.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const created = await createServiceRequest({
        serviceKey: serviceId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        preferredDate: preferredDate ? new Date(preferredDate).toISOString() : null,
        accessNotes: accessNotes.trim() || null,
        budget: budget ? Number(budget) : null,
      })
      setCreatedRequest(created)
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not create the request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="overlay"><section className="modal requestWizardModal">
    <button className="modalClose" onClick={onClose} aria-label="Close request form"><X size={19} /></button>
    {submitted ? <div className="successState">
      <div className="successIcon"><CheckCircle2 size={34} /></div>
      <span className="eyebrow">REQUEST CREATED</span>
      <h2>Your request is ready.</h2>
      <p>Request <strong>{onCreated ? 'created successfully' : 'received successfully'}</strong>. Matching providers can now respond with pricing and availability.</p>
      <div className="successMeta">
        <span><CalendarDays size={15} /> Providers can now review the request</span>
        <span><MapPin size={15} /> {location || 'Your service area'}</span>
      </div>
      <button className="buttonPrimary" onClick={() => { if (createdRequest) onCreated?.(createdRequest); onClose() }}>Done <ArrowRight size={17} /></button>
    </div> : <>
      <span className="eyebrow">REQUEST A SERVICE</span>
      <h2>Create a new service request.</h2>
      <p className="modalLead">Add enough detail for providers to give you useful quotes and availability.</p>
      <div className="wizardSteps">
        <span className={step >= 1 ? 'active' : ''}>01 Service</span>
        <span className={step >= 2 ? 'active' : ''}>02 Job details</span>
        <span className={step >= 3 ? 'active' : ''}>03 Review</span>
      </div>

      {step === 1 && <>
        <div className="wizardGrid">
          {services.map((item) => (
            <button key={item.id} type="button" className={'wizardChoice ' + (serviceId === item.id ? 'selected' : '')} onClick={() => setServiceId(item.id)}>
              <strong>{item.title}</strong>
              <small>{item.label}</small>
              <span>From {item.startingPrice}</span>
            </button>
          ))}
        </div>
        <div className="modalActions">
          <button className="buttonPrimary" disabled={!serviceId} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
        </div>
      </>}

      {step === 2 && <>
        <div className="fieldGrid">
          <label>
            <span>Request title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Commercial banner installation" required />
          </label>
          <label>
            <span>Service location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Suburb or service address" required />
          </label>
        </div>
        <label className="requestWizardFullField">
          <span>What needs to be done?</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="fieldLarge" placeholder="Include measurements, access details, preferred timing, materials or anything else providers should know." />
        </label>
        <div className="fieldGrid">
          <label>
            <span>Preferred date</span>
            <input type="datetime-local" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} />
          </label>
          <label>
            <span>Budget</span>
            <input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Optional" />
          </label>
        </div>
        <label className="requestWizardFullField">
          <span>Access notes</span>
          <input value={accessNotes} onChange={(event) => setAccessNotes(event.target.value)} placeholder="Parking, building access, operating hours..." />
        </label>
        <div className="uploadDrop">
          <Upload size={20} />
          <div><strong>Add job photos</strong><span>Optional. Photo uploads can be connected next.</span></div>
        </div>
        {error && <div className="formError">{error}</div>}
        <div className="modalActions">
          <button className="buttonGhost" onClick={() => setStep(1)}>Back</button>
          <button className="buttonPrimary" disabled={!title.trim() || !description.trim() || !location.trim()} onClick={() => setStep(3)}>Review <ArrowRight size={16} /></button>
        </div>
      </>}

      {step === 3 && <>
        <div className="requestReviewCard">
          <div><span>Service</span><strong>{service?.title}</strong></div>
          <div><span>Request</span><strong>{title}</strong></div>
          <div><span>Location</span><strong>{location}</strong></div>
          <div><span>Preferred date</span><strong>{preferredDate ? new Date(preferredDate).toLocaleString() : 'Flexible'}</strong></div>
          <div><span>Budget</span><strong>{budget ? '$' + Number(budget).toLocaleString() : 'Open to quotes'}</strong></div>
          <div><span>Details</span><p>{description}</p></div>
        </div>
        {error && <div className="formError">{error}</div>}
        <div className="modalActions">
          <button className="buttonGhost" onClick={() => setStep(2)}>Back</button>
          <button className="buttonPrimary" disabled={busy} onClick={handleSubmit}>{busy ? 'Creating…' : 'Create request'} <ArrowRight size={16} /></button>
        </div>
      </>}
    </>}
  </section></div>
}
