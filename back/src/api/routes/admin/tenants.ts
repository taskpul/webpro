import type { Request } from "express"
import { Router } from "express"
import { MedusaError } from "medusa-core-utils"
import { TENANT_SERVICE } from "../../../modules/tenant"
import type { TenantService } from "../../../modules/tenant/tenant-service"
import { superAdminMiddleware } from "../../../middleware/super-admin-middleware"
import {
  resolveTenantDeleteInput,
  validateTenantCreatePayload,
} from "../utils/tenant-validation"

type ScopedRequest = Request & {
  scope: { resolve: <T = unknown>(registration: string) => T }
}

export default (router: Router) => {
  const route = Router()
  router.use("/tenants", route)

  route.use(superAdminMiddleware)

  route.get("/", async (req: ScopedRequest, res) => {
    const tenantService =
      req.scope.resolve<TenantService>(TENANT_SERVICE)
    const tenants = await tenantService.list()
    return res.json({ tenants })
  })

  route.post("/", async (req: ScopedRequest, res) => {
    const validation = validateTenantCreatePayload(req.body)

    if (!validation.data) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      })
    }

    try {
      const tenantService =
        req.scope.resolve<TenantService>(TENANT_SERVICE)
      const tenant = await tenantService.create(validation.data)
      return res.status(201).json({ tenant })
    } catch (error) {
      const message = (error as MedusaError).message ?? "Unable to create tenant"
      return res.status(400).json({ message })
    }
  })

  route.delete("/:identifier", async (req: ScopedRequest, res) => {
    try {
      const deleteInput = resolveTenantDeleteInput(req.params.identifier)
      const tenantService =
        req.scope.resolve<TenantService>(TENANT_SERVICE)
      const deleted = await tenantService.delete(deleteInput)
      return res.json({ deleted })
    } catch (error) {
      const message = (error as MedusaError).message ?? "Unable to delete tenant"
      return res.status(
        error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND
          ? 404
          : 400
      ).json({ message })
    }
  })

  return router
}
