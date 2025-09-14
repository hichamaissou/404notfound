'use client'

import { useEffect, useState } from 'react'
import { AppProvider as PolarisAppProvider } from '@shopify/polaris'
import createApp from '@shopify/app-bridge'
import en from '@shopify/polaris/locales/en.json'
import '@shopify/polaris/build/esm/styles.css'

interface EmbeddedLayoutProps {
  children: React.ReactNode
}

export default function EmbeddedLayout({ children }: EmbeddedLayoutProps) {
  const [appBridge, setAppBridge] = useState<any>(null)

  useEffect(() => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const host = urlParams.get('host')
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY

    if (apiKey && host) {
      try {
        const app = createApp({
          apiKey,
          host,
          forceRedirect: true,
        })
        setAppBridge(app)
      } catch (error) {
        console.error('Failed to initialize App Bridge:', error)
      }
    }
  }, [])

  return (
    <PolarisAppProvider i18n={en}>
      {children}
    </PolarisAppProvider>
  )
}
