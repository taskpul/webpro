import type { Request, Response } from "express"

type QueryValue = string | string[] | undefined

type NormalizedEnv = {
  networkHosts: Set<string>
  rootDomain: string | null
  wordpressSignupUrl: string | null
  wordpressSignupDomain: string | null
  wordpressSignupPath: string
  wordpressSignupProtocol: string | null
  storefrontBaseUrl: string | null
}

const parseList = (value?: string | null): Set<string> => {
  if (!value) {
    return new Set()
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  )
}

const normalizeHost = (host?: string | null): string | null => {
  if (!host) {
    return null
  }

  const raw = host.split(",").shift()?.trim().toLowerCase() ?? ""

  if (!raw) {
    return null
  }

  if (raw.startsWith("[") && raw.includes("]")) {
    return raw.slice(0, raw.indexOf("]") + 1)
  }

  const portIndex = raw.indexOf(":")
  if (portIndex !== -1) {
    return raw.slice(0, portIndex)
  }

  return raw
}

const headerValue = (value?: string | string[]): string | null => {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

const extractQueryValue = (value: QueryValue): string | null => {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === "string" ? first : null
  }

  return typeof value === "string" ? value : null
}

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const ensureUrl = (value: string): URL | null => {
  try {
    return new URL(value)
  } catch (error) {
    if (!value.includes("://")) {
      try {
        return new URL(`https://${value}`)
      } catch {
        return null
      }
    }

    return null
  }
}

const appendQueryParams = (target: URL, query: Request["query"]): void => {
  Object.entries(query).forEach(([key, rawValue]) => {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((entry) => {
        if (typeof entry === "string") {
          target.searchParams.append(key, entry)
        }
      })
      return
    }

    if (typeof rawValue === "string") {
      target.searchParams.append(key, rawValue)
    }
  })
}

const loadEnv = (): NormalizedEnv => ({
  networkHosts: parseList(process.env.WORDPRESS_NETWORK_HOSTS ?? null),
  rootDomain: process.env.ROOT_DOMAIN?.trim().toLowerCase() || null,
  wordpressSignupUrl: process.env.WORDPRESS_SIGNUP_URL?.trim() || null,
  wordpressSignupDomain: process.env.WORDPRESS_SIGNUP_DOMAIN?.trim().toLowerCase() || null,
  wordpressSignupPath: process.env.WORDPRESS_SIGNUP_PATH?.trim() || "/wp-signup.php",
  wordpressSignupProtocol: process.env.WORDPRESS_SIGNUP_PROTOCOL?.trim().toLowerCase() || null,
  storefrontBaseUrl:
    process.env.TENANT_SIGNUP_STOREFRONT_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    null,
})

const buildWordPressUrl = (
  env: NormalizedEnv,
  host: string | null,
  protocol: string
): URL | null => {
  const signupPath = env.wordpressSignupPath.startsWith("/")
    ? env.wordpressSignupPath
    : `/${env.wordpressSignupPath}`

  if (env.wordpressSignupUrl) {
    const explicit = ensureUrl(env.wordpressSignupUrl)
    if (explicit) {
      if (!explicit.pathname || explicit.pathname === "/") {
        explicit.pathname = signupPath
      }
      return explicit
    }
  }

  const targetHost = env.wordpressSignupDomain || host
  if (!targetHost) {
    return null
  }

  try {
    const resolvedProtocol = env.wordpressSignupProtocol || protocol || "https"
    return new URL(`${resolvedProtocol}://${targetHost}${signupPath}`)
  } catch {
    return null
  }
}

const shouldUseWordPress = (env: NormalizedEnv, host: string | null): boolean => {
  if (env.wordpressSignupUrl || env.wordpressSignupDomain) {
    return true
  }

  if (!host) {
    return false
  }

  if (env.networkHosts.has(host)) {
    return true
  }

  if (env.rootDomain && env.rootDomain === host) {
    return true
  }

  return false
}

const resolveProtocol = (req: Request): string => {
  const forwarded = headerValue(req.headers["x-forwarded-proto"])?.split(",")[0]
  if (forwarded) {
    return forwarded
  }

  return req.protocol || "https"
}

const resolveHost = (req: Request): string | null => {
  const forwarded = headerValue(req.headers["x-forwarded-host"])
  const normalizedForwarded = normalizeHost(forwarded)
  if (normalizedForwarded) {
    return normalizedForwarded
  }

  return normalizeHost(req.headers.host ?? null)
}

const buildStorefrontUrl = (env: NormalizedEnv, path: string): URL | null => {
  if (!env.storefrontBaseUrl) {
    return null
  }

  const base = ensureUrl(env.storefrontBaseUrl)
  if (!base) {
    return null
  }

  try {
    return new URL(path, base)
  } catch {
    return null
  }
}

const resolveActionPath = (req: Request): string => {
  const original = req.originalUrl?.split("?")[0]
  if (original) {
    return original
  }

  const combined = `${req.baseUrl ?? ""}${req.path ?? ""}`
  return combined || "/public/tenants/signup"
}

const prefillSubdomain = (req: Request): string | null => {
  const candidate =
    extractQueryValue(req.query.subdomain as QueryValue) ??
    extractQueryValue(req.query.tenant as QueryValue) ??
    extractQueryValue(req.query.site as QueryValue)

  return candidate?.trim() ? candidate.trim() : null
}

const applyWordPressQuery = (
  url: URL,
  req: Request,
  siteSlug: string | null
): void => {
  if (siteSlug) {
    url.searchParams.set("new", siteSlug)
  }

  appendQueryParams(url, req.query)
}

export const handleTenantSignupGet = (req: Request, res: Response): void => {
  const env = loadEnv()
  const host = resolveHost(req)
  const protocol = resolveProtocol(req)
  const siteSlug = prefillSubdomain(req)

  if (shouldUseWordPress(env, host)) {
    const wordpressUrl = buildWordPressUrl(env, host, protocol)

    if (wordpressUrl) {
      applyWordPressQuery(wordpressUrl, req, siteSlug)
      res.redirect(302, wordpressUrl.toString())
      return
    }
  }

  const storefrontUrl = buildStorefrontUrl(env, "/public/tenants/signup")

  if (storefrontUrl) {
    appendQueryParams(storefrontUrl, req.query)
    res.redirect(302, storefrontUrl.toString())
    return
  }

  const actionPath = escapeAttribute(resolveActionPath(req))
  const subdomainPrefill = escapeAttribute(siteSlug ?? "")

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Medusa Tenant Signup</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: #f9fafb;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
        max-width: 480px;
        width: 100%;
        padding: 32px;
        box-sizing: border-box;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 600;
        color: #0f172a;
      }
      p {
        margin: 0 0 24px;
        color: #475569;
        line-height: 1.5;
      }
      label {
        display: block;
        font-weight: 500;
        margin-bottom: 6px;
        color: #0f172a;
      }
      input {
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #cbd5f5;
        font-size: 16px;
        box-sizing: border-box;
        margin-bottom: 16px;
      }
      button {
        width: 100%;
        padding: 12px;
        font-size: 16px;
        border: none;
        border-radius: 8px;
        background: #2563eb;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      small {
        display: block;
        color: #64748b;
        margin-top: 4px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Provision a Medusa storefront</h1>
      <p>Complete the form below to create a tenant storefront. After submitting, you will receive an email with next steps to access your workspace.</p>
      <form method="post" action="${actionPath}">
        <label for="name">Tenant name</label>
        <input id="name" name="name" type="text" required autocomplete="organization" />
        <label for="email">Admin email</label>
        <input id="email" name="email" type="email" required autocomplete="email" />
        <label for="password">Admin password</label>
        <input id="password" name="password" type="password" required autocomplete="new-password" />
        <label for="subdomain">Requested subdomain</label>
        <input id="subdomain" name="subdomain" type="text" value="${subdomainPrefill}" autocomplete="off" />
        <small>Leave the subdomain blank to generate it from the tenant name.</small>
        <button type="submit">Create storefront</button>
      </form>
    </main>
  </body>
</html>`

  res.status(200).type("text/html; charset=utf-8").send(html)
}

export const __testables = {
  loadEnv,
  normalizeHost,
  ensureUrl,
  appendQueryParams,
  resolveActionPath,
  prefillSubdomain,
  shouldUseWordPress,
}
