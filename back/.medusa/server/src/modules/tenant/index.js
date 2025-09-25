"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const awilix_1 = require("awilix");
const tenant_service_1 = __importDefault(require("./tenant-service"));
const tenant_signup_service_1 = __importDefault(require("./tenant-signup-service"));
const register = (container) => {
    container.register({
        tenantService: (0, awilix_1.asClass)(tenant_service_1.default).singleton(),
        tenantSignupService: (0, awilix_1.asClass)(tenant_signup_service_1.default).singleton(),
    });
};
exports.default = register;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy90ZW5hbnQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxtQ0FBZ0M7QUFDaEMsc0VBQTRDO0FBQzVDLG9GQUF5RDtBQUV6RCxNQUFNLFFBQVEsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFO0lBQzdCLFNBQVMsQ0FBQyxRQUFRLENBQUM7UUFDakIsYUFBYSxFQUFFLElBQUEsZ0JBQU8sRUFBQyx3QkFBYSxDQUFDLENBQUMsU0FBUyxFQUFFO1FBQ2pELG1CQUFtQixFQUFFLElBQUEsZ0JBQU8sRUFBQywrQkFBbUIsQ0FBQyxDQUFDLFNBQVMsRUFBRTtLQUM5RCxDQUFDLENBQUE7QUFDSixDQUFDLENBQUE7QUFFRCxrQkFBZSxRQUFRLENBQUEifQ==