'use client'

import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  FormLayout,
  Modal,
  Tabs,
  Text,
  TextField,
} from '@shopify/polaris'
import { useEffect,useState } from 'react'

interface Redirect {
  id: number
  path: string
  target: string
  createdBy: string
  createdAt: string
  shopifyId?: string
}

interface RedirectRule {
  id: number
  pattern: string
  replacement: string
  flags: string
  enabled: boolean
  priority: number
}

interface RedirectManagementProps {
  token: string
}

export default function RedirectManagement({ token }: RedirectManagementProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [redirects, setRedirects] = useState<Redirect[]>([])
  const [rules, setRules] = useState<RedirectRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null)
  const [editingRule, setEditingRule] = useState<RedirectRule | null>(null)

  // Form states
  const [path, setPath] = useState('')
  const [target, setTarget] = useState('')
  const [pattern, setPattern] = useState('')
  const [replacement, setReplacement] = useState('')
  const [flags, setFlags] = useState('i')
  const [priority, setPriority] = useState('100')
  const [testPath, setTestPath] = useState('')
  const [testResult, setTestResult] = useState('')

  const tabs = [
    {
      id: 'redirects',
      content: 'Redirects',
      accessibilityLabel: 'Redirect list',
      panelID: 'redirects-content',
    },
    {
      id: 'rules',
      content: 'Regex Rules',
      accessibilityLabel: 'Regex rules',
      panelID: 'rules-content',
    },
  ]

  useEffect(() => {
    fetchData()
  }, [token])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [redirectsRes, rulesRes] = await Promise.all([
        fetch('/api/redirects', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/redirect-rules', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      if (redirectsRes.ok) {
        const redirectsData = await redirectsRes.json()
        setRedirects(redirectsData.redirects)
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json()
        setRules(rulesData.rules)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRedirect = async () => {
    try {
      const response = await fetch('/api/redirects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ path, target }),
      })

      if (response.ok) {
        setShowModal(false)
        setPath('')
        setTarget('')
        fetchData()
      }
    } catch (error) {
      console.error('Error creating redirect:', error)
    }
  }

  const handleDeleteRedirect = async (id: number) => {
    if (!confirm('Are you sure you want to delete this redirect?')) return

    try {
      const response = await fetch(`/api/redirects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting redirect:', error)
    }
  }

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/redirect-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pattern,
          replacement,
          flags,
          priority: parseInt(priority),
        }),
      })

      if (response.ok) {
        setShowRuleModal(false)
        resetRuleForm()
        fetchData()
      }
    } catch (error) {
      console.error('Error creating rule:', error)
    }
  }

  const resetRuleForm = () => {
    setPattern('')
    setReplacement('')
    setFlags('i')
    setPriority('100')
    setEditingRule(null)
  }

  const testRegexRule = () => {
    if (!pattern || !testPath) {
      setTestResult('')
      return
    }

    try {
      const regex = new RegExp(pattern, flags)
      const result = testPath.replace(regex, replacement)
      setTestResult(result !== testPath ? result : 'No match')
    } catch (error) {
      setTestResult('Invalid regex pattern')
    }
  }

  const redirectRows = redirects.map((redirect) => [
    redirect.path,
    redirect.target,
    <Badge tone={redirect.createdBy === 'manual' ? 'info' : 'success'}>
      {redirect.createdBy}
    </Badge>,
    new Date(redirect.createdAt).toLocaleDateString(),
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button
        size="slim"
        tone="critical"
        onClick={() => handleDeleteRedirect(redirect.id)}
      >
        Delete
      </Button>
    </div>,
  ])

  const ruleRows = rules.map((rule) => [
    <code>{rule.pattern}</code>,
    <code>{rule.replacement}</code>,
    rule.flags,
    rule.priority.toString(),
    <Badge tone={rule.enabled ? 'success' : 'attention'}>
      {rule.enabled ? 'Enabled' : 'Disabled'}
    </Badge>,
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button size="slim">Edit</Button>
      <Button size="slim" tone="critical">Delete</Button>
    </div>,
  ])

  const renderRedirects = () => (
    <Card>
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Text as="h2" variant="headingMd">Redirects</Text>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Create Redirect
          </Button>
        </div>

        {redirects.length > 0 ? (
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'text']}
            headings={['Path', 'Target', 'Created By', 'Created', 'Actions']}
            rows={redirectRows}
          />
        ) : (
          <EmptyState
            heading="No redirects found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text as="p">Create your first redirect to start managing 404 errors.</Text>
          </EmptyState>
        )}
      </div>
    </Card>
  )

  const renderRules = () => (
    <Card>
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Text as="h2" variant="headingMd">Regex Rules</Text>
          <Button variant="primary" onClick={() => setShowRuleModal(true)}>
            Create Rule
          </Button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <Banner tone="info">
            <Text as="p">
              Regex rules automatically create redirects for matching patterns. 
              Rules are processed in priority order (lower numbers first).
            </Text>
          </Banner>
        </div>

        {rules.length > 0 ? (
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'numeric', 'text', 'text']}
            headings={['Pattern', 'Replacement', 'Flags', 'Priority', 'Status', 'Actions']}
            rows={ruleRows}
          />
        ) : (
          <EmptyState
            heading="No regex rules found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text as="p">Create regex rules to automatically handle families of URLs.</Text>
          </EmptyState>
        )}
      </div>
    </Card>
  )

  return (
    <>
      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
        <div style={{ marginTop: '1rem' }}>
          {selectedTab === 0 && renderRedirects()}
          {selectedTab === 1 && renderRules()}
        </div>
      </Tabs>

      {/* Create Redirect Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Redirect"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateRedirect,
          disabled: !path || !target,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowModal(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="From Path"
              value={path}
              onChange={setPath}
              placeholder="/old-page"
              helpText="The path that should redirect (e.g., /old-page)"
              autoComplete="off"
            />
            <TextField
              label="To Target"
              value={target}
              onChange={setTarget}
              placeholder="/new-page"
              helpText="The destination URL (e.g., /new-page or https://example.com)"
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Create Rule Modal */}
      <Modal
        open={showRuleModal}
        onClose={() => {
          setShowRuleModal(false)
          resetRuleForm()
        }}
        title="Create Regex Rule"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateRule,
          disabled: !pattern || !replacement,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setShowRuleModal(false)
              resetRuleForm()
            },
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Pattern"
              value={pattern}
              onChange={setPattern}
              placeholder="^/old-category/(.+)$"
              helpText="Regular expression pattern to match paths"
              autoComplete="off"
            />
            <TextField
              label="Replacement"
              value={replacement}
              onChange={setReplacement}
              placeholder="/new-category/$1"
              helpText="Replacement pattern (use $1, $2 for capture groups)"
              autoComplete="off"
            />
            <TextField
              label="Flags"
              value={flags}
              onChange={setFlags}
              placeholder="i"
              helpText="Regex flags (i = case insensitive, g = global)"
              autoComplete="off"
            />
            <TextField
              label="Priority"
              type="number"
              value={priority}
              onChange={setPriority}
              helpText="Lower numbers are processed first"
              autoComplete="off"
            />
            
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f6f6f7', borderRadius: '4px' }}>
              <Text as="h3" variant="headingXs">Test Rule</Text>
              <div style={{ marginTop: '0.5rem' }}>
                <TextField
                  label="Test Path"
                  value={testPath}
                  onChange={setTestPath}
                  placeholder="/old-category/some-product"
                  autoComplete="off"
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <Button size="slim" onClick={testRegexRule}>
                    Test
                  </Button>
                </div>
                {testResult && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Text as="p" variant="bodyMd">
                      <strong>Result:</strong> {testResult}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </>
  )
}
