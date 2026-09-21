import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, MapPin, Save, UserRound } from 'lucide-react'
import type { AnyWorkProfile } from '../types/auth'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage({ role }: { role: 'customer' | 'provider' }) {
  const { profile, user, updateProfile } = useAuth()
  const [form, setForm] = useState(() => profileToForm(profile))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(profileToForm(profile))
  }, [profile])

  if (!profile) return null

  const set = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const submit = async () => {
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      await updateProfile({
        first_name: form.firstName,
        last_name: form.lastName,
        display_name: [form.firstName, form.lastName].filter(Boolean).join(' '),
        company_name: role === 'provider' ? form.companyName || null : profile.company_name,
        phone: form.phone || null,
        bio: form.bio || null,
        address_line1: form.addressLine1 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postalCode || null,
      })
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="workspaceDashboard">
      <div className="workspacePageTitle">
        <span className="eyebrow">ACCOUNT</span>
        <h1>{role === 'provider' ? 'Business profile' : 'Your profile'}</h1>
        <p>Keep your contact details and marketplace profile up to date.</p>
      </div>

      <div className="profilePageGrid">
        <section className="dashboardCard profileSummaryCard">
          <div className="profileLargeAvatar">{profileInitials(profile)}</div>
          <div>
            <span className="eyebrow">{role === 'provider' ? 'PROVIDER' : 'CUSTOMER'}</span>
            <h2>{profile.display_name || 'Your profile'}</h2>
            <p>{user?.email}</p>
          </div>
          <div className="profileStatus"><CheckCircle2 size={15} /> Active account</div>
        </section>

        <section className="dashboardCard profileFormCard">
          <div className="profileSectionHeading">
            <div>
              <span className="eyebrow">PERSONAL DETAILS</span>
              <h2>Profile information</h2>
            </div>
            {saved && <span className="profileSaved"><CheckCircle2 size={15} /> Saved</span>}
          </div>

          <div className="profileFormGrid">
            <Field label="First name"><input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
            <Field label="Last name"><input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
            <Field label="Email"><input value={user?.email ?? ''} disabled /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            {role === 'provider' && <Field label="Business name"><input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>}
            <Field label="City"><input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Address"><input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} /></Field>
            <Field label="Postal code"><input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} /></Field>
            <Field label="About" full><textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
          </div>

          {error && <div className="formError">{error}</div>}

          <div className="profileFormActions">
            <div className="profileHint"><Bell size={15} /> Notifications stay tied to your account.</div>
            <button className="buttonPrimary" onClick={() => void submit()} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </section>

        <section className="dashboardCard profileAddressCard">
          <span className="eyebrow">SERVICE LOCATION</span>
          <h2>{role === 'provider' ? 'Where you work' : 'Default address'}</h2>
          <p><MapPin size={16} /> {[form.addressLine1, form.city, form.state, form.postalCode].filter(Boolean).join(', ') || 'Add an address to improve service matching.'}</p>
          <span className="profileAddressNote"><UserRound size={14} /> Stored in your AnyWork profile.</span>
        </section>
      </div>
    </div>
  )
}

function Field({ label, full = false, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={full ? 'profileField profileFieldFull' : 'profileField'}><span>{label}</span>{children}</label>
}

function profileToForm(profile: AnyWorkProfile | null) {
  return {
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    companyName: profile?.company_name ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
    addressLine1: profile?.address_line1 ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    postalCode: profile?.postal_code ?? '',
  }
}

function profileInitials(profile: AnyWorkProfile) {
  const source = profile.display_name || profile.first_name || 'AW'
  return source.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}
