import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import SignupForm from "../signup-form"

describe("SignupForm", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const fillField = (testId: string, value: string) => {
    const input = screen.getByTestId(testId) as HTMLInputElement
    fireEvent.change(input, { target: { value } })
  }

  it("submits tenant details and shows a success message", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ tenant: { name: "Acme" } }),
          {
            status: 201,
            headers: { "content-type": "application/json" },
          }
        )
      )

    render(
      <SignupForm
        actionUrl="https://api.example.com/public/tenants/signup"
        tenantName="Acme"
        initialSubdomain="acme"
      />
    )

    fillField("tenant-name-input", "Acme Corp")
    fillField("tenant-email-input", "owner@acme.com")
    fillField("tenant-password-input", "Sup3rStrongPassword!")
    fillField("tenant-subdomain-input", "acme")

    const form = screen.getByTestId("tenant-signup-form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const call = fetchMock.mock.calls[0]
    expect(call).toBeDefined()

    const [url, options] = call as [string, RequestInit]

    expect(url).toBe("https://api.example.com/public/tenants/signup")
    expect(options.method).toBe("POST")
    expect(typeof options.body).toBe("string")

    const payload = JSON.parse(options.body as string)
    expect(payload).toMatchObject({
      name: "Acme Corp",
      email: "owner@acme.com",
      subdomain: "acme",
    })

    await waitFor(() => {
      expect(screen.getByTestId("tenant-signup-feedback")).toHaveTextContent(
        "Tenant Acme was created successfully."
      )
    })

    expect((screen.getByTestId("tenant-name-input") as HTMLInputElement).value).toBe("")
  })

  it("reports errors returned by the API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "name, email, and password are required" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      )
    )

    render(
      <SignupForm actionUrl="https://api.example.com/public/tenants/signup" tenantName={null} />
    )

    fillField("tenant-name-input", "")
    fillField("tenant-email-input", "bad-email")
    fillField("tenant-password-input", "123")

    const form = screen.getByTestId("tenant-signup-form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByTestId("tenant-signup-feedback")).toHaveTextContent(
        "name, email, and password are required"
      )
    })
  })
})
