import { Search, SlidersHorizontal, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Provider, Service } from '../types/marketplace'
import { ProviderCard } from '../components/ProviderCard'

export function PublicProviders({
  providers,
  services,
  onProvider,
}: {
  providers: Provider[]
  services: Service[]
  onProvider: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [activeService, setActiveService] = useState('all')

  const filteredProviders = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return providers.filter((provider) => {
      const matchesService =
        activeService === 'all' || provider.serviceIds.includes(activeService)

      const matchesQuery =
        !normalized ||
        [provider.name, provider.location, provider.summary]
          .join(' ')
          .toLowerCase()
          .includes(normalized)

      return matchesService && matchesQuery
    })
  }, [providers, activeService, query])

  return (
    <main className="pageModern publicProvidersPage animate-anywork-rise">
      <div className="container">
        <div className="pageHero providerDirectoryHero">
          <div>
            <span className="eyebrow">PROVIDER MARKETPLACE</span>
            <h1>Find the people behind the work.</h1>
            <p>
              Compare verified providers by service, location, rating and completed work before you request a service.
            </p>
          </div>
          <div className="providerDirectoryStats">
            <span><strong>{providers.length}</strong><small>verified providers</small></span>
            <span><strong>4.9/5</strong><small>average rating</small></span>
            <span><strong>1,200+</strong><small>jobs requested</small></span>
          </div>
        </div>

        <div className="providerDirectoryToolbar">
          <div className="searchField">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search provider, service or location..."
            />
          </div>
          <button className="filterButton" type="button">
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        <div className="providerFilterChips" aria-label="Filter providers by service">
          <button
            className={activeService === 'all' ? 'active' : ''}
            onClick={() => setActiveService('all')}
          >
            All providers
          </button>
          {services.map((service) => (
            <button
              key={service.id}
              className={activeService === service.id ? 'active' : ''}
              onClick={() => setActiveService(service.id)}
            >
              {service.title}
            </button>
          ))}
        </div>

        <div className="providerDirectoryResultsHeader">
          <div>
            <span className="eyebrow">DISCOVER</span>
            <h2>{filteredProviders.length} providers available</h2>
          </div>
          <span className="providerSortHint"><Star size={14} /> Verified marketplace profiles</span>
        </div>

        {filteredProviders.length > 0 ? (
          <div className="providerGridModern providerDirectoryGrid">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onClick={() => onProvider(provider.id)}
              />
            ))}
          </div>
        ) : (
          <div className="providerEmptyState">
            <div className="providerEmptyIcon"><Search size={20} /></div>
            <h3>No providers match your search.</h3>
            <p>Try a different provider name, service category or location.</p>
            <button
              className="buttonSecondary"
              onClick={() => {
                setQuery('')
                setActiveService('all')
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <section className="providerJoinCta">
          <div>
            <span className="eyebrow">FOR SERVICE PROVIDERS</span>
            <h2>Turn more requests into work.</h2>
            <p>Create a trusted profile, receive relevant requests and send clear quotes to customers.</p>
          </div>
          <button className="buttonPrimary">Become a provider <span>→</span></button>
        </section>
      </div>
    </main>
  )
}
