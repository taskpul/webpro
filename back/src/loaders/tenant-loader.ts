import path from "path"
import { DataSource } from "typeorm"
import { Request, Response, NextFunction } from "express"
import { MedusaError } from "medusa-core-utils"

type TenantRecord = {
  db_name: string
  subdomain: string
}

const connections: Record<string, DataSource> = {}
const tenantMetadataCache = new Map<string, TenantRecord | null>()

type TenantOrmPaths = {
  entities: string[]
  migrations: string[]
}

const DEFAULT_NETWORK_PREFIXES = ["network", "wordpress", "wp-admin", "wpadmin"]

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])

const parseList = (value?: string | null) =>
  (value ? value.split(",") : [])
    .map((prefix) => prefix.trim().toLowerCase())
    .filter((prefix) => prefix.length > 0)

const reservedPrefixes = new Set<string>([
  "www",
  ...DEFAULT_NETWORK_PREFIXES,
  ...parseList(process.env.WP_NETWORK_HOSTS),
  ...parseList(process.env.NON_TENANT_PREFIXES),
])

const normalizeHost = (rawHost?: string | null) => {
  if (!rawHost) {
    return ""
  }

  const trimmed = rawHost.trim().toLowerCase()
  if (!trimmed) {
    return ""
  }

  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    return trimmed.slice(0, trimmed.indexOf("]") + 1)
  }

  const portSeparatorIndex = trimmed.indexOf(":")
  if (portSeparatorIndex === -1) {
    return trimmed
  }

  return trimmed.slice(0, portSeparatorIndex)
}

const extractSubdomain = (host: string, rootDomain?: string) => {
  if (!host || loopbackHosts.has(host)) {
    return null
  }

  const normalizedRoot = rootDomain?.toLowerCase().trim()

  if (normalizedRoot && host === normalizedRoot) {
    return null
  }

  const normalizedHost = host.endsWith(".") ? host.slice(0, -1) : host

  if (normalizedRoot && normalizedHost.endsWith(`.${normalizedRoot}`)) {
    const hostParts = normalizedHost.split(".")
    const rootParts = normalizedRoot.split(".")

    if (hostParts.length <= rootParts.length) {
      return null
    }

    const subParts = hostParts.slice(0, hostParts.length - rootParts.length)
    const [firstLabel] = subParts

    if (!firstLabel || reservedPrefixes.has(firstLabel)) {
      return null
    }

    return subParts.join(".")
  }

  const hostParts = normalizedHost.split(".")

  if (hostParts.length <= 1) {
    return null
  }

  const [firstLabel] = hostParts

  if (reservedPrefixes.has(firstLabel)) {
    return null
  }

  if (normalizedRoot && hostParts.slice(1).join(".") !== normalizedRoot) {
    return null
  }

  return firstLabel
}

const buildLookupKey = (subdomain: string, rootDomain?: string) =>
  rootDomain ? `${subdomain}.${rootDomain}` : subdomain

const parseGlobOverrides = (value?: string | null) =>
  (value ? value.split(",") : [])
    .map((glob) => glob.trim())
    .filter((glob) => glob.length > 0)

const isCompiledRuntime = (loaderDir: string) => {
  const normalized = path.resolve(loaderDir)
  const segments = normalized.split(path.sep).filter(Boolean)
  const medusaIndex = segments.lastIndexOf(".medusa")

  if (medusaIndex === -1) {
    return false
  }

  return segments[medusaIndex + 1] === "server"
}

const pushUnique = (target: string[], value: string) => {
  if (!target.includes(value)) {
    target.push(value)
  }
}

const resolveTenantOrmPathsInternal = (
  env: NodeJS.ProcessEnv,
  loaderDir: string
): TenantOrmPaths => {
  const loaderRoot = path.resolve(loaderDir, "..", "..")
  const compiledRuntime = isCompiledRuntime(loaderDir)
  const projectRoot = env.MEDUSA_PROJECT_DIR
    ? path.resolve(env.MEDUSA_PROJECT_DIR)
    : compiledRuntime
    ? path.resolve(loaderRoot, "..")
    : loaderRoot

  const baseCandidates = Array.from(
    new Set(
      [
        loaderRoot,
        projectRoot,
        path.join(projectRoot, ".medusa", "server"),
        path.join(projectRoot, "dist"),
        path.join(projectRoot, "build"),
        process.cwd(),
      ].map((candidate) => path.resolve(candidate))
    )
  )

  const entityExtensions = compiledRuntime ? ["js", "cjs"] : ["ts", "js", "cjs"]
  const migrationExtensions = Array.from(new Set([...entityExtensions, "sql"]))

  const entityDirectories: string[][] = [
    ["src", "models"],
    ["src", "modules"],
    ["models"],
    ["modules"],
  ]

  const migrationDirectories: string[][] = [
    ["migrations"],
    ["src", "migrations"],
  ]

  const entities: string[] = []
  const migrations: string[] = []

  for (const base of baseCandidates) {
    for (const segments of entityDirectories) {
      for (const ext of entityExtensions) {
        pushUnique(entities, path.join(base, ...segments, `**/*.${ext}`))
      }
    }

    for (const segments of migrationDirectories) {
      for (const ext of migrationExtensions) {
        pushUnique(migrations, path.join(base, ...segments, `**/*.${ext}`))
      }
    }
  }

  const projectRelative = (glob: string) =>
    path.isAbsolute(glob) ? glob : path.resolve(projectRoot, glob)

  const entityOverrides = parseGlobOverrides(
    env.TENANT_ENTITIES_GLOB ?? env.TENANT_ENTITY_GLOB ?? env.TENANT_ENTITIES_PATH
  ).map(projectRelative)

  const migrationOverrides = parseGlobOverrides(
    env.TENANT_MIGRATIONS_GLOB ??
      env.TENANT_MIGRATION_GLOB ??
      env.TENANT_MIGRATIONS_PATH
  ).map(projectRelative)

  return {
    entities: entityOverrides.length > 0 ? entityOverrides : entities,
    migrations: migrationOverrides.length > 0 ? migrationOverrides : migrations,
  }
}

export type ResolveTenantOrmPathsOptions = {
  env?: NodeJS.ProcessEnv
  loaderDir?: string
}

export const resolveTenantOrmPaths = (
  options: ResolveTenantOrmPathsOptions = {}
): TenantOrmPaths => {
  const env = options.env ?? process.env
  const loaderDir = options.loaderDir ?? __dirname

  return resolveTenantOrmPathsInternal(env, loaderDir)
}

let cachedTenantOrmPaths: TenantOrmPaths | null = null

const getTenantOrmPaths = () => {
  if (!cachedTenantOrmPaths) {
    cachedTenantOrmPaths = resolveTenantOrmPaths()
  }

  return cachedTenantOrmPaths
}

async function getTenantMetadata(lookupKey: string) {
  if (tenantMetadataCache.has(lookupKey)) {
    return tenantMetadataCache.get(lookupKey) ?? null
  }

  const mainDbName = process.env.MAIN_DB

  if (!mainDbName) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "MAIN_DB environment variable must be configured for tenant resolution"
    )
  }

  const mainDb = await getTenantConnection(mainDbName)
  const result = await mainDb.query(`SELECT * FROM tenant WHERE subdomain=$1 LIMIT 1`, [
    lookupKey,
  ])

  const tenant = (result?.[0] as TenantRecord | undefined) ?? null
  tenantMetadataCache.set(lookupKey, tenant)

  return tenant
}

export async function getTenantConnection(dbName: string) {
  if (connections[dbName] && connections[dbName].isInitialized) {
    return connections[dbName]
  }

  const ormPaths = getTenantOrmPaths()

  const dataSource = new DataSource({
    type: "postgres",
    url: `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`,
    entities: ormPaths.entities,
    migrations: ormPaths.migrations,
    synchronize: false,
    logging: false,
  })

  await dataSource.initialize()
  connections[dbName] = dataSource

  return dataSource
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const normalizedHost = normalizeHost(req.headers.host)
  const rootDomain = process.env.ROOT_DOMAIN?.toLowerCase().trim()
  const subdomain = extractSubdomain(normalizedHost, rootDomain)

  if (!subdomain) {
    return next()
  }

  const lookupKey = buildLookupKey(subdomain, rootDomain)

  let tenant: TenantRecord | null

  try {
    tenant = await getTenantMetadata(lookupKey)
  } catch (error) {
    if (error instanceof MedusaError) {
      return next(error)
    }

    return next()
  }

  if (!tenant) {
    return next()
  }

  try {
    const tenantConn = await getTenantConnection(tenant.db_name)

    req.scope.register({
      manager: tenantConn.manager,
    })
  } catch (error) {
    return next(error as Error)
  }

  return next()
}
