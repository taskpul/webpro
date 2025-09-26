import "reflect-metadata"
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
        jwtSecret:
          typeof process.env.JWT_SECRET === "string" && process.env.JWT_SECRET.length > 0
            ? process.env.JWT_SECRET
            : "supersecret",
        cookieSecret:
          typeof process.env.COOKIE_SECRET === "string" && process.env.COOKIE_SECRET.length > 0
            ? process.env.COOKIE_SECRET
            : "supersecret",
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
