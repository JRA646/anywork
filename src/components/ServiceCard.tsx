import { ArrowUpRight } from 'lucide-react'
import type { Service } from '../types/marketplace'
import { icons } from './Icons'
import { serviceImageById } from '../data/media'

export function ServiceCard({ service, onClick }: { service: Service; onClick?: () => void }) {
  const Icon = icons[service.icon as keyof typeof icons] ?? icons.Store
  const image = serviceImageById[service.id]
  return (
    <button className="serviceCardModern serviceCardImage tw-image-shine group" style={{ '--service-image': 'url("' + image + '")' } as Record<string, string>} onClick={onClick}>
      <div className="serviceCardPhoto" />
      <div className="serviceCardShade" />
      <div className="serviceCardIcon"><Icon size={21} /></div>
      <div className="serviceCardTopline"><span>FROM {service.startingPrice}</span><ArrowUpRight size={18} /></div>
      <div className="serviceCardContent"><h3>{service.title}</h3><p>{service.label}</p><span className="serviceCardDescription">{service.description}</span></div>
    </button>
  )
}
