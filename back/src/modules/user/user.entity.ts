import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  email: string

  @Column({ type: "varchar", nullable: true })
  password_hash: string | null

  @Column({ type: "varchar", default: "member" })
  role: string

  @Column({ type: "boolean", default: false })
  is_super_admin: boolean

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
