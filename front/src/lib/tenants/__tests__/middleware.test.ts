import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const getRegionMapMock = vi.fn()
const getCountryCodeMock = vi.fn()

const createCookieJar = () => {
  const store = new Map<string, { value: string; options?: Record<string, unknown> }>()

  return {
    store,
    get: (name: string) => {
      const entry = store.get(name)
      return entry ? { name, value: entry.value } : undefined
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      store.set(name, { value, options })
    },
  }
}

const redirectMock = vi.fn((url: string, status = 307) => ({
  kind: "redirect" as const,
  url,
  status,
  cookies: createCookieJar(),
}))

const nextMock = vi.fn(() => ({
  kind: "next" as const,
  cookies: createCookieJar(),
}))

vi.mock("@lib/regions", () => ({
  getRegionMap: getRegionMapMock,
  getCountryCode: getCountryCodeMock,
}))

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: redirectMock,
    next: nextMock,
  },
  NextRequest: class {},
}))

const { middleware } = await import("../../../middleware")

const createRequest = ({
  hostname,
  pathname,
  search = "",
  cookies = {},
}: {
  hostname: string
  pathname: string
  search?: string
  cookies?: Record<string, string>
}): NextRequest => {
  const url = new URL(`https://${hostname}${pathname}${search}`)

  const cookieStore = new Map(
    Object.entries(cookies).map(([name, value]) => [name, { name, value }])
  )

  return {
    headers: new Headers(),
    geo: {},
    nextUrl: url,
    cookies: {
      get: (name: string) => cookieStore.get(name),
    },
  } as unknown as NextRequest
}

describe("middleware multisite redirects", () => {
  beforeEach(() => {
    getRegionMapMock.mockReset()
    getCountryCodeMock.mockReset()
    redirectMock.mockClear()
    nextMock.mockClear()

    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, "crypto", {
        value: { randomUUID: () => "cache-id" },
        configurable: true,
      })
    } else if (!("randomUUID" in globalThis.crypto)) {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: () => "cache-id",
        configurable: true,
      })
    }
  })

  it("redirects tenant storefront requests to include the resolved country code", async () => {
    const regionMap = new Map([["us", { id: "us" }]])
    getRegionMapMock.mockResolvedValue(regionMap)
    getCountryCodeMock.mockResolvedValue("us")

    const request = createRequest({
      hostname: "acme.example.com",
      pathname: "/",
    })

    const response = await middleware(request)

    expect(getRegionMapMock).toHaveBeenCalledOnce()
    expect(getCountryCodeMock).toHaveBeenCalledWith(request, regionMap)
    expect(redirectMock).toHaveBeenCalledWith("https://acme.example.com/us", 307)
    expect(response.kind).toBe("redirect")
  })

  it("preserves primary domains while setting cache identifiers when a country segment exists", async () => {
    const regionMap = new Map([["us", { id: "us" }]])
    getRegionMapMock.mockResolvedValue(regionMap)
    getCountryCodeMock.mockResolvedValue("us")

    const request = createRequest({
      hostname: "example.com",
      pathname: "/us",
    })

    const response = await middleware(request)

    expect(getRegionMapMock).toHaveBeenCalledOnce()
    expect(getCountryCodeMock).toHaveBeenCalledWith(request, regionMap)
    expect(redirectMock).toHaveBeenCalledWith("https://example.com/us", 307)
    expect(response.kind).toBe("redirect")
    expect(response.cookies.get("_medusa_cache_id")).toBeDefined()
  })

  it("allows public multisite routes to bypass region redirects", async () => {
    const request = createRequest({
      hostname: "network.example.com",
      pathname: "/public/register",
    })

    const response = await middleware(request)

    expect(nextMock).toHaveBeenCalledOnce()
    expect(getRegionMapMock).not.toHaveBeenCalled()
    expect(response.kind).toBe("next")
  })
})
