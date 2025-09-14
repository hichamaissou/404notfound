'use client'

import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  DropZone,
  EmptyState,
  Modal,
  ProgressBar,
  Text,
} from '@shopify/polaris'
import { useCallback,useEffect, useState } from 'react'

interface ImportRecord {
  id: number
  filename: string
  status: string
  totalRows: number
  processedRows: number
  successRows: number
  errorRows: number
  errors: string[] | null
  createdAt: string
  completedAt: string | null
}

interface CSVImportProps {
  token: string
}

export default function CSVImport({ token }: CSVImportProps) {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Array<{ path: string; target: string }>>([])
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    fetchImports()
  }, [token])

  const fetchImports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/imports/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setImports(data.imports)
      }
    } catch (error) {
      console.error('Error fetching imports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDropZoneDrop = useCallback(
    (files: File[]) => {
      const csvFile = files.find(file => 
        file.type === 'text/csv' || file.name.endsWith('.csv')
      )
      
      if (csvFile) {
        setFile(csvFile)
        parseCSVPreview(csvFile)
      }
    },
    [],
  )

  const parseCSVPreview = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n').slice(0, 6) // Show first 5 data rows + header
      const preview: Array<{ path: string; target: string }> = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim()
        if (!line) continue

        const [path, target] = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''))
        if (path && target) {
          preview.push({ path, target })
        }
      }

      setPreviewData(preview)
      setShowPreview(true)
    } catch (error) {
      console.error('Error parsing CSV:', error)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/redirects/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        setShowPreview(false)
        setFile(null)
        setPreviewData([])
        fetchImports()
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge tone="success">Completed</Badge>
      case 'processing':
        return <Badge tone="info">Processing</Badge>
      case 'failed':
        return <Badge tone="critical">Failed</Badge>
      default:
        return <Badge tone="attention">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleString() : '-'
  }

  const importRows = imports.map((importRecord) => [
    importRecord.filename,
    getStatusBadge(importRecord.status),
    importRecord.totalRows.toString(),
    importRecord.successRows.toString(),
    importRecord.errorRows.toString(),
    formatDate(importRecord.createdAt),
    formatDate(importRecord.completedAt),
    importRecord.status === 'processing' ? (
      <ProgressBar 
        progress={(importRecord.processedRows / importRecord.totalRows) * 100}
        size="small"
      />
    ) : (
      <Button size="slim" disabled={!importRecord.errors?.length}>
        View Errors
      </Button>
    ),
  ])

  const fileUpload = !file && (
    <DropZone.FileUpload actionTitle="Add file" actionHint="or drop file to upload" />
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Upload Section */}
        <Card>
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <Text as="h2" variant="headingMd">Upload CSV File</Text>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <Banner tone="info">
                <Text as="p">
                  Upload a CSV file with two columns: <strong>Path</strong> and <strong>Target</strong>.
                  First row should be headers. Example: /old-page,/new-page
                </Text>
              </Banner>
            </div>

            <DropZone onDrop={handleDropZoneDrop} accept=".csv,text/csv">
              {fileUpload}
              {file && (
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                  <Text as="p" variant="bodyMd">
                    Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                  </Text>
                  <div style={{ marginTop: '1rem' }}>
                    <Button onClick={() => setShowPreview(true)}>
                      Preview & Upload
                    </Button>
                  </div>
                </div>
              )}
            </DropZone>
          </div>
        </Card>

        {/* Import History */}
        <Card>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <Text as="h2" variant="headingMd">Import History</Text>
              <Button onClick={fetchImports} loading={loading}>
                Refresh
              </Button>
            </div>

            {imports.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric', 'text', 'text', 'text']}
                headings={['Filename', 'Status', 'Total', 'Success', 'Errors', 'Started', 'Completed', 'Progress']}
                rows={importRows}
              />
            ) : (
              <EmptyState
                heading="No imports yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">Upload your first CSV file to get started.</Text>
              </EmptyState>
            )}
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Preview: ${file?.name}`}
        primaryAction={{
          content: 'Upload & Process',
          onAction: handleUpload,
          loading: uploading,
          disabled: previewData.length === 0,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowPreview(false),
          },
        ]}
      >
        <Modal.Section>
          <div style={{ marginBottom: '1rem' }}>
            <Text as="p" variant="bodyMd">
              Preview of first 5 rows. Total rows to process: {previewData.length}
            </Text>
          </div>
          
          {previewData.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'text']}
              headings={['Path', 'Target']}
              rows={previewData.map(row => [row.path, row.target])}
            />
          ) : (
            <Banner tone="critical">
              <Text as="p">
                No valid data found. Please ensure your CSV has Path and Target columns.
              </Text>
            </Banner>
          )}
        </Modal.Section>
      </Modal>
    </>
  )
}
