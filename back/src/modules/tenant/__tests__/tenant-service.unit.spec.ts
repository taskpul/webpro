import { EntityManager } from "typeorm"
import Tenant from "../tenant-model"
import TenantService, {
  TenantCreateInput,
  TenantServiceOptions,
} from "../tenant-service"
import {
  destroyTenantConnection,
  evictTenantMetadataCache,
} from "../../../loaders/tenant-loader"

jest.mock("../../../loaders/tenant-loader", () => ({
  evictTenantMetadataCache: jest.fn(),
  destroyTenantConnection: jest.fn().mockResolvedValue(undefined),
}))

const mockedEvictTenantMetadataCache = jest.mocked(evictTenantMetadataCache)
const mockedDestroyTenantConnection = jest.mocked(destroyTenantConnection)

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
  query: jest.fn().mockImplementation(async (sql: unknown) => {
    if (typeof sql === "string" && sql.includes("to_regclass")) {
      return { rows: [{ table_name: "public.user" }] }
    }

    return { rows: [] }
  }),
  end: jest.fn().mockResolvedValue(undefined),
})

const setupService = (
  overrides: {
    repo?: MockRepo
    manager?: MockManager
    client?: MockPgClient
    options?: Partial<TenantServiceOptions>
    migrationRunner?: jest.Mock
  } = {}
) => {
  const repo = overrides.repo ?? buildRepo()
  const manager = overrides.manager ?? buildManager(repo)
  const client = overrides.client ?? buildPgClient()
  const migrationRunner =
    overrides.migrationRunner ?? jest.fn().mockResolvedValue(undefined)

  const { migrations: overrideMigrations, ...optionOverrides } =
    overrides.options ?? {}

  const tenantServiceOptions: TenantServiceOptions = {
    ...defaultOptions,
    ...optionOverrides,
    database: {
      ...defaultOptions.database,
      ...optionOverrides?.database,
    },
    admin: {
      ...defaultOptions.admin,
      ...optionOverrides?.admin,
    },
    migrations: {
      directory: overrideMigrations?.directory ?? "/app/backend",
      medusaProjectDir:
        overrideMigrations?.medusaProjectDir ?? "/app/backend",
      runner: overrideMigrations?.runner ?? migrationRunner,
    },
  }

  const service = new TenantService({
    manager: manager as unknown as EntityManager,
    tenantServiceOptions,
    createPgClient: () => client,
  })

  return { service, manager, repo, client, migrationRunner }
}

describe("TenantService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedEvictTenantMetadataCache.mockClear()
    mockedDestroyTenantConnection.mockClear()
  })

  it("creates a tenant, database, and admin user", async () => {
    const { service, manager, repo, client, migrationRunner } = setupService()

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
    expect(tenant.subdomain).toBe("acme-corp.example.com")

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

    expect(repo.findOne).toHaveBeenCalledWith({
      where: [
        { name: "Acme Corp" },
        { subdomain: "acme-corp.example.com" },
        { dbName: "db_acme_corp" },
      ],
    })

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Acme Corp",
        subdomain: "acme-corp.example.com",
        dbName: "db_acme_corp",
      })
    )

    expect(migrationRunner).toHaveBeenCalledTimes(1)
    expect(migrationRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        directory: "/app/backend",
        databaseUrl:
          "postgres://postgres:postgres@localhost:5432/" + tenant.dbName,
      })
    )

    expect(client.connect).toHaveBeenCalled()
    expect(
      client.query.mock.calls.some(([sql]) =>
        typeof sql === "string" && sql.includes("to_regclass")
      )
    ).toBe(true)

    const insertCall = client.query.mock.calls.find(([sql]) =>
      typeof sql === "string" && sql.includes("INSERT INTO public.\"user\"")
    )

    expect(insertCall).toBeDefined()
    const [, params] = insertCall as [string, unknown[]]
    expect(typeof params?.[0]).toBe("string")
    expect(params?.[1]).toBe(payload.adminEmail.toLowerCase())
    expect(params?.[2]).not.toBe(payload.adminPassword)
  })

  it("does not recreate an existing database", async () => {
    const { service, manager, repo, client, migrationRunner } = setupService()

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
    expect(migrationRunner).toHaveBeenCalledTimes(1)
  })

  it("throws when attempting to create a duplicate tenant", async () => {
    const { service, repo, migrationRunner } = setupService()

    repo.findOne.mockResolvedValue({ id: "1" })

    await expect(
      service.create({
        name: "Demo",
        adminEmail: "demo@demo.test",
        adminPassword: "secret",
      })
    ).rejects.toThrow("Tenant with matching name, subdomain, or database already exists")

    expect(migrationRunner).not.toHaveBeenCalled()
  })

  it("slugifies provided subdomain overrides and stores the hostname", async () => {
    const { service, repo } = setupService({
      options: { rootDomain: "Sites.Test" },
    })

    repo.findOne.mockResolvedValue(null)

    const tenant = await service.create({
      name: "VIP Tenant",
      adminEmail: "owner@vip.test",
      adminPassword: "secret",
      subdomain: "VIP",
    })

    expect(tenant.subdomain).toBe("vip.sites.test")
    expect(repo.findOne).toHaveBeenCalledWith({
      where: [
        { name: "VIP Tenant" },
        { subdomain: "vip.sites.test" },
        { dbName: "db_vip_tenant" },
      ],
    })
  })

  it("rejects subdomain overrides that do not contain alphanumeric characters", async () => {
    const { service, repo, migrationRunner } = setupService()

    repo.findOne.mockResolvedValue(null)

    await expect(
      service.create({
        name: "Bad Tenant",
        adminEmail: "owner@bad.test",
        adminPassword: "secret",
        subdomain: "!!!",
      })
    ).rejects.toThrow("Subdomain slug must include alphanumeric characters")

    expect(migrationRunner).not.toHaveBeenCalled()
  })

  it("throws when Medusa schema is missing after migrations", async () => {
    const client = buildPgClient()
    client.query.mockImplementation(async (sql: unknown) => {
      if (typeof sql === "string" && sql.includes("to_regclass")) {
        return { rows: [{ table_name: null }] }
      }

      return { rows: [] }
    })

    const { service, repo, migrationRunner, client: injectedClient } =
      setupService({
        client,
      })

    repo.findOne.mockResolvedValue(null)

    await expect(
      service.create({
        name: "Broken",
        adminEmail: "broken@acme.test",
        adminPassword: "secret",
      })
    ).rejects.toThrow("Medusa migrations did not create the expected user table")

    expect(migrationRunner).toHaveBeenCalledTimes(1)
    expect(injectedClient.end).toHaveBeenCalled()
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

  it("evicts tenant caches and destroys connections when deleting a tenant", async () => {
    const { service, repo } = setupService()

    const tenant = {
      id: "tenant-id",
      name: "Tenant",
      dbName: "db_tenant",
      subdomain: "tenant.example.com",
    } as Tenant

    repo.findOne.mockResolvedValue(tenant)
    repo.remove.mockResolvedValue(tenant)

    await service.delete({ id: tenant.id })

    expect(mockedEvictTenantMetadataCache).toHaveBeenCalledWith(
      "tenant.example.com"
    )
    expect(mockedDestroyTenantConnection).toHaveBeenCalledWith("db_tenant")
  })

  it("lists tenants using the repository", async () => {
    const { service, repo } = setupService()
    const tenants = [{ id: "1" }]
    repo.find.mockResolvedValue(tenants)

    const result = await service.list()
    expect(result).toBe(tenants)
  })
})
