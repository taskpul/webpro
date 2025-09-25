import { runTenantMigrations } from "../src/modules/tenant/tenant-migration-runner"

async function run() {
  const directory = process.env.MEDUSA_PROJECT_DIR || process.cwd()
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set to run tenant migrations")
  }

  try {
    await runTenantMigrations({
      directory,
      databaseUrl,
      medusaProjectDir: process.env.MEDUSA_PROJECT_DIR,
    })
  } catch (error) {
    console.error("❌ Tenant migration workflow failed", error)
    process.exitCode = 1
    throw error
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
