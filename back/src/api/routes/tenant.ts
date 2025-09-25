import { Router } from "express"
import { TenantService } from "../../services/tenant-service"
import { DataSource } from "typeorm"
import { Tenant } from "../../modules/tenant/tenant-model"
import { requireSuperAdmin } from "../../middleware/super-admin-middleware"

export default (app) => {
  const router = Router()
  app.use("/tenants", router)

  const mainDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.MAIN_DB,
    entities: [Tenant],
  })

  let tenantService: TenantService

  mainDataSource.initialize().then(() => {
    tenantService = new TenantService(mainDataSource)
  })

  // ✅ Protect with requireSuperAdmin
  router.post("/", requireSuperAdmin, async (req, res) => {
    const { name } = req.body
    const result = await tenantService.createTenant(name)
    res.json(result)
  })

  router.delete("/:name", requireSuperAdmin, async (req, res) => {
    const result = await tenantService.deleteTenant(req.params.name)
    res.json(result)
  })

  // List tenants (can be public or protected, your choice)
  router.get("/", requireSuperAdmin, async (req, res) => {
    const tenants = await tenantService.listTenants()
    res.json(tenants)
  })
}
