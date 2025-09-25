-- Create tenant table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Add super_admin flag to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
