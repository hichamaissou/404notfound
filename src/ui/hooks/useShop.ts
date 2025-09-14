/**
 * Custom hook for managing shop context in embedded Shopify apps.
 * Handles shop parameter extraction from URL and localStorage fallback.
 */

import { useEffect, useState } from 'react'

import { BadRequestError } from '../../core/errors'

/**
 * Gets shop domain from URL search params.
 * 
 * @returns Shop domain from ?shop= parameter or null
 */
function getShopFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  
  const params = new URLSearchParams(window.location.search)
  return params.get('shop')
}

/**
 * Gets shop domain from localStorage.
 * 
 * @returns Shop domain from storage or null
 */
function getShopFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  
  try {
    return localStorage.getItem('shop_domain')
  } catch {
    return null
  }
}

/**
 * Stores shop domain in localStorage.
 * 
 * @param shop - Shop domain to store
 */
function setShopInStorage(shop: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem('shop_domain', shop)
  } catch {
    // localStorage not available, ignore
  }
}

/**
 * Custom hook that provides the current shop domain.
 * 
 * Tries to get shop from:
 * 1. URL ?shop= parameter
 * 2. localStorage fallback
 * 
 * Automatically stores shop in localStorage when found in URL.
 * 
 * @returns Shop domain string
 * @throws BadRequestError if no shop found
 */
export function useShop(): string {
  const [shop, setShop] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    try {
      // Try URL first
      let shopDomain = getShopFromUrl()
      
      if (shopDomain) {
        // Store in localStorage for future use
        setShopInStorage(shopDomain)
        setShop(shopDomain)
        setError(null)
        return
      }
      
      // Fallback to localStorage
      shopDomain = getShopFromStorage()
      
      if (shopDomain) {
        setShop(shopDomain)
        setError(null)
        return
      }
      
      // No shop found anywhere
      setError('Shop parameter missing. Please access this app from your Shopify admin.')
      
    } catch (err) {
      setError('Failed to determine shop context')
    }
  }, [])
  
  if (error) {
    throw new BadRequestError(error)
  }
  
  if (!shop) {
    throw new BadRequestError('Shop parameter missing. Please access this app from your Shopify admin.')
  }
  
  return shop
}

/**
 * Hook variant that returns shop or null without throwing.
 * Useful for optional shop context or loading states.
 * 
 * @returns Shop domain or null if not available
 */
export function useShopOptional(): string | null {
  const [shop, setShop] = useState<string | null>(null)
  
  useEffect(() => {
    const shopDomain = getShopFromUrl() || getShopFromStorage()
    setShop(shopDomain)
  }, [])
  
  return shop
}
