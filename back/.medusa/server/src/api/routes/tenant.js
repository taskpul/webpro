"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_service_1 = require("../../services/tenant-service");
const typeorm_1 = require("typeorm");
const tenant_model_1 = require("../../modules/tenant/tenant-model");
const super_admin_middleware_1 = require("../../middleware/super-admin-middleware");
exports.default = (app) => {
    const router = (0, express_1.Router)();
    app.use("/tenants", router);
    const mainDataSource = new typeorm_1.DataSource({
        type: "postgres",
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.MAIN_DB,
        entities: [tenant_model_1.Tenant],
    });
    let tenantService;
    mainDataSource.initialize().then(() => {
        tenantService = new tenant_service_1.TenantService(mainDataSource);
    });
    // ✅ Protect with requireSuperAdmin
    router.post("/", super_admin_middleware_1.requireSuperAdmin, async (req, res) => {
        const { name } = req.body;
        const result = await tenantService.createTenant(name);
        res.json(result);
    });
    router.delete("/:name", super_admin_middleware_1.requireSuperAdmin, async (req, res) => {
        const result = await tenantService.deleteTenant(req.params.name);
        res.json(result);
    });
    // List tenants (can be public or protected, your choice)
    router.get("/", super_admin_middleware_1.requireSuperAdmin, async (req, res) => {
        const tenants = await tenantService.listTenants();
        res.json(tenants);
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS9yb3V0ZXMvdGVuYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscUNBQWdDO0FBQ2hDLGtFQUE2RDtBQUM3RCxxQ0FBb0M7QUFDcEMsb0VBQTBEO0FBQzFELG9GQUEyRTtBQUUzRSxrQkFBZSxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sR0FBRSxDQUFBO0lBQ3ZCLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBRTNCLE1BQU0sY0FBYyxHQUFHLElBQUksb0JBQVUsQ0FBQztRQUNwQyxJQUFJLEVBQUUsVUFBVTtRQUNoQixJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1FBQ3pCLElBQUksRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDO1FBQzdDLFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU87UUFDN0IsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTztRQUM3QixRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1FBQzdCLFFBQVEsRUFBRSxDQUFDLHFCQUFNLENBQUM7S0FDbkIsQ0FBQyxDQUFBO0lBRUYsSUFBSSxhQUE0QixDQUFBO0lBRWhDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ3BDLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixtQ0FBbUM7SUFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsMENBQWlCLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNyRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtRQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckQsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLDBDQUFpQixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLHlEQUF5RDtJQUN6RCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSwwQ0FBaUIsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3BELE1BQU0sT0FBTyxHQUFHLE1BQU0sYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2pELEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDLENBQUEifQ==