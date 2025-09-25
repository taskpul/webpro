import { Router } from "express"

export default (router: Router) => {
  const route = Router()
  router.use("/tenants/signup", route)

  route.post("/", async (req, res) => {
    const { name, email, password, subdomain } = req.body
    const tenantSignupService = req.scope.resolve("tenantSignupService")

    try {
      const result = await tenantSignupService.signup({ name, email, password, subdomain })
      return res.json(result)
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }
  })

  return router
}
