export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
  return <img className={'brandImage brandImage-' + variant} src="/anywork-logo.webp" alt="ANYwork Services" />
}
