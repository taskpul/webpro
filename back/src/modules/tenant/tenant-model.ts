import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

@Entity({ name: "tenant" })
@Index("idx_tenant_name", ["name"], { unique: true })
@Index("idx_tenant_subdomain", ["subdomain"], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "varchar", nullable: false })
  name!: string

  @Column({ type: "varchar", nullable: false })
  subdomain!: string

  @Column({ name: "db_name", type: "varchar", nullable: false })
  dbName!: string

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date
}

export default Tenant
