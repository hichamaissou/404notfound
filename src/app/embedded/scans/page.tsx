'use client'

import { useEffect, useState } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  Text, 
  Button, 
  Badge,
  Toast,
  Frame,
  Banner
} from '@shopify/polaris'
import { getShop } from '@/lib/shop/context'

interface Scan {
  id: string
  status: string
  startedAt: string
  finishedAt?: string
  stats?: {
    pagesScanned?: number
    brokenLinks?: number
  }
  error?: string
}

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const shop = getShop()

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastActive(true)
  }

  const fetchScans = async () => {
    if (!shop) return

    try {
      const response = await fetch(`/api/scans/status?shop=${encodeURIComponent(shop)}`)
      if (response.ok) {
        const data = await response.json()
        setScans(data.scans)
      }
    } catch (err) {
      showToast('Failed to fetch scans')
    } finally {
      setLoading(false)
    }
  }

  const handleStartScan = async () => {
    if (!shop) return

    try {
      const response = await fetch('/api/scans/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop }),
      })

      if (response.ok) {
        showToast('Scan queued successfully!')
        setTimeout(() => fetchScans(), 1000)
      } else {
        throw new Error('Failed to queue scan')
      }
    } catch (err) {
      showToast('Failed to queue scan')
    }
  }

  useEffect(() => {
    fetchScans()
  }, [shop])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge tone="attention">Queued</Badge>
      case 'running':
        return <Badge tone="info">Running</Badge>
      case 'done':
        return <Badge tone="success">Completed</Badge>
      case 'failed':
        return <Badge tone="critical">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  ) : null

  return (
    <Frame>
      <Page
        title="Site Scans"
        backAction={{ url: '/embedded/dashboard' }}
        primaryAction={{
          content: 'Start New Scan',
          onAction: handleStartScan,
        }}
      >
        <Layout>
          {loading ? (
            <Layout.Section>
              <Card>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Text as="p">Loading scans...</Text>
                </div>
              </Card>
            </Layout.Section>
          ) : scans.length === 0 ? (
            <Layout.Section>
              <Card>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <Text as="h3" variant="headingMd">No scans yet</Text>
                    <Text as="p" tone="subdued">
                      Start your first site scan to discover broken links and redirect chains.
                    </Text>
                    <Button variant="primary" onClick={handleStartScan}>
                      Run First Scan
                    </Button>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          ) : (
            <Layout.Section>
              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Text as="h3" variant="headingSm">
                      Scan History ({scans.length})
                    </Text>
                  </div>
                  <div>
                    {scans.map(scan => (
                      <div key={scan.id} style={{ 
                        padding: '1rem', 
                        borderBottom: '1px solid #e1e1e1',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <Text as="p">Started: {new Date(scan.startedAt).toLocaleString()}</Text>
                          {scan.finishedAt && (
                            <Text as="p" variant="bodySm" tone="subdued">
                              Finished: {new Date(scan.finishedAt).toLocaleString()}
                            </Text>
                          )}
                          {scan.stats && (
                            <Text as="p" variant="bodySm" tone="subdued">
                              Pages: {scan.stats.pagesScanned} | Broken: {scan.stats.brokenLinks}
                            </Text>
                          )}
                        </div>
                        {getStatusBadge(scan.status)}
                      </div>
                    ))}
                  </div>
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