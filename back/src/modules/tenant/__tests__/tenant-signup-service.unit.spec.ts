import { MedusaError } from "medusa-core-utils"
import TenantSignupService from "../tenant-signup-service"
import type { TenantService } from "../tenant-service"
import type TenantPlanService from "../tenant-plan-service"

const buildServices = () => {
  const tenantService = {
    create: jest.fn(),
  } as unknown as jest.Mocked<Pick<TenantService, "create">>

  const tenantPlanService = {
    assertActivePlan: jest.fn(),
  } as unknown as jest.Mocked<Pick<TenantPlanService, "assertActivePlan">>

  const signupService = new TenantSignupService({
    tenantService: tenantService as unknown as TenantService,
    tenantPlanService: tenantPlanService as unknown as TenantPlanService,
  })

  return { tenantService, tenantPlanService, signupService }
}

describe("TenantSignupService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("persists the plan identifier when creating a tenant", async () => {
    const { tenantService, tenantPlanService, signupService } = buildServices()

    tenantPlanService.assertActivePlan.mockResolvedValue({
      id: "starter",
      name: "Starter",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    tenantService.create.mockImplementation(async (payload) => ({
      id: "tenant_123",
      name: payload.name,
      subdomain: payload.subdomain ?? "starter.example.com",
      dbName: payload.dbName ?? "db_starter",
      planId: payload.planId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const result = await signupService.signup({
      name: "Starter Tenant",
      email: "owner@example.com",
      password: "Password123",
      subdomain: "starter",
      planId: "starter",
    })

    expect(tenantPlanService.assertActivePlan).toHaveBeenCalledWith("starter")
    expect(tenantService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Starter Tenant",
        adminEmail: "owner@example.com",
        adminPassword: "Password123",
        subdomain: "starter",
        planId: "starter",
      })
    )
    expect(result.tenant.planId).toBe("starter")
  })

  it("throws when the plan identifier is missing", async () => {
    const { signupService, tenantPlanService, tenantService } = buildServices()

    await expect(
      signupService.signup({
        name: "Missing Plan",
        email: "missing@example.com",
        password: "Password123",
        planId: "",
      })
    ).rejects.toMatchObject({ message: "planId is required" })

    expect(tenantPlanService.assertActivePlan).not.toHaveBeenCalled()
    expect(tenantService.create).not.toHaveBeenCalled()
  })

  it("throws when the plan cannot be found", async () => {
    const { signupService, tenantPlanService, tenantService } = buildServices()

    tenantPlanService.assertActivePlan.mockRejectedValue(
      new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The requested plan is not available"
      )
    )

    await expect(
      signupService.signup({
        name: "Invalid Plan",
        email: "invalid@example.com",
        password: "Password123",
        planId: "unknown",
      })
    ).rejects.toMatchObject({ message: "The requested plan is not available" })

    expect(tenantService.create).not.toHaveBeenCalled()
  })
})
