"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
exports.default = (router) => {
    const route = (0, express_1.Router)();
    // Endpoint: GET /public/tenants
    router.use("/", route);
    route.get("/", async (req, res) => {
        const tenantService = req.scope.resolve("tenantService");
        try {
            const tenants = await tenantService.list();
            return res.json({ tenants });
        }
        catch (err) {
            return res
                .status(500)
                .json({ type: "error", message: err.message || "Failed to fetch tenants" });
        }
    });
    return router;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvcm91dGVzL3B1YmxpYy90ZW5hbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscUNBQWdDO0FBRWhDLGtCQUFlLENBQUMsTUFBYyxFQUFFLEVBQUU7SUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBQSxnQkFBTSxHQUFFLENBQUE7SUFFdEIsZ0NBQWdDO0lBQ2hDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBRXRCLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDaEMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFeEQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDMUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNsQixPQUFPLEdBQUc7aUJBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQztpQkFDWCxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxJQUFJLHlCQUF5QixFQUFFLENBQUMsQ0FBQTtRQUMvRSxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLE1BQU0sQ0FBQTtBQUNmLENBQUMsQ0FBQSJ9