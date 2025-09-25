import { DataSource } from "typeorm"
import bcrypt from "bcryptjs"

// Load env variables
const dbUser = process.env.DB_USER || "medusauser"
const dbPass = process.env.DB_PASS || "micro123456"
const dbHost = process.env.DB_HOST || "localhost"
const dbPort = process.env.DB_PORT || "5432"
const mainDb = process.env.MAIN_DB || "db_main"

const connectionString = `postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${mainDb}`

const AppDataSource = new DataSource({
  type: "postgres",
  url: connectionString,
})

async function createSuperAdmin() {
  await AppDataSource.initialize()

  const email = process.env.SUPERADMIN_EMAIL || "superadmin@example.com"
  const password = process.env.SUPERADMIN_PASS || "supersecret"

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Ensure unique constraint on email exists
  await AppDataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'user' AND indexname = 'user_email_unique'
      ) THEN
        ALTER TABLE "user" ADD CONSTRAINT user_email_unique UNIQUE (email);
      END IF;
    END$$;
  `)

  // Insert or update super admin user
  await AppDataSource.query(
    `
    INSERT INTO "user" (id, email, password_hash, role, is_super_admin, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, 'admin', true, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_super_admin = true,
        role = 'admin',
        updated_at = NOW();
  `,
    [email, passwordHash]
  )

  console.log(`✅ Super admin created: ${email} / ${password}`)
  await AppDataSource.destroy()
}

createSuperAdmin().catch((err) => {
  console.error("❌ Failed to create super admin:", err)
  process.exit(1)
})
