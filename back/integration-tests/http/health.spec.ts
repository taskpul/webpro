import express from "express"
import type { AddressInfo } from "net"

describe("Health endpoint", () => {
  it("returns 200 OK", async () => {
    const app = express()
    app.get("/health", (_req, res) => res.sendStatus(200))
    const server = app.listen(0)
    const { port } = server.address() as AddressInfo
    const response = await fetch(`http://127.0.0.1:${port}/health`)
    expect(response.status).toBe(200)
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
