import { Router } from "express"
import { superAdminMiddleware } from "../../../middleware/super-admin-middleware"

export default (router: Router) => {
  const route = Router()
  router.use("/tenants", route)

  // Super admin only
  route.get("/", superAdminMiddleware, async (req, res) => {
    const tenantService = req.scope.resolve("tenantService")
    const tenants = await tenantService.list()
    res.json({ tenants })
  })

  return router
}
