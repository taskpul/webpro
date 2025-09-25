import { tenantMiddleware } from "./tenant-loader"

export default async ({ app }) => {
  // attach tenant middleware before routes
  app.use(tenantMiddleware)
}
