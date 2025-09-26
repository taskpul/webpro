export type PostgresConnectionConfig = {
  host: string
  database: string
  username?: string | null
  password?: string | null
  port?: string | number | null
}

const hasValue = (value: string | number | null | undefined): value is string | number => {
  if (value === null || typeof value === "undefined") {
    return false
  }

  if (typeof value === "number") {
    return true
  }

  return value.trim().length > 0
}

export const buildPostgresConnectionUrl = (config: PostgresConnectionConfig) => {
  const { host, database } = config

  if (!host || host.trim().length === 0) {
    throw new Error("Postgres host must be provided to build a connection URL")
  }

  if (!database || database.trim().length === 0) {
    throw new Error("Postgres database name must be provided to build a connection URL")
  }

  const encode = (value: string) => encodeURIComponent(value)

  const username = config.username ?? ""
  const password = config.password ?? ""

  const hasUser = username.length > 0
  const hasPassword = password.length > 0

  let authSegment = ""

  if (hasUser || hasPassword) {
    const encodedUser = hasUser ? encode(username) : ""
    const encodedPassword = hasPassword ? encode(password) : ""

    authSegment = `${encodedUser}${hasPassword ? `:${encodedPassword}` : ""}@`
  }

  const portSegment = hasValue(config.port) ? `:${config.port}` : ""

  return `postgres://${authSegment}${host}${portSegment}/${database}`
}
