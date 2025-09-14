'use client'

import { usePathname } from 'next/navigation'
import { 
  Card,
  ButtonGroup,
  Button
} from '@shopify/polaris'

export default function Navigation() {
  const pathname = usePathname()

  // Don't show navigation on the main embedded page (it redirects anyway)
  if (pathname === '/embedded') {
    return null
  }

  const navigationItems = [
    { url: '/embedded/dashboard', label: 'Dashboard' },
    { url: '/embedded/scans', label: 'Scans' },
    { url: '/embedded/rules', label: 'Rules' },
    { url: '/embedded/autofix', label: 'Auto-fix' },
  ]

  return (
    <div style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 1000,
      backgroundColor: 'var(--p-color-bg-surface)',
      borderBottom: '1px solid var(--p-color-border-subdued)',
      padding: '0.5rem 1rem'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem' 
        }}>
          <strong style={{ fontSize: '1.1rem' }}>Redirect Watch</strong>
        </div>
        
        <ButtonGroup variant="segmented">
          {navigationItems.map(item => (
            <Button
              key={item.url}
              url={item.url}
              pressed={pathname?.startsWith(item.url)}
              size="slim"
            >
              {item.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  )
}
