import { NextRequest, NextResponse } from "next/server"

import { getCountryCode, getRegionMap } from "@lib/regions"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 🚀 Skip middleware for public endpoints (tenant signup, etc.)
  if (path.startsWith("/public")) {
    return NextResponse.next()
  }

  if (path.includes(".")) {
    return NextResponse.next()
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value ?? crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)

  if (!regionMap || regionMap.size === 0) {
    return NextResponse.next()
  }

  const countryCode = await getCountryCode(request, regionMap)

  if (!countryCode) {
    return NextResponse.next()
  }

  const pathSegments = request.nextUrl.pathname.split("/").filter(Boolean)
  const currentCountry = pathSegments.at(0)?.toLowerCase()
  const hasCountrySegment =
    currentCountry !== undefined && regionMap.has(currentCountry)
  const matchesCountryCode = currentCountry === countryCode

  if (hasCountrySegment && matchesCountryCode) {
    if (cacheIdCookie) {
      return NextResponse.next()
    }

    const response = NextResponse.redirect(request.nextUrl.href, 307)
    response.cookies.set("_medusa_cache_id", cacheId, {
      maxAge: 60 * 60 * 24,
    })

    return response
  }

  const redirectPath = request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search ?? ""
  const redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`

  return NextResponse.redirect(redirectUrl, 307)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp|public).*)",
  ],
}
