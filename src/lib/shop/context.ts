/**
 * Shop context utilities for client-side shop parameter management
 */

/**
 * Get shop domain from URL search params (client-only)
 * @returns shop domain or null if not found
 */
export function getShopFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('shop')
}

/**
 * Get shop domain from localStorage (client-only)
 * @returns shop domain or null if not found
 */
export function getShopFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  
  return localStorage.getItem('shop_domain')
}

/**
 * Store shop domain in localStorage (client-only)
 * @param shop - shop domain to store
 */
export function setShopInStorage(shop: string): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('shop_domain', shop)
}

/**
 * Get shop domain from URL or fallback to localStorage
 * @returns shop domain or null if not found
 */
export function getShop(): string | null {
  return getShopFromUrl() || getShopFromStorage()
}
