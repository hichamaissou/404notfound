/**
 * Reusable chart card component with Chart.js integration.
 * Provides consistent styling and responsive charts across the app.
 */

import { Card, Text } from '@shopify/polaris'
import type { ChartData, ChartOptions } from 'chart.js'
import { Bar,Line } from 'react-chartjs-2'

export interface ChartCardProps {
  /** Chart title */
  title: string
  /** Chart type */
  type: 'line' | 'bar'
  /** Chart.js data object */
  data: ChartData<'line'> | ChartData<'bar'>
  /** Optional Chart.js options (merged with defaults) */
  options?: Partial<ChartOptions<'line'>> | Partial<ChartOptions<'bar'>>
  /** Optional loading state */
  loading?: boolean
  /** Optional height in pixels */
  height?: number
}

/**
 * Default Chart.js options for consistent styling.
 */
const defaultOptions: ChartOptions<'line' | 'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      cornerRadius: 4,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#6d7175',
        font: {
          size: 12,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(109, 113, 117, 0.1)',
      },
      ticks: {
        color: '#6d7175',
        font: {
          size: 12,
        },
      },
    },
  },
}

/**
 * Chart card component with integrated Chart.js charts.
 * 
 * @param props - Chart card properties
 * @returns Card containing a responsive chart
 * 
 * @example
 * ```tsx
 * <ChartCard
 *   title="404 Errors Trend"
 *   type="line"
 *   data={{
 *     labels: ['Jan', 'Feb', 'Mar'],
 *     datasets: [{
 *       label: '404 Errors',
 *       data: [12, 8, 15],
 *       borderColor: '#2c6ecb',
 *       backgroundColor: 'rgba(44, 110, 203, 0.1)',
 *     }]
 *   }}
 * />
 * ```
 */
export function ChartCard({
  title,
  type,
  data,
  options = {},
  loading = false,
  height = 300,
}: ChartCardProps) {
  // Merge provided options with defaults
  const chartOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales,
    },
  } as ChartOptions<'line' | 'bar'>
  
  return (
    <Card>
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Text as="h3" variant="headingSm">
            {title}
          </Text>
        </div>
        
        {loading ? (
          <div 
            style={{ 
              height: `${height}px`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
            }}
          >
            <Text as="p" tone="subdued">
              Loading chart...
            </Text>
          </div>
        ) : (
          <div style={{ height: `${height}px` }}>
            {type === 'line' ? (
              <Line data={data as ChartData<'line'>} options={chartOptions as ChartOptions<'line'>} />
            ) : (
              <Bar data={data as ChartData<'bar'>} options={chartOptions as ChartOptions<'bar'>} />
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
