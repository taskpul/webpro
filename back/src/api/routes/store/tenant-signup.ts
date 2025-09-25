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
    const { name, email, password, subdomain } = req.body
    const tenantSignupService = req.scope.resolve("tenantSignupService")
    const result = await tenantSignupService.signup({ name, email, password, subdomain })
    res.json(result)
  })

  return router
}

