'use client'

import { 
  Badge,
  Banner,
  Button, 
  ButtonGroup,
  Card, 
  DataTable,
  Frame,
  Layout, 
  Page, 
  Text, 
  Toast} from '@shopify/polaris'
import { 
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { useEffect, useState } from 'react'
import { Bar,Line } from 'react-chartjs-2'

import { useShopOptional } from '@/ui/hooks/useShop'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface DashboardData {
  stats: { total: number; resolved: number; unresolved: number; estimatedRoi: number }
  recent: { path: string; hits: number; lastSeen: string }[]
  trend: { date: string; hits: number }[]
  top: { path: string; hits: number }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const shop = useShopOptional()

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastActive(true)
  }

  // Debug shop detection
  useEffect(() => {
    console.log('Dashboard shop detection:', {
      shop,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      searchParams: typeof window !== 'undefined' ? window.location.search : 'server'
    })
  }, [shop])

  const fetchDashboardData = async () => {
    if (!shop) {
      setError('Shop not found')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/dashboard?shop=${encodeURIComponent(shop)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to load dashboard')
      }
      const dashboardData = await res.json()
      setData(dashboardData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleScanNow = async () => {
    if (!shop) {
      showToast('Shop not found in URL or localStorage')
      return
    }

    try {
      const response = await fetch('/api/scans/queue-working', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop }),
      })

      const result = await response.json()
      console.log('Scan queue response:', result)

      if (response.ok) {
        showToast('Scan queued successfully!')
        // Refresh dashboard data
        setTimeout(() => fetchDashboardData(), 1000)
      } else {
        throw new Error(result.error || 'Failed to queue scan')
      }
    } catch (err) {
      console.error('Scan error:', err)
      showToast(`Failed to queue scan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [shop])

  if (loading) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Text as="p">Loading dashboard...</Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (error || !data) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Banner tone="critical" title="Missing shop context">
                  <p>We couldn’t detect your shop. Open the app from Shopify admin or add ?shop=your-shop.myshopify.com to the URL.</p>
                </Banner>
                <div style={{ height: 12 }} />
                <Text as="p" tone="critical">Error: {error || 'No data available'}</Text>
                <div style={{ marginTop: '1rem' }}>
                  <Button onClick={fetchDashboardData}>Retry</Button>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const { stats, trend, top } = data

  // Chart data for trend
  const trendChartData = {
    labels: trend.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: '404 Errors',
        data: trend.map(d => d.hits),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.1,
      },
    ],
  }

  // Chart data for top broken paths
  const topPathsChartData = {
    labels: top.map(p => p.path.length > 20 ? `${p.path.substring(0, 20)}...` : p.path),
    datasets: [
      {
        label: 'Hits',
        data: top.map(p => p.hits),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  // Data table for top broken paths
  const tableRows = data.recent.map(path => [
    path.path,
    String(path.hits),
    new Date(path.lastSeen).toLocaleDateString(),
  ])

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  ) : null

  const showOnboarding = stats.unresolved === 0 && stats.resolved === 0

  return (
    <Frame>
      <Page
        title="Dashboard"
        primaryAction={{
          content: 'Scan now',
          onAction: handleScanNow,
        }}
      >
        <Layout>
          <Layout.Section>
            <Banner tone="info" title="Why fix 404s?">
              <p>404s are dead ends for customers and search engines. Fixing them boosts SEO, improves UX, and recovers revenue.</p>
            </Banner>
          </Layout.Section>
          {/* Onboarding */}
          {showOnboarding && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Text as="h2" variant="headingMd">Welcome to Redirect Watch! 🚀</Text>
                    <Text as="p">Get started with these simple steps:</Text>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Badge tone="info">Step 1</Badge>
                            <Text as="h3" variant="headingSm">Add 404 Tracking</Text>
                            <Text as="p" variant="bodySm">
                              Add our tracking snippet to your theme to capture 404 errors automatically.
                            </Text>
                            <Button size="slim" url="https://help.redirectwatch.com/setup">
                              View Setup Guide
                            </Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Badge tone="attention">Step 2</Badge>
                            <Text as="h3" variant="headingSm">Run First Scan</Text>
                            <Text as="p" variant="bodySm">
                              Scan your website to discover existing broken links and redirect opportunities.
                            </Text>
                            <Button size="slim" variant="primary" onClick={handleScanNow}>
                              Start Scan
                            </Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Badge tone="success">Step 3</Badge>
                            <Text as="h3" variant="headingSm">Create Redirects</Text>
                            <Text as="p" variant="bodySm">
                              Use our auto-fix feature or create manual redirects to resolve 404 errors.
                            </Text>
                            <Button size="slim" url="/embedded/autofix">
                              Auto-fix
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          )}

          {/* KPI Cards */}
          <Layout.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Text as="h3" variant="headingSm">Total 404s</Text>
                    <Text as="p" variant="headingLg">{stats.unresolved}</Text>
                    <Badge tone={stats.unresolved > 0 ? 'attention' : 'success'}>
                      {stats.unresolved > 0 ? 'Needs attention' : 'All resolved'}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Text as="h3" variant="headingSm">Resolved</Text>
                    <Text as="p" variant="headingLg">{stats.resolved}</Text>
                    <Badge tone={stats.resolved > 0 ? 'success' : 'attention'}>
                      {stats.resolved > 0 ? 'Getting better' : 'Start fixing'}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Text as="h3" variant="headingSm">Estimated ROI</Text>
                    <Text as="p" variant="headingLg">€{stats.estimatedRoi.toLocaleString()}</Text>
                    <Badge tone="info">Revenue recovered</Badge>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Text as="h3" variant="headingSm">Total 404s</Text>
                    <Text as="p" variant="headingLg">{stats.total}</Text>
                    <Badge tone="success">Fixed</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </Layout.Section>

          {/* Charts */}
          <Layout.Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Text as="h3" variant="headingSm">
                      404 Trend (Last 14 Days)
                    </Text>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Line data={trendChartData} options={chartOptions} />
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Text as="h3" variant="headingSm">
                      Top 5 Broken Paths
                    </Text>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Bar data={topPathsChartData} options={chartOptions} />
                  </div>
                </div>
              </Card>
            </div>
          </Layout.Section>

          {/* Action Buttons */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Text as="h3" variant="headingSm">Quick Actions</Text>
                  <ButtonGroup>
                    <Button url="/embedded/autofix">Auto-fix (preview)</Button>
                    <Button url="/embedded/rules">Rules</Button>
                    <Button url="/embedded/scans">View Scans</Button>
                  </ButtonGroup>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* Recent Broken Paths Table */}
          {data.recent.length > 0 && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Text as="h3" variant="headingSm">
                      Recent Broken Paths
                    </Text>
                  </div>
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'text']}
                    headings={['Path', 'Hits', 'Last Seen']}
                    rows={tableRows}
                  />
                </div>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  )
}
