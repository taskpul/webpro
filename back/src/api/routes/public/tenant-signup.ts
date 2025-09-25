import { Router } from "express"

import { handleTenantSignupGet } from "../shared/tenant-signup-helpers"

export default (router: Router) => {
  const route = Router()

  // Endpoint: POST /public/tenants/signup
  router.use("/tenants/signup", route)

  route.get("/", (req, res) => {
    handleTenantSignupGet(req, res)
  })

  route.post("/", async (req, res) => {
    const { name, email, password, subdomain } = req.body
    const tenantSignupService = req.scope.resolve("tenantSignupService")

    try {
      const result = await tenantSignupService.signup({
        name,
        email,
        password,
        subdomain,
      })
      return res.status(201).json(result)
    } catch (err: any) {
      return res
        .status(400)
        .json({ type: "error", message: err.message || "Signup failed" })
    }
  })

  return router
}
