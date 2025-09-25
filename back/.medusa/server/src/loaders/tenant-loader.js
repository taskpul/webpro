"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantConnection = getTenantConnection;
exports.tenantMiddleware = tenantMiddleware;
const typeorm_1 = require("typeorm");
const medusa_core_utils_1 = require("medusa-core-utils");
const connections = {};
async function getTenantConnection(dbName) {
    if (connections[dbName] && connections[dbName].isInitialized) {
        return connections[dbName];
    }
    const dataSource = new typeorm_1.DataSource({
        type: "postgres",
        url: `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`,
        entities: ["dist/models/*.js"], // adjust if using TS directly
        migrations: ["dist/migrations/*.js"],
        synchronize: false,
        logging: false,
    });
    await dataSource.initialize();
    connections[dbName] = dataSource;
    return dataSource;
}
async function tenantMiddleware(req, res, next) {
    const host = req.headers.host || "";
    const subdomain = host.split(".")[0];
    if (!subdomain || subdomain === "www") {
        return next();
    }
    // Fetch tenant from MAIN_DB
    const mainDb = await getTenantConnection(process.env.MAIN_DB);
    const tenant = await mainDb.query(`SELECT * FROM tenant WHERE subdomain=$1 LIMIT 1`, [
        `${subdomain}.${process.env.ROOT_DOMAIN}`,
    ]);
    if (!tenant.length) {
        throw new medusa_core_utils_1.MedusaError(medusa_core_utils_1.MedusaError.Types.NOT_FOUND, `Tenant not found for subdomain: ${subdomain}`);
    }
    const dbName = tenant[0].db_name;
    const tenantConn = await getTenantConnection(dbName);
    // Attach tenant connection to request scope
    req.scope.register({
        manager: tenantConn.manager,
    });
    next();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sb2FkZXJzL3RlbmFudC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFNQSxrREFrQkM7QUFFRCw0Q0EyQkM7QUFyREQscUNBQW9DO0FBRXBDLHlEQUErQztBQUUvQyxNQUFNLFdBQVcsR0FBK0IsRUFBRSxDQUFBO0FBRTNDLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxNQUFjO0lBQ3RELElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM3RCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxvQkFBVSxDQUFDO1FBQ2hDLElBQUksRUFBRSxVQUFVO1FBQ2hCLEdBQUcsRUFBRSxjQUFjLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE1BQU0sRUFBRTtRQUN2SCxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLDhCQUE4QjtRQUM5RCxVQUFVLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztRQUNwQyxXQUFXLEVBQUUsS0FBSztRQUNsQixPQUFPLEVBQUUsS0FBSztLQUNmLENBQUMsQ0FBQTtJQUVGLE1BQU0sVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQzdCLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUE7SUFFaEMsT0FBTyxVQUFVLENBQUE7QUFDbkIsQ0FBQztBQUVNLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3BGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQTtJQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRXBDLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxLQUFLLEtBQUssRUFBRSxDQUFDO1FBQ3RDLE9BQU8sSUFBSSxFQUFFLENBQUE7SUFDZixDQUFDO0lBRUQsNEJBQTRCO0lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFpQixDQUFDLENBQUE7SUFDdkUsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDLGlEQUFpRCxFQUFFO1FBQ25GLEdBQUcsU0FBUyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFO0tBQzFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkIsTUFBTSxJQUFJLCtCQUFXLENBQUMsK0JBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLG1DQUFtQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQ3BHLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQ2hDLE1BQU0sVUFBVSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFcEQsNENBQTRDO0lBQzVDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQ2pCLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTztLQUM1QixDQUFDLENBQUE7SUFFRixJQUFJLEVBQUUsQ0FBQTtBQUNSLENBQUMifQ==