import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { migrate } from "@medusajs/medusa/dist/commands/db/migrate"
import { initializeContainer } from "@medusajs/medusa/dist/loaders"

async function run() {
  const directory = process.env.MEDUSA_PROJECT_DIR || process.cwd()

  const container = await initializeContainer(directory)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await migrate({
      directory,
      skipLinks: false,
      skipScripts: false,
      executeAllLinks: false,
      executeSafeLinks: true,
      container,
      logger,
    })
    logger.info("✅ Tenant migrations completed")
  } catch (error) {
    logger.error("❌ Tenant migration workflow failed", error)
    process.exitCode = 1
    throw error
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
