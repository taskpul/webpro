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
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
})
