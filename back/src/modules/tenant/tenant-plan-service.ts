import { MedusaError } from "medusa-core-utils"
import { EntityManager } from "typeorm"
import TenantPlan from "./tenant-plan-model"

export class TenantPlanService {
  private readonly manager: EntityManager

  constructor({ manager }: { manager: EntityManager }) {
    this.manager = manager
  }

  private get repository() {
    return this.manager.getRepository(TenantPlan)
  }

  async listActiveIds(): Promise<string[]> {
    const plans = await this.repository.find({
      where: { isActive: true },
      order: { createdAt: "ASC" },
      select: { id: true },
    })

    return plans.map((plan) => plan.id)
  }

  async retrieve(planId: string): Promise<TenantPlan | null> {
    const normalized = planId.trim()
    if (!normalized) {
      return null
    }

    return this.repository.findOne({ where: { id: normalized } })
  }

  async assertActivePlan(planId: string): Promise<TenantPlan> {
    const normalized = planId.trim()

    if (!normalized) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A planId must be provided"
      )
    }

    const plan = await this.repository.findOne({
      where: { id: normalized, isActive: true },
    })

    if (!plan) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The requested plan is not available"
      )
    }

    return plan
  }
}

export default TenantPlanService
