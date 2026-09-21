import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import type { AnyWorkProfile, AnyWorkRole } from '../types/auth'
import { useAuth } from '../auth/AuthContext'

export function AuthPage({
  mode,
  onAuthenticated,
}: {
  mode: 'workspace' | 'admin'
  onAuthenticated: (profile: AnyWorkProfile) => void
}) {
  const { signIn, signUp, configured } = useAuth()
  const [accountType, setAccountType] = useState<Exclude<AnyWorkRole, 'admin'>>('customer')
  const [registering, setRegistering] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const admin = mode === 'admin'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (registering && !admin) {
        const result = await signUp({
          email,
          password,
          role: accountType,
          firstName,
          lastName,
          companyName: accountType === 'provider' ? companyName : undefined,
          phone,
        })

        if (result.needsEmailConfirmation) {
          setMessage('Account created. Check your email to confirm your address, then return here to sign in.')
          setRegistering(false)
          return
        }

        if (result.profile) onAuthenticated(result.profile)
        return
      }

      const profile = await signIn(email, password, admin ? 'admin' : accountType)
      onAuthenticated(profile)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="authShell">
      <section className="authPromo">
        <button className="authPromoBrand" type="button" onClick={() => window.history.back()}>
          <span className="marketLogo">AW</span>
          <strong>ANYwork</strong>
        </button>
        <div className="authPromoContent">
          <span className="eyebrow">{admin ? 'OPERATIONS WORKSPACE' : 'SERVICE MARKETPLACE'}</span>
          <h1>{admin ? 'Run the marketplace with clarity.' : 'Get the right work moving.'}</h1>
          <p>{admin ? 'Secure access for approved operations users.' : 'Discover trusted providers, compare quotes and keep every job in one place.'}</p>
          <div className="authTrustList">
            <span><CheckCircle2 size={17} /> Clear request status</span>
            <span><CheckCircle2 size={17} /> Quotes you can compare</span>
            <span><CheckCircle2 size={17} /> One account across your work</span>
          </div>
        </div>
        <span className="authPromoFooter">ANYwork · Service marketplace</span>
      </section>

      <section className="authFormPanel">
        <div className="authFormWrap">
          <div className="authHeader">
            <span className="eyebrow">{admin ? 'SECURE ACCESS' : registering ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</span>
            <h2>{admin ? 'Operations sign in.' : registering ? 'Start using ANYwork.' : 'Sign in and get things done.'}</h2>
            <p>{admin ? 'Use your approved operations account to continue.' : registering ? 'Choose how you use ANYwork, then create your account.' : 'Access your requests, messages, jobs and profile.'}</p>
          </div>

          {!admin && (
            <div className="authRoleTabs" role="tablist" aria-label="Account type">
              <button className={accountType === 'customer' ? 'active' : ''} type="button" onClick={() => setAccountType('customer')}>
                <UserRound size={15} /> Customer
              </button>
              <button className={accountType === 'provider' ? 'active' : ''} type="button" onClick={() => setAccountType('provider')}>
                <Building2 size={15} /> Provider
              </button>
            </div>
          )}

          <form className="authForm" onSubmit={submit}>
            {registering && !admin && (
              <>
                <div className="authFieldRow">
                  <AuthField label="First name"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" /></AuthField>
                  <AuthField label="Last name"><input value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" /></AuthField>
                </div>
                {accountType === 'provider' && (
                  <div className="authFieldRow">
                    <AuthField label="Business name"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required autoComplete="organization" /></AuthField>
                    <AuthField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></AuthField>
                  </div>
                )}
              </>
            )}

            <AuthField label="Email address" icon={<Mail size={15} />}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </AuthField>
            <AuthField label="Password" icon={<LockKeyhole size={15} />}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={registering ? 'new-password' : 'current-password'} />
            </AuthField>

            {error && <div className="formError">{error}</div>}
            {message && <div className="formSuccess"><CheckCircle2 size={16} /> {message}</div>}

            <button className="authSubmit" type="submit" disabled={busy || !configured}>
              {busy ? 'Please wait…' : admin ? 'Sign in to operations' : registering ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>

          {!configured && <div className="authConfigNotice"><ShieldCheck size={15} /> Supabase is not configured. Add the project credentials from <code>.env.local</code>.</div>}

          {!admin && (
            <div className="authSwitch">
              {registering ? (
                <>Already have an account? <button type="button" onClick={() => { setRegistering(false); setMessage(''); setError('') }}>Sign in</button></>
              ) : (
                <>New to ANYwork? <button type="button" onClick={() => { setRegistering(true); setMessage(''); setError('') }}>Create an account</button>
              )}
            </div>
          )}

          {admin && <div className="adminAccessNote"><ShieldCheck size={15} /><span>Operations access is intentionally kept separate from the public customer/provider sign-in.</span></div>}
        </div>
      </section>
    </main>
  )
}

function AuthField({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="authField">
      <span>{label}</span>
      <div className="authInputWrap">
        {icon}
        {children}
      </div>
    </label>
  )
}
