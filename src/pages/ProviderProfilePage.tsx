import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, MapPin, MessageCircle, Star } from 'lucide-react'
import type { Provider, Service } from '../types/marketplace'
import { listPublicProviderReviews, type DbPublicProviderReview } from '../lib/anyworkApi'

export function ProviderProfilePage({ provider, services, onQuote }: { provider: Provider; services: Service[]; onQuote: (serviceId?: string) => void }) {
  const [reviews, setReviews] = useState<DbPublicProviderReview[]>([])
  const offered = services.filter((service) => provider.serviceIds.includes(service.id))

  useEffect(() => {
    let mounted = true
    void listPublicProviderReviews(provider.id)
      .then((rows) => { if (mounted) setReviews(rows) })
      .catch(() => { if (mounted) setReviews([]) })
    return () => { mounted = false }
  }, [provider.id])

  return (
    <main className="pageModern animate-anywork-rise">
      <div className="container">
        <button className="backLinkModern" onClick={() => window.history.back()}>← Back to marketplace</button>

        <div className="providerProfileHero">
          <div className="providerAvatarHuge">{provider.initials}</div>
          <div>
            {provider.verified && <div className="profileVerified"><CheckCircle2 size={15} /> Verified provider</div>}
            <h1>{provider.name}</h1>
            <p>{provider.summary}</p>
            <div className="profileMeta">
              <span><MapPin size={15} /> {provider.location}</span>
              <span><Star size={15} /> {provider.rating} ({provider.reviewCount})</span>
              <span>{provider.completedJobs} completed jobs</span>
            </div>
          </div>
          <div className="profileActions">
            <button className="buttonSecondary"><MessageCircle size={16} /> Message</button>
            <button className="buttonPrimary" onClick={() => onQuote(offered[0]?.id)}>Request service</button>
          </div>
        </div>

        <div className="profileLayout">
          <div>
            <section className="contentCard">
              <span className="eyebrow">ABOUT</span>
              <h2>Why customers hire {provider.name}</h2>
              <p>{provider.summary} Customers value this provider for clear communication, practical scheduling and reliable completion updates.</p>
              <div className="providerFacts">
                <div><strong>{provider.responseRate}</strong><span>Response rate</span></div>
                <div><strong>{provider.responseTime}</strong><span>Typical response</span></div>
                <div><strong>{provider.completedJobs}</strong><span>Jobs completed</span></div>
              </div>
            </section>

            <section className="contentCard">
              <span className="eyebrow">SERVICES</span>
              <h2>What they can do</h2>
              <div className="profileServiceList">
                {offered.map((service) => (
                  <div key={service.id}>
                    <div>
                      <strong>{service.title}</strong>
                      <span>{service.label}</span>
                    </div>
                    <button onClick={() => onQuote(service.id)}>Request <span>from {service.startingPrice}</span></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="contentCard">
              <span className="eyebrow">REVIEWS</span>
              <h2>What customers say</h2>
              {reviews.length ? (
                <div className="reviewGrid">
                  {reviews.map((review) => (
                    <div key={review.id}>
                      <strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong>
                      <span>{review.comment || 'No written comment.'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="providerEmptyInline">No published reviews yet.</div>
              )}
            </section>
          </div>

          <aside className="profileSidebar">
            <div className="stickyQuoteCard">
              <span className="eyebrow">READY TO START?</span>
              <h3>Request this provider.</h3>
              <p>Send your job details and get a quote with availability.</p>
              <button className="buttonPrimary full" onClick={() => onQuote(offered[0]?.id)}>Start a request</button>
              <div className="sideTrust">
                <span><CheckCircle2 /> Verified profile</span>
                <span><Clock3 /> {provider.responseTime}</span>
                <span><Star /> {provider.rating} rating</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
