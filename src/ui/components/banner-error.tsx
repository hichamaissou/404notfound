/**
 * Reusable error banner component for displaying user-friendly error messages.
 * Provides consistent error presentation across the app.
 */

import { Banner } from '@shopify/polaris'

export interface BannerErrorProps {
  /** Error message to display */
  message: string
  /** Optional detailed error information */
  details?: string
  /** Whether the banner can be dismissed */
  dismissible?: boolean
  /** Callback when banner is dismissed */
  onDismiss?: () => void
  /** Optional action button */
  action?: {
    content: string
    onAction: () => void
  } | undefined
}

/**
 * Error banner component for consistent error display.
 * 
 * @param props - Banner error properties
 * @returns Polaris Banner with error styling and message
 * 
 * @example
 * ```tsx
 * <BannerError
 *   message="Failed to load redirects"
 *   details="Network connection error"
 *   dismissible
 *   onDismiss={() => setError(null)}
 *   action={{
 *     content: 'Retry',
 *     onAction: () => refetch()
 *   }}
 * />
 * ```
 */
export function BannerError({
  message,
  details,
  dismissible = false,
  onDismiss,
  action,
}: BannerErrorProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Banner
        tone="critical"
        onDismiss={dismissible ? onDismiss : undefined}
        action={action || undefined}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {message}
          </p>
          {details && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
              {details}
            </p>
          )}
        </div>
      </Banner>
    </div>
  )
}

/**
 * Warning banner variant for non-critical issues.
 */
export function BannerWarning({
  message,
  details,
  dismissible = false,
  onDismiss,
  action,
}: BannerErrorProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Banner
        tone="warning"
        onDismiss={dismissible ? onDismiss : undefined}
        action={action || undefined}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {message}
          </p>
          {details && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
              {details}
            </p>
          )}
        </div>
      </Banner>
    </div>
  )
}

/**
 * Success banner variant for positive feedback.
 */
export function BannerSuccess({
  message,
  details,
  dismissible = true,
  onDismiss,
  action,
}: BannerErrorProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Banner
        tone="success"
        onDismiss={dismissible ? onDismiss : undefined}
        action={action || undefined}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>
            {message}
          </p>
          {details && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
              {details}
            </p>
          )}
        </div>
      </Banner>
    </div>
  )
}
