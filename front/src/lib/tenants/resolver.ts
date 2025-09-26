export interface TenantStorefrontSettings {
  medusaUrl: string
  publishableKey?: string | null
}

export interface TenantConfig {
  tenant: string
  hostname: string
  rootDomain: string
  wordpress?: {
    networkId?: string
    siteSlug?: string
  }
  storefront?: TenantStorefrontSettings
}

export type TenantContextType =
  | "tenant"
  | "network-admin"
  | "primary-domain"
  | "unknown"

export interface TenantContext {
  type: TenantContextType
  config: TenantConfig | null
  storefront: TenantStorefrontSettings | null
  matchedHost?: string | null
}

const tenantCache = new Map<string, TenantConfig>()

const isTenantConfig = (value: unknown): value is TenantConfig => {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<TenantConfig>

  return (
    typeof candidate.tenant === "string" &&
    typeof candidate.hostname === "string" &&
    typeof candidate.rootDomain === "string"
  )
}

const parseTenantConfigsFromSnapshot = (): TenantConfig[] => {
  const snapshot = process.env.NEXT_TENANT_CONFIG_SNAPSHOT

  if (!snapshot) {
    return []
  }

  try {
    const parsed = JSON.parse(snapshot) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTenantConfig)
  } catch {
    return []
  }
}

const hydrateTenantCache = (configs: TenantConfig[]) => {
  configs.forEach((config) => {
    const cacheKey = normalizeHost(config.hostname) ?? config.tenant

    if (cacheKey) {
      tenantCache.set(cacheKey, config)
    }
  })
}

const normalizeHost = (host?: string | null): string | null => {
  if (!host) {
    return null
  }

  const lower = host.trim().toLowerCase()

  if (!lower) {
    return null
  }

  return lower.split(":")[0]
}

const networkHosts = () => {
  const fromEnv = process.env.WORDPRESS_NETWORK_HOSTS?.split(",") ?? []
  return new Set(
    fromEnv
      .map((value) => normalizeHost(value) ?? "")
      .filter((value) => value.length > 0)
  )
}

const primaryDomains = () => {
  const fromEnv = process.env.WORDPRESS_PRIMARY_DOMAINS?.split(",") ?? []
  return new Set(
    fromEnv
      .map((value) => normalizeHost(value) ?? "")
      .filter((value) => value.length > 0)
  )
}

const networkAdminPaths = () => {
  const defaults = ["/wp-admin/network", "/wp-signup.php", "/wp-activate.php"]
  const fromEnv = process.env.WORDPRESS_NETWORK_ADMIN_PATHS?.split(",") ?? []
  const combined = [...fromEnv.map((value) => value.trim()), ...defaults]

  return new Set(
    combined
      .filter((value) => value.length > 0)
      .map((value) => (value.startsWith("/") ? value : `/${value}`))
  )
}

const isNetworkAdminPath = (pathname?: string | null) => {
  if (!pathname) {
    return false
  }

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`

  return networkAdminPaths().has(normalized)
}

const loadTenantConfigs = async (): Promise<void> => {
  if (tenantCache.size > 0) {
    return
  }

  const fromSnapshot = parseTenantConfigsFromSnapshot()

  if (fromSnapshot.length > 0) {
    hydrateTenantCache(fromSnapshot)
  }
}

const ensureTenantCache = async () => {
  if (tenantCache.size === 0) {
    await loadTenantConfigs()
  }
}

const findTenantByHost = async (host: string): Promise<TenantConfig | null> => {
  await ensureTenantCache()

  const direct = tenantCache.get(host)

  if (direct) {
    return direct
  }

  const configs = Array.from(tenantCache.values())

  for (let index = 0; index < configs.length; index += 1) {
    const config = configs[index]
    const normalizedHostname = normalizeHost(config.hostname)
    const normalizedRootDomain = normalizeHost(config.rootDomain)

    if (normalizedHostname === host) {
      return config
    }

    if (normalizedRootDomain) {
      const expected = `${config.tenant}.${normalizedRootDomain}`

      if (expected === host) {
        return config
      }
    }
  }

  return null
}

const resolvePrimaryDomain = async (host: string): Promise<TenantConfig | null> => {
  await ensureTenantCache()

  const matches: TenantConfig[] = []

  const configs = Array.from(tenantCache.values())

  for (let index = 0; index < configs.length; index += 1) {
    const config = configs[index]

    if (normalizeHost(config.rootDomain) === host) {
      matches.push(config)
    }
  }

  if (matches.length === 0) {
    return null
  }

  matches.sort((a, b) => a.tenant.localeCompare(b.tenant))

  return matches[0]
}

const getDefaultStorefront = (): TenantStorefrontSettings => ({
  medusaUrl: process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? null,
})

export interface ResolveTenantOptions {
  host?: string | null
  pathname?: string | null
}

export const resolveTenantContext = async ({
  host,
  pathname,
}: ResolveTenantOptions): Promise<TenantContext> => {
  const normalizedHost = normalizeHost(host)

  if (!normalizedHost) {
    return {
      type: "unknown",
      config: null,
      storefront: getDefaultStorefront(),
      matchedHost: null,
    }
  }

  if (networkHosts().has(normalizedHost) || isNetworkAdminPath(pathname)) {
    return {
      type: "network-admin",
      config: null,
      storefront: getDefaultStorefront(),
      matchedHost: normalizedHost,
    }
  }

  const tenant = await findTenantByHost(normalizedHost)

  if (tenant) {
    return {
      type: "tenant",
      config: tenant,
      storefront: tenant.storefront ?? getDefaultStorefront(),
      matchedHost: normalizedHost,
    }
  }

  if (primaryDomains().has(normalizedHost)) {
    return {
      type: "primary-domain",
      config: null,
      storefront: getDefaultStorefront(),
      matchedHost: normalizedHost,
    }
  }

  const primary = await resolvePrimaryDomain(normalizedHost)

  if (primary) {
    return {
      type: "primary-domain",
      config: primary,
      storefront: primary.storefront ?? getDefaultStorefront(),
      matchedHost: normalizedHost,
    }
  }

  return {
    type: "unknown",
    config: null,
    storefront: getDefaultStorefront(),
    matchedHost: normalizedHost,
  }
}

export const __clearTenantCacheForTests = () => {
  tenantCache.clear()
}
