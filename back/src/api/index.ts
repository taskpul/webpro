import tenantRoutes from "./routes/tenant"

export default (rootDirectory, container) => {
  // other routes...
  tenantRoutes(container.router)
}
