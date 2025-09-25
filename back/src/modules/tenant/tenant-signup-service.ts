import { EntityManager } from "typeorm"
import { MedusaError } from "medusa-core-utils"
import bcrypt from "bcryptjs"
import { execSync } from "child_process"
import { DataSource } from "typeorm"

type SignupInput = {
  name: string
  email: string
  password: string
  subdomain?: string
}

class TenantSignupService {
  private manager: EntityManager

  constructor({ manager }: { manager: EntityManager }) {
    this.manager = manager
  }

  async signup(data: SignupInput) {
    const { name, email, password } = data
    if (!name || !email || !password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "name, email, and password are required"
      )
    }

    const dbName = `db_${name}`
    const subdomain =
      data.subdomain || `${name}.${process.env.ROOT_DOMAIN || "example.com"}`

    const dbUrl = `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`

    // 1. Create tenant database if not exists
    try {
      await this.manager.query(`CREATE DATABASE ${dbName}`)
    } catch (e) {
      // Database might already exist → ignore error
    }

    // 2. Run migrations for tenant DB
    try {
      execSync(`DATABASE_URL=${dbUrl} yarn medusa migrations run`, {
        cwd: process.cwd(),
        stdio: "inherit",
      })
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.DB_ERROR,
        `Failed running migrations for tenant ${name}`
      )
    }

    // 3. Insert tenant record into db_main
    await this.manager.query(
      `
      INSERT INTO tenant (name, subdomain, db_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE
      SET subdomain = EXCLUDED.subdomain,
          db_name = EXCLUDED.db_name,
          updated_at = NOW();
    `,
      [name, subdomain, dbName]
    )

    // 4. Connect to tenant DB and create default admin user
    const tenantConnection = new DataSource({
      type: "postgres",
      url: dbUrl,
      entities: ["dist/models/*.js"],
      migrations: ["dist/migrations/*.js"],
      synchronize: false,
      logging: false,
    })

    await tenantConnection.initialize()

    const hashedPass = await bcrypt.hash(password, 10)

    await tenantConnection.query(
      `
      INSERT INTO public."user" (id, email, password_hash, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'admin', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    `,
      [email, hashedPass]
    )

    await tenantConnection.destroy()

    return {
      tenant: { name, subdomain, dbName },
      admin: { email },
    }
  }
}

export default TenantSignupService
