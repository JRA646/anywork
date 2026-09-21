export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
  const stacked = variant === 'sidebar' || variant === 'auth'

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

  return (
    <img
      className={'brandImage brandImage-' + variant}
      src="/anywork-services.svg"
      alt="ANYwork Services"
      loading="eager"
      decoding="async"
    />
  )
}
