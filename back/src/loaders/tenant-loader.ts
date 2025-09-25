import { DataSource } from "typeorm"
import { Request, Response, NextFunction } from "express"
import { MedusaError } from "medusa-core-utils"

const connections: Record<string, DataSource> = {}

export async function getTenantConnection(dbName: string) {
  if (connections[dbName] && connections[dbName].isInitialized) {
    return connections[dbName]
  }

  const dataSource = new DataSource({
    type: "postgres",
    url: `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`,
    entities: ["dist/models/*.js"], // adjust if using TS directly
    migrations: ["dist/migrations/*.js"],
    synchronize: false,
    logging: false,
  })

  await dataSource.initialize()
  connections[dbName] = dataSource

  return dataSource
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || ""
  const subdomain = host.split(".")[0]

  if (!subdomain || subdomain === "www") {
    return next()
  }

  // Fetch tenant from MAIN_DB
  const mainDb = await getTenantConnection(process.env.MAIN_DB as string)
  const tenant = await mainDb.query(`SELECT * FROM tenant WHERE subdomain=$1 LIMIT 1`, [
    `${subdomain}.${process.env.ROOT_DOMAIN}`,
  ])

  if (!tenant.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Tenant not found for subdomain: ${subdomain}`)
  }

  const dbName = tenant[0].db_name
  const tenantConn = await getTenantConnection(dbName)

  // Attach tenant connection to request scope
  req.scope.register({
    manager: tenantConn.manager,
  })

  next()
}
