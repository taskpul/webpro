import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/lib/tenants/__tests__/**/*.test.ts",
      "src/app/public/tenants/signup/__tests__/**/*.test.tsx",
    ],
    environmentMatchGlobs: [
      ["src/app/public/tenants/signup/__tests__/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "src/lib"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@pages": path.resolve(__dirname, "src/pages"),
    },
  },
})
