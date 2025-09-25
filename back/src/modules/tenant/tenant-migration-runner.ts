import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
type MigrateModule = typeof import("@medusajs/medusa/commands/db/migrate")
type LoadersModule = typeof import("@medusajs/medusa/loaders/index")

let dependenciesPromise: Promise<{
  migrate: MigrateModule["migrate"]
  initializeContainer: LoadersModule["initializeContainer"]
}> | null = null

const loadDependencies = async () => {
  if (!dependenciesPromise) {
    dependenciesPromise = Promise.all([
      import("@medusajs/medusa/commands/db/migrate"),
      import("@medusajs/medusa/loaders/index"),
    ]).then(([migrateModule, loadersModule]) => ({
      migrate: migrateModule.migrate,
      initializeContainer: loadersModule.initializeContainer,
    }))
  }

  return dependenciesPromise
}

export type TenantMigrationContext = {
  databaseUrl: string
  directory: string
  medusaProjectDir?: string
}

export type TenantMigrationRunner = (
  context: TenantMigrationContext
) => Promise<void>

export const runTenantMigrations: TenantMigrationRunner = async (
  context
) => {
  const previousDatabaseUrl = process.env.DATABASE_URL
  const previousProjectDir = process.env.MEDUSA_PROJECT_DIR
  const projectDir = context.medusaProjectDir ?? context.directory

  process.env.DATABASE_URL = context.databaseUrl
  process.env.MEDUSA_PROJECT_DIR = projectDir

  try {
    const { migrate, initializeContainer } = await loadDependencies()
    const container = await initializeContainer(context.directory)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    await migrate({
      directory: context.directory,
      skipLinks: false,
      skipScripts: false,
      executeAllLinks: false,
      executeSafeLinks: true,
      container,
      logger,
    })

    logger.info("✅ Tenant migrations completed")
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl
    }

    if (previousProjectDir === undefined) {
      delete process.env.MEDUSA_PROJECT_DIR
    } else {
      process.env.MEDUSA_PROJECT_DIR = previousProjectDir
    }
  }
}
