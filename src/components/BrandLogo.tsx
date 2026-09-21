export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
  const stacked = variant === 'sidebar' || variant === 'auth'
  const whiteLockup = variant === 'header' || variant === 'hero'

  if (stacked) {
    return (
      <span className={'brandLockup brandLockup-' + variant} aria-label="ANYwork Services">
        <img
          className="brandMark"
          src="/anywork-mark.svg"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
        <img
          className="brandServices"
          src="/anywork-services.svg"
          alt=""
          loading="eager"
          decoding="async"
        />
      </span>
    )
  }

  if (whiteLockup) {
    return (
      <span className={'brandLockup brandLockup-' + variant} aria-label="ANYwork Services">
        <img
          className="brandHeaderMark"
          src="/anywork-mark.svg"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
        <img
          className="brandHeaderWordmark"
          src="/anywork_white.png"
          alt="ANYwork Services"
          loading="eager"
          decoding="async"
        />
      </span>
    )
  }

  return (
    <img
      className={'brandImage brandImage-' + variant}
      src="/anywork.png"
      alt="ANYwork Services"
      loading="eager"
      decoding="async"
    />
  )
}
