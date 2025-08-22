// lib/server/models/DOF_Estacion.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_EstacionAttrs {
  id: number;
  Numero: string;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_EstacionCreation = Optional<DOF_EstacionAttrs, 'id' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'>;

export class DOF_Estacion extends Model<DOF_EstacionAttrs, DOF_EstacionCreation>
  implements DOF_EstacionAttrs {
  declare id: number;
  declare Numero: string;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_Estacion.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        Numero: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_Estacion',
        tableName: 'DOF_Estacion',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt'
      }
    );
    return DOF_Estacion;
  }
}
