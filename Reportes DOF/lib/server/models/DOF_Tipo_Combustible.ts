// lib/server/models/DOF_Tipo_Combustible.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_Tipo_CombustibleAttrs {
  id: number;
  Nombre: string;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_Tipo_CombustibleCreation = Optional<
  DOF_Tipo_CombustibleAttrs,
  'id' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'
>;

export class DOF_Tipo_Combustible
  extends Model<DOF_Tipo_CombustibleAttrs, DOF_Tipo_CombustibleCreation>
  implements DOF_Tipo_CombustibleAttrs {
  declare id: number;
  declare Nombre: string;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_Tipo_Combustible.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        Nombre: { type: DataTypes.STRING(150), allowNull: false, unique: true },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_Tipo_Combustible',
        tableName: 'DOF_Tipo_Combustible',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt'
      }
    );
    return DOF_Tipo_Combustible;
  }
}
