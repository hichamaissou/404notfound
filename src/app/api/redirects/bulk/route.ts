import { parse } from 'csv-parse/sync'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, imports, redirects, shops } from '@/lib/db'
import { createShopifyAdminGraphQL } from '@/lib/shopify/admin-graphql'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    // Parse CSV content
    const csvText = await file.text()
    let records: Array<{ path: string; target: string }>

    try {
      const parsed = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })

      records = parsed.map((row: any) => ({
        path: row.Path || row.path,
        target: row.Target || row.target,
      })).filter((row: any) => row.path && row.target)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 })
    }

    // Create import record
    const [importRecord] = await db
      .insert(imports)
      .values({
        shopId: session.shopId,
        filename: file.name,
        status: 'processing',
        totalRows: records.length,
      })
      .returning()

    // Process records in background (simplified for this example)
    processCSVImport(session.shopId, importRecord.id, records)

    return NextResponse.json({
      importId: importRecord.id,
      totalRows: records.length,
      message: 'Import started successfully',
    })
  } catch (error) {
    console.error('Error processing CSV upload:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process CSV' 
    }, { status: 500 })
  }
}

async function processCSVImport(
  shopId: string,
  importId: string,
  records: Array<{ path: string; target: string }>
) {
  const errors: string[] = []
  let successCount = 0
  let processedCount = 0

  try {
    // Get shop details
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1)

    if (!shop) {
      throw new Error('Shop not found')
    }

    const shopifyAdmin = createShopifyAdminGraphQL(shop.shopDomain, shop.accessToken)

    // Process each record
    for (const record of records) {
      try {
        // Create redirect in Shopify
        const shopifyRedirect = await shopifyAdmin.createUrlRedirect({
          path: record.path,
          target: record.target,
        })

        // Store in local database
        await db
          .insert(redirects)
          .values({
            shopId,
            fromPath: record.path,
            toPath: record.target,
          })

        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Row ${processedCount + 1}: ${errorMessage}`)
      }

      processedCount++

      // Update progress periodically
      if (processedCount % 10 === 0 || processedCount === records.length) {
        await db
          .update(imports)
          .set({
            processedRows: processedCount,
            successRows: successCount,
            errorRows: errors.length,
            errors: errors.length > 0 ? errors : null,
          })
          .where(eq(imports.id, importId))
      }
    }

    // Mark as completed
    await db
      .update(imports)
      .set({
        status: 'completed',
        processedRows: processedCount,
        successRows: successCount,
        errorRows: errors.length,
        errors: errors.length > 0 ? errors : null,
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId))

  } catch (error) {
    console.error('Error processing import:', error)
    
    // Mark as failed
    await db
      .update(imports)
      .set({
        status: 'failed',
        errors: [error instanceof Error ? error.message : 'Processing failed'],
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId))
  }
}
