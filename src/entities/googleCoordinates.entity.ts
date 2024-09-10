import { Column, DataType, Table, Model } from 'sequelize-typescript';

@Table({})
export class GoogleCoordinatesEntity extends Model<GoogleCoordinatesEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lat: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lng: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  bearing: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  googleResponse: string;
}
