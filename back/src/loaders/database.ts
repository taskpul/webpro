import { DataSource } from "typeorm"

const AppDataSource = new DataSource({
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
})

export default AppDataSource
