import { useState } from 'react'
import { ChevronDown, CircleHelp, Mail, Search } from 'lucide-react'

const articles = [
  ['How do I review a service request?', 'Open Requests from your workspace, filter by status, then select a request to inspect its customer, provider and quote details.'],
  ['How does provider verification work?', 'Providers can be marked verified after your operations team reviews the account and business information.'],
  ['How do I change marketplace settings?', 'Use Settings to update the customer experience controls and request lifecycle behavior.'],
  ['Where can I see customer activity?', 'Open Customers to search accounts and view jobs, spend and account status.'],
]

export function HelpCenterPage() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<number | null>(0)

  const filtered = articles.filter(([title, body]) => (title + ' ' + body).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="workspaceDashboard helpModern">
      <div className="workspacePageTitle"><span className="eyebrow">SUPPORT</span><h1>Help center</h1><p>Quick answers for running the ANYwork marketplace.</p></div>
      <section className="helpHeroCard">
        <div className="helpHeroIcon"><CircleHelp size={25} /></div>
        <div><h2>How can we help?</h2><p>Search the quick-start guides or contact support when you need a hand.</p></div>
        <div className="searchField helpSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help..." /></div>
      </section>
      <div className="helpLayout">
        <section className="dashboardCard">
          <div className="cardHeading"><div><span className="eyebrow">QUICK ANSWERS</span><h2>Common questions</h2></div></div>
          <div className="faqList">
            {filtered.map(([title, body], index) => (
              <div className="faqItem" key={title}>
                <button onClick={() => setOpen(open === index ? null : index)}><strong>{title}</strong><ChevronDown className={open === index ? 'isOpen' : ''} size={17} /></button>
                {open === index && <p>{body}</p>}
              </div>
            ))}
            {!filtered.length && <div className="emptyModern"><strong>No help articles found</strong><p>Try another search term.</p></div>}
          </div>
        </section>
        <aside className="dashboardCard helpContactCard">
          <span className="eyebrow">NEED MORE HELP?</span><h2>Talk to support</h2><p>Send the operations team a message and include the request or provider ID when relevant.</p>
          <a className="buttonPrimary" href="mailto:support@anywork.app"><Mail size={16} /> Contact support</a>
        </aside>
      </div>
    </div>
  )
}
