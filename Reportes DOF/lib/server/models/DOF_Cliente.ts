// lib/server/models/DOF_Cliente.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_ClienteAttrs {
  id: number;
  Nombre: string;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_ClienteCreation = Optional<DOF_ClienteAttrs, 'id' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'>;

export class DOF_Cliente extends Model<DOF_ClienteAttrs, DOF_ClienteCreation>
  implements DOF_ClienteAttrs {
  declare id: number;
  declare Nombre: string;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_Cliente.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        Nombre: { type: DataTypes.STRING(200), allowNull: false, unique: true },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_Cliente',
        tableName: 'DOF_Cliente',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt'
      }
    );
    return DOF_Cliente;
  }
}
