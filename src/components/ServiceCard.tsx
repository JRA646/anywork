import { ArrowUpRight } from 'lucide-react'
import type { Service } from '../types/marketplace'
import { icons } from './Icons'

export function ServiceCard({ service, onClick }: { service: Service; onClick?: () => void }) {
  const Icon = icons[service.icon as keyof typeof icons]
  return (
    <button className="serviceCardModern" onClick={onClick}>
      <div className="serviceCardIcon"><Icon size={21} /></div>
      <div className="serviceCardTopline"><span>FROM {service.startingPrice}</span><ArrowUpRight size={18} /></div>
      <h3>{service.title}</h3>
      <p>{service.label}</p>
      <span className="serviceCardDescription">{service.description}</span>
    </button>
  )
}