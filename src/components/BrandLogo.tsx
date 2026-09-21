export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
  const src = variant === 'sidebar' ? '/anywork_white.png' : '/anywork.png'

  return (
    <img
      className={'brandImage brandImage-' + variant}
      src={src}
      alt="ANYwork Services"
      loading="eager"
      decoding="async"
    />
  )
}
