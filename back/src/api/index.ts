import type { Application } from "express"
import tenantRoutes from "./routes/tenant"

type ContainerLike = {
  resolve?: (registration: string) => unknown
  router?: unknown
}

export default (
  _rootDirectory: string,
  options: { container: ContainerLike; app?: Application } | ContainerLike
) => {
  const container = "container" in options ? options.container : options
  const expressApp =
    ("app" in options && options.app) ||
    (container?.resolve?.("app") as Application | undefined) ||
    (container?.router as Application | undefined) ||
    (container as unknown as Application)

  if (!expressApp || typeof expressApp.use !== "function") {
    throw new Error("Unable to locate Express application for tenant routes")
  }

  tenantRoutes(expressApp)
}
