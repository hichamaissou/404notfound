import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Redirect Watch',
  description: 'Shopify app for 404 tracking and redirect management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
