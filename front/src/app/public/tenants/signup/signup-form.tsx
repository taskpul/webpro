"use client"

import React, { useMemo, useState } from "react"

import { RadioGroup } from "@headlessui/react"
import { Button, clx } from "@medusajs/ui"

import Input from "@modules/common/components/input"

const extractMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json()
      return (
        payload?.message || payload?.error || payload?.type || "Signup failed"
      )
    } catch {
      return "Signup failed"
    }
  }

  try {
    const text = await response.text()
    return text?.trim() || "Signup failed"
  } catch {
    return "Signup failed"
  }
}

export type TenantPlanSummary = {
  id: string
  name: string
  description?: string | null
  price?: string | null
  billingInterval?: string | null
  badge?: string | null
  features?: string[] | null
}

type SignupFormProps = {
  actionUrl: string
  tenantName: string | null
  initialSubdomain?: string | null
  plans: TenantPlanSummary[]
}

type RequestState = "idle" | "pending" | "success" | "error"

const SignupForm = ({
  actionUrl,
  tenantName,
  initialSubdomain,
  plans,
}: SignupFormProps) => {
  const [state, setState] = useState<RequestState>("idle")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  const hasPlans = plans.length > 0

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  )

  const handlePlanChange = (value: string) => {
    setSelectedPlanId(value)
    setPlanError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedPlanId) {
      setPlanError("Select a plan to continue.")
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: (formData.get("name") as string | null)?.trim() || "",
      email: (formData.get("email") as string | null)?.trim() || "",
      password: formData.get("password") as string | null,
      subdomain: (formData.get("subdomain") as string | null)?.trim() || undefined,
      planId: selectedPlanId,
    }

    setState("pending")
    setFeedback(null)
    setPlanError(null)

    try {
      const response = await fetch(actionUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "omit",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await extractMessage(response))
      }

      let success = "Tenant created successfully."

      try {
        const contentType = response.headers.get("content-type") ?? ""
        if (contentType.includes("application/json")) {
          const data = await response.clone().json()
          if (data?.tenant?.name) {
            success = `Tenant ${data.tenant.name} was created successfully.`
          }
        }
      } catch {
        // Ignore parsing errors and keep the default success message.
      }

      form.reset()
      setState("success")
      setFeedback(success)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed"
      setState("error")
      setFeedback(message)
    }
  }

  const heading = tenantName
    ? `Create the ${tenantName} storefront`
    : "Create your Medusa storefront"

  const showFeedback = state !== "idle" && feedback
  const feedbackClassName =
    state === "success" ? "text-emerald-500" : "text-rose-500"

  const canSubmit = hasPlans && Boolean(selectedPlanId) && state !== "pending"

  return (
    <section className="mx-auto flex w-full max-w-2xl px-6" data-testid="tenant-signup-section">
      <div className="w-full rounded-2xl border border-ui-border-base bg-ui-bg-base p-10 shadow-elevation-card-rest">
        <header className="mb-8 flex flex-col gap-y-2">
          <p className="text-small-plus text-ui-fg-subtle uppercase tracking-wide">
            Tenant onboarding
          </p>
          <h1 className="text-3xl font-semibold text-ui-fg-base">{heading}</h1>
          <p className="text-base text-ui-fg-subtle">
            Provision a Medusa tenant, create the first administrator, and sync
            the storefront with your WordPress multisite network. The
            administrator will receive instructions to activate their account
            and complete the setup.
          </p>
        </header>
        <form
          className="flex flex-col gap-y-6"
          onSubmit={handleSubmit}
          data-testid="tenant-signup-form"
        >
          <fieldset className="flex flex-col gap-y-4" data-testid="tenant-plan-picker">
            <legend className="text-base-plus font-semibold text-ui-fg-base">
              Choose a plan
            </legend>
            <p className="text-small text-ui-fg-subtle">
              Plans unlock the provisioning experience for your WordPress multisite
              tenants. Select the option that matches the storefront you intend to
              launch.
            </p>
            {hasPlans ? (
              <RadioGroup
                value={selectedPlanId}
                onChange={handlePlanChange}
                className="grid grid-cols-1 gap-4"
              >
                {plans.map((plan) => (
                  <RadioGroup.Option
                    key={plan.id}
                    value={plan.id}
                    as="div"
                    data-testid={`tenant-plan-card-${plan.id}`}
                    className={({ checked, active }) =>
                      clx(
                        "group flex cursor-pointer flex-col gap-y-3 rounded-2xl border border-ui-border-base bg-ui-bg-base p-6 shadow-elevation-card-rest transition-[border-color,box-shadow]",
                        checked
                          ? "border-ui-border-interactive shadow-elevation-card-hover"
                          : "hover:border-ui-border-strong",
                        active && !checked
                          ? "border-ui-border-strong shadow-elevation-card-hover"
                          : null
                      )
                    }
                  >
                    {({ checked }) => (
                      <div className="flex flex-col gap-y-3">
                        <div className="flex items-start justify-between gap-x-4">
                          <div className="flex flex-col gap-y-1">
                            <RadioGroup.Label className="text-base-plus font-semibold text-ui-fg-base">
                              {plan.name}
                            </RadioGroup.Label>
                            <RadioGroup.Description className="text-small text-ui-fg-subtle">
                              {plan.description?.trim() || `Plan ID: ${plan.id}`}
                            </RadioGroup.Description>
                            {plan.price ? (
                              <p className="text-small-plus font-medium text-ui-fg-base">
                                {plan.price}
                                {plan.billingInterval ? (
                                  <span className="text-small text-ui-fg-subtle">
                                    /{plan.billingInterval}
                                  </span>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                          <span
                            aria-hidden="true"
                            className={clx(
                              "flex h-5 w-5 items-center justify-center rounded-full border",
                              checked
                                ? "border-ui-border-interactive bg-ui-bg-subtle"
                                : "border-ui-border-base bg-ui-bg-subtle"
                            )}
                          >
                            <span
                              className={clx(
                                "h-2.5 w-2.5 rounded-full",
                                checked ? "bg-ui-bg-interactive" : "bg-transparent"
                              )}
                            />
                          </span>
                        </div>
                        {plan.features && plan.features.length > 0 ? (
                          <ul className="flex list-disc flex-col gap-y-1 pl-5 text-small text-ui-fg-subtle">
                            {plan.features.map((feature) => (
                              <li key={feature}>{feature}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
            ) : (
              <div
                className="rounded-2xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-6 text-small text-ui-fg-muted"
                data-testid="tenant-plan-empty"
              >
                No tenant plans are currently available. Contact your network administrator to enable a
                plan before provisioning a storefront.
              </div>
            )}
            {planError ? (
              <p className="text-small text-rose-500" data-testid="tenant-plan-error">
                {planError}
              </p>
            ) : null}
            {!selectedPlan && hasPlans ? (
              <div
                className="rounded-2xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-6 text-small text-ui-fg-muted"
                data-testid="tenant-plan-placeholder"
              >
                Select a plan above to unlock the tenant setup form. Each plan is tuned for WordPress
                multisite storefronts, ensuring compatible onboarding and provisioning.
              </div>
            ) : null}
          </fieldset>
          {selectedPlan ? (
            <div
              className="rounded-xl border border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-small text-ui-fg-subtle"
              data-testid="tenant-plan-summary"
            >
              Provisioning the <span className="font-semibold text-ui-fg-base">{selectedPlan.name}</span>{" "}
              plan for your tenant storefront.
            </div>
          ) : null}
          {selectedPlan ? (
            <div className="grid grid-cols-1 gap-4" data-testid="tenant-form-fields">
              <Input
                label="Tenant name"
                name="name"
                required
                autoComplete="organization"
                data-testid="tenant-name-input"
              />
              <Input
                label="Admin email"
                name="email"
                required
                type="email"
                autoComplete="email"
                data-testid="tenant-email-input"
              />
              <Input
                label="Admin password"
                name="password"
                required
                type="password"
                autoComplete="new-password"
                data-testid="tenant-password-input"
              />
              <Input
                label="Requested subdomain"
                name="subdomain"
                defaultValue={initialSubdomain ?? undefined}
                autoComplete="off"
                data-testid="tenant-subdomain-input"
              />
              <p className="text-small text-ui-fg-subtle">
                Leave the subdomain blank to generate one from the tenant name.
                For WordPress multisite networks, the slug will also be used for
                the site path.
              </p>
            </div>
          ) : null}
          {showFeedback ? (
            <p
              className={`${feedbackClassName} text-sm`}
              data-testid="tenant-signup-feedback"
            >
              {feedback}
            </p>
          ) : null}
          <Button
            type="submit"
            size="large"
            className="w-full"
            isLoading={state === "pending"}
            disabled={!canSubmit}
            data-testid="tenant-signup-submit"
          >
            Provision storefront
          </Button>
        </form>
      </div>
    </section>
  )
}

export default SignupForm
