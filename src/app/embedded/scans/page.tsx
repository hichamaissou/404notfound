'use client'

import { 
  Badge,
  Banner,
  Button, 
  ButtonGroup,
  Card, 
  Frame,
  Layout, 
  Page, 
  Text, 
  Toast} from '@shopify/polaris'
import { useEffect, useState } from 'react'

import { useShopOptional } from '@/ui/hooks/useShop'

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

  const shop = useShopOptional()

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

  const handleStartScanDev = async () => {
    if (!shop) return

    try {
      const response = await fetch('/api/scans/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop, dev: true }),
      })

      if (response.ok) {
        showToast('Scan queued and triggered (dev)')
        setTimeout(() => fetchScans(), 1000)
      } else {
        throw new Error('Failed to queue scan (dev)')
      }
    } catch (err) {
      showToast('Failed to queue scan (dev)')
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
          {!shop && (
            <Layout.Section>
              <Banner tone="critical" title="Missing shop context">
                <p>We couldn’t detect your shop. Open the app from Shopify admin or add ?shop=your-shop.myshopify.com to the URL.</p>
              </Banner>
            </Layout.Section>
          )}
          <Layout.Section>
            <Banner tone="info" title="About scans">
              <p>A scan visits internal pages to find broken links and redirect chains. It runs in the background.</p>
              <p style={{ marginTop: 6 }}>In development, you can trigger processing immediately via the ‘Run now (dev)’ option.</p>
            </Banner>
          </Layout.Section>
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
                    <ButtonGroup>
                      <Button variant="primary" onClick={handleStartScan}>Run First Scan</Button>
                      <Button onClick={handleStartScanDev}>Run now (dev)</Button>
                    </ButtonGroup>
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
                  <div style={{ marginBottom: '0.75rem' }}>
                    <ButtonGroup>
                      <Button onClick={handleStartScan}>Start New Scan</Button>
                      <Button onClick={handleStartScanDev}>Run now (dev)</Button>
                    </ButtonGroup>
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
