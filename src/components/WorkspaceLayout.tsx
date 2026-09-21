import { Bell, ChevronDown, CircleHelp, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Role } from '../types/marketplace'

const nav = {
  customer: ['dashboard', 'requests', 'messages', 'profile'],
  provider: ['dashboard', 'requests', 'jobs', 'services', 'earnings', 'messages', 'profile'],
  admin: ['dashboard', 'requests', 'providers', 'services', 'customers', 'settings'],
} as const

export function WorkspaceLayout({ role,title,current,onNavigate,onPublicSite,children }: { role:Role; title:string; current:string; onNavigate:(value:string)=>void; onPublicSite:()=>void; children:ReactNode }) {
  return <div className="workspace"><aside className="workspaceSidebar"><button className="workspaceBrand" onClick={onPublicSite}><span className="marketLogo">AW</span><span>ANYwork</span></button><div className="workspaceLabel">{role.toUpperCase()} WORKSPACE</div><nav>{nav[role].map((item) => <button key={item} className={current === item ? 'active' : ''} onClick={() => onNavigate(item)}><span>{item.replace('-', ' ')}</span></button>)}</nav><div className="workspaceBottom"><button onClick={() => onNavigate('help')}><CircleHelp size={16} /> Help center</button><button onClick={onPublicSite}><LogOut size={16} /> Exit workspace</button></div></aside><div className="workspaceMain"><header className="workspaceTopbar"><div><span className="workspaceKicker">{role === 'provider' ? 'Provider portal' : role === 'admin' ? 'Operations' : 'Customer portal'}</span><strong>{title}</strong></div><div className="workspaceActions"><button className="roundIcon"><Bell size={18} /></button><button className="profileMenu"><span>{role === 'provider' ? 'NF' : role === 'admin' ? 'AD' : 'JD'}</span><ChevronDown size={14} /></button></div></header><main className="workspaceContent">{children}</main></div></div>
}