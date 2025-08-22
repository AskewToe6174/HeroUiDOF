// lib/server/models/DOF_Parametros.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_ParametrosAttrs {
  id: number;
  Nombre: string;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_ParametrosCreation = Optional<DOF_ParametrosAttrs, 'id' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'>;

export class DOF_Parametros extends Model<DOF_ParametrosAttrs, DOF_ParametrosCreation>
  implements DOF_ParametrosAttrs {
  declare id: number;
  declare Nombre: string;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_Parametros.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        Nombre: { type: DataTypes.STRING(150), allowNull: false, unique: true },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_Parametros',
        tableName: 'DOF_Parametros',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt'
      }
    );
    return DOF_Parametros;
  }
}
