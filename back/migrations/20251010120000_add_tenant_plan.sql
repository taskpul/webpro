CREATE TABLE IF NOT EXISTS tenant_plan (
  id text PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_plan_active ON tenant_plan(is_active);

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS plan_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_plan_id_fkey'
      AND table_name = 'tenant'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE tenant
      ADD CONSTRAINT tenant_plan_id_fkey
      FOREIGN KEY (plan_id)
      REFERENCES tenant_plan(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_plan_id ON tenant(plan_id);
