import { Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { Provider, Service } from '../types/marketplace'
import { ServiceCard } from '../components/ServiceCard'
import { ProviderCard } from '../components/ProviderCard'

export function PublicServices({ services, providers, onQuote, onProvider }: { services: Service[]; providers: Provider[]; onQuote: (serviceId?: string) => void; onProvider: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('all')
  const filtered = services
    .filter((service) => active === 'all' || service.id === active)
    .filter((service) => (service.title + ' ' + service.label).toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="pageModern">
      <div className="container">
        <div className="pageHero">
          <span className="eyebrow">SERVICES</span>
          <h1>Find the right service.</h1>
          <p>Browse the work you need, then compare the providers who can deliver it.</p>
        </div>

        <div className="serviceToolbar">
          <div className="searchField">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services..." />
          </div>
          <button className="filterButton"><SlidersHorizontal size={16} /> Filters</button>
        </div>

        <div className="filterChips">
          <button className={active === 'all' ? 'active' : ''} onClick={() => setActive('all')}>All</button>
          {services.map((service) => (
            <button key={service.id} className={active === service.id ? 'active' : ''} onClick={() => setActive(service.id)}>
              {service.title}
            </button>
          ))}
        </div>

        <div className="serviceGridModern">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} onClick={() => onQuote(service.id)} />
          ))}
        </div>

        <div className="directoryHeading">
          <div>
            <span className="eyebrow">PROVIDER DIRECTORY</span>
            <h2>Providers you can hire</h2>
          </div>
          <span>{providers.length} verified providers</span>
        </div>

        <div className="providerGridModern">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onClick={() => onProvider(provider.id)} />
          ))}
        </div>
      </div>
    </main>
  )
}
