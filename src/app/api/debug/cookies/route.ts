import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll()
  
  return NextResponse.json({
    cookiesCount: allCookies.length,
    cookies: allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      length: cookie.value.length
    })),
    headers: {
      cookie: request.headers.get('cookie'),
      userAgent: request.headers.get('user-agent'),
    },
    url: request.url
  })
}
