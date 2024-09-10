import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({timestamps: false})
export class FlowEntity extends Model<FlowEntity> {
  @Column({
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
    type: DataType.UUID,
  })
  id: string; 

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  userData: string; 
}