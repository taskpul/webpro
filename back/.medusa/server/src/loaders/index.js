"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tenant_loader_1 = require("./tenant-loader");
exports.default = async ({ app }) => {
    // attach tenant middleware before routes
    app.use(tenant_loader_1.tenantMiddleware);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbG9hZGVycy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1EQUFrRDtBQUVsRCxrQkFBZSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO0lBQy9CLHlDQUF5QztJQUN6QyxHQUFHLENBQUMsR0FBRyxDQUFDLGdDQUFnQixDQUFDLENBQUE7QUFDM0IsQ0FBQyxDQUFBIn0=