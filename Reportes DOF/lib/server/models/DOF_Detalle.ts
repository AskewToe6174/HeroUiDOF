// lib/server/models/DOF_Detalle.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_DetalleAttrs {
  id: number;
  idAcuerdo: number;
  idParametro: number;
  Valor: string; // DECIMAL(10,6) vendrá como string
  IdTipoCombustible?: number | null;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_DetalleCreation = Optional<
  DOF_DetalleAttrs,
  'id' | 'IdTipoCombustible' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'
>;

export class DOF_Detalle extends Model<DOF_DetalleAttrs, DOF_DetalleCreation>
  implements DOF_DetalleAttrs {
  declare id: number;
  declare idAcuerdo: number;
  declare idParametro: number;
  declare Valor: string;
  declare IdTipoCombustible: number | null;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_Detalle.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        idAcuerdo: { type: DataTypes.INTEGER, allowNull: false },
        idParametro: { type: DataTypes.INTEGER, allowNull: false },
        Valor: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
        IdTipoCombustible: { type: DataTypes.INTEGER },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_Detalle',
        tableName: 'DOF_Detalle',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt',
        indexes: [
          { fields: ['idAcuerdo'] },
          { fields: ['idParametro'] },
          { fields: ['IdTipoCombustible'] },
          { unique: true, fields: ['idAcuerdo', 'idParametro', 'IdTipoCombustible'] }
        ]
      }
    );
    return DOF_Detalle;
  }
}
