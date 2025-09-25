import express, { Request, Response, NextFunction } from "express"
import type { AddressInfo } from "net"
import { randomUUID } from "crypto"
import * as childProcess from "child_process"
import tenantRoutes from "../../src/api/routes/tenant"
import { TENANT_SERVICE } from "../../src/modules/tenant"
import type Tenant from "../../src/modules/tenant/tenant-model"
import TenantService, {
  TenantServiceOptions,
} from "../../src/modules/tenant/tenant-service"
import type { EntityManager } from "typeorm"

type ScopedRequest = Request & {
  scope: { resolve: <T = unknown>(registration: string) => T }
}

type MockEntityManager = {
  query: jest.Mock<Promise<unknown>, [string, unknown?]>
  getRepository: jest.Mock
}

type MockPgClient = {
  connect: jest.Mock<Promise<void>, []>
  query: jest.Mock<Promise<unknown>, [string, unknown?]>
  end: jest.Mock<Promise<void>, []>
}

class InMemoryTenantRepository {
  public records: Tenant[] = []

  create = jest.fn((data: Partial<Tenant>) => ({ ...data } as Tenant))

  save = jest.fn(async (tenant: Partial<Tenant>) => {
    const now = new Date()
    const index = tenant.id
      ? this.records.findIndex((record) => record.id === tenant.id)
      : -1

    if (index >= 0) {
      const existing = this.records[index]
      const updated = {
        ...existing,
        ...tenant,
        updatedAt: now,
      } as Tenant
      this.records[index] = updated
      return updated
    }

    const created: Tenant = {
      id: (tenant.id as string) ?? randomUUID(),
      name: tenant.name as string,
      subdomain: tenant.subdomain as string,
      dbName: tenant.dbName as string,
      createdAt: now,
      updatedAt: now,
    }
    this.records.push(created)
    return created
  })

  findOne = jest.fn(
    async ({ where }: { where: Array<Partial<Tenant>> | Partial<Tenant> }) => {
      const conditions = Array.isArray(where) ? where : [where]
      const record = this.records.find((tenant) =>
        conditions.some((condition) =>
          Object.entries(condition).every(([key, value]) => {
            if (value === undefined) {
              return true
            }
            return (
              (tenant as unknown as Record<string, unknown>)[key] === value
            )
          })
        )
      )
      return record ?? null
    }
  )

  find = jest.fn(async () => {
    return [...this.records].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )
  })

  remove = jest.fn(async (tenant: Tenant) => {
    this.records = this.records.filter((record) => record.id !== tenant.id)
    return tenant
  })
}

type TenantModuleTestContext = {
  service: TenantService
  repo: InMemoryTenantRepository
  manager: MockEntityManager
  migrationRunner: jest.Mock
  client: MockPgClient
  clientDatabases: string[]
  insertedUsers: unknown[][]
}

const buildTenantModuleContext = (): TenantModuleTestContext => {
  const repo = new InMemoryTenantRepository()
  const createdDatabases = new Set<string>()

  const manager: MockEntityManager = {
    query: jest.fn(async (sql: string, params?: unknown) => {
      if (sql.includes("SELECT 1 FROM pg_database")) {
        const [dbName] = (params as unknown[]) ?? []
        if (typeof dbName === "string" && createdDatabases.has(dbName)) {
          return [{ exists: 1 }]
        }
        return []
      }

      if (sql.startsWith("CREATE DATABASE")) {
        const match = sql.match(/\"([^\"]+)\"/)
        if (match) {
          createdDatabases.add(match[1])
        }
        return []
      }

      if (sql.startsWith("DROP DATABASE IF EXISTS")) {
        const match = sql.match(/\"([^\"]+)\"/)
        if (match) {
          createdDatabases.delete(match[1])
        }
        return []
      }

      return []
    }),
    getRepository: jest.fn().mockReturnValue(repo),
  }

  const migrationRunner = jest.fn().mockResolvedValue(undefined)
  const clientDatabases: string[] = []
  const insertedUsers: unknown[][] = []

  const client: MockPgClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(async (sql: string, params?: unknown) => {
      if (sql.includes("to_regclass")) {
        return { rows: [{ table_name: "public.user" }] }
      }

      if (sql.includes('INSERT INTO public."user"')) {
        insertedUsers.push((params as unknown[]) ?? [])
      }

      return { rows: [] }
    }),
    end: jest.fn().mockResolvedValue(undefined),
  }

  const options: TenantServiceOptions = {
    rootDomain: "example.com",
    database: {
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: "postgres",
    },
    admin: {
      role: "admin",
      promoteToSuperAdmin: true,
      bcryptSaltRounds: 4,
    },
    migrations: {
      directory: "/workspace/backend",
      medusaProjectDir: "/workspace/backend",
      runner: migrationRunner,
    },
  }

  const service = new TenantService({
    manager: manager as unknown as EntityManager,
    tenantServiceOptions: options,
    createPgClient: (database: string) => {
      clientDatabases.push(database)
      return client
    },
  })

  return {
    service,
    repo,
    manager,
    migrationRunner,
    client,
    clientDatabases,
    insertedUsers,
  }
}

const attachScope = (service: TenantService) => {
  return (req: ScopedRequest, _res: Response, next: NextFunction) => {
    req.scope = {
      resolve: <T = unknown>(registration: string) => {
        if (registration === TENANT_SERVICE) {
          return service as unknown as T
        }
        throw new Error(`Unknown registration: ${registration}`)
      },
    }
    next()
  }
}

const createApp = () => {
  const context = buildTenantModuleContext()
  const app = express()
  app.use(express.json())
  app.use(attachScope(context.service))
  tenantRoutes(app)

  return { app, ...context }
}

const startServer = () => {
  const { app, ...context } = createApp()
  const server = app.listen(0)
  const execSpy = jest
    .spyOn(childProcess, "execSync")
    .mockImplementation(() => {
      throw new Error("Shell commands are not allowed during tenant provisioning")
    })

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
    execSpy.mockRestore()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  return { requestJson, close, execSpy, ...context }
}

describe("Tenants API", () => {
  it("rejects requests without super admin header", async () => {
    const server = startServer()

    try {
      const response = await server.requestJson("POST", "/tenants", {
        name: "tenant-one",
        adminEmail: "owner@example.com",
        adminPassword: "password123",
      })

      expect(response.status).toBe(403)
      expect(response.body).toMatchObject({ message: "Super admin only" })
    } finally {
      await server.close()
    }
  })

  it("validates tenant payload", async () => {
    const server = startServer()

    try {
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
    } finally {
      await server.close()
    }
  })

  it("provisions tenants using the module service without shell commands", async () => {
    const server = startServer()
    const { repo, migrationRunner, manager, client, clientDatabases, insertedUsers, execSpy } = server

    try {
      const createResponse = await server.requestJson(
        "POST",
        "/tenants",
        {
          name: "Tenant One",
          adminEmail: "Admin@Tenant-One.com",
          adminPassword: "password123",
          subdomain: "tenant-one",
        },
        { "x-test-super-admin": "admin-1" }
      )

      expect(createResponse.status).toBe(201)
      const tenantId = createResponse.body.tenant.id
      expect(createResponse.body.tenant).toMatchObject({
        name: "Tenant One",
        subdomain: "tenant-one.example.com",
      })

      expect(repo.records).toHaveLength(1)
      const [record] = repo.records
      expect(record).toMatchObject({
        id: tenantId,
        name: "Tenant One",
        subdomain: "tenant-one.example.com",
        dbName: "db_tenant_one",
      })
      expect(record.createdAt).toBeInstanceOf(Date)
      expect(record.updatedAt).toBeInstanceOf(Date)

      expect(clientDatabases).toContain("db_tenant_one")
      expect(client.connect).toHaveBeenCalled()
      expect(client.end).toHaveBeenCalled()

      expect(migrationRunner).toHaveBeenCalledTimes(1)
      expect(
        manager.query.mock.calls.some(
          ([sql]) => typeof sql === "string" && sql.includes('CREATE DATABASE "db_tenant_one"')
        )
      ).toBe(true)

      expect(insertedUsers).toHaveLength(1)
      const [insertParams] = insertedUsers
      expect(insertParams?.[1]).toBe("admin@tenant-one.com")
      expect(insertParams?.[2]).not.toBe("password123")

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
        subdomain: "tenant-one.example.com",
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

      expect(repo.records).toHaveLength(0)
      expect(
        manager.query.mock.calls.some(
          ([sql]) =>
            typeof sql === "string" &&
            sql.includes('DROP DATABASE IF EXISTS "db_tenant_one"')
        )
      ).toBe(true)

      expect(execSpy).not.toHaveBeenCalled()
    } finally {
      await server.close()
    }
  })
})
