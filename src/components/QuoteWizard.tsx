import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, MapPin, Upload, X } from 'lucide-react'
import { services as mockServices } from '../data/mockData'
import type { Service } from '../types/marketplace'
import { useAuth } from '../auth/AuthContext'
import { createServiceRequest, uploadRequestPhoto, type DbRequest } from '../lib/anyworkApi'
import { showError, showSuccess } from '../lib/alerts'

const getLocalDateTimeMin = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export function QuoteWizard({
  initialService = '',
  servicesOverride = mockServices,
  onClose,
  onCreated,
}: {
  initialService?: string
  servicesOverride?: Service[]
  onClose: () => void
  onCreated?: (request: DbRequest) => void
}) {
  const { session, profile } = useAuth()
  const isGuest = !session
  const services = servicesOverride
  const validInitialService = services.some((item) => item.id === initialService) ? initialService : ''

  const [step, setStep] = useState(validInitialService ? 2 : 1)
  const [serviceId, setServiceId] = useState(validInitialService)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [accessNotes, setAccessNotes] = useState('')
  const [requesterName, setRequesterName] = useState('')
  const [requesterEmail, setRequesterEmail] = useState('')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [createdRequest, setCreatedRequest] = useState<DbRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const service = useMemo(() => services.find((item) => item.id === serviceId), [serviceId, services])
  const detailsValid = Boolean(service && title.trim() && description.trim() && location.trim())
  const budgetValue = budget.trim() ? Number(budget) : null
  const budgetValid = budgetValue === null || (Number.isFinite(budgetValue) && budgetValue >= 0)
  const requesterValid = !isGuest || Boolean(
    requesterName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail.trim()),
  )

  const photoPreviews = useMemo(
    () => selectedPhotos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [selectedPhotos],
  )

  useEffect(() => () => {
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [photoPreviews])

  useEffect(() => {
    if (!isGuest) {
      setRequesterName(profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' '))
      setRequesterEmail(session?.user?.email || '')
    }
  }, [isGuest, profile, session])

  const handlePhotoSelection = (files: FileList | null) => {
    if (!files) return
    const next = [...selectedPhotos]
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (next.length >= 6) {
        errors.push('You can add up to 6 photos.')
        break
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        errors.push(file.name + ' is not a supported image type.')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        errors.push(file.name + ' is larger than 5 MB.')
        continue
      }
      if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
    }

    setSelectedPhotos(next)
    setError(errors[0] || '')
  }

  const removePhoto = (index: number) => {
    setSelectedPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))
  }

  const goToDetails = () => {
    if (!serviceId) {
      setError('Choose a service before continuing.')
      return
    }
    setError('')
    setStep(2)
  }

  const goToReview = () => {
    if (!detailsValid) {
      setError('Complete the request title, service location and job details before reviewing.')
      return
    }
    if (!budgetValid) {
      setError('Enter a valid budget amount or leave the budget blank.')
      return
    }
    if (!requesterValid) {
      setError('Add your name and a valid email address so we can send you quotes.')
      return
    }
    if (companyWebsite.trim()) {
      setError('Unable to process this request.')
      return
    }
    setError('')
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!serviceId || !detailsValid || !budgetValid || !requesterValid) {
      setError('Please complete the required request details before creating the request.')
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
        budget: budgetValue,
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail.trim(),
        requesterPhone: requesterPhone.trim() || null,
        companyWebsite: companyWebsite.trim(),
      })

      let uploadWarning = ''

      if (!isGuest) {
        for (let index = 0; index < selectedPhotos.length; index += 1) {
          setUploadingPhotoIndex(index)
          try {
            await uploadRequestPhoto(created.id, selectedPhotos[index])
          } catch {
            uploadWarning = uploadWarning || 'Your request was created, but one or more photos could not be uploaded. You can add them from the request page.'
          }
        }
      } else if (selectedPhotos.length) {
        uploadWarning = 'Your request was created. Photo uploads are available after signing in to manage the request.'
      }

      setUploadingPhotoIndex(null)
      setCreatedRequest(created)
      setError(uploadWarning)
      setSubmitted(true)

      await showSuccess(
        'Request created',
        'Your request was received. Quotes will be sent to ' + requesterEmail.trim() + '.',
      )
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'We could not create the request. Please try again.'
      setError(message)
      await showError('Unable to create request', message)
    } finally {
      setUploadingPhotoIndex(null)
      setBusy(false)
    }
  }

  const closeAndCreate = () => {
    if (createdRequest) onCreated?.(createdRequest)
    onClose()
  }

  return (
    <div className="overlay" role="presentation">
      <section className="modal requestWizardModal" role="dialog" aria-modal="true" aria-labelledby="request-wizard-title">
        <button className="modalClose" type="button" onClick={onClose} aria-label="Close request form">
          <X size={19} />
        </button>

        {submitted ? (
          <div className="successState">
            <div className="successIcon"><CheckCircle2 size={34} /></div>
            <span className="eyebrow">REQUEST CREATED</span>
            <h2 id="request-wizard-title">Your request is ready.</h2>
            <p>Your request is now with the ANYwork provider network. Quotes will be sent to {requesterEmail}.</p>
            <div className="successMeta">
              <span><CalendarDays size={15} /> {createdRequest?.request_number || 'Request submitted'}</span>
              <span><MapPin size={15} /> {location || 'Your service area'}</span>
            </div>
            <button className="buttonPrimary" type="button" onClick={closeAndCreate}>
              {isGuest ? 'Done' : 'View request'} {isGuest ? <CheckCircle2 size={17} /> : <ArrowRight size={17} />}
            </button>
          </div>
        ) : (
          <>
            <div className="requestWizardHeader">
              <span className="eyebrow">REQUEST A SERVICE</span>
              <h2 id="request-wizard-title">Create a new service request.</h2>
              <p className="modalLead">
                {isGuest
                  ? 'No account required. Tell us what you need and we will send provider quotes to your email.'
                  : 'Give providers the right context so their quotes and availability are useful to you.'}
              </p>
            </div>

            <div className="wizardSteps professionalWizardSteps" aria-label="Request creation steps">
              <button type="button" className={step >= 1 ? 'active' : ''} onClick={() => step > 1 && setStep(1)} disabled={step === 1}>
                <span className="wizardStepNumber">01</span>
                <span className="wizardStepCopy"><b>Service</b><small>Choose category</small></span>
              </button>
              <i aria-hidden="true" />
              <button type="button" className={step >= 2 ? 'active' : ''} onClick={() => step > 2 && setStep(2)} disabled={step <= 2}>
                <span className="wizardStepNumber">02</span>
                <span className="wizardStepCopy"><b>Job details</b><small>Tell us what you need</small></span>
              </button>
              <i aria-hidden="true" />
              <span className={step >= 3 ? 'active' : ''}>
                <span className="wizardStepNumber">03</span>
                <span className="wizardStepCopy"><b>Review</b><small>Check & submit</small></span>
              </span>
            </div>

            <div className="requestWizardBody">
              {step === 1 && (
                <div className="requestWizardStep">
                  <div className="wizardSectionIntro">
                    <div>
                      <span className="eyebrow">WHAT DO YOU NEED?</span>
                      <h3>Select the service category.</h3>
                    </div>
                    <small>Choose the closest match. You can add specific requirements in the next step.</small>
                  </div>

                  <div className="wizardGrid">
                    {services.map((item) => (
                      <button key={item.id} type="button" className={'wizardChoice ' + (serviceId === item.id ? 'selected' : '')} onClick={() => { setServiceId(item.id); setError('') }}>
                        <strong>{item.title}</strong>
                        <small>{item.label}</small>
                        <span>From {item.startingPrice}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="requestWizardStep">
                  <div className="selectedServiceBanner">
                    <div>
                      <span className="eyebrow">SELECTED SERVICE</span>
                      <strong>{service?.title || 'Choose a service'}</strong>
                      <small>Providers matching this category will be able to review your request.</small>
                    </div>
                    <button type="button" className="buttonGhost" onClick={() => setStep(1)}>
                      <ArrowLeft size={15} /> Change service
                    </button>
                  </div>

                  <div className="wizardSectionIntro">
                    <div>
                      <span className="eyebrow">JOB DETAILS</span>
                      <h3>Tell providers what they are quoting.</h3>
                    </div>
                    <small>Fields marked with * are required.</small>
                  </div>

                  <div className="fieldGrid">
                    <label>
                      <span>Request title <b>*</b></span>
                      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Commercial banner installation" required />
                    </label>
                    <label>
                      <span>Service location <b>*</b></span>
                      <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} placeholder="Suburb, building or service address" required />
                    </label>
                  </div>

                  <label className="requestWizardFullField">
                    <span>What needs to be done? <b>*</b></span>
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="fieldLarge" maxLength={2000} placeholder="Include measurements, materials, access details, preferred timing or anything else providers should know." required />
                    <small className="fieldCounter">{description.length}/2000</small>
                  </label>

                  <div className="fieldGrid">
                    <label>
                      <span>Preferred date</span>
                      <input type="datetime-local" value={preferredDate} min={getLocalDateTimeMin()} onChange={(event) => setPreferredDate(event.target.value)} />
                    </label>
                    <label>
                      <span>Budget <small>(optional)</small></span>
                      <input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Leave blank for open quotes" inputMode="decimal" />
                    </label>
                  </div>

                  {isGuest && (
                    <div className="requestContactSection">
                      <div className="wizardSectionIntro requestContactIntro">
                        <div>
                          <span className="eyebrow">CONTACT DETAILS</span>
                          <h3>Where should we send your quotes?</h3>
                        </div>
                        <small>No account required. We use this email to send provider quotes and request updates.</small>
                      </div>

                      <div className="fieldGrid">
                        <label>
                          <span>Your name <b>*</b></span>
                          <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} maxLength={120} placeholder="e.g. John Rey Soler" autoComplete="name" required />
                        </label>
                        <label>
                          <span>Email address <b>*</b></span>
                          <input value={requesterEmail} onChange={(event) => setRequesterEmail(event.target.value)} maxLength={160} type="email" placeholder="you@example.com" autoComplete="email" required />
                        </label>
                      </div>

                      <label className="requestWizardFullField">
                        <span>Phone number <small>(optional)</small></span>
                        <input value={requesterPhone} onChange={(event) => setRequesterPhone(event.target.value)} maxLength={40} type="tel" placeholder="+63 9XX XXX XXXX" autoComplete="tel" />
                      </label>

                      <label className="requestHoneypot" aria-hidden="true">
                        <span>Website</span>
                        <input tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} />
                      </label>
                    </div>
                  )}

                  <label className="requestWizardFullField">
                    <span>Access notes <small>(optional)</small></span>
                    <input value={accessNotes} onChange={(event) => setAccessNotes(event.target.value)} maxLength={500} placeholder="Parking, building access, operating hours..." />
                  </label>

                  <div className="requestPhotoUpload">
                    <input id="request-photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { handlePhotoSelection(event.target.files); event.currentTarget.value = '' }} />
                    <label className="uploadDrop" htmlFor="request-photo-input">
                      <span className="uploadDropIcon"><Upload size={19} /></span>
                      <span className="requestPhotoUploadCopy">
                        <strong>Add job photos</strong>
                        <small>{isGuest ? 'Optional. You can attach photos after signing in.' : 'JPG, PNG or WebP · up to 6 photos · 5 MB each'}</small>
                      </span>
                      <span className="buttonGhost uploadBrowseButton">Choose photos</span>
                    </label>
                    {photoPreviews.length > 0 && (
                      <div className="requestPhotoPreviewGrid">
                        {photoPreviews.map((preview, index) => (
                          <div className="requestPhotoPreview" key={preview.url}>
                            <img src={preview.url} alt={preview.name} />
                            <button type="button" onClick={() => removePhoto(index)} aria-label={'Remove ' + preview.name}><X size={13} /></button>
                            {uploadingPhotoIndex === index && <span className="photoUploadProgress">Uploading…</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <div className="formError" role="alert">{error}</div>}
                </div>
              )}

              {step === 3 && (
                <div className="requestWizardStep">
                  <div className="wizardSectionIntro">
                    <div>
                      <span className="eyebrow">FINAL REVIEW</span>
                      <h3>Check the request before sending it.</h3>
                    </div>
                    <small>You can still go back and change any detail.</small>
                  </div>

                  <div className="requestReviewCard">
                    <div><span>Service</span><strong>{service?.title || '—'}</strong></div>
                    <div><span>Request</span><strong>{title}</strong></div>
                    <div><span>Location</span><strong>{location}</strong></div>
                    <div><span>Preferred date</span><strong>{preferredDate ? new Date(preferredDate).toLocaleString() : 'Flexible'}</strong></div>
                    <div><span>Budget</span><strong>{budgetValue !== null ? '$' + budgetValue.toLocaleString() : 'Open to quotes'}</strong></div>
                    <div><span>Quotes sent to</span><strong>{requesterEmail || 'Your account email'}</strong></div>
                    <div className="requestReviewDetails"><span>Details</span><p>{description}</p></div>
                    {accessNotes && <div className="requestReviewDetails"><span>Access notes</span><p>{accessNotes}</p></div>}
                    <div className="requestReviewDetails">
                      <span>Photos</span>
                      <p>{selectedPhotos.length ? (isGuest ? selectedPhotos.length + ' photo(s) selected. Attach them later after signing in.' : selectedPhotos.length + ' photo(s) will be uploaded with this request.') : 'No photos attached.'}</p>
                    </div>
                  </div>

                  {error && <div className="formError" role="alert">{error}</div>}
                </div>
              )}
            </div>

            <div className="requestWizardFooter">
              <div className="requestWizardFooterHint">
                {step === 1 ? 'You can edit all job details on the next step.' : isGuest ? 'No account required. Provider quotes will be emailed to you.' : 'Providers will receive this request after you submit it.'}
              </div>
              <div className="modalActions">
                {step > 1 && <button className="buttonGhost" type="button" onClick={() => { setError(''); setStep(step - 1) }}><ArrowLeft size={15} /> Back</button>}
                {step === 1 ? (
                  <button className="buttonPrimary" type="button" disabled={!serviceId} onClick={goToDetails}>Continue <ArrowRight size={16} /></button>
                ) : step === 2 ? (
                  <button className="buttonPrimary" type="button" disabled={!detailsValid || !budgetValid || !requesterValid} onClick={goToReview}>Review request <ArrowRight size={16} /></button>
                ) : (
                  <button className="buttonPrimary" type="button" disabled={busy} onClick={handleSubmit}>{busy ? 'Creating request…' : 'Create request'} <ArrowRight size={16} /></button>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
