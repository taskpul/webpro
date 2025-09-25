"use client"

import React, { useState } from "react"

import { Button } from "@medusajs/ui"

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

type SignupFormProps = {
  actionUrl: string
  tenantName: string | null
  initialSubdomain?: string | null
}

type RequestState = "idle" | "pending" | "success" | "error"

const SignupForm = ({ actionUrl, tenantName, initialSubdomain }: SignupFormProps) => {
  const [state, setState] = useState<RequestState>("idle")
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: (formData.get("name") as string | null)?.trim() || "",
      email: (formData.get("email") as string | null)?.trim() || "",
      password: formData.get("password") as string | null,
      subdomain: (formData.get("subdomain") as string | null)?.trim() || undefined,
    }

    setState("pending")
    setFeedback(null)

    try {
      const response = await fetch(actionUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
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
          <div className="grid grid-cols-1 gap-4">
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
