export type Role = 'customer' | 'provider' | 'admin'

export type RequestStatus =
  | 'Requested'
  | 'Quoted'
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'

export type Service = {
  id: string
  title: string
  label: string
  description: string
  icon: string
  items: string[]
  startingPrice: string
}

export type Provider = {
  id: string
  name: string
  initials: string
  serviceIds: string[]
  rating: number
  reviewCount: number
  completedJobs: number
  location: string
  responseTime: string
  responseRate: string
  summary: string
  verified: boolean
}

export type Quote = {
  id: string
  requestId: string
  providerId: string
  amount: number
  availability: string
  message: string
  status: 'Pending' | 'Accepted' | 'Declined'
}

export type ServiceRequest = {
  id: string
  customer: string
  serviceId: string
  title: string
  providerId?: string
  status: RequestStatus
  location: string
  date: string
  budget: number
  description: string
  quotes: string[]
}