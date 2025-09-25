#!/bin/bash
# Usage:
#   ./manage-tenants.sh --check            -> test connection and config
#   ./manage-tenants.sh --init             -> create db_main and tenant table
#   ./manage-tenants.sh ns1                -> create tenant db_ns1 + admin
#   ./manage-tenants.sh --delete ns1       -> delete tenant ns1 + db_ns1
#   ./manage-tenants.sh --list             -> list tenants from db_main

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/we/.env"
BACKEND_DIR="$SCRIPT_DIR/we"
FRONTEND_DIR="$SCRIPT_DIR/we-storefront"

# Load env vars
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' $ENV_FILE | xargs)
else
  echo "❌ .env file not found at $ENV_FILE"
  exit 1
fi

# --- Pre-checks ---
# 1. Yarn check
if ! command -v yarn &> /dev/null; then
  echo "❌ Yarn is not installed. Please install with: npm install -g yarn"
  exit 1
fi

# 2. Frontend config directory check
if [ ! -d "$FRONTEND_DIR/config" ]; then
  echo "⚠️  Creating missing directory: $FRONTEND_DIR/config"
  mkdir -p "$FRONTEND_DIR/config"
fi

check_env_and_db() {
  echo "🔎 Checking environment..."
  echo "  DB_USER=$DB_USER"
  echo "  DB_HOST=$DB_HOST"
  echo "  DB_PORT=$DB_PORT"
  echo "  MAIN_DB=$MAIN_DB"
  echo "  ROOT_DOMAIN=$ROOT_DOMAIN"

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

  # Run Medusa migrations inside tenant DB (Medusa v2 syntax)
  cd $BACKEND_DIR
  DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" \
  yarn medusa db:migrate || { echo "❌ Medusa migrations failed"; exit 1; }

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

  # Write frontend config file
  echo "{ \"tenant\": \"$TENANT_NAME\", \"subdomain\": \"$SUBDOMAIN\" }" > $FRONTEND_DIR/config/${TENANT_NAME}.json

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
  rm -f $FRONTEND_DIR/config/${TENANT_NAME}.json

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
