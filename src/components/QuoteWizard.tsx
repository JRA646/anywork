import { useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Plus, Upload, X } from 'lucide-react'
import { services } from '../data/mockData'

export function QuoteWizard({ initialService = '', onClose }: { initialService?: string; onClose: () => void }) {
  const [step, setStep] = useState(initialService ? 2 : 1)
  const [serviceId, setServiceId] = useState(initialService)
  const [submitted, setSubmitted] = useState(false)
  const service = services.find((item) => item.id === serviceId)

  return <div className="overlay"><section className="modal">
    <button className="modalClose" onClick={onClose}><X size={19} /></button>
    {submitted ? <div className="successState">
      <div className="successIcon"><CheckCircle2 size={34} /></div>
      <span className="eyebrow">REQUEST RECEIVED</span><h2>Your job is on the way.</h2>
      <p>We created request <strong>AW-1028</strong>. Matching providers can now respond with pricing and availability.</p>
      <div className="successMeta"><span><CalendarDays size={15} /> Responses usually arrive within a few hours</span><span><MapPin size={15} /> Your service area was included</span></div>
      <button className="buttonPrimary" onClick={onClose}>Back to ANYwork <ArrowRight size={17} /></button>
    </div> : <>
      <span className="eyebrow">REQUEST A SERVICE</span><h2>Tell us what needs doing.</h2>
      <div className="wizardSteps"><span className={step >= 1 ? 'active' : ''}>01 Service</span><span className={step >= 2 ? 'active' : ''}>02 Job details</span><span className={step >= 3 ? 'active' : ''}>03 Contact</span></div>
      {step === 1 && <><p className="modalLead">Start with the closest category.</p><div className="wizardGrid">{services.map((item) => <button key={item.id} className={'wizardChoice ' + (serviceId === item.id ? 'selected' : '')} onClick={() => setServiceId(item.id)}><strong>{item.title}</strong><small>{item.label}</small><span>From {item.startingPrice}</span></button>)}</div><div className="modalActions"><button className="buttonPrimary" disabled={!serviceId} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button></div></>}
      {step === 2 && <><p className="modalLead">Give providers enough detail to quote accurately.</p><textarea className="fieldLarge" placeholder="What needs to be done? Include measurements, access details, preferred timing or anything else that matters." /><div className="fieldGrid"><label><span>Preferred date</span><input placeholder="24 Sep 2026" /></label><label><span>Service location</span><input placeholder="Enter suburb or address" /></label><label><span>Budget</span><input placeholder="$ Optional" /></label><label><span>Access notes</span><input placeholder="Parking, access, hours..." /></label></div><div className="uploadDrop"><Upload size={20} /><div><strong>Add job photos</strong><span>Optional. Clear photos help providers quote faster.</span></div></div><div className="modalActions"><button className="buttonGhost" onClick={() => setStep(1)}>Back</button><button className="buttonPrimary" onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button></div></>}
      {step === 3 && <><p className="modalLead">Your contact details are shared only with providers responding to this request.</p><div className="fieldGrid"><label><span>Full name</span><input placeholder="John Doe" /></label><label><span>Phone</span><input placeholder="+61..." /></label><label><span>Email</span><input placeholder="you@example.com" /></label><label><span>Best way to reach you</span><input placeholder="Phone, email or message" /></label></div><div className="requestSummaryBox"><span>Requesting <strong>{service?.title || 'ANYwork'}</strong></span><span>Providers respond with pricing, availability and a message.</span></div><div className="modalActions"><button className="buttonGhost" onClick={() => setStep(2)}>Back</button><button className="buttonPrimary" onClick={() => setSubmitted(true)}>Submit request <ArrowRight size={16} /></button></div></>}
    </>}
  </section></div>
}