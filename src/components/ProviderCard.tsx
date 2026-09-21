import { CheckCircle2, MapPin, Star } from 'lucide-react'
import type { Provider } from '../types/marketplace'

export function ProviderCard({ provider, compact = false, onClick }: { provider: Provider; compact?: boolean; onClick?: () => void }) {
  return (
    <button className={`providerCardModern ${compact ? 'compact' : ''}`} onClick={onClick}>
      <div className="providerAvatarLarge">{provider.initials}</div>
      <div className="providerCardBody">
        <div className="providerTitleRow">
          <strong>{provider.name}</strong>
          {provider.verified && <span className="verifiedPill"><CheckCircle2 size={12} /> Verified</span>}
        </div>
        <span className="providerLocation"><MapPin size={13} /> {provider.location}</span>
        <p>{provider.summary}</p>
        <div className="providerMetrics">
          <span><Star size={13} /> {provider.rating} ({provider.reviewCount})</span>
          <span>{provider.completedJobs} jobs</span>
          <span>{provider.responseRate} response</span>
        </div>
      </div>
    </button>
  )
}