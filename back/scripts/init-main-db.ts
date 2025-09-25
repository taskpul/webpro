import { DataSource } from "typeorm"
import * as bcrypt from "bcryptjs"

async function initMainDb() {
  const connection = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.MAIN_DB,
  })

  await connection.initialize()

  // Create default super admin if not exists
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com"
  const pass = process.env.SUPER_ADMIN_PASS || "superadmin123"

  const hash = await bcrypt.hash(pass, 10)

  await connection.query(`
    INSERT INTO "user" (id, email, password_hash, role, is_super_admin, created_at, updated_at)
    VALUES (gen_random_uuid(), '${email}', '${hash}', 'admin', true, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
  `)

  console.log(`✅ Super admin ready: ${email} / ${pass}`)
  await connection.destroy()
}

initMainDb().catch((err) => {
  console.error("❌ Init failed", err)
  process.exit(1)
})
