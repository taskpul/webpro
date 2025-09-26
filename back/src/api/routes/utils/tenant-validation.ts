import { MedusaError } from "medusa-core-utils"
import type {
  TenantCreateInput,
  TenantDeleteInput,
} from "../../../modules/tenant/tenant-service"

type TenantCreatePayload = Partial<{
  name: unknown
  subdomain: unknown
  adminEmail: unknown
  adminPassword: unknown
  planId: unknown
}>

type TenantValidationResult = {
  data?: TenantCreateInput
  errors: string[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUBDOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateTenantCreatePayload(
  payload: TenantCreatePayload
): TenantValidationResult {
  const errors: string[] = []

  const name = typeof payload.name === "string" ? payload.name.trim() : ""
  if (!name) {
    errors.push("Tenant name is required")
  }

  const adminEmail =
    typeof payload.adminEmail === "string"
      ? payload.adminEmail.trim().toLowerCase()
      : ""
  if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
    errors.push("A valid admin email is required")
  }

  const adminPassword =
    typeof payload.adminPassword === "string"
      ? payload.adminPassword
      : ""
  if (!adminPassword || adminPassword.length < 8) {
    errors.push("Admin password must be at least 8 characters long")
  }

  let subdomain: string | undefined
  if (typeof payload.subdomain === "string") {
    const trimmed = payload.subdomain.trim().toLowerCase()
    if (!SUBDOMAIN_REGEX.test(trimmed)) {
      errors.push("Subdomain must contain lowercase alphanumeric characters")
    } else {
      subdomain = trimmed
    }
  }

  let planId: string | undefined
  if (typeof payload.planId === "string") {
    const trimmed = payload.planId.trim()
    if (trimmed) {
      planId = trimmed
    }
  }

  if (errors.length) {
    return { errors }
  }

  return {
    data: {
      name,
      adminEmail,
      adminPassword,
      subdomain,
      planId,
    },
    errors,
  }
}

export function resolveTenantDeleteInput(
  identifier: string | undefined
): TenantDeleteInput {
  if (!identifier) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A tenant identifier is required"
    )
  }

  const trimmed = identifier.trim()
  if (!trimmed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A tenant identifier is required"
    )
  }

  if (UUID_REGEX.test(trimmed)) {
    return { id: trimmed }
  }

  return { name: trimmed }
}
