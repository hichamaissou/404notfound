import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@shopify/app-bridge'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/**/*'],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com;"
      }]
    }]
  },
}

export default nextConfig
