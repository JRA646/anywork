import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MarketplaceApp from './MarketplaceApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarketplaceApp />
  </StrictMode>,
)
