import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  label?: string
  value: string
  options: string[]
  placeholder?: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const filtered = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="searchableSelect" ref={root}>
      {label && <span className="searchableSelectLabel">{label}</span>}
      <button type="button" className="searchableSelectTrigger" disabled={disabled} onClick={() => { setOpen((v) => !v); setQuery('') }}>
        <span className={value ? '' : 'placeholder'}>{value || placeholder || 'Select an option'}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="searchableSelectMenu">
          <div className="searchableSelectSearch"><Search size={14} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'Search ' + (label || 'options').toLowerCase() + '...'} /></div>
          <div className="searchableSelectOptions">
            {filtered.length ? filtered.map((option) => (
              <button type="button" key={option} className={option === value ? 'selected' : ''} onClick={() => { onChange(option); setOpen(false); setQuery('') }}>
                <span>{option}</span>{option === value && <Check size={14} />}
              </button>
            )) : (
              <div className="searchableSelectEmpty">No matching options</div>
            )}
          </div>
          {value && <button type="button" className="searchableSelectClear" onClick={() => { onChange(''); setOpen(false) }}><X size={13} /> Clear selection</button>}
        </div>
      )}
    </div>
  )
}
