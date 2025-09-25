import { EntityManager } from "typeorm"
import Tenant from "../tenant-model"
import TenantService, {
  TenantCreateInput,
  TenantServiceOptions,
} from "../tenant-service"

type MockRepo = {
  create: jest.Mock
  save: jest.Mock
  findOne: jest.Mock
  find: jest.Mock
  remove: jest.Mock
}

type MockManager = Pick<EntityManager, "query" | "getRepository"> & {
  query: jest.Mock
  getRepository: jest.Mock
}

type MockPgClient = {
  connect: jest.Mock
  query: jest.Mock
  end: jest.Mock
}

const buildRepo = (): MockRepo => ({
  create: jest.fn((data) => ({ id: "tenant-id", ...data })),
  save: jest.fn(async (tenant) => ({ ...tenant, id: tenant.id ?? "tenant-id" })),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
})

const buildManager = (repo: MockRepo): MockManager => {
  return {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockReturnValue(repo),
  } as unknown as MockManager
}

const defaultOptions: TenantServiceOptions = {
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
}

const buildPgClient = (): MockPgClient => ({
  connect: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined),
})

const setupService = (
  overrides: {
    repo?: MockRepo
    manager?: MockManager
    client?: MockPgClient
    options?: Partial<TenantServiceOptions>
  } = {}
) => {
  const repo = overrides.repo ?? buildRepo()
  const manager = overrides.manager ?? buildManager(repo)
  const client = overrides.client ?? buildPgClient()

  const tenantServiceOptions = overrides.options
    ? {
        ...defaultOptions,
        ...overrides.options,
        database: {
          ...defaultOptions.database,
          ...overrides.options.database,
        },
        admin: {
          ...defaultOptions.admin,
          ...overrides.options.admin,
        },
      }
    : defaultOptions

  const service = new TenantService({
    manager: manager as unknown as EntityManager,
    tenantServiceOptions,
    createPgClient: () => client,
  })

  return { service, manager, repo, client }
}

describe("TenantService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("creates a tenant, database, and admin user", async () => {
    const { service, manager, repo, client } = setupService()

    const managerQuery = manager.query as jest.Mock
    managerQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT 1 FROM pg_database")) {
        return []
      }
      return []
    })

    repo.findOne.mockResolvedValue(null)

    const payload: TenantCreateInput = {
      name: "Acme Corp",
      adminEmail: "admin@acme.test",
      adminPassword: "secret",
    }

    const tenant = await service.create(payload)

    expect(tenant.name).toBe("Acme Corp")
    expect(tenant.dbName).toBe("db_acme_corp")

    expect(managerQuery).toHaveBeenCalledWith(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
    )
    expect(
      managerQuery.mock.calls.some(([sql]) =>
        typeof sql === "string" && sql.includes("CREATE TABLE IF NOT EXISTS tenant")
      )
    ).toBe(true)
    expect(managerQuery).toHaveBeenCalledWith(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [tenant.dbName]
    )

    expect(client.connect).toHaveBeenCalled()
    expect(
      client.query.mock.calls.some(([sql]) =>
        typeof sql === "string" && sql.includes("CREATE TABLE IF NOT EXISTS public.\"user\"")
      )
    ).toBe(true)

    const insertCall = client.query.mock.calls.find(([sql]) =>
      typeof sql === "string" && sql.includes("INSERT INTO public.\"user\"")
    )

    expect(insertCall).toBeDefined()
    const [, params] = insertCall as [string, unknown[]]
    expect(params?.[0]).toBe(payload.adminEmail)
    expect(params?.[1]).not.toBe(payload.adminPassword)
  })

  it("does not recreate an existing database", async () => {
    const { service, manager, repo, client } = setupService()

    const managerQuery = manager.query as jest.Mock
    managerQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT 1 FROM pg_database")) {
        return [{ exists: 1 }]
      }
      return []
    })

    repo.findOne.mockResolvedValue(null)

    await service.create({
      name: "Demo",
      adminEmail: "demo@demo.test",
      adminPassword: "secret",
    })

    expect(
      managerQuery.mock.calls.filter(([sql]) =>
        typeof sql === "string" && sql.startsWith("CREATE DATABASE")
      ).length
    ).toBe(0)
    expect(client.connect).toHaveBeenCalled()
  })

  it("throws when attempting to create a duplicate tenant", async () => {
    const { service, repo } = setupService()

    repo.findOne.mockResolvedValue({ id: "1" })

    await expect(
      service.create({
        name: "Demo",
        adminEmail: "demo@demo.test",
        adminPassword: "secret",
      })
    ).rejects.toThrow("Tenant with matching name, subdomain, or database already exists")
  })

  it("drops the database when deleting a tenant", async () => {
    const { service, manager, repo } = setupService()

    const tenant = { id: "1", name: "Demo", dbName: "db_demo" } as Tenant
    repo.findOne.mockResolvedValue(tenant)
    repo.remove.mockResolvedValue(tenant)

    await service.delete({ id: tenant.id })

    expect(repo.remove).toHaveBeenCalledWith(tenant)
    expect(manager.query).toHaveBeenCalledWith(
      'DROP DATABASE IF EXISTS "db_demo";'
    )
  })

  it("lists tenants using the repository", async () => {
    const { service, repo } = setupService()
    const tenants = [{ id: "1" }]
    repo.find.mockResolvedValue(tenants)

    const result = await service.list()
    expect(result).toBe(tenants)
  })
})
