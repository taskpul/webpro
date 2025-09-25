import type { Metadata } from "next"

import { getMedusaSdk } from "@lib/config"

import SignupForm from "./signup-form"

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

export const metadata: Metadata = {
  title: "Tenant storefront signup",
  description:
    "Provision a tenant storefront, create the first administrator, and connect your WordPress multisite deployment.",
}

type TenantSignupPageProps = {
  searchParams?: SearchParams
}

const TenantSignupPage = async ({ searchParams }: TenantSignupPageProps) => {
  const { tenant } = await getMedusaSdk()

  const medusaUrl = tenant.storefront?.medusaUrl ?? process.env.MEDUSA_BACKEND_URL ?? null
  const actionUrl = resolveSignupAction(medusaUrl)

  const initialSubdomain =
    firstParam(searchParams?.subdomain) ??
    firstParam(searchParams?.tenant) ??
    firstParam(searchParams?.site) ??
    null

  return (
    <div className="min-h-screen w-full bg-ui-bg-subtle py-16">
      <SignupForm
        actionUrl={actionUrl}
        tenantName={tenant.config?.tenant ?? null}
        initialSubdomain={initialSubdomain}
      />
    </div>
  )
}

export default TenantSignupPage
