import "reflect-metadata"
import { randomBytes } from "crypto"
import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { User } from "./src/modules/user/user.entity"
import Tenant from "./src/modules/tenant/tenant-model"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS
const dbHost = process.env.DB_HOST || "localhost"
const dbPort = process.env.DB_PORT || "5432"
const mainDb = process.env.MAIN_DB || "db_main"
const connectionString = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${mainDb}`

const nodeEnv = process.env.NODE_ENV ?? "development"
const isDevLikeEnv = nodeEnv === "development" || nodeEnv === "test"

const resolveSecret = (envKey: "JWT_SECRET" | "COOKIE_SECRET") => {
  const value = process.env[envKey]

  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }

  if (isDevLikeEnv) {
    const generated = randomBytes(32).toString("hex")
    process.env[envKey] = generated

    console.warn(
      `[medusa-config] ${envKey} was not provided. Generated an ephemeral development secret. Use a persistent value to keep sessions between restarts.`,
    )

    return generated
  }

  throw new Error(
    `${envKey} is required when NODE_ENV=${nodeEnv}. Set a strong, unique secret in your environment before starting the server.`,
  )
}

export default defineConfig({
  projectConfig: {
    databaseUrl: connectionString,
    databaseEntities: [User, Tenant],
    http: (() => {
      const httpConfig: {
        storeCors?: string
        adminCors?: string
        authCors?: string
        jwtSecret: string
        cookieSecret: string
      } = {
        jwtSecret: resolveSecret("JWT_SECRET"),
        cookieSecret: resolveSecret("COOKIE_SECRET"),
      }

      if (typeof process.env.STORE_CORS !== "undefined") {
        httpConfig.storeCors = process.env.STORE_CORS
      }

      if (typeof process.env.ADMIN_CORS !== "undefined") {
        httpConfig.adminCors = process.env.ADMIN_CORS
      }

      if (typeof process.env.AUTH_CORS !== "undefined") {
        httpConfig.authCors = process.env.AUTH_CORS
      }

      return httpConfig
    })(),
  },
})
