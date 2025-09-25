"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
exports.default = (router) => {
    const route = (0, express_1.Router)();
    // Register under `/public` instead of `/store`
    router.use("/public/tenants/signup", route);
    route.post("/", async (req, res) => {
        const { name, email, password, subdomain } = req.body;
        const tenantSignupService = req.scope.resolve("tenantSignupService");
        const result = await tenantSignupService.signup({ name, email, password, subdomain });
        res.json(result);
    });
    return router;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LXNpZ251cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvcm91dGVzL3N0b3JlL3RlbmFudC1zaWdudXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBZ0M7QUFFaEMsa0JBQWUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtJQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFBLGdCQUFNLEdBQUUsQ0FBQTtJQUN0QiwrQ0FBK0M7SUFDL0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUUzQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2pDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFBO1FBQ3JELE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLE1BQU0sR0FBRyxNQUFNLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDckYsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sTUFBTSxDQUFBO0FBQ2YsQ0FBQyxDQUFBIn0=