/**
 * Custom hook for type-safe JSON API requests.
 * Provides consistent error handling and response formatting.
 */

import { useCallback,useState } from 'react'

/**
 * Success response format from our unified API handler.
 */
interface ApiSuccessResponse<T> {
  ok: true
  data: T
  requestId?: string
}

/**
 * Error response format from our unified API handler.
 */
interface ApiErrorResponse {
  ok: false
  error: string
  code: string
  details?: Record<string, unknown>
  requestId?: string
}

/**
 * Union type for all API responses.
 */
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Hook return type with data, loading state, and error handling.
 */
interface UseFetchJsonReturn<T> {
  /** Response data (null while loading or on error) */
  data: T | null
  /** Loading state */
  loading: boolean
  /** Error message (null when no error) */
  error: string | null
  /** Function to trigger the request */
  execute: (url: string, options?: RequestInit) => Promise<T>
  /** Function to reset state */
  reset: () => void
}

/**
 * Custom hook for making type-safe JSON API requests.
 * 
 * Features:
 * - Automatic JSON parsing and validation
 * - Loading state management
 * - Error handling with user-friendly messages
 * - TypeScript generics for response typing
 * - Request deduplication
 * 
 * @returns Object with data, loading state, error, and execute function
 * 
 * @example
 * ```typescript
 * interface User { id: string; name: string }
 * 
 * function UserProfile() {
 *   const { data: user, loading, error, execute } = useFetchJson<User>()
 *   
 *   useEffect(() => {
 *     execute('/api/user/123')
 *   }, [execute])
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   if (!user) return null
 *   
 *   return <div>Hello, {user.name}!</div>
 * }
 * ```
 */
export function useFetchJson<T>(): UseFetchJsonReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRequest, setCurrentRequest] = useState<string | null>(null)
  
  const execute = useCallback(async (url: string, options?: RequestInit): Promise<T> => {
    // Prevent duplicate requests
    if (currentRequest === url && loading) {
      throw new Error('Request already in progress')
    }
    
    setCurrentRequest(url)
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options?.headers,
        },
        ...options,
      })
      
      // Parse JSON response
      const jsonData: ApiResponse<T> = await response.json()
      
      if (jsonData.ok) {
        setData(jsonData.data)
        setError(null)
        return jsonData.data
      } else {
        // API returned an error response
        const errorMessage = jsonData.error || 'An unexpected error occurred'
        setError(errorMessage)
        setData(null)
        throw new Error(errorMessage)
      }
      
    } catch (err) {
      let errorMessage = 'Network error occurred'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      setError(errorMessage)
      setData(null)
      throw new Error(errorMessage)
      
    } finally {
      setLoading(false)
      setCurrentRequest(null)
    }
  }, [currentRequest, loading])
  
  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
    setCurrentRequest(null)
  }, [])
  
  return {
    data,
    loading,
    error,
    execute,
    reset,
  }
}

/**
 * Simplified hook for one-time data fetching with automatic execution.
 * 
 * @param url - API endpoint URL
 * @param options - Optional fetch options
 * @returns Object with data, loading state, and error
 */
export function useFetchJsonAuto<T>(
  url: string,
  options?: RequestInit
): Omit<UseFetchJsonReturn<T>, 'execute' | 'reset'> {
  const { data, loading, error, execute } = useFetchJson<T>()
  
  // Auto-execute on mount
  useState(() => {
    execute(url, options).catch(() => {
      // Error is already handled by the hook
    })
  })
  
  return { data, loading, error }
}
