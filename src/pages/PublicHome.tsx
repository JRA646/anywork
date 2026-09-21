import { ArrowRight, CheckCircle2, Search, ShieldCheck, Sparkles, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Provider, Service } from '../types/marketplace'
import { ServiceCard } from '../components/ServiceCard'
import { ProviderCard } from '../components/ProviderCard'
import { sampleImages } from '../data/media'

export function PublicHome({ services, providers, onNavigate, onQuote }: { services: Service[]; providers: Provider[]; onNavigate: (path: string) => void; onQuote: (serviceId?: string) => void }) {
  return <div className="publicHome">
    <section className="heroModern tw-image-shine animate-anywork-rise" style={{ backgroundImage: 'linear-gradient(120deg, rgba(246,244,239,.97) 0%, rgba(246,244,239,.90) 45%, rgba(246,244,239,.28) 100%), url("' + sampleImages.hero + '")' }}>
      <div className="container heroGrid">
        <div className="heroCopy">
          <span className="eyebrow">THE SERVICE MARKETPLACE</span>
          <h1>Get the work done.<br /><em>Without the runaround.</em></h1>
          <p className="heroSub">Find trusted providers, compare quotes and track every job from request to completion.</p>
          <div className="heroSearch tw-glass" onClick={() => onNavigate('/services')}>
            <Search size={19} />
            <span>What do you need help with?</span>
            <button onClick={(e) => { e.stopPropagation(); onNavigate('/services') }}>Search</button>
          </div>
          <div className="heroTrust"><span><ShieldCheck size={16} /> Verified providers</span><span><CheckCircle2 size={16} /> Clear quotes</span><span><Sparkles size={16} /> Easy job tracking</span></div>
          <div className="heroTrustNumbers">
            <span><strong>4.9/5</strong><small>average provider rating</small></span>
            <span><strong>1,200+</strong><small>jobs requested</small></span>
            <span><strong>98%</strong><small>on-time completion</small></span>
          </div>
        </div>
        <div className="heroVisual">
          <div className="heroImageCard tw-image-shine animate-anywork-float" style={{ backgroundImage: 'linear-gradient(180deg, rgba(17,17,17,.05), rgba(17,17,17,.66)), url("' + sampleImages.office + '")' }}>
            <span className="heroVisualLabel">BUILT FOR REAL WORK</span>
            <strong>One place for requests, quotes and jobs.</strong>
          </div>
          <div className="heroFeatureCard tw-glass">
            <span className="heroCardLabel">HOW ANYWORK WORKS</span><div className="heroCardLine"><b>01</b><span>Tell us what you need</span></div><div className="heroCardLine"><b>02</b><span>Compare providers</span></div><div className="heroCardLine"><b>03</b><span>Approve your quote</span></div><div className="heroCardLine"><b>04</b><span>Track it to done</span></div>
            <button onClick={() => onQuote()}>Start a request <ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
    </section>
    <section className="sectionModern homeServicesSection"><div className="container"><SectionHeading eyebrow="POPULAR SERVICES" title="Whatever needs doing." action="Browse all" onClick={() => onNavigate('/services')} /><div className="serviceGridModern">{services.map((service) => <ServiceCard key={service.id} service={service} onClick={() => onQuote(service.id)} />)}</div></div></section>
    <section className="sectionModern softSection homeTrustSection"><div className="container trustGrid"><div><span className="eyebrow">WHY ANYWORK</span><h2>A better way to hire for everyday work.</h2><p className="bodyLead">One place for discovery, quotes, scheduling, messages, photos and invoices. No scattered chats. No guessing what happens next.</p></div><div className="trustTiles"><TrustTile icon={<ShieldCheck />} title="Verified providers" text="Identity, profile and service information stay visible." /><TrustTile icon={<Star />} title="Real reviews" text="See ratings and completed work before choosing." /><TrustTile icon={<CheckCircle2 />} title="Clear status" text="Every request follows one simple lifecycle." /><TrustTile icon={<Sparkles />} title="Flexible jobs" text="Use Custom when the job does not fit one category." /></div></div></section>
    <section className="audienceSection sectionModern homeAudienceSection">
      <div className="container">
        <div className="audienceIntro"><span className="eyebrow">BUILT FOR BOTH SIDES</span><h2>One marketplace. Two great experiences.</h2><p>Whether you need work done or provide the work, ANYwork keeps the next step obvious.</p></div>
        <div className="audienceGrid">
          <button className="audienceCard audienceCustomer tw-image-shine" onClick={() => onNavigate('/services')}>
            <div><span className="eyebrow">FOR CUSTOMERS</span><h3>Find the right provider faster.</h3><p>Describe the job, compare quotes, book the work and stay updated from your dashboard.</p><span className="audienceAction">Find a service <ArrowRight size={16} /></span></div>
          </button>
          <button className="audienceCard audienceProvider tw-image-shine" onClick={() => onNavigate('/signin')}>
            <div><span className="eyebrow">FOR PROVIDERS</span><h3>Turn more requests into work.</h3><p>Manage opportunities, send clear quotes, schedule jobs and build a trusted profile.</p><span className="audienceAction">Join as a provider <ArrowRight size={16} /></span></div>
          </button>
        </div>
      </div>
    </section>
    <section className="sectionModern homeProvidersSection"><div className="container"><SectionHeading eyebrow="TRUSTED PROVIDERS" title="People behind the work." action="Explore services" onClick={() => onNavigate('/services')} /><div className="providerGridModern">{providers.slice(0, 3).map((provider) => <ProviderCard key={provider.id} provider={provider} onClick={() => onNavigate('/providers/' + provider.id)} />)}</div></div></section>
    <section className="sectionModern projectSection homeProjectsSection"><div className="container"><span className="eyebrow">RECENT PROJECTS</span><h2>From small fixes to full fit-outs.</h2><div className="projectGridModern"><Project title="Commercial signage" category="INSTALL" meta="Retail · Parramatta" cls="imageOne" image={sampleImages.installation} /><Project title="Custom office furniture" category="BUILD" meta="Commercial · North Sydney" cls="imageTwo" image={sampleImages.fabrication} /><Project title="Event banner setup" category="PRINT" meta="Events · Alexandria" cls="imageThree" image={sampleImages.event} /></div></div></section>
    <section className="ctaModern homeCtaSection"><div className="container ctaInner"><div><span className="eyebrow">START WITH THE JOB</span><h2>Not sure which provider you need?</h2><p>Send the details. ANYwork helps route the request to the right service and providers.</p></div><button className="buttonPrimary light" onClick={() => onQuote()}>Request a service <ArrowRight size={17} /></button></div></section>
  </div>
}
function SectionHeading({ eyebrow,title,action,onClick }: { eyebrow:string; title:string; action:string; onClick:()=>void }) { return <div className="sectionHeading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="textLink" onClick={onClick}>{action}<ArrowRight size={15} /></button></div> }
function TrustTile({ icon,title,text }: { icon:ReactNode; title:string; text:string }) { return <div>{icon}<strong>{title}</strong><span>{text}</span></div> }
function Project({ title,category,meta,cls,image }: { title:string; category:string; meta:string; cls:string; image:string }) { return <div className={'projectCard ' + cls} style={{ backgroundImage: 'linear-gradient(180deg, rgba(17,17,17,.06), rgba(17,17,17,.86)), url("' + image + '")' }}><span>{category}</span><strong>{title}</strong><small>{meta}</small></div> }