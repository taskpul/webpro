import { asClass, asValue } from "awilix"
import TenantService, {
  TenantCreateInput,
  TenantDeleteInput,
  TenantServiceMigrationOptions,
  TenantServiceOptions,
} from "./tenant-service"
import TenantSignupService from "./tenant-signup-service"
import Tenant from "./tenant-model"

export const TENANT_SERVICE = "tenantService"

const register = (
  container,
  options: Partial<TenantServiceOptions> = {}
) => {
  container.register({
    tenantServiceOptions: asValue(options),
    [TENANT_SERVICE]: asClass(TenantService).scoped(),
    tenantSignupService: asClass(TenantSignupService).scoped(),
  })
}

export { TenantService, TenantSignupService, Tenant }
export type {
  TenantCreateInput,
  TenantDeleteInput,
  TenantServiceMigrationOptions,
  TenantServiceOptions,
}

export default register
