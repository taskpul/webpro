import { Router } from "express"

export default (router: Router) => {
  const route = Router()
  // Register under `/public` instead of `/store`
  router.use("/public/tenants/signup", route)

  route.post("/", async (req, res) => {
    const { name, email, password, subdomain } = req.body
    const tenantSignupService = req.scope.resolve("tenantSignupService")
    const result = await tenantSignupService.signup({ name, email, password, subdomain })
    res.json(result)
  })

  return router
}

