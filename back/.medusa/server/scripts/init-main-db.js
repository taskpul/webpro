"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
async function initMainDb() {
    const connection = new typeorm_1.DataSource({
        type: "postgres",
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.MAIN_DB,
    });
    await connection.initialize();
    // Create default super admin if not exists
    const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
    const pass = process.env.SUPER_ADMIN_PASS || "superadmin123";
    const hash = await bcrypt.hash(pass, 10);
    await connection.query(`
    INSERT INTO "user" (id, email, password_hash, role, is_super_admin, created_at, updated_at)
    VALUES (gen_random_uuid(), '${email}', '${hash}', 'admin', true, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
  `);
    console.log(`✅ Super admin ready: ${email} / ${pass}`);
    await connection.destroy();
}
initMainDb().catch((err) => {
    console.error("❌ Init failed", err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC1tYWluLWRiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc2NyaXB0cy9pbml0LW1haW4tZGIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxxQ0FBb0M7QUFDcEMsaURBQWtDO0FBRWxDLEtBQUssVUFBVSxVQUFVO0lBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQVUsQ0FBQztRQUNoQyxJQUFJLEVBQUUsVUFBVTtRQUNoQixJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1FBQ3pCLElBQUksRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDO1FBQzdDLFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU87UUFDN0IsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTztRQUM3QixRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPO0tBQzlCLENBQUMsQ0FBQTtJQUVGLE1BQU0sVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBRTdCLDJDQUEyQztJQUMzQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLHdCQUF3QixDQUFBO0lBQ3ZFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksZUFBZSxDQUFBO0lBRTVELE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFFeEMsTUFBTSxVQUFVLENBQUMsS0FBSyxDQUFDOztrQ0FFUyxLQUFLLE9BQU8sSUFBSTs7R0FFL0MsQ0FBQyxDQUFBO0lBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUE7SUFDdEQsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7QUFDNUIsQ0FBQztBQUVELFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDakIsQ0FBQyxDQUFDLENBQUEifQ==