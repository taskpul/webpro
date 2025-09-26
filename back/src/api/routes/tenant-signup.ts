import { Router } from "express"

export default (router: Router) => {
  const route = Router()
  router.use("/tenants/signup", route)

  route.post("/", async (req, res) => {
    const { name, email, password, subdomain, planId } = req.body
    if (typeof planId !== "string" || !planId.trim()) {
      return res.status(400).json({ message: "planId is required" })
    }
    const tenantSignupService = req.scope.resolve("tenantSignupService")

    try {
      const result = await tenantSignupService.signup({
        name,
        email,
        password,
        subdomain,
        planId,
      })
      return res.json(result)
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }
  })

  return router
}
