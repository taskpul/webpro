import { Router } from "express"

export default (router: Router) => {
  const route = Router()

  // Endpoint: GET /public/tenants
  router.use("/", route)

  route.get("/", async (req, res) => {
    const tenantService = req.scope.resolve("tenantService")

    try {
      const tenants = await tenantService.list()
      return res.json({ tenants })
    } catch (err: any) {
      return res
        .status(500)
        .json({ type: "error", message: err.message || "Failed to fetch tenants" })
    }
  })

  return router
}
