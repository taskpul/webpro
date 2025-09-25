import type { NextRequest } from "next/server"
import { listRegions } from "@lib/data/regions"
import type { HttpTypes } from "@medusajs/types"

export type RegionMap = Map<string, HttpTypes.StoreRegion>

const regionCache = new Map<string, RegionMap>()
const DEFAULT_CACHE_KEY = "__default__"

const toCacheKey = (cacheId?: string | null) => {
  if (!cacheId) {
    return DEFAULT_CACHE_KEY
  }

  const trimmed = cacheId.trim()

  if (!trimmed) {
    return DEFAULT_CACHE_KEY
  }

  return trimmed
}

const buildRegionMap = (regions: HttpTypes.StoreRegion[]): RegionMap => {
  const map: RegionMap = new Map()

  regions.forEach((region) => {
    region.countries?.forEach((country) => {
      const iso = country?.iso_2?.toLowerCase()

      if (iso) {
        map.set(iso, region)
      }
    })
  })

  return map
}

export const getRegionMap = async (
  cacheId?: string | null
): Promise<RegionMap | null> => {
  const cacheKey = toCacheKey(cacheId)

  if (regionCache.has(cacheKey)) {
    return regionCache.get(cacheKey) ?? null
  }

  try {
    const regions = await listRegions()

    if (!regions || regions.length === 0) {
      return null
    }

    const map = buildRegionMap(regions)

    if (map.size === 0) {
      return null
    }

    regionCache.set(cacheKey, map)

    return map
  } catch {
    return null
  }
}

type MinimalRequest = Pick<
  NextRequest,
  "headers" | "nextUrl" | "cookies"
> & {
  geo?: { country?: string | null } | null
}

const normalizeCountryCode = (value?: string | null) =>
  value?.trim().toLowerCase() ?? null

const getCountryFromPath = (request: MinimalRequest, regionMap: RegionMap) => {
  const segment = request.nextUrl.pathname
    .split("/")
    .filter(Boolean)
    .at(0)
    ?.toLowerCase()

  if (segment && regionMap.has(segment)) {
    return segment
  }

  return null
}

const getCountryFromHeaders = (
  request: MinimalRequest,
  regionMap: RegionMap
) => {
  const header = request.headers.get?.("x-country-code")
  const normalized = normalizeCountryCode(header)

  if (normalized && regionMap.has(normalized)) {
    return normalized
  }

  const acceptLanguage = request.headers.get?.("accept-language")

  if (!acceptLanguage) {
    return null
  }

  const entries = acceptLanguage
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  for (const entry of entries) {
    const [locale] = entry.split(";")

    if (!locale) {
      continue
    }

    const normalizedLocale = locale.toLowerCase()
    const parts = normalizedLocale.split("-")

    if (parts.length > 1) {
      const regionCandidate = parts[parts.length - 1]

      if (regionMap.has(regionCandidate)) {
        return regionCandidate
      }
    }

    if (regionMap.has(normalizedLocale)) {
      return normalizedLocale
    }
  }

  return null
}

const getCountryFromGeo = (
  request: MinimalRequest,
  regionMap: RegionMap
) => {
  const geoCountry = normalizeCountryCode(request.geo?.country ?? null)

  if (geoCountry && regionMap.has(geoCountry)) {
    return geoCountry
  }

  return null
}

const getFallbackCountry = (regionMap: RegionMap) => {
  if (regionMap.has("us")) {
    return "us"
  }

  const first = regionMap.keys().next()

  if (!first.done) {
    return first.value
  }

  return null
}

export const getCountryCode = async (
  request: MinimalRequest,
  regionMap: RegionMap
): Promise<string | null> => {
  if (!regionMap || regionMap.size === 0) {
    return null
  }

  const fromPath = getCountryFromPath(request, regionMap)

  if (fromPath) {
    return fromPath
  }

  const fromHeaders = getCountryFromHeaders(request, regionMap)

  if (fromHeaders) {
    return fromHeaders
  }

  const fromGeo = getCountryFromGeo(request, regionMap)

  if (fromGeo) {
    return fromGeo
  }

  return getFallbackCountry(regionMap)
}

export const __clearRegionCacheForTests = () => {
  regionCache.clear()
}
