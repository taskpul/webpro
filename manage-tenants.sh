#!/bin/bash
# Usage:
#   ./manage-tenants.sh --check            -> test connection and config
#   ./manage-tenants.sh --init             -> create db_main and tenant table
#   ./manage-tenants.sh ns1                -> create tenant db_ns1 + admin
#   ./manage-tenants.sh --delete ns1       -> delete tenant ns1 + db_ns1
#   ./manage-tenants.sh --list             -> list tenants from db_main

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/back/.env"
BACKEND_DIR="$SCRIPT_DIR/back"
FRONTEND_DIR="$SCRIPT_DIR/front"
DEFAULT_TENANT_EXPORT_ROOT="$SCRIPT_DIR/tenants-config"

# Ensure Node-based tooling runs from the backend project directory
export MEDUSA_PROJECT_DIR="$BACKEND_DIR"

# Load env vars (including WordPress multisite settings)
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "❌ .env file not found at $ENV_FILE"
  exit 1
fi

# Derive shared export directories
TENANT_CONFIG_ROOT="${TENANT_CONFIG_ROOT:-$DEFAULT_TENANT_EXPORT_ROOT}"
NEXT_TENANT_CONFIG_DIR="${NEXT_TENANT_CONFIG_DIR:-$FRONTEND_DIR/config/tenants}"
WORDPRESS_THEME_CONFIG_DIR="${WORDPRESS_THEME_CONFIG_DIR:-$TENANT_CONFIG_ROOT/wordpress/tenants}"

# --- Pre-checks ---
check_command() {
  local cmd=$1
  local install_hint=$2
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ Missing prerequisite: $cmd"
    [ -n "$install_hint" ] && echo "   ➜ $install_hint"
    exit 1
  fi
}

check_command "psql" "Install PostgreSQL client tools and ensure 'psql' is on your PATH."
check_command "node" "Install Node.js v20 or later."
check_command "yarn" "Install Yarn globally with: npm install -g yarn"

if [ ! -x "$BACKEND_DIR/node_modules/.bin/medusa" ]; then
  echo "❌ Medusa CLI is not installed. Run 'cd $BACKEND_DIR && yarn install' first."
  exit 1
fi

mkdir -p "$TENANT_CONFIG_ROOT" "$NEXT_TENANT_CONFIG_DIR" "$WORDPRESS_THEME_CONFIG_DIR"

REQUIRED_ENV_VARS=(DB_USER DB_PASS DB_HOST DB_PORT MAIN_DB ROOT_DOMAIN)
for var in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    echo "   ➜ Define $var in $ENV_FILE"
    exit 1
  fi
done

if [ -n "$WORDPRESS_NETWORK_ID" ]; then
  echo "ℹ️  Targeting WordPress network ID: $WORDPRESS_NETWORK_ID"
fi

check_env_and_db() {
  echo "🔎 Checking environment..."
  echo "  DB_USER=$DB_USER"
  echo "  DB_HOST=$DB_HOST"
  echo "  DB_PORT=$DB_PORT"
  echo "  MAIN_DB=$MAIN_DB"
  echo "  ROOT_DOMAIN=$ROOT_DOMAIN"
  echo "  NEXT CONFIG DIR=$NEXT_TENANT_CONFIG_DIR"
  echo "  WORDPRESS CONFIG DIR=$WORDPRESS_THEME_CONFIG_DIR"

  echo "🔎 Testing Postgres connection..."
  if PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "\q" &>/dev/null; then
    echo "✅ Connection successful"
  else
    echo "❌ Cannot connect to Postgres. Check DB_USER/DB_PASS/DB_HOST/DB_PORT in .env"
    exit 1
  fi

  echo "🔎 Checking if MAIN_DB exists..."
  if PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -tc "SELECT 1 FROM pg_database WHERE datname='$MAIN_DB';" | grep -q 1; then
    echo "✅ MAIN_DB '$MAIN_DB' exists"
  else
    echo "⚠️ MAIN_DB '$MAIN_DB' does not exist yet. Run: ./manage-tenants.sh --init"
  fi
}

init_main_db() {
  echo "🚀 Creating MAIN_DB: $MAIN_DB"

  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -tc "SELECT 1 FROM pg_database WHERE datname = '$MAIN_DB'" | grep -q 1 || \
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "CREATE DATABASE $MAIN_DB"

  echo "📦 Running migration for tenant table..."
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $MAIN_DB -c "
    CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";
    CREATE TABLE IF NOT EXISTS tenant (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL,
      subdomain text UNIQUE NOT NULL,
      db_name text UNIQUE NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_tenant_name ON tenant(name);
    CREATE INDEX IF NOT EXISTS idx_tenant_subdomain ON tenant(subdomain);
  "

  echo "✅ MAIN_DB $MAIN_DB initialized (tenant registry ready)"
}

create_tenant() {
  TENANT_NAME=$1
  DB_NAME="db_${TENANT_NAME}"
  SUBDOMAIN="${TENANT_NAME}.${ROOT_DOMAIN}"

  if [ -z "$TENANT_NAME" ]; then
    echo "❌ Usage: ./manage-tenants.sh <tenant_name>"
    exit 1
  fi

  echo "🚀 Creating tenant: $TENANT_NAME"
  echo "   Database: $DB_NAME"
  echo "   Subdomain: $SUBDOMAIN"

  # Create tenant database
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "CREATE DATABASE $DB_NAME"

  # Run Medusa migrations for the tenant using the provisioning script
  pushd "$BACKEND_DIR" >/dev/null || exit 1
  DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" \
  yarn medusa exec ./scripts/run-tenant-migrations.ts || { echo "❌ Tenant migration workflow failed"; popd >/dev/null; exit 1; }
  popd >/dev/null || exit 1

  # Insert tenant record into db_main
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $MAIN_DB -c "
    INSERT INTO tenant (name, subdomain, db_name, created_at, updated_at)
    VALUES ('$TENANT_NAME', '$SUBDOMAIN', '$DB_NAME', NOW(), NOW())
    ON CONFLICT (name) DO UPDATE
    SET subdomain=EXCLUDED.subdomain, db_name=EXCLUDED.db_name, updated_at=NOW();
  "

  # ✅ Create default admin using Medusa CLI
  DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" \
  yarn medusa user -e admin@$TENANT_NAME.com -p ${ADMIN_PASS:-admin123} || {
    echo "⚠️ Failed to create admin via Medusa CLI"
  }

  TENANT_CONFIG_CONTENT="$(cat <<JSON
{
  "tenant": "$TENANT_NAME",
  "hostname": "$SUBDOMAIN",
  "rootDomain": "$ROOT_DOMAIN",
  "wordpress": {
    "networkId": "${WORDPRESS_NETWORK_ID:-}",
    "siteSlug": "$TENANT_NAME"
  },
  "storefront": {
    "medusaUrl": "${MEDUSA_BACKEND_URL:-http://localhost:9000}",
    "publishableKey": "${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}"
  }
}
JSON
)"

  echo "$TENANT_CONFIG_CONTENT" > "$NEXT_TENANT_CONFIG_DIR/${TENANT_NAME}.json"
  echo "$TENANT_CONFIG_CONTENT" > "$WORDPRESS_THEME_CONFIG_DIR/${TENANT_NAME}.json"

  echo "✅ Tenant $TENANT_NAME created successfully!"
  echo "   Admin login: admin@$TENANT_NAME.com / ${ADMIN_PASS:-admin123}"
}

delete_tenant() {
  TENANT_NAME=$1
  DB_NAME="db_${TENANT_NAME}"

  if [ -z "$TENANT_NAME" ]; then
    echo "❌ Usage: ./manage-tenants.sh --delete <tenant_name>"
    exit 1
  fi

  echo "⚠️ Deleting tenant: $TENANT_NAME"

  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $MAIN_DB -c "DELETE FROM tenant WHERE name = '$TENANT_NAME';"
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -c "DROP DATABASE IF EXISTS $DB_NAME;"
  rm -f "$NEXT_TENANT_CONFIG_DIR/${TENANT_NAME}.json" "$WORDPRESS_THEME_CONFIG_DIR/${TENANT_NAME}.json"

  echo "✅ Tenant $TENANT_NAME deleted successfully!"
}

list_tenants() {
  echo "📋 Tenants in MAIN_DB ($MAIN_DB):"
  PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $MAIN_DB -c "SELECT id, name, subdomain, db_name, created_at FROM tenant ORDER BY created_at;"
}

# Command dispatcher
case $1 in
  --check)
    check_env_and_db
    ;;
  --init)
    init_main_db
    ;;
  --delete)
    delete_tenant $2
    ;;
  --list)
    list_tenants
    ;;
  *)
    create_tenant $1
    ;;
esac
