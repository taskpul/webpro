"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tenant_1 = __importDefault(require("./routes/tenant"));
exports.default = (rootDirectory, container) => {
    // other routes...
    (0, tenant_1.default)(container.router);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYXBpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNkRBQTBDO0FBRTFDLGtCQUFlLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQzFDLGtCQUFrQjtJQUNsQixJQUFBLGdCQUFZLEVBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ2hDLENBQUMsQ0FBQSJ9