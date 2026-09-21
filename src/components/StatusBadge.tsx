import type { RequestStatus } from '../types/marketplace'

export function StatusBadge({ status }: { status: RequestStatus }) {
  const tone =
    status === 'Completed' || status === 'Scheduled'
      ? 'success'
      : status === 'In Progress'
        ? 'info'
        : status === 'Quoted'
          ? 'warning'
          : 'neutral'

  return <span className={`statusBadge ${tone}`}>{status}</span>
}