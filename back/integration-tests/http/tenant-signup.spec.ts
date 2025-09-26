import express, { NextFunction, Request, RequestHandler, Router } from "express"
import { randomUUID } from "crypto"
import type { AddressInfo } from "net"
import { MedusaError } from "medusa-core-utils"
import publicTenantSignupRoutes from "../../src/api/routes/public/tenant-signup"
import TenantSignupService from "../../src/modules/tenant/tenant-signup-service"
import type {
  TenantCreateInput,
  TenantService,
} from "../../src/modules/tenant/tenant-service"
import type Tenant from "../../src/modules/tenant/tenant-model"

type ScopedRequest = Request & {
  scope: { resolve: (registration: string) => unknown }
}

class FakeTenantService implements Pick<TenantService, "create"> {
  lastInput?: TenantCreateInput
  migrationsRan = false

  async create(input: TenantCreateInput): Promise<Tenant> {
    this.lastInput = { ...input }
    this.migrationsRan = true

    const slug = input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

    const dbName = input.dbName ?? `db_${slug.replace(/-/g, "_")}`
    const subdomain = input.subdomain ?? `${slug}.example.com`
    const now = new Date()

    return {
      id: randomUUID(),
      name: input.name.trim(),
      subdomain,
      dbName,
      planId: input.planId ?? null,
      createdAt: now,
      updatedAt: now,
    }
  }
}

class FakeTenantPlanService {
  readonly validPlans = new Set(["starter", "plus"])
  lastChecked?: string

  async assertActivePlan(planId: string) {
    const normalized = planId.trim()
    this.lastChecked = normalized

    if (!this.validPlans.has(normalized)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The requested plan is not available"
      )
    }

    return {
      id: normalized,
      name: normalized,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}

const attachScope = (signupService: TenantSignupService): RequestHandler => {
  return ((req: ScopedRequest, _res, next: NextFunction) => {
    req.scope = {
      resolve: (registration: string) => {
        if (registration === "tenantSignupService") {
          return signupService
        }
        throw new Error(`Unknown registration: ${registration}`)
      },
    }
    next()
  }) as RequestHandler
}

const startServer = () => {
  const tenantService = new FakeTenantService()
  const planService = new FakeTenantPlanService()
  const signupService = new TenantSignupService({
    tenantService,
    tenantPlanService: planService,
  })
  const app = express()
  app.use(express.json())
  app.use(attachScope(signupService))

  const router = Router()
  publicTenantSignupRoutes(router)
  app.use("/public", router)

  const server = app.listen(0)
  const { port } = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${port}`

  const request = (path: string, init?: RequestInit) => {
    return fetch(`${baseUrl}${path}`, init)
  }

  const requestJson = async (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const contentType = response.headers.get("content-type") ?? ""
    const responseBody = contentType.includes("application/json")
      ? await response.json()
      : await response.text()

    return { status: response.status, body: responseBody }
  }

  const close = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  return { requestJson, request, close, tenantService, planService, baseUrl }
}

const snapshotEnv = (keys: string[]) => {
  const previous = new Map<string, string | undefined>()

  keys.forEach((key) => {
    previous.set(key, process.env[key])
  })

  return () => {
    keys.forEach((key) => {
      const value = previous.get(key)
      if (value === undefined) {
        delete process.env[key]
        return
      }

      process.env[key] = value
    })
  }
}

describe("Public tenant signup", () => {
  it("redirects GET requests to the configured storefront experience", async () => {
    const restoreEnv = snapshotEnv([
      "TENANT_SIGNUP_STOREFRONT_URL",
      "NEXT_PUBLIC_BASE_URL",
      "WORDPRESS_SIGNUP_URL",
      "WORDPRESS_SIGNUP_DOMAIN",
    ])

    process.env.TENANT_SIGNUP_STOREFRONT_URL = "https://front.example.com"
    delete process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.WORDPRESS_SIGNUP_URL
    delete process.env.WORDPRESS_SIGNUP_DOMAIN

    const server = startServer()

    try {
      const response = await server.request("/public/tenants/signup?tenant=acme", {
        method: "GET",
        redirect: "manual",
      })

      expect(response.status).toBe(302)
      expect(response.headers.get("location")).toBe(
        "https://front.example.com/public/tenants/signup?tenant=acme"
      )
    } finally {
      restoreEnv()
      await server.close()
    }
  })

  it("redirects WordPress network hosts to the multisite signup flow", async () => {
    const restoreEnv = snapshotEnv([
      "TENANT_SIGNUP_STOREFRONT_URL",
      "WORDPRESS_NETWORK_HOSTS",
      "WORDPRESS_SIGNUP_PATH",
      "WORDPRESS_SIGNUP_PROTOCOL",
      "WORDPRESS_SIGNUP_DOMAIN",
      "WORDPRESS_SIGNUP_URL",
    ])

    delete process.env.TENANT_SIGNUP_STOREFRONT_URL
    process.env.WORDPRESS_NETWORK_HOSTS = "network.example.com"
    process.env.WORDPRESS_SIGNUP_PATH = "/wp-signup.php"
    process.env.WORDPRESS_SIGNUP_PROTOCOL = "https"
    delete process.env.WORDPRESS_SIGNUP_DOMAIN
    delete process.env.WORDPRESS_SIGNUP_URL

    const server = startServer()

    try {
      const response = await server.request(
        "/public/tenants/signup?tenant=network-site",
        {
          method: "GET",
          headers: {
            "x-forwarded-host": "network.example.com",
            "x-forwarded-proto": "https",
          },
          redirect: "manual",
        }
      )

      expect(response.status).toBe(302)

      const location = response.headers.get("location")
      expect(location).toBeDefined()

      const url = new URL(location ?? "")
      expect(`${url.protocol}//${url.host}${url.pathname}`).toBe(
        "https://network.example.com/wp-signup.php"
      )
      expect(url.searchParams.get("new")).toBe("network-site")
      expect(url.searchParams.get("tenant")).toBe("network-site")
    } finally {
      restoreEnv()
      await server.close()
    }
  })

  it("renders a fallback HTML experience when no redirect target is configured", async () => {
    const restoreEnv = snapshotEnv([
      "TENANT_SIGNUP_STOREFRONT_URL",
      "NEXT_PUBLIC_BASE_URL",
      "WORDPRESS_SIGNUP_URL",
      "WORDPRESS_SIGNUP_DOMAIN",
      "WORDPRESS_NETWORK_HOSTS",
    ])

    delete process.env.TENANT_SIGNUP_STOREFRONT_URL
    delete process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.WORDPRESS_SIGNUP_URL
    delete process.env.WORDPRESS_SIGNUP_DOMAIN
    delete process.env.WORDPRESS_NETWORK_HOSTS

    const server = startServer()

    try {
      const response = await server.request("/public/tenants/signup?site=alpha", {
        method: "GET",
        redirect: "manual",
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/html")

      const body = await response.text()
      expect(body).toContain("Provision a Medusa storefront")
      expect(body).toContain("form method=\"post\"")
      expect(body).toContain("value=\"alpha\"")
      expect(body).toContain("name=\"planId\"")
    } finally {
      restoreEnv()
      await server.close()
    }
  })

  it("provisions tenants through the shared tenant service", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/public/tenants/signup", {
      name: "Acme Widgets",
      email: "owner@acme.io",
      password: "StrongPass123",
      planId: "starter",
    })

    expect(response.status).toBe(201)
    expect(response.body.tenant).toMatchObject({
      name: "Acme Widgets",
      subdomain: "acme-widgets.example.com",
      dbName: "db_acme_widgets",
      planId: "starter",
    })

    expect(server.tenantService.lastInput).toMatchObject({
      name: "Acme Widgets",
      adminEmail: "owner@acme.io",
      adminPassword: "StrongPass123",
      planId: "starter",
    })
    expect(server.tenantService.migrationsRan).toBe(true)
    expect(server.planService.lastChecked).toBe("starter")

    await server.close()
  })

  it("supports explicit subdomains and reflects TypeScript runtime usage", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/public/tenants/signup", {
      name: "TS Source Tenant",
      email: "ts@example.com",
      password: "AnotherStrongPass123",
      subdomain: "custom-ts",
      planId: "plus",
    })

    expect(response.status).toBe(201)
    expect(response.body.tenant).toMatchObject({
      subdomain: "custom-ts",
      dbName: "db_ts_source_tenant",
      planId: "plus",
    })
    expect(server.tenantService.lastInput).toMatchObject({
      subdomain: "custom-ts",
      planId: "plus",
    })

    await server.close()
  })

  it("returns an error when the plan identifier is missing", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/public/tenants/signup", {
      name: "No Plan Tenant",
      email: "noplan@example.com",
      password: "Password123",
    })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ message: "planId is required" })

    await server.close()
  })

  it("returns an error when the plan identifier is invalid", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/public/tenants/signup", {
      name: "Invalid Plan Tenant",
      email: "invalid-plan@example.com",
      password: "Password123",
      planId: "unknown",
    })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      type: "error",
      message: "The requested plan is not available",
    })

    await server.close()
  })
})
