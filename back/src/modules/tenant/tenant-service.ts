import { MedusaError } from "medusa-core-utils"
import bcrypt from "bcryptjs"
import { Client, ClientConfig } from "pg"
import { EntityManager } from "typeorm"
import Tenant from "./tenant-model"

type PgClientLike = {
  connect: () => Promise<void>
  query: (query: string, parameters?: unknown[]) => Promise<unknown>
  end: () => Promise<void>
}

type PgClientFactory = (database: string) => PgClientLike

export type TenantServiceOptions = {
  rootDomain: string
  database: {
    host: string
    port: number
    user: string
    password: string
    ssl?: ClientConfig["ssl"]
  }
  admin: {
    role: string
    promoteToSuperAdmin: boolean
    bcryptSaltRounds: number
  }
}

export type TenantCreateInput = {
  name: string
  adminEmail: string
  adminPassword: string
  subdomain?: string
  dbName?: string
}

export type TenantDeleteInput = {
  id?: string
  name?: string
}

const DEFAULT_SALT_ROUNDS = 10

export class TenantService {
  private readonly manager: EntityManager
  private readonly options: TenantServiceOptions
  private readonly createPgClient: PgClientFactory
  private registryEnsured = false

  constructor(
    {
      manager,
      tenantServiceOptions,
      createPgClient,
    }: {
      manager: EntityManager
      tenantServiceOptions?: Partial<TenantServiceOptions>
      createPgClient?: PgClientFactory
    }
  ) {
    this.manager = manager
    this.options = this.buildOptions(tenantServiceOptions)
    this.assertDatabaseCredentials()

    this.createPgClient =
      createPgClient ??
      ((database: string) => {
        const config: ClientConfig = {
          host: this.options.database.host,
          port: this.options.database.port,
          user: this.options.database.user,
          password: this.options.database.password,
          database,
          ssl: this.options.database.ssl,
        }
        return new Client(config)
      })
  }

  async create(input: TenantCreateInput): Promise<Tenant> {
    const name = input.name?.trim()
    if (!name) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tenant name is required"
      )
    }

    if (!input.adminEmail) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Admin email is required"
      )
    }

    if (!input.adminPassword) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Admin password is required"
      )
    }

    const slug = this.slugify(name)
    if (!slug) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tenant name must include alphanumeric characters"
      )
    }

    const defaultDbName = `db_${slug.replace(/-/g, "_")}`
    const dbName = input.dbName ?? defaultDbName
    this.assertIdentifier(dbName, "database name")

    const subdomain =
      input.subdomain ?? `${slug}.${this.options.rootDomain}`

    await this.ensureTenantRegistry()

    const tenantRepo = this.manager.getRepository(Tenant)
    const existing = await tenantRepo.findOne({
      where: [{ name }, { subdomain }, { dbName }],
    })

    if (existing) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "Tenant with matching name, subdomain, or database already exists"
      )
    }

    const dbExists = await this.databaseExists(dbName)
    if (!dbExists) {
      await this.createDatabase(dbName)
    }

    await this.bootstrapTenantDatabase(
      dbName,
      input.adminEmail.toLowerCase(),
      input.adminPassword
    )

    const tenant = tenantRepo.create({
      name,
      subdomain,
      dbName,
    })

    return await tenantRepo.save(tenant)
  }

  async delete(input: TenantDeleteInput): Promise<{ id: string; name: string }> {
    if (!input.id && !input.name) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Provide a tenant id or name to delete"
      )
    }

    const tenantRepo = this.manager.getRepository(Tenant)
    const tenant = await tenantRepo.findOne({
      where: input.id ? { id: input.id } : { name: input.name! },
    })

    if (!tenant) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Tenant not found"
      )
    }

    await tenantRepo.remove(tenant)
    await this.dropDatabase(tenant.dbName)

    return { id: tenant.id, name: tenant.name }
  }

  async list(): Promise<Tenant[]> {
    const tenantRepo = this.manager.getRepository(Tenant)
    return tenantRepo.find({ order: { createdAt: "ASC" } })
  }

  private buildOptions(
    overrides?: Partial<TenantServiceOptions>
  ): TenantServiceOptions {
    const env = process.env

    const rootDomain =
      overrides?.rootDomain ?? env.ROOT_DOMAIN ?? "example.com"

    const database = {
      host: overrides?.database?.host ?? env.DB_HOST ?? "localhost",
      port: overrides?.database?.port ?? parseInt(env.DB_PORT || "5432", 10),
      user: overrides?.database?.user ?? env.DB_USER ?? "",
      password: overrides?.database?.password ?? env.DB_PASS ?? "",
      ssl: overrides?.database?.ssl,
    }

    const admin = {
      role: overrides?.admin?.role ?? "admin",
      promoteToSuperAdmin:
        overrides?.admin?.promoteToSuperAdmin ?? true,
      bcryptSaltRounds:
        overrides?.admin?.bcryptSaltRounds ?? DEFAULT_SALT_ROUNDS,
    }

    return {
      rootDomain,
      database,
      admin,
    }
  }

  private assertDatabaseCredentials(): void {
    if (!this.options.database.user || !this.options.database.password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Database user and password must be configured for tenant provisioning"
      )
    }
  }

  private async ensureTenantRegistry(): Promise<void> {
    if (this.registryEnsured) {
      return
    }

    await this.manager.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
    await this.manager.query(`
      CREATE TABLE IF NOT EXISTS tenant (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text UNIQUE NOT NULL,
        subdomain text UNIQUE NOT NULL,
        db_name text UNIQUE NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `)
    await this.manager.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_name ON tenant(name);'
    )
    await this.manager.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_subdomain ON tenant(subdomain);'
    )

    this.registryEnsured = true
  }

  private async databaseExists(dbName: string): Promise<boolean> {
    const result = await this.manager.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    )
    return Array.isArray(result) && result.length > 0
  }

  private async createDatabase(dbName: string): Promise<void> {
    await this.manager.query(`CREATE DATABASE "${dbName}";`)
  }

  private async dropDatabase(dbName: string): Promise<void> {
    await this.manager.query(`DROP DATABASE IF EXISTS "${dbName}";`)
  }

  private async bootstrapTenantDatabase(
    dbName: string,
    adminEmail: string,
    adminPassword: string
  ): Promise<void> {
    const client = this.createPgClient(dbName)
    await client.connect()

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
      await client.query(`
        CREATE TABLE IF NOT EXISTS public."user" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          password_hash text,
          role text NOT NULL DEFAULT 'member',
          is_super_admin boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `)
      await client.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON public."user"(email);'
      )

      const hashedPassword = await bcrypt.hash(
        adminPassword,
        this.options.admin.bcryptSaltRounds
      )

      await client.query(
        `
          INSERT INTO public."user" (
            id,
            email,
            password_hash,
            role,
            is_super_admin,
            created_at,
            updated_at
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (email)
          DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            is_super_admin = EXCLUDED.is_super_admin,
            updated_at = NOW();
        `,
        [
          adminEmail,
          hashedPassword,
          this.options.admin.role,
          this.options.admin.promoteToSuperAdmin,
        ]
      )
    } finally {
      await client.end()
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
  }

  private assertIdentifier(value: string, label: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid ${label}: ${value}`
      )
    }
  }
}

export default TenantService
