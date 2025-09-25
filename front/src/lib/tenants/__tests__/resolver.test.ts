import { describe, it, expect, beforeEach, afterEach } from "vitest"
import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import {
  __clearTenantCacheForTests,
  resolveTenantContext,
} from "../resolver"

let configDirectory: string

const writeTenantConfig = async (fileName: string, payload: Record<string, any>) => {
  const filePath = path.join(configDirectory, fileName)
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8")
}

beforeEach(async () => {
  configDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "tenant-config-")
  )

  process.env.TENANT_CONFIG_DIR = configDirectory
  process.env.MEDUSA_BACKEND_URL = "https://default-medusa.local"
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_default"
  delete process.env.WORDPRESS_NETWORK_HOSTS
  delete process.env.WORDPRESS_NETWORK_ADMIN_PATHS
  delete process.env.WORDPRESS_PRIMARY_DOMAINS

  await writeTenantConfig("acme.json", {
    tenant: "acme",
    hostname: "acme.example.com",
    rootDomain: "example.com",
    storefront: {
      medusaUrl: "https://medusa.acme.example.com",
      publishableKey: "pk_acme",
    },
  })

  await writeTenantConfig("beta.json", {
    tenant: "beta",
    hostname: "beta.example.com",
    rootDomain: "example.com",
    storefront: {
      medusaUrl: "https://medusa.beta.example.com",
      publishableKey: "pk_beta",
    },
  })

  __clearTenantCacheForTests()
})

afterEach(async () => {
  __clearTenantCacheForTests()
  await fs.rm(configDirectory, { recursive: true, force: true })
  delete process.env.TENANT_CONFIG_DIR
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
