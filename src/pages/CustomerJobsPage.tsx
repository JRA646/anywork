import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { listCustomerRequests, type DbRequest } from '../lib/anyworkApi'

export function CustomerJobsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [jobs, setJobs] = useState<DbRequest[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void listCustomerRequests().then((rows) => setJobs(rows.filter((row) => ['Scheduled','In Progress','Completed'].includes(row.status)))).catch(() => setJobs([])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="workspaceDashboard providerHub">
      <div className="workspacePageTitle providerPageTitle"><span className="eyebrow">CUSTOMER WORKSPACE</span><h1>Jobs</h1><p>Manage scheduled work, execution updates, changes and completion from one workspace.</p></div>
      <div className="providerJobsList">
        {loading ? <div className="providerEmptyPanel"><strong>Loading jobs</strong><span>Checking your confirmed work.</span></div> : jobs.length ? jobs.map((job) => (
          <article className="providerJobCard" key={job.id}>
            <div className="providerJobDate"><strong>{job.preferred_date ? new Date(job.preferred_date).toLocaleDateString([], { day:'2-digit', month:'short' }) : '—'}</strong><span>{job.preferred_date ? new Date(job.preferred_date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : 'Flexible'}</span></div>
            <div className="providerJobMain"><span className="requestId">{job.request_number}</span><h3>{job.title}</h3><p><MapPin size={13} /> {job.location}</p></div>
            <div className="providerJobValue"><span>Schedule</span><strong><CalendarDays size={13} /> {job.preferred_date ? new Date(job.preferred_date).toLocaleDateString() : 'Not set'}</strong></div>
            <StatusBadge status={job.status} />
            <button className="jobRowArrow" onClick={() => onNavigate('/customer/jobs/' + job.id)} aria-label="Open job"><ArrowRight size={18} /></button>
          </article>
        )) : <div className="providerEmptyPanel"><strong>No active jobs</strong><span>Accept a quote and confirm a schedule to create a job.</span><button className="buttonPrimary" onClick={() => onNavigate('/customer/requests')}>View requests</button></div>}
      </div>
    </div>
  )
}
