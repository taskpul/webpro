import type { Application, Request, Response } from "express"
import { Router } from "express"
import { MedusaError } from "medusa-core-utils"
import type { TenantService } from "../../modules/tenant/tenant-service"
import { superAdminMiddleware } from "../../middleware/super-admin-middleware"
import {
  resolveTenantDeleteInput,
  validateTenantCreatePayload,
} from "./utils/tenant-validation"

type ScopedRequest = Request & {
  scope: { resolve: <T = unknown>(registration: string) => T }
}

const handleServiceError = (error: unknown, res: Response) => {
  if (error instanceof MedusaError) {
    return res.status(error.type === MedusaError.Types.NOT_FOUND ? 404 : 400).json({
      type: error.type,
      message: error.message,
    })
  }

  return res.status(500).json({
    type: "unknown_error",
    message: (error as Error)?.message ?? "Unexpected error",
  })
}

export default (app: Application) => {
  const router = Router()
  app.use("/tenants", router)

  router.use(superAdminMiddleware)

  router.get("/", async (req: ScopedRequest, res) => {
    try {
      const tenantService = req.scope.resolve<TenantService>("tenantService")
      const tenants = await tenantService.list()
      return res.json({ tenants })
    } catch (error) {
      return handleServiceError(error, res)
    }
  })

  router.post("/", async (req: ScopedRequest, res) => {
    const validation = validateTenantCreatePayload(req.body)

    if (!validation.data) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      })
    }

    try {
      const tenantService = req.scope.resolve<TenantService>("tenantService")
      const tenant = await tenantService.create(validation.data)
      return res.status(201).json({ tenant })
    } catch (error) {
      return handleServiceError(error, res)
    }
  })

  router.delete("/:identifier", async (req: ScopedRequest, res) => {
    let deleteInput

    try {
      deleteInput = resolveTenantDeleteInput(req.params.identifier)
    } catch (error) {
      return handleServiceError(error, res)
    }

    try {
      const tenantService = req.scope.resolve<TenantService>("tenantService")
      const deleted = await tenantService.delete(deleteInput)
      return res.json({ deleted })
    } catch (error) {
      return handleServiceError(error, res)
    }
  })
}
