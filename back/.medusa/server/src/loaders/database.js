"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.MAIN_DB,
    entities: ["dist/models/*.js"],
    migrations: ["dist/migrations/*.js"],
    synchronize: false,
    logging: true,
});
exports.default = AppDataSource;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbG9hZGVycy9kYXRhYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFvQztBQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLG9CQUFVLENBQUM7SUFDbkMsSUFBSSxFQUFFLFVBQVU7SUFDaEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTztJQUN6QixJQUFJLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE1BQU0sRUFBRSxFQUFFLENBQUM7SUFDakQsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTztJQUM3QixRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPO0lBQzdCLFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU87SUFDN0IsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUM7SUFDOUIsVUFBVSxFQUFFLENBQUMsc0JBQXNCLENBQUM7SUFDcEMsV0FBVyxFQUFFLEtBQUs7SUFDbEIsT0FBTyxFQUFFLElBQUk7Q0FDZCxDQUFDLENBQUE7QUFFRixrQkFBZSxhQUFhLENBQUEifQ==