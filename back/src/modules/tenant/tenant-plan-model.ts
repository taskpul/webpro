import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm"

@Entity({ name: "tenant_plan" })
export class TenantPlan {
  @PrimaryColumn({ type: "varchar" })
  id!: string

  @Column({ type: "varchar", nullable: false })
  name!: string

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date
}

export default TenantPlan
