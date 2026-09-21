export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
  return (
    <img
      className={'brandImage brandImage-' + variant}
      src={variant === 'sidebar' ? '/anywork-services.svg' : '/anywork-services.svg'}
      alt="ANYwork Services"
      loading="eager"
      decoding="async"
    />
  )
}
