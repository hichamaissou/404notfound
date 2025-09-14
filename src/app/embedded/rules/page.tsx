'use client'

import { 
  Badge,
  Banner,
  Button, 
  Card, 
  Frame,
  Layout, 
  Page, 
  Text, 
  TextField,
  Toast} from '@shopify/polaris'
import { useEffect, useState } from 'react'

import { getShop } from '@/lib/shop/context'

interface RedirectRule {
  id: string
  pattern: string
  replacement: string
  flags?: string
  enabled: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export default function RulesPage() {
  const [rules, setRules] = useState<RedirectRule[]>([])
  const [loading, setLoading] = useState(true)
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [testPath, setTestPath] = useState('')
  const [testResult, setTestResult] = useState<any>(null)

  const shop = getShop()

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastActive(true)
  }

  const fetchRules = async () => {
    if (!shop) return

    try {
      const response = await fetch(`/api/redirect-rules?shop=${encodeURIComponent(shop)}`)
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules)
      }
    } catch (err) {
      showToast('Failed to fetch rules')
    } finally {
      setLoading(false)
    }
  }

  const handleTestPath = async () => {
    if (!testPath || rules.length === 0) return

    try {
      const response = await fetch('/api/redirect-rules/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: testPath,
          rules: rules.map(rule => ({
            pattern: rule.pattern,
            replacement: rule.replacement,
            flags: rule.flags,
            enabled: rule.enabled,
            priority: rule.priority,
          })),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setTestResult(result)
      }
    } catch (err) {
      showToast('Failed to test path')
    }
  }

  useEffect(() => {
    fetchRules()
  }, [shop])

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  ) : null

  return (
    <Frame>
      <Page
        title="Redirect Rules"
        backAction={{ url: '/embedded/dashboard' }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Text as="h3" variant="headingSm">Test a Path</Text>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Test Path"
                        value={testPath}
                        onChange={setTestPath}
                        placeholder="/old-path/example"
                        autoComplete="off"
                      />
                    </div>
                    <Button 
                      onClick={handleTestPath}
                      disabled={!testPath || rules.length === 0}
                    >
                      Simulate
                    </Button>
                  </div>
                  {testResult && (
                    <div>
                      {testResult.matched ? (
                        <Banner tone="success">
                          <p><strong>Match found!</strong></p>
                          <p>Original: {testResult.original}</p>
                          <p>Transformed: {testResult.transformed}</p>
                        </Banner>
                      ) : (
                        <Banner tone="info">
                          <p>No rules matched this path.</p>
                        </Banner>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                {loading ? (
                  <Text as="p">Loading rules...</Text>
                ) : rules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                      <Text as="h3" variant="headingMd">No rules yet</Text>
                      <Text as="p" tone="subdued">
                        Create regex rules to automatically redirect patterns of URLs.
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Text as="h3" variant="headingSm">Rules ({rules.length})</Text>
                    <div>
                      {rules.map(rule => (
                        <div key={rule.id} style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid #e1e1e1',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <Text as="p"><strong>Pattern:</strong> {rule.pattern}</Text>
                            <Text as="p"><strong>Replacement:</strong> {rule.replacement}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Priority: {rule.priority} | Flags: {rule.flags || 'g'}
                            </Text>
                          </div>
                          <Badge tone={rule.enabled ? 'success' : undefined}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  )
}