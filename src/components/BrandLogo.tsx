import { ANYWORK_LOGO_DATA_URI } from '../assets/anyworkLogo'

export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'auth' | 'hero' }) {
  return <img className={'brandImage brandImage-' + variant} src={ANYWORK_LOGO_DATA_URI} alt="ANYwork Services" />
}
