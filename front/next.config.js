const fs = require("fs")
const path = require("path")
const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

const loadTenantConfigs = () => {
  const directory = path.join(__dirname, "config", "tenants")

  try {
    const files = fs.readdirSync(directory, { withFileTypes: true })

    return files
      .filter((file) => file.isFile() && file.name.endsWith(".json"))
      .map((file) => {
        const absolute = path.join(directory, file.name)
        const contents = fs.readFileSync(absolute, "utf-8")

        return JSON.parse(contents)
      })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "ENOENT") {
        return []
      }
    }

    throw error
  }
}

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
  env: {
    TENANT_CONFIGS: JSON.stringify(loadTenantConfigs()),
  },
}

module.exports = nextConfig
