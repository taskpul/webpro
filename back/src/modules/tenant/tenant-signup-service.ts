import { MedusaError } from "medusa-core-utils"
import type TenantPlanService from "./tenant-plan-service"
import type { TenantService } from "./tenant-service"

type SignupInput = {
  name: string
  email: string
  password: string
  subdomain?: string
  planId: string
}

class TenantSignupService {
  private readonly tenantService: TenantService
  private readonly tenantPlanService: TenantPlanService

  constructor({
    tenantService,
    tenantPlanService,
  }: {
    tenantService: TenantService
    tenantPlanService: TenantPlanService
  }) {
    this.tenantService = tenantService
    this.tenantPlanService = tenantPlanService
  }

  async signup(data: SignupInput) {
    const { name, email, password, subdomain, planId } = data
    if (!name?.trim() || !email || !password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "name, email, and password are required"
      )
    }

    const normalizedPlanId = planId?.trim()
    if (!normalizedPlanId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "planId is required"
      )
    }

    await this.tenantPlanService.assertActivePlan(normalizedPlanId)

    const tenant = await this.tenantService.create({
      name: name.trim(),
      adminEmail: email,
      adminPassword: password,
      subdomain,
      planId: normalizedPlanId,
    })

    return {
      tenant,
      admin: { email },
    }
  }
}

export default TenantSignupService
