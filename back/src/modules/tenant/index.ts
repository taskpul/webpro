import { asClass, asValue } from "awilix"
import TenantService, {
  TenantCreateInput,
  TenantDeleteInput,
  TenantServiceMigrationOptions,
  TenantServiceOptions,
} from "./tenant-service"
import TenantSignupService from "./tenant-signup-service"
import TenantPlanService from "./tenant-plan-service"
import TenantPlan from "./tenant-plan-model"
import Tenant from "./tenant-model"

export const TENANT_SERVICE = "tenantService"

const register = (
  container,
  options: Partial<TenantServiceOptions> = {}
) => {
  container.register({
    tenantServiceOptions: asValue(options),
    [TENANT_SERVICE]: asClass(TenantService).scoped(),
    tenantPlanService: asClass(TenantPlanService).scoped(),
    tenantSignupService: asClass(TenantSignupService).scoped(),
  })
}

export { TenantService, TenantSignupService, Tenant, TenantPlanService, TenantPlan }
export type {
  TenantCreateInput,
  TenantDeleteInput,
  TenantServiceMigrationOptions,
  TenantServiceOptions,
}

export default register
