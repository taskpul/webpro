"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
exports.default = (router) => {
    const route = (0, express_1.Router)();
    // Endpoint: POST /public/tenants/signup
    router.use("/tenants/signup", route);
    route.post("/", async (req, res) => {
        const { name, email, password, subdomain } = req.body;
        const tenantSignupService = req.scope.resolve("tenantSignupService");
        try {
            const result = await tenantSignupService.signup({
                name,
                email,
                password,
                subdomain,
            });
            return res.status(201).json(result);
        }
        catch (err) {
            return res
                .status(400)
                .json({ type: "error", message: err.message || "Signup failed" });
        }
    });
    return router;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LXNpZ251cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvcm91dGVzL3B1YmxpYy90ZW5hbnQtc2lnbnVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscUNBQWdDO0FBRWhDLGtCQUFlLENBQUMsTUFBYyxFQUFFLEVBQUU7SUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBQSxnQkFBTSxHQUFFLENBQUE7SUFFdEIsd0NBQXdDO0lBQ3hDLE1BQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFFcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNqQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtRQUNyRCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFcEUsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7Z0JBQzlDLElBQUk7Z0JBQ0osS0FBSztnQkFDTCxRQUFRO2dCQUNSLFNBQVM7YUFDVixDQUFDLENBQUE7WUFDRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLE1BQU0sQ0FBQTtBQUNmLENBQUMsQ0FBQSJ9