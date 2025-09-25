import express, { NextFunction, Request, RequestHandler, Router } from "express"
import { randomUUID } from "crypto"
import type { AddressInfo } from "net"
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
      createdAt: now,
      updatedAt: now,
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
  const signupService = new TenantSignupService({ tenantService })
  const app = express()
  app.use(express.json())
  app.use(attachScope(signupService))

  const router = Router()
  publicTenantSignupRoutes(router)
  app.use("/public", router)

  const server = app.listen(0)
  const { port } = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${port}`

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

  return { requestJson, close, tenantService }
}

describe("Public tenant signup", () => {
  it("provisions tenants through the shared tenant service", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/public/tenants/signup", {
      name: "Acme Widgets",
      email: "owner@acme.io",
      password: "StrongPass123",
    })

    expect(response.status).toBe(201)
    expect(response.body.tenant).toMatchObject({
      name: "Acme Widgets",
      subdomain: "acme-widgets.example.com",
      dbName: "db_acme_widgets",
    })

    expect(server.tenantService.lastInput).toMatchObject({
      name: "Acme Widgets",
      adminEmail: "owner@acme.io",
      adminPassword: "StrongPass123",
    })
    expect(server.tenantService.migrationsRan).toBe(true)

    await server.close()
  })

  it("supports explicit subdomains and reflects TypeScript runtime usage", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/public/tenants/signup", {
      name: "TS Source Tenant",
      email: "ts@example.com",
      password: "AnotherStrongPass123",
      subdomain: "custom-ts",
    })

    expect(response.status).toBe(201)
    expect(response.body.tenant).toMatchObject({
      subdomain: "custom-ts",
      dbName: "db_ts_source_tenant",
    })
    expect(server.tenantService.lastInput).toMatchObject({
      subdomain: "custom-ts",
    })

    await server.close()
  })
})
