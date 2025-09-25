import express, { Request, Response, NextFunction } from "express"
import { randomUUID } from "crypto"
import type { AddressInfo } from "net"
import tenantRoutes from "../../src/api/routes/tenant"
import type {
  TenantCreateInput,
  TenantDeleteInput,
} from "../../src/modules/tenant/tenant-service"

type TenantRecord = {
  id: string
  name: string
  subdomain: string
  dbName: string
}

class InMemoryTenantService {
  private tenants: TenantRecord[] = []

  reset() {
    this.tenants = []
  }

  async list(): Promise<TenantRecord[]> {
    return this.tenants.map((tenant) => ({ ...tenant }))
  }

  async create(input: TenantCreateInput): Promise<TenantRecord> {
    const id = randomUUID()
    const name = input.name
    const subdomain = input.subdomain ?? `${name}.example.com`
    const dbName = input.dbName ?? `db_${name.replace(/[^a-z0-9]+/gi, "_")}`

    const record: TenantRecord = { id, name, subdomain, dbName }
    this.tenants.push(record)
    return { ...record }
  }

  async delete(
    input: TenantDeleteInput
  ): Promise<{ id: string; name: string }> {
    const index = this.tenants.findIndex((tenant) => {
      if (input.id) {
        return tenant.id === input.id
      }
      return tenant.name === input.name
    })

    if (index < 0) {
      throw new Error("Tenant not found")
    }

    const [tenant] = this.tenants.splice(index, 1)
    return { id: tenant.id, name: tenant.name }
  }
}

type ScopedRequest = Request & {
  scope: { resolve: (registration: string) => unknown }
}

const attachScope = (service: InMemoryTenantService) => {
  return (req: ScopedRequest, _res: Response, next: NextFunction) => {
    req.scope = {
      resolve: (registration: string) => {
        if (registration === "tenantService") {
          return service
        }
        throw new Error(`Unknown registration: ${registration}`)
      },
    }
    next()
  }
}

const createApp = () => {
  const service = new InMemoryTenantService()
  const app = express()
  app.use(express.json())
  app.use(attachScope(service))
  tenantRoutes(app)

  return { app, service }
}

const startServer = () => {
  const { app, service } = createApp()
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

  return { requestJson, close, service }
}

describe("Tenants API", () => {
  it("rejects requests without super admin header", async () => {
    const server = startServer()

    const response = await server.requestJson("POST", "/tenants", {
      name: "tenant-one",
      adminEmail: "owner@example.com",
      adminPassword: "password123",
    })

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({ message: "Super admin only" })

    await server.close()
  })

  it("validates tenant payload", async () => {
    const server = startServer()

    const response = await server.requestJson(
      "POST",
      "/tenants",
      {
        name: " ",
        adminEmail: "invalid-email",
        adminPassword: "123",
      },
      { "x-test-super-admin": "admin-1" }
    )

    expect(response.status).toBe(400)
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        "Tenant name is required",
        "A valid admin email is required",
        "Admin password must be at least 8 characters long",
      ])
    )

    await server.close()
  })

  it("allows super admins to perform tenant CRUD", async () => {
    const server = startServer()
    const { service } = server
    service.reset()

    const createResponse = await server.requestJson(
      "POST",
      "/tenants",
      {
        name: "Tenant One",
        adminEmail: "admin@tenant-one.com",
        adminPassword: "password123",
        subdomain: "tenant-one",
      },
      { "x-test-super-admin": "admin-1" }
    )

    expect(createResponse.status).toBe(201)
    const tenantId = createResponse.body.tenant.id
    expect(createResponse.body.tenant).toMatchObject({
      name: "Tenant One",
      subdomain: "tenant-one",
    })

    const listResponse = await server.requestJson(
      "GET",
      "/tenants",
      undefined,
      { "x-test-super-admin": "admin-1" }
    )

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.tenants).toHaveLength(1)
    expect(listResponse.body.tenants[0]).toMatchObject({
      id: tenantId,
      name: "Tenant One",
    })

    const deleteResponse = await server.requestJson(
      "DELETE",
      `/tenants/${tenantId}`,
      undefined,
      { "x-test-super-admin": "admin-1" }
    )

    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body.deleted).toEqual({
      id: tenantId,
      name: "Tenant One",
    })

    const listAfterDelete = await server.requestJson(
      "GET",
      "/tenants",
      undefined,
      { "x-test-super-admin": "admin-1" }
    )

    expect(listAfterDelete.status).toBe(200)
    expect(listAfterDelete.body.tenants).toEqual([])

    await server.close()
  })
})
