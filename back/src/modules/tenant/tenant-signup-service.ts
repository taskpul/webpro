import { MedusaError } from "medusa-core-utils"
import type { TenantService } from "./tenant-service"

type SignupInput = {
  name: string
  email: string
  password: string
  subdomain?: string
}

class TenantSignupService {
  private readonly tenantService: TenantService

  constructor({ tenantService }: { tenantService: TenantService }) {
    this.tenantService = tenantService
  }

  async signup(data: SignupInput) {
    const { name, email, password, subdomain } = data
    if (!name?.trim() || !email || !password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "name, email, and password are required"
      )
    }

    const tenant = await this.tenantService.create({
      name: name.trim(),
      adminEmail: email,
      adminPassword: password,
      subdomain,
    })

    return {
      tenant,
      admin: { email },
    }
  }
}

export default TenantSignupService
