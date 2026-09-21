export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
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
