import { redirect } from 'next/navigation'

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>
}) {
  const params = await searchParams
  const shop = params.shop

  if (!shop) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        gap: '20px'
      }}>
        <h1>Redirect Watch</h1>
        <p>Please provide a shop parameter to install the app.</p>
        <p>Example: ?shop=your-shop.myshopify.com</p>
      </div>
    )
  }

  // Redirect to OAuth flow
  redirect(`/api/auth?shop=${shop}`)
}
