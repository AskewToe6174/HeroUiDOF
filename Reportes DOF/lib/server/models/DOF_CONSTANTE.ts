// lib/server/models/DOF_CONSTANTE.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_CONSTANTEAttrs {
  id: number;
  Nombre: string;
  Valor: string;
  IdTipoCombustible?: number | null;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_CONSTANTECreation = Optional<
  DOF_CONSTANTEAttrs,
  'id' | 'IdTipoCombustible' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'
>;

export class DOF_CONSTANTE extends Model<DOF_CONSTANTEAttrs, DOF_CONSTANTECreation>
  implements DOF_CONSTANTEAttrs {
  declare id: number;
  declare Nombre: string;
  declare Valor: string;
  declare IdTipoCombustible: number | null;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_CONSTANTE.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        Nombre: { type: DataTypes.STRING(150), allowNull: false },
        Valor: { type: DataTypes.STRING(255), allowNull: false },
        IdTipoCombustible: { type: DataTypes.INTEGER },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_CONSTANTE',
        tableName: 'DOF_CONSTANTE',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt',
        indexes: [
          { fields: ['Nombre'] },
          { unique: true, fields: ['Nombre', 'IdTipoCombustible'] }
        ]
      }
    );
    return DOF_CONSTANTE;
  }
}
