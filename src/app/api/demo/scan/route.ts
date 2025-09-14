import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Demo scan API called')
    
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Return demo data immediately
    const demoData = {
      success: true,
      scanId: crypto.randomUUID(),
      message: 'Demo scan completed with sample data',
      stats: {
        pages: 12,
        broken: 3,
        chains: 2,
        loops: 0
      },
      pages: [
        { url: `https://${shop}/`, status: 200, ok: true, depth: 0 },
        { url: `https://${shop}/products`, status: 200, ok: true, depth: 1 },
        { url: `https://${shop}/collections`, status: 200, ok: true, depth: 1 },
        { url: `https://${shop}/about`, status: 200, ok: true, depth: 1 },
        { url: `https://${shop}/contact`, status: 200, ok: true, depth: 1 },
        { url: `https://${shop}/blog`, status: 200, ok: true, depth: 1 },
        { url: `https://${shop}/old-product`, status: 404, ok: false, depth: 1 },
        { url: `https://${shop}/broken-link`, status: 404, ok: false, depth: 1 },
        { url: `https://${shop}/missing-page`, status: 404, ok: false, depth: 1 },
        { url: `https://${shop}/redirect-page`, status: 301, ok: false, depth: 1, redirectedTo: `https://${shop}/new-page` },
        { url: `https://${shop}/temp-redirect`, status: 302, ok: false, depth: 1, redirectedTo: `https://${shop}/permanent-page` },
        { url: `https://${shop}/products/sample`, status: 200, ok: true, depth: 2 }
      ],
      issues: [
        {
          fromUrl: `https://${shop}/`,
          toUrl: `https://${shop}/old-product`,
          type: 'broken_link',
          statusCode: 404,
          firstSeen: new Date().toISOString()
        },
        {
          fromUrl: `https://${shop}/products`,
          toUrl: `https://${shop}/broken-link`,
          type: 'broken_link',
          statusCode: 404,
          firstSeen: new Date().toISOString()
        },
        {
          fromUrl: `https://${shop}/collections`,
          toUrl: `https://${shop}/missing-page`,
          type: 'broken_link',
          statusCode: 404,
          firstSeen: new Date().toISOString()
        },
        {
          fromUrl: `https://${shop}/`,
          toUrl: `https://${shop}/redirect-page`,
          type: 'redirect_chain',
          statusCode: 301,
          redirectedTo: `https://${shop}/new-page`,
          firstSeen: new Date().toISOString()
        },
        {
          fromUrl: `https://${shop}/about`,
          toUrl: `https://${shop}/temp-redirect`,
          type: 'redirect_chain',
          statusCode: 302,
          redirectedTo: `https://${shop}/permanent-page`,
          firstSeen: new Date().toISOString()
        }
      ],
      recommendations: [
        {
          type: 'redirect',
          from: `https://${shop}/old-product`,
          to: `https://${shop}/products/sample`,
          confidence: 0.85,
          reason: 'Similar product name'
        },
        {
          type: 'redirect',
          from: `https://${shop}/broken-link`,
          to: `https://${shop}/products`,
          confidence: 0.72,
          reason: 'Likely intended for products page'
        }
      ]
    }

    console.log(`Demo scan completed for ${shop}`)

    return NextResponse.json(demoData)

  } catch (error) {
    console.error('Demo scan error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to run demo scan', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
