const fs = require("fs")
const path = require("path")

const checkEnvVariables = require("./check-env-variables")

const loadTenantSnapshot = () => {
  const directory =
    process.env.TENANT_CONFIG_DIR ?? path.join(__dirname, "config", "tenants")

  try {
    const files = fs.readdirSync(directory)

    const configs = files
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => {
        const absolute = path.join(directory, file)
        const data = fs.readFileSync(absolute, "utf-8")

        try {
          return JSON.parse(data)
        } catch (error) {
          console.warn(
            `⚠️  Failed to parse tenant config ${file}: ${(error && error.message) || error}`
          )
          return null
        }
      })
      .filter((config) => config !== null)

    return JSON.stringify(configs)
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.warn(
        `⚠️  Unable to read tenant configs from ${directory}: ${(error && error.message) || error}`
      )
    }

    return "[]"
  }
}

const tenantConfigSnapshot = loadTenantSnapshot()

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_TENANT_CONFIG_SNAPSHOT: tenantConfigSnapshot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
    ],
  },
}

module.exports = nextConfig
