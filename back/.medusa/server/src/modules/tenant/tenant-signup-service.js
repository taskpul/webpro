"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const medusa_core_utils_1 = require("medusa-core-utils");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const child_process_1 = require("child_process");
const typeorm_1 = require("typeorm");
class TenantSignupService {
    constructor({ manager }) {
        this.manager = manager;
    }
    async signup(data) {
        const { name, email, password } = data;
        if (!name || !email || !password) {
            throw new medusa_core_utils_1.MedusaError(medusa_core_utils_1.MedusaError.Types.INVALID_DATA, "name, email, and password are required");
        }
        const dbName = `db_${name}`;
        const subdomain = data.subdomain || `${name}.${process.env.ROOT_DOMAIN || "example.com"}`;
        const dbUrl = `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`;
        // 1. Create tenant database if not exists
        try {
            await this.manager.query(`CREATE DATABASE ${dbName}`);
        }
        catch (e) {
            // Database might already exist → ignore error
        }
        // 2. Run migrations for tenant DB
        try {
            (0, child_process_1.execSync)(`DATABASE_URL=${dbUrl} yarn medusa migrations run`, {
                cwd: process.cwd(),
                stdio: "inherit",
            });
        }
        catch (err) {
            throw new medusa_core_utils_1.MedusaError(medusa_core_utils_1.MedusaError.Types.DB_ERROR, `Failed running migrations for tenant ${name}`);
        }
        // 3. Insert tenant record into db_main
        await this.manager.query(`
      INSERT INTO tenant (name, subdomain, db_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE
      SET subdomain = EXCLUDED.subdomain,
          db_name = EXCLUDED.db_name,
          updated_at = NOW();
    `, [name, subdomain, dbName]);
        // 4. Connect to tenant DB and create default admin user
        const tenantConnection = new typeorm_1.DataSource({
            type: "postgres",
            url: dbUrl,
            entities: ["dist/models/*.js"],
            migrations: ["dist/migrations/*.js"],
            synchronize: false,
            logging: false,
        });
        await tenantConnection.initialize();
        const hashedPass = await bcryptjs_1.default.hash(password, 10);
        await tenantConnection.query(`
      INSERT INTO public."user" (id, email, password_hash, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'admin', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    `, [email, hashedPass]);
        await tenantConnection.destroy();
        return {
            tenant: { name, subdomain, dbName },
            admin: { email },
        };
    }
}
exports.default = TenantSignupService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LXNpZ251cC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvdGVuYW50L3RlbmFudC1zaWdudXAtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHlEQUErQztBQUMvQyx3REFBNkI7QUFDN0IsaURBQXdDO0FBQ3hDLHFDQUFvQztBQVNwQyxNQUFNLG1CQUFtQjtJQUd2QixZQUFZLEVBQUUsT0FBTyxFQUE4QjtRQUNqRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtJQUN4QixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFpQjtRQUM1QixNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDdEMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSwrQkFBVyxDQUNuQiwrQkFBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQzlCLHdDQUF3QyxDQUN6QyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUE7UUFDM0IsTUFBTSxTQUFTLEdBQ2IsSUFBSSxDQUFDLFNBQVMsSUFBSSxHQUFHLElBQUksSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxhQUFhLEVBQUUsQ0FBQTtRQUV6RSxNQUFNLEtBQUssR0FBRyxjQUFjLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFBO1FBRWhJLDBDQUEwQztRQUMxQyxJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1gsOENBQThDO1FBQ2hELENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDO1lBQ0gsSUFBQSx3QkFBUSxFQUFDLGdCQUFnQixLQUFLLDZCQUE2QixFQUFFO2dCQUMzRCxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQkFDbEIsS0FBSyxFQUFFLFNBQVM7YUFDakIsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksK0JBQVcsQ0FDbkIsK0JBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUMxQix3Q0FBd0MsSUFBSSxFQUFFLENBQy9DLENBQUE7UUFDSCxDQUFDO1FBRUQsdUNBQXVDO1FBQ3ZDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQ3RCOzs7Ozs7O0tBT0QsRUFDQyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQzFCLENBQUE7UUFFRCx3REFBd0Q7UUFDeEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG9CQUFVLENBQUM7WUFDdEMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsR0FBRyxFQUFFLEtBQUs7WUFDVixRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztZQUM5QixVQUFVLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztZQUNwQyxXQUFXLEVBQUUsS0FBSztZQUNsQixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQTtRQUVGLE1BQU0sZ0JBQWdCLENBQUMsVUFBVSxFQUFFLENBQUE7UUFFbkMsTUFBTSxVQUFVLEdBQUcsTUFBTSxrQkFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEQsTUFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQzFCOzs7O0tBSUQsRUFDQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFaEMsT0FBTztZQUNMLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFO1lBQ25DLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRTtTQUNqQixDQUFBO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0JBQWUsbUJBQW1CLENBQUEifQ==