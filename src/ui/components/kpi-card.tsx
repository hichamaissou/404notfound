/**
 * Reusable KPI (Key Performance Indicator) card component.
 * Displays metrics in a consistent, visually appealing format.
 */

import { Card, Text } from '@shopify/polaris'

export interface KpiCardProps {
  /** KPI title/label */
  title: string
  /** Main metric value */
  value: string | number
  /** Optional subtitle or description */
  subtitle?: string
  /** Optional trend indicator */
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
  /** Optional loading state */
  loading?: boolean
}

/**
 * KPI card component for displaying key metrics.
 * 
 * @param props - KPI card properties
 * @returns Formatted KPI card with title, value, and optional trend
 * 
 * @example
 * ```tsx
 * <KpiCard
 *   title="Total 404s"
 *   value={42}
 *   subtitle="This month"
 *   trend={{ direction: 'down', value: '12%' }}
 * />
 * ```
 */
export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  loading = false,
}: KpiCardProps) {
  return (
    <Card>
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <Text as="h3" variant="headingSm" tone="subdued">
            {title}
          </Text>
        </div>
        
        <div style={{ marginBottom: '0.25rem' }}>
          <Text as="p" variant="headingLg">
            {loading ? '...' : value}
          </Text>
        </div>
        
        {subtitle && (
          <div style={{ marginBottom: '0.5rem' }}>
            <Text as="p" variant="bodySm" tone="subdued">
              {subtitle}
            </Text>
          </div>
        )}
        
        {trend && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: trend.direction === 'up' 
                  ? '#d73502' 
                  : trend.direction === 'down' 
                  ? '#008060' 
                  : '#6d7175'
              }}
            >
              {trend.direction === 'up' && '↗'}
              {trend.direction === 'down' && '↘'}
              {trend.direction === 'neutral' && '→'}
            </span>
            <Text as="span" variant="bodySm" tone="subdued">
              {trend.value}
            </Text>
          </div>
        )}
      </div>
    </Card>
  )
}
