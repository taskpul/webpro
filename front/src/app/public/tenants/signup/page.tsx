import type { Metadata } from "next"

import { getMedusaSdk } from "@lib/config"

import SignupForm, { type TenantPlanSummary } from "./signup-form"

type SearchParams = Record<string, string | string[] | undefined>

const firstParam = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

const resolveSignupAction = (medusaUrl: string | null): string => {
  if (!medusaUrl) {
    return "/public/tenants/signup"
  }

  try {
    const base = new URL(medusaUrl)
    return new URL("/public/tenants/signup", base).toString()
  } catch {
    return "/public/tenants/signup"
  }
}

const resolvePlanCatalogUrl = (medusaUrl: string | null): string | null => {
  if (!medusaUrl) {
    return null
  }

  try {
    const base = new URL(medusaUrl)
    return new URL("/public/tenant-plans", base).toString()
  } catch {
    return null
  }
}

const pickString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }

  return null
}

const parsePlanSummary = (value: unknown): TenantPlanSummary | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Record<string, unknown>

  const id = pickString(candidate["id"], candidate["planId"], candidate["plan_id"])
  if (!id) {
    return null
  }

  const name = pickString(candidate["name"], id) ?? id

  const description =
    pickString(
      candidate["description"],
      candidate["summary"],
      candidate["tagline"],
      candidate["subtitle"]
    ) ?? null

  const price =
    pickString(
      candidate["price"],
      candidate["priceText"],
      candidate["price_text"],
      candidate["priceDisplay"],
      candidate["price_display"],
      candidate["priceLabel"],
      candidate["price_label"]
    ) ?? null

  const billingInterval =
    pickString(
      candidate["billingInterval"],
      candidate["interval"],
      candidate["billing_period"],
      candidate["billingPeriod"],
      candidate["billing_interval"]
    ) ?? null

  const badge =
    pickString(candidate["badge"], candidate["label"], candidate["tag"], candidate["badgeLabel"]) ?? null

  const featuresCandidate = candidate["features"]
  const features = Array.isArray(featuresCandidate)
    ? featuresCandidate.filter((item): item is string => typeof item === "string")
    : null

  return {
    id,
    name,
    description: description ?? null,
    price,
    billingInterval,
    badge,
    features,
  }
}

const fetchPlanCatalog = async (
  medusaUrl: string | null
): Promise<TenantPlanSummary[]> => {
  const url = resolvePlanCatalogUrl(medusaUrl)

  if (!url) {
    return []
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    })

    if (!response.ok) {
      return []
    }

    const payload = (await response.json()) as unknown
    const plans =
      payload && typeof payload === "object" && Array.isArray((payload as any).plans)
        ? ((payload as any).plans as unknown[])
        : []

    return plans
      .map((entry) => parsePlanSummary(entry))
      .filter((entry): entry is TenantPlanSummary => entry !== null)
  } catch {
    return []
  }
}

export const metadata: Metadata = {
  title: "Tenant storefront signup",
  description:
    "Provision a tenant storefront, create the first administrator, and connect your WordPress multisite deployment.",
}

type TenantSignupPageProps = {
  searchParams?: Promise<SearchParams>
}

const TenantSignupPage = async ({ searchParams }: TenantSignupPageProps) => {
  const { tenant } = await getMedusaSdk()

  const medusaUrl = tenant.storefront?.medusaUrl ?? process.env.MEDUSA_BACKEND_URL ?? null
  const actionUrl = resolveSignupAction(medusaUrl)
  const planCatalog = await fetchPlanCatalog(medusaUrl)

  const params = ((await searchParams) ?? {}) as SearchParams

  const initialSubdomain =
    firstParam(params.subdomain) ??
    firstParam(params.tenant) ??
    firstParam(params.site) ??
    null

  return (
    <div className="min-h-screen w-full bg-ui-bg-subtle py-16">
      <SignupForm
        actionUrl={actionUrl}
        tenantName={tenant.config?.tenant ?? null}
        initialSubdomain={initialSubdomain}
        plans={planCatalog}
      />
    </div>
  )
}

export default TenantSignupPage
