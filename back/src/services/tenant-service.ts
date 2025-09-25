import { DataSource } from "typeorm"
import { execSync } from "child_process"
import { Tenant } from "../modules/tenant/tenant-model"
import * as bcrypt from "bcryptjs"

export class TenantService {
  private mainDataSource: DataSource

  constructor(mainDataSource: DataSource) {
    this.mainDataSource = mainDataSource
  }

  async createTenant(tenantName: string) {
    const dbName = `db_${tenantName}`
    const subdomain = `${tenantName}.${process.env.ROOT_DOMAIN}`

    // 1. Create tenant DB
    execSync(
      `psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -tc "SELECT 1 FROM pg_database WHERE datname='${dbName}'" | grep -q 1 || psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -c "CREATE DATABASE ${dbName}"`
    )

    // 2. Run Medusa migrations
    execSync(
      `DATABASE_URL="postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}" yarn medusa migrations run`,
      { cwd: process.cwd(), stdio: "inherit" }
    )

    // 3. Insert tenant record into db_main
    const tenantRepo = this.mainDataSource.getRepository(Tenant)
    let tenant = tenantRepo.create({ name: tenantName, subdomain, db_name: dbName })
    await tenantRepo.save(tenant)

    // 4. Create default admin
    const hashed = await bcrypt.hash(process.env.ADMIN_PASS || "admin123", 10)
    execSync(
      `psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -d ${dbName} -c "INSERT INTO public.user (id, email, password_hash, role, created_at, updated_at) VALUES (gen_random_uuid(), 'admin@${tenantName}.com', '${hashed}', 'admin', NOW(), NOW()) ON CONFLICT (email) DO NOTHING;"`
    )

    return { tenantName, dbName, subdomain }
  }

  async deleteTenant(tenantName: string) {
    const dbName = `db_${tenantName}`

    // 1. Delete tenant record
    const tenantRepo = this.mainDataSource.getRepository(Tenant)
    await tenantRepo.delete({ name: tenantName })

    // 2. Drop tenant DB
    execSync(
      `psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -c "DROP DATABASE IF EXISTS ${dbName}"`
    )

    return { deleted: tenantName }
  }

  async listTenants() {
    const tenantRepo = this.mainDataSource.getRepository(Tenant)
    return tenantRepo.find()
  }
}
