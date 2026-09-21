import { ArrowLeft, ArrowRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Provider, Service } from '../types/marketplace'
import { ServiceCard } from '../components/ServiceCard'
import { ProviderCard } from '../components/ProviderCard'

type CategoryGroup = {
  name: string
  services: Service[]
  subcategories: { name: string; services: Service[] }[]
}

export function PublicServices({ services, providers, onQuote, onProvider }: { services: Service[]; providers: Provider[]; onQuote: (serviceId?: string) => void; onProvider: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)

  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, Service[]>()
    services.forEach((service) => {
      const category = service.category?.trim() || service.title
      map.set(category, [...(map.get(category) || []), service])
    })
    return Array.from(map.entries())
      .map(([name, rows]) => {
        const subMap = new Map<string, Service[]>()
        rows.forEach((service) => {
          const subcategory = service.subcategory?.trim() || service.label || service.title
          subMap.set(subcategory, [...(subMap.get(subcategory) || []), service])
        })
        return {
          name,
          services: rows,
          subcategories: Array.from(subMap.entries()).map(([subName, subServices]) => ({ name: subName, services: subServices })),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [services])

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return services.filter((service) => [
      service.title,
      service.label,
      service.category,
      service.subcategory,
      service.description,
      ...(service.tags || []),
      ...(service.items || []),
    ].filter(Boolean).join(' ').toLowerCase().includes(term))
  }, [query, services])

  const selectedCategory = groups.find((group) => group.name === activeCategory) || null
  const selectedSubcategory = selectedCategory?.subcategories.find((item) => item.name === activeSubcategory) || null

  const selectCategory = (category: string) => {
    setActiveCategory(category)
    setActiveSubcategory(null)
    setQuery('')
  }

  const selectSubcategory = (subcategory: string) => {
    setActiveSubcategory(subcategory)
    setQuery('')
  }

  const reset = () => {
    setActiveCategory(null)
    setActiveSubcategory(null)
    setQuery('')
  }

  return (
    <main className="pageModern servicesPage servicesNeedFirstPage animate-anywork-rise">
      <div className="container">
        <div className="pageHero servicesNeedHero">
          <span className="eyebrow">SERVICE MARKETPLACE</span>
          <h1>What do you need help with?</h1>
          <p>Choose what you need done, then narrow it down to the right service before comparing providers.</p>
        </div>

        <div className="serviceNeedSearch">
          <div className="searchField">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='What are you looking for? e.g. "custom cabinet", "sign installation"' />
          </div>
          <button className="filterButton"><SlidersHorizontal size={16} /> Filters</button>
        </div>

        {!!query.trim() && (
          <section className="serviceSearchResults">
            <div className="serviceBrowseHeading">
              <div>
                <span className="eyebrow">SEARCH RESULTS</span>
                <h2>{searchResults.length ? searchResults.length + ' services found' : 'No exact service found'}</h2>
              </div>
              {!!searchResults.length && <button className="textLink" onClick={reset}>Clear search</button>}
            </div>
            {searchResults.length ? (
              <div className="serviceGridModern serviceSearchGrid">
                {searchResults.map((service) => <ServiceCard key={service.id} service={service} onClick={() => onQuote(service.id)} />)}
              </div>
            ) : (
              <div className="serviceNeedEmpty">
                <Sparkles size={22} />
                <div><strong>Can't find exactly what you need?</strong><p>Use a custom request and describe the job in your own words.</p></div>
                <button className="buttonPrimary" onClick={() => onQuote()}>Describe my project <ArrowRight size={16} /></button>
              </div>
            )}
          </section>
        )}

        {!query.trim() && !activeCategory && (
          <>
            <div className="serviceBrowseHeading">
              <div>
                <span className="eyebrow">START HERE</span>
                <h2>What are you looking to get done?</h2>
              </div>
              <span className="serviceBrowseHint">{services.length} services available</span>
            </div>

            <div className="categoryNeedGrid">
              {groups.map((group) => (
                <button className="categoryNeedCard" key={group.name} onClick={() => selectCategory(group.name)}>
                  <div className="categoryNeedCardTop">
                    <span className="categoryNeedIcon"><Sparkles size={19} /></span>
                    <span className="categoryNeedCount">{group.services.length} {group.services.length === 1 ? 'service' : 'services'}</span>
                  </div>
                  <h3>{group.name}</h3>
                  <div className="categoryNeedPreview">
                    {group.subcategories.slice(0, 3).map((item) => <span key={item.name}>{item.name}</span>)}
                  </div>
                  <span className="categoryNeedAction">View subcategories <ArrowRight size={15} /></span>
                </button>
              ))}
            </div>
          </>
        )}

        {!query.trim() && activeCategory && (
          <section className="serviceBrowsePanel">
            <div className="serviceBrowseHeading">
              <div>
                <button className="serviceBackLink" onClick={reset}><ArrowLeft size={15} /> All categories</button>
                <span className="eyebrow">CATEGORY</span>
                <h2>{selectedCategory?.name}</h2>
                <p>Select a subcategory to find the exact type of work you need.</p>
              </div>
              <span className="serviceBrowseHint">{selectedCategory?.services.length || 0} services</span>
            </div>

            <div className="subcategoryNeedGrid">
              {selectedCategory?.subcategories.map((subcategory) => (
                <button className={activeSubcategory === subcategory.name ? 'subcategoryNeedCard active' : 'subcategoryNeedCard'} key={subcategory.name} onClick={() => selectSubcategory(subcategory.name)}>
                  <span className="subcategoryNeedIcon"><Sparkles size={17} /></span>
                  <span className="subcategoryNeedCopy">
                    <strong>{subcategory.name}</strong>
                    <small>{subcategory.services.length} {subcategory.services.length === 1 ? 'service' : 'services'}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>

            {selectedSubcategory && (
              <div className="subcategoryServices">
                <div className="serviceBrowseHeading compact">
                  <div><span className="eyebrow">SERVICES</span><h3>{selectedSubcategory.name}</h3></div>
                  <button className="textLink" onClick={() => setActiveSubcategory(null)}>View all subcategories</button>
                </div>
                <div className="serviceGridModern">
                  {selectedSubcategory.services.map((service) => <ServiceCard key={service.id} service={service} onClick={() => onQuote(service.id)} />)}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="directoryHeading">
          <div><span className="eyebrow">PROVIDER DIRECTORY</span><h2>Providers you can hire</h2></div>
          <span>{providers.length} providers</span>
        </div>

        <div className="providerGridModern">
          {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} onClick={() => onProvider(provider.id)} />)}
        </div>
      </div>
    </main>
  )
}
