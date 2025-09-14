interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail(data: EmailData): Promise<boolean> {
  // If no Resend API key, just log and return success (no-op)
  if (!process.env.RESEND_API_KEY) {
    console.log('Email would be sent:', data.subject)
    return true
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Redirect Watch <noreply@redirectwatch.app>',
        to: data.to,
        subject: data.subject,
        html: data.html,
      }),
    })

    if (!response.ok) {
      throw new Error(`Email API error: ${response.statusText}`)
    }

    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

export function generateWeeklyDigestEmail(data: {
  shopDomain: string
  new404s: number
  totalHits: number
  topBrokenUrls: Array<{ path: string; hits: number }>
  fixedRedirects: number
  estimatedRevenueLoss: number
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Weekly 404 Digest - ${data.shopDomain}</title>
        <style>
            body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; }
            .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat { background: white; padding: 15px; border-radius: 6px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; }
            .stat-label { font-size: 14px; color: #6b7280; }
            .url-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .url-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .url-item:last-child { border-bottom: none; }
            .footer { background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Weekly 404 Digest</h1>
                <p>Your weekly summary for ${data.shopDomain}</p>
            </div>
            
            <div class="content">
                <div class="stats">
                    <div class="stat">
                        <div class="stat-number">${data.new404s}</div>
                        <div class="stat-label">New 404s This Week</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${data.totalHits}</div>
                        <div class="stat-label">Total 404 Hits</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${data.fixedRedirects}</div>
                        <div class="stat-label">Redirects Created</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">€${data.estimatedRevenueLoss.toFixed(0)}</div>
                        <div class="stat-label">Estimated Revenue Loss</div>
                    </div>
                </div>

                ${data.topBrokenUrls.length > 0 ? `
                <div class="url-list">
                    <h3>Top Broken URLs This Week</h3>
                    ${data.topBrokenUrls.map(url => `
                        <div class="url-item">
                            <strong>${url.path}</strong> - ${url.hits} hits
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <p>
                    <strong>Action Required:</strong> 
                    ${data.new404s > 0 ? 
                        `You have ${data.new404s} new 404 errors to fix. Log in to your Redirect Watch app to create redirects.` :
                        'Great job! No new 404 errors this week.'
                    }
                </p>
            </div>

            <div class="footer">
                <p>This digest was sent by Redirect Watch</p>
                <p><a href="https://admin.shopify.com/store/${data.shopDomain.replace('.myshopify.com', '')}/apps/redirect-watch" style="color: #93c5fd;">Open Redirect Watch</a></p>
            </div>
        </div>
    </body>
    </html>
  `
}

export function generateAlertEmail(data: {
  shopDomain: string
  alertType: string
  message: string
  details?: any
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Alert: ${data.alertType} - ${data.shopDomain}</title>
        <style>
            body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; }
            .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 Alert: ${data.alertType}</h1>
                <p>${data.shopDomain}</p>
            </div>
            
            <div class="content">
                <div class="alert">
                    <p><strong>Alert:</strong> ${data.message}</p>
                    ${data.details ? `<p><strong>Details:</strong> ${JSON.stringify(data.details, null, 2)}</p>` : ''}
                </div>

                <p>Please log in to your Redirect Watch app to investigate and resolve this issue.</p>
            </div>

            <div class="footer">
                <p><a href="https://admin.shopify.com/store/${data.shopDomain.replace('.myshopify.com', '')}/apps/redirect-watch" style="color: #93c5fd;">Open Redirect Watch</a></p>
            </div>
        </div>
    </body>
    </html>
  `
}
