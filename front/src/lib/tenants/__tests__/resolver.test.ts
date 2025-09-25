import { describe, it, expect, beforeEach, afterEach } from "vitest"

import {
  __clearTenantCacheForTests,
  resolveTenantContext,
} from "../resolver"

const serializeConfigs = (configs: Record<string, any>[]) =>
  JSON.stringify(configs)

beforeEach(() => {
  process.env.MEDUSA_BACKEND_URL = "https://default-medusa.local"
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_default"
  delete process.env.WORDPRESS_NETWORK_HOSTS
  delete process.env.WORDPRESS_NETWORK_ADMIN_PATHS
  delete process.env.WORDPRESS_PRIMARY_DOMAINS

  process.env.TENANT_CONFIGS = serializeConfigs([
    {
      tenant: "acme",
      hostname: "acme.example.com",
      rootDomain: "example.com",
      storefront: {
        medusaUrl: "https://medusa.acme.example.com",
        publishableKey: "pk_acme",
      },
    },
    {
      tenant: "beta",
      hostname: "beta.example.com",
      rootDomain: "example.com",
      storefront: {
        medusaUrl: "https://medusa.beta.example.com",
        publishableKey: "pk_beta",
      },
    },
  ])

  __clearTenantCacheForTests()
})

afterEach(() => {
  __clearTenantCacheForTests()
  delete process.env.TENANT_CONFIGS
})

describe("resolveTenantContext", () => {
  it("loads tenant configuration by exact hostname", async () => {
    const result = await resolveTenantContext({ host: "acme.example.com" })

    expect(result.type).toBe("tenant")
    expect(result.config?.tenant).toBe("acme")
    expect(result.storefront?.medusaUrl).toBe(
      "https://medusa.acme.example.com"
    )
    expect(result.storefront?.publishableKey).toBe("pk_acme")
  })

  it("normalizes hosts that include a port", async () => {
    const result = await resolveTenantContext({ host: "beta.example.com:443" })

    expect(result.type).toBe("tenant")
    expect(result.config?.tenant).toBe("beta")
  })

  it("falls back to network admin context for configured hosts", async () => {
    process.env.WORDPRESS_NETWORK_HOSTS = "network.example.com"

    const result = await resolveTenantContext({ host: "network.example.com" })

    expect(result.type).toBe("network-admin")
    expect(result.config).toBeNull()
    expect(result.storefront?.medusaUrl).toBe("https://default-medusa.local")
  })

  it("returns primary-domain context when the root domain is requested", async () => {
    const result = await resolveTenantContext({ host: "example.com" })

    expect(result.type).toBe("primary-domain")
    expect(result.config?.tenant).toBe("acme")
    expect(result.storefront?.medusaUrl).toBe(
      "https://medusa.acme.example.com"
    )
  })

  it("treats network admin paths as non-tenant requests", async () => {
    const result = await resolveTenantContext({
      host: "acme.example.com",
      pathname: "/wp-admin/network",
    })

    expect(result.type).toBe("network-admin")
    expect(result.config).toBeNull()
    expect(result.storefront?.publishableKey).toBe("pk_default")
  })

  it("falls back to default storefront settings when no tenant matches", async () => {
    const result = await resolveTenantContext({ host: "unknown.example.com" })

    expect(result.type).toBe("unknown")
    expect(result.config).toBeNull()
    expect(result.storefront?.medusaUrl).toBe("https://default-medusa.local")
  })
})
