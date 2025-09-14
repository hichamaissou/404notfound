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
  RangeSlider,
  Text, 
  Toast} from '@shopify/polaris'
import { useState } from 'react'

import { useShopOptional } from '@/ui/hooks/useShop'

interface Suggestion {
  from: string
  to: string
  score: number
}

export default function AutoFixPage() {
  const [threshold, setThreshold] = useState(88)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const shop = useShopOptional()

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastActive(true)
  }

  const handlePreviewSuggestions = async () => {
    if (!shop) return

    setLoading(true)
    setSuggestions([])

    try {
      const response = await fetch('/api/redirects/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop,
          threshold: threshold / 100,
          apply: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions)
      
      if (data.suggestions.length === 0) {
        showToast('No suggestions found with current threshold')
      } else {
        showToast(`Found ${data.suggestions.length} suggestions`)
      }

    } catch (err) {
      showToast('Failed to generate suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleApplySuggestions = async () => {
    if (!shop || suggestions.length === 0) return
    setLoading(true)
    try {
      const response = await fetch('/api/redirects/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, threshold: threshold / 100, apply: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to apply suggestions')
      showToast(`Applied ${data.appliedCount} redirects`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to apply suggestions')
    } finally {
      setLoading(false)
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
        title="Auto-fix Suggestions"
        backAction={{ url: '/embedded/dashboard' }}
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
            <Banner tone="info" title="How auto-fix works">
              <p>Suggestions use fuzzy matching (Jaro‑Winkler). Start with threshold 0.88. Preview before applying to avoid false positives.</p>
            </Banner>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Text as="h3" variant="headingSm">Confidence Threshold</Text>
                  <div style={{ padding: '0 1rem' }}>
                    <RangeSlider
                      label={`${threshold}% confidence minimum`}
                      value={threshold}
                      onChange={(value) => setThreshold(Array.isArray(value) ? value[0] : value)}
                      min={80}
                      max={95}
                      step={1}
                    />
                  </div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Higher thresholds mean more confident matches but fewer suggestions.
                  </Text>
                  <ButtonGroup>
                    <Button 
                      variant="primary" 
                      onClick={handlePreviewSuggestions}
                      loading={loading}
                    >
                      Preview Suggestions
                    </Button>
                    <Button onClick={handleApplySuggestions} disabled={suggestions.length === 0} loading={loading}>
                      Apply selected
                    </Button>
                  </ButtonGroup>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {suggestions.length > 0 && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '1rem' }}>
                  <Text as="h3" variant="headingSm">
                    Found {suggestions.length} suggestions
                  </Text>
                  <div style={{ marginTop: '1rem' }}>
                    {suggestions.map((suggestion, index) => (
                      <div key={index} style={{ 
                        padding: '1rem', 
                        borderBottom: index < suggestions.length - 1 ? '1px solid #e1e1e1' : 'none' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text as="p"><strong>From:</strong> {suggestion.from}</Text>
                            <Text as="p"><strong>To:</strong> {suggestion.to}</Text>
                          </div>
                          <Badge tone="success">{`${Math.round(suggestion.score * 100)}%`}</Badge>
                        </div>
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
