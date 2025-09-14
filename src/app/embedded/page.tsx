'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

function HomePageContent() {
  const [token, setToken] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get token from URL params
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      // Store token in localStorage for subsequent requests
      localStorage.setItem('auth_token', tokenParam)
      
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState({}, '', url.toString())
    } else {
      // Try to get token from localStorage
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken) {
        setToken(storedToken)
      }
    }
  }, [searchParams])

  if (!token) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Redirect to dashboard
  window.location.href = '/embedded/dashboard'
  return null
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
