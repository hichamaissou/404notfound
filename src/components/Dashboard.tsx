'use client'

import { useState, useEffect } from 'react'
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  DataTable,
  Badge,
  Banner,
  Tabs,
  Spinner,
  EmptyState,
} from '@shopify/polaris'
import { ChartVerticalIcon, EditIcon, ImportIcon } from '@shopify/polaris-icons'
import RedirectManagement from './RedirectManagement'
import CSVImport from './CSVImport'

interface DashboardProps {
  token: string
}

interface BrokenUrl {
  id: string
  path: string
  hits: number
  firstSeen: string
  lastSeen: string
  isResolved: boolean
}

interface DashboardStats {
  total404s: number
  totalHits: number
  resolvedCount: number
  weeklyNew: number
  estimatedRevenueLoss: number
}

export default function Dashboard({ token }: DashboardProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [brokenUrls, setBrokenUrls] = useState<BrokenUrl[]>([])
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    {
      id: 'dashboard',
      content: 'Dashboard',
      accessibilityLabel: 'Dashboard',
      panelID: 'dashboard-content',
    },
    {
      id: 'redirects',
      content: 'Redirects',
      accessibilityLabel: 'Redirects management',
      panelID: 'redirects-content',
    },
    {
      id: 'import',
      content: 'Import',
      accessibilityLabel: 'CSV Import',
      panelID: 'import-content',
    },
  ]

  useEffect(() => {
    fetchDashboardData()
  }, [token])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/broken-urls', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const data = await response.json()
      setStats(data.stats)
      setBrokenUrls(data.brokenUrls)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const createRedirect = async (path: string) => {
    try {
      const target = prompt(`Create redirect for ${path}.\nEnter target URL:`)
      if (!target) return

      const response = await fetch('/api/redirects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ path, target }),
      })

      if (response.ok) {
        fetchDashboardData() // Refresh data
      } else {
        alert('Failed to create redirect')
      }
    } catch (err) {
      alert('Error creating redirect')
    }
  }

  const renderDashboard = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Spinner size="large" />
        </div>
      )
    }

    if (error) {
      return (
        <Banner tone="critical">
          <Text as="p">{error}</Text>
        </Banner>
      )
    }

    if (!stats) {
      return (
        <EmptyState
          heading="No data available"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p">Start tracking 404s by adding the tracking snippet to your theme.</Text>
        </EmptyState>
      )
    }

    const tableRows = brokenUrls.slice(0, 10).map((url) => [
      url.path,
      url.hits.toString(),
      formatDate(url.firstSeen),
      formatDate(url.lastSeen),
      url.isResolved ? (
        <Badge tone="success">Resolved</Badge>
      ) : (
        <Badge tone="attention">Active</Badge>
      ),
      <Button
        size="slim"
        onClick={() => createRedirect(url.path)}
        disabled={url.isResolved}
      >
        Create Redirect
      </Button>,
    ])

    return (
      <Layout>
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text as="h3" variant="headingMd">Total 404s</Text>
                <Text as="p" variant="headingLg" tone="subdued">{stats.total404s}</Text>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text as="h3" variant="headingMd">Total Hits</Text>
                <Text as="p" variant="headingLg" tone="subdued">{stats.totalHits}</Text>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text as="h3" variant="headingMd">Resolved</Text>
                <Text as="p" variant="headingLg" tone="success">{stats.resolvedCount}</Text>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Text as="h3" variant="headingMd">Est. Revenue Loss</Text>
                <Text as="p" variant="headingLg" tone="critical">{formatCurrency(stats.estimatedRevenueLoss)}</Text>
              </div>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '1rem' }}>
              <Text as="h2" variant="headingMd">Recent Broken Links</Text>
              {brokenUrls.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric', 'text', 'text', 'text', 'text']}
                  headings={['Path', 'Hits', 'First Seen', 'Last Seen', 'Status', 'Action']}
                  rows={tableRows}
                />
              ) : (
                <EmptyState
                  heading="No broken links found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p">Great! No 404 errors have been detected yet.</Text>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    )
  }

  const renderRedirects = () => {
    return <RedirectManagement token={token} />
  }

  const renderImport = () => {
    return <CSVImport token={token} />
  }

  return (
    <Page
      title="Redirect Watch"
      subtitle="Monitor and fix 404 errors on your store"
    >
      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
        <div style={{ marginTop: '1rem' }}>
          {selectedTab === 0 && renderDashboard()}
          {selectedTab === 1 && renderRedirects()}
          {selectedTab === 2 && renderImport()}
        </div>
      </Tabs>
    </Page>
  )
}
