import { asClass } from "awilix"
import TenantService from "./tenant-service"
import TenantSignupService from "./tenant-signup-service"

const register = (container) => {
  container.register({
    tenantService: asClass(TenantService).singleton(),
    tenantSignupService: asClass(TenantSignupService).singleton(),
  })
}

export default register
