import Medusa from "@medusajs/js-sdk"
import { headers } from "next/headers"

import {
  resolveTenantContext,
  type TenantContext,
} from "./tenants/resolver"

type MedusaCacheKey = `${string}::${string}`

const sdkCache = new Map<MedusaCacheKey, Medusa>()

const getDefaultStorefrontSettings = () => ({
  medusaUrl: process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
})

const createCacheKey = (url: string, publishableKey: string): MedusaCacheKey =>
  `${url}::${publishableKey}`

export type TenantAwareMedusa = {
  sdk: Medusa
  tenant: TenantContext
}

export const getMedusaSdk = async (options?: {
  host?: string | null
  pathname?: string | null
}): Promise<TenantAwareMedusa> => {
  let headerList: Awaited<ReturnType<typeof headers>> | null = null

  try {
    headerList = await headers()
  } catch {
    headerList = null
  }

  const getHeader = (name: string) => headerList?.get(name) ?? null

  const host =
    options?.host ??
    getHeader("x-forwarded-host") ??
    getHeader("host") ??
    null

  const pathname = options?.pathname ?? getHeader("x-pathname") ?? null

  const tenant = await resolveTenantContext({ host, pathname })

  const storefront = tenant.storefront ?? getDefaultStorefrontSettings()

  const cacheKey = createCacheKey(
    storefront.medusaUrl,
    storefront.publishableKey ?? ""
  )

  let sdk = sdkCache.get(cacheKey)

  if (!sdk) {
    sdk = new Medusa({
      baseUrl: storefront.medusaUrl,
      debug: process.env.NODE_ENV === "development",
      publishableKey: storefront.publishableKey || undefined,
    })

    sdkCache.set(cacheKey, sdk)
  }

  return { sdk, tenant }
}

export const __clearMedusaCacheForTests = () => {
  sdkCache.clear()
}
