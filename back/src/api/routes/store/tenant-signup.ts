import { Router } from "express"

import { handleTenantSignupGet } from "../shared/tenant-signup-helpers"

export default (router: Router) => {
  const route = Router()
  // Register under `/public` instead of `/store`
  router.use("/public/tenants/signup", route)

  route.get("/", (req, res) => {
    handleTenantSignupGet(req, res)
  })

  route.post("/", async (req, res) => {
    const { name, email, password, subdomain, planId } = req.body
    if (typeof planId !== "string" || !planId.trim()) {
      return res.status(400).json({
        type: "error",
        message: "planId is required",
      })
    }
    const tenantSignupService = req.scope.resolve("tenantSignupService")
    const result = await tenantSignupService.signup({
      name,
      email,
      password,
      subdomain,
      planId,
    })
    res.json(result)
  })

  return router
}

