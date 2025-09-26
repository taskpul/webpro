import path from "path"
import type { Request, Response, NextFunction } from "express"

type QueryHandlerMap = Record<string, jest.Mock>
type ManagerMap = Record<string, unknown>

type MockDataSourceOptions = {
  url?: string
  entities?: string[]
  migrations?: string[]
}

type MockedDataSourceInstance = {
  isInitialized: boolean
  manager: unknown
  options: MockDataSourceOptions
  initialize: jest.Mock
  query: jest.Mock
  destroy: jest.Mock
}

const queryHandlers: QueryHandlerMap = {}
const managers: ManagerMap = {}
const dataSources: Record<string, MockedDataSourceInstance> = {}

jest.mock("typeorm", () => {
  class MockDataSource {
    public isInitialized = false
    public manager: unknown
    public readonly options: MockDataSourceOptions
    private readonly name: string

    constructor(options: MockDataSourceOptions = {}) {
      this.options = options
      const url = options?.url ?? ""
      const segments = url.split("/")
      this.name = segments[segments.length - 1] || url
      this.manager = managers[this.name] ?? { db: this.name }
      dataSources[this.name] = this as unknown as MockedDataSourceInstance
    }

    initialize = jest.fn().mockImplementation(async () => {
      this.isInitialized = true
      return this
    })

    query = jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      const handler = queryHandlers[this.name]

      if (!handler) {
        return Promise.resolve([])
      }

      const result = handler(sql, params)
      return result instanceof Promise ? result : Promise.resolve(result)
    })

    destroy = jest.fn().mockImplementation(async () => {
      this.isInitialized = false
    })
  }

  return {
    DataSource: jest.fn((options: { url?: string }) => new MockDataSource(options)),
  }
})

const loadTenantLoader = async () => {
  const module = await import("../tenant-loader")
  return module
}

const buildRequest = (host: string) => {
  return {
    headers: { host },
    scope: { register: jest.fn() },
  } as unknown as Request & { scope: { register: jest.Mock } }
}

describe("tenantMiddleware", () => {
  const originalEnv = { ...process.env }

  const envKeys = [
    "DB_USER",
    "DB_PASS",
    "DB_HOST",
    "DB_PORT",
    "MAIN_DB",
    "ROOT_DOMAIN",
    "WP_NETWORK_HOSTS",
    "TENANT_ENTITIES_GLOB",
    "TENANT_ENTITY_GLOB",
    "TENANT_ENTITIES_PATH",
    "TENANT_MIGRATIONS_GLOB",
    "TENANT_MIGRATION_GLOB",
    "TENANT_MIGRATIONS_PATH",
  ]

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    for (const key of Object.keys(queryHandlers)) {
      delete queryHandlers[key]
    }

    for (const key of Object.keys(managers)) {
      delete managers[key]
    }

    for (const key of Object.keys(dataSources)) {
      delete dataSources[key]
    }

    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }

    process.env.DB_USER = "postgres"
    process.env.DB_PASS = "postgres"
    process.env.DB_HOST = "localhost"
    process.env.DB_PORT = "5432"
    process.env.MAIN_DB = "db_main"
    process.env.ROOT_DOMAIN = "example.com"
    process.env.WP_NETWORK_HOSTS = "network"
  })

  afterAll(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  it("passes through for localhost", async () => {
    const { tenantMiddleware } = await loadTenantLoader()
    const req = buildRequest("localhost:9000")
    const next = jest.fn()

    await tenantMiddleware(req, {} as Response, next as unknown as NextFunction)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.scope.register).not.toHaveBeenCalled()
  })

  it("skips lookup for apex domain", async () => {
    queryHandlers.db_main = jest.fn().mockResolvedValue([])

    const { tenantMiddleware } = await loadTenantLoader()
    const req = buildRequest("example.com")
    const next = jest.fn()

    await tenantMiddleware(req, {} as Response, next as unknown as NextFunction)

    expect(queryHandlers.db_main).not.toHaveBeenCalled()
    expect(req.scope.register).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("skips lookup for network admin host", async () => {
    queryHandlers.db_main = jest.fn().mockResolvedValue([])

    const { tenantMiddleware } = await loadTenantLoader()
    const req = buildRequest("network.example.com")
    const next = jest.fn()

    await tenantMiddleware(req, {} as Response, next as unknown as NextFunction)

    expect(queryHandlers.db_main).not.toHaveBeenCalled()
    expect(req.scope.register).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("registers tenant manager for valid subdomain", async () => {
    const manager = { id: "tenant-manager" }
    managers.db_tenant = manager

    queryHandlers.db_main = jest.fn().mockResolvedValue([
      { subdomain: "acme.example.com", db_name: "db_tenant" },
    ])

    const { tenantMiddleware } = await loadTenantLoader()
    const req = buildRequest("acme.example.com")
    const next = jest.fn()

    await tenantMiddleware(req, {} as Response, next as unknown as NextFunction)

    expect(queryHandlers.db_main).toHaveBeenCalledTimes(1)
    expect(req.scope.register).toHaveBeenCalledWith({ manager })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("caches failed lookups to allow passthrough", async () => {
    const handler = jest.fn().mockResolvedValue([])
    queryHandlers.db_main = handler

    const { tenantMiddleware } = await loadTenantLoader()
    const host = "unknown.example.com"

    const firstReq = buildRequest(host)
    const secondReq = buildRequest(host)
    const firstNext = jest.fn()
    const secondNext = jest.fn()

    await tenantMiddleware(firstReq, {} as Response, firstNext as unknown as NextFunction)
    await tenantMiddleware(secondReq, {} as Response, secondNext as unknown as NextFunction)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(firstReq.scope.register).not.toHaveBeenCalled()
    expect(secondReq.scope.register).not.toHaveBeenCalled()
    expect(firstNext).toHaveBeenCalledTimes(1)
    expect(secondNext).toHaveBeenCalledTimes(1)
  })

  it("derives TypeScript ORM globs by default", async () => {
    const { getTenantConnection } = await loadTenantLoader()

    await getTenantConnection("db_main")

    const dataSource = dataSources.db_main
    expect(dataSource).toBeDefined()
    expect(
      dataSource?.options.entities?.some((glob) => glob.includes("src/modules"))
    ).toBe(true)
    expect(
      dataSource?.options.entities?.some((glob) => glob.includes("**/*.ts"))
    ).toBe(true)
    expect(
      dataSource?.options.migrations?.some((glob) => glob.includes("migrations"))
    ).toBe(true)
    expect(
      dataSource?.options.migrations?.some((glob) => glob.includes("**/*.sql"))
    ).toBe(true)
  })

  it("allows overriding ORM globs via environment variables", async () => {
    process.env.TENANT_ENTITIES_GLOB = "build/server/entities/**/*.js"
    process.env.TENANT_MIGRATIONS_GLOB = "/var/bundles/migrations/*.js"

    const { getTenantConnection } = await loadTenantLoader()

    await getTenantConnection("db_override")

    const dataSource = dataSources.db_override
    expect(dataSource?.options.entities).toEqual([
      path.resolve(process.cwd(), "build/server/entities/**/*.js"),
    ])
    expect(dataSource?.options.migrations).toEqual([
      "/var/bundles/migrations/*.js",
    ])
  })

  it("generates compiled runtime ORM globs", async () => {
    const { resolveTenantOrmPaths } = await loadTenantLoader()
    const env = {
      MEDUSA_PROJECT_DIR: "/srv/medusa",
    } as NodeJS.ProcessEnv

    const { entities, migrations } = resolveTenantOrmPaths({
      env,
      loaderDir: "/srv/medusa/.medusa/server/src/loaders",
    })

    expect(entities).toEqual(
      expect.arrayContaining([
        path.join("/srv/medusa/.medusa/server", "src/modules/**/*.js"),
      ])
    )
    expect(entities).toEqual(
      expect.not.arrayContaining([expect.stringContaining("**/*.ts")])
    )
    expect(migrations).toEqual(
      expect.arrayContaining([
        path.join("/srv/medusa/.medusa/server", "migrations/**/*.js"),
        path.join("/srv/medusa", "migrations/**/*.js"),
      ])
    )
  })

  it("evicts cached tenant metadata and destroys connections", async () => {
    const manager = { id: "tenant-manager" }
    managers.db_tenant = manager

    const metadataHandler = jest
      .fn()
      .mockResolvedValue([
        { subdomain: "tenant.example.com", db_name: "db_tenant" },
      ])

    queryHandlers.db_main = metadataHandler

    const {
      tenantMiddleware,
      evictTenantMetadataCache,
      destroyTenantConnection,
    } = await loadTenantLoader()

    const host = "tenant.example.com"

    const firstReq = buildRequest(host)
    const firstNext = jest.fn()
    await tenantMiddleware(firstReq, {} as Response, firstNext as unknown as NextFunction)

    expect(metadataHandler).toHaveBeenCalledTimes(1)
    const initialDataSource = dataSources.db_tenant
    expect(initialDataSource).toBeDefined()
    expect(initialDataSource?.initialize).toHaveBeenCalledTimes(1)

    const secondReq = buildRequest(host)
    await tenantMiddleware(secondReq, {} as Response, jest.fn() as unknown as NextFunction)
    expect(metadataHandler).toHaveBeenCalledTimes(1)

    evictTenantMetadataCache(host)
    await destroyTenantConnection("db_tenant")

    expect(initialDataSource?.destroy).toHaveBeenCalledTimes(1)

    const thirdReq = buildRequest(host)
    await tenantMiddleware(thirdReq, {} as Response, jest.fn() as unknown as NextFunction)

    expect(metadataHandler).toHaveBeenCalledTimes(2)
    const refreshedDataSource = dataSources.db_tenant
    expect(refreshedDataSource).toBeDefined()
    expect(refreshedDataSource).not.toBe(initialDataSource)
    expect(refreshedDataSource?.initialize).toHaveBeenCalledTimes(1)
  })
})
