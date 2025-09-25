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
exports.TenantService = void 0;
const child_process_1 = require("child_process");
const tenant_model_1 = require("../modules/tenant/tenant-model");
const bcrypt = __importStar(require("bcryptjs"));
class TenantService {
    constructor(mainDataSource) {
        this.mainDataSource = mainDataSource;
    }
    async createTenant(tenantName) {
        const dbName = `db_${tenantName}`;
        const subdomain = `${tenantName}.${process.env.ROOT_DOMAIN}`;
        // 1. Create tenant DB
        (0, child_process_1.execSync)(`psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -tc "SELECT 1 FROM pg_database WHERE datname='${dbName}'" | grep -q 1 || psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -c "CREATE DATABASE ${dbName}"`);
        // 2. Run Medusa migrations
        (0, child_process_1.execSync)(`DATABASE_URL="postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}" yarn medusa migrations run`, { cwd: process.cwd(), stdio: "inherit" });
        // 3. Insert tenant record into db_main
        const tenantRepo = this.mainDataSource.getRepository(tenant_model_1.Tenant);
        let tenant = tenantRepo.create({ name: tenantName, subdomain, db_name: dbName });
        await tenantRepo.save(tenant);
        // 4. Create default admin
        const hashed = await bcrypt.hash(process.env.ADMIN_PASS || "admin123", 10);
        (0, child_process_1.execSync)(`psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -d ${dbName} -c "INSERT INTO public.user (id, email, password_hash, role, created_at, updated_at) VALUES (gen_random_uuid(), 'admin@${tenantName}.com', '${hashed}', 'admin', NOW(), NOW()) ON CONFLICT (email) DO NOTHING;"`);
        return { tenantName, dbName, subdomain };
    }
    async deleteTenant(tenantName) {
        const dbName = `db_${tenantName}`;
        // 1. Delete tenant record
        const tenantRepo = this.mainDataSource.getRepository(tenant_model_1.Tenant);
        await tenantRepo.delete({ name: tenantName });
        // 2. Drop tenant DB
        (0, child_process_1.execSync)(`psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -c "DROP DATABASE IF EXISTS ${dbName}"`);
        return { deleted: tenantName };
    }
    async listTenants() {
        const tenantRepo = this.mainDataSource.getRepository(tenant_model_1.Tenant);
        return tenantRepo.find();
    }
}
exports.TenantService = TenantService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc2VydmljZXMvdGVuYW50LXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsaURBQXdDO0FBQ3hDLGlFQUF1RDtBQUN2RCxpREFBa0M7QUFFbEMsTUFBYSxhQUFhO0lBR3hCLFlBQVksY0FBMEI7UUFDcEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUE7SUFDdEMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsVUFBa0I7UUFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLFNBQVMsR0FBRyxHQUFHLFVBQVUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBRTVELHNCQUFzQjtRQUN0QixJQUFBLHdCQUFRLEVBQ04sV0FBVyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sa0RBQWtELE1BQU0sNkJBQTZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyx3QkFBd0IsTUFBTSxHQUFHLENBQ2hSLENBQUE7UUFFRCwyQkFBMkI7UUFDM0IsSUFBQSx3QkFBUSxFQUNOLDRCQUE0QixPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxNQUFNLDhCQUE4QixFQUM1SixFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUN6QyxDQUFBO1FBRUQsdUNBQXVDO1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLHFCQUFNLENBQUMsQ0FBQTtRQUM1RCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDaEYsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTdCLDBCQUEwQjtRQUMxQixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLElBQUEsd0JBQVEsRUFDTixXQUFXLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxPQUFPLE1BQU0sMkhBQTJILFVBQVUsV0FBVyxNQUFNLDREQUE0RCxDQUNsVCxDQUFBO1FBRUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsVUFBa0I7UUFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUVqQywwQkFBMEI7UUFDMUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMscUJBQU0sQ0FBQyxDQUFBO1FBQzVELE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRTdDLG9CQUFvQjtRQUNwQixJQUFBLHdCQUFRLEVBQ04sV0FBVyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sZ0NBQWdDLE1BQU0sR0FBRyxDQUM1SCxDQUFBO1FBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDZixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxxQkFBTSxDQUFDLENBQUE7UUFDNUQsT0FBTyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDMUIsQ0FBQztDQUNGO0FBdkRELHNDQXVEQyJ9