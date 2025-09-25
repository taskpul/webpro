import { Entity, Column } from "typeorm"
import { User as MedusaUser } from "@medusajs/medusa/dist/models/user"

@Entity()
export class UserExtended extends MedusaUser {
  @Column({ type: "boolean", default: false })
  is_super_admin: boolean
}
